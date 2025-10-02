
import { GoogleGenerativeAI } from '@google/generative-ai';
import { memoryManager } from './core/memory';
import { emotionalAnalyzer } from './intelligence/emotional';
import { followUpManager } from './intelligence/followup';
import { buildSystemPrompt, buildSearchContext } from './prompts/optimized';
import { generateProactiveInsights, extractIntent } from './utils/helpers';
import { 
  IntelligentVendorResponse, 
  InteractionRecord, 
  EmotionalState,
  ProactiveInsight 
} from './types-v2';

// Import product search functionality
import { storage } from '../../storage';
import { db } from '../../db';
import { products, stores } from '@shared/schema';
import { eq, and, or, sql, asc, desc, ilike } from 'drizzle-orm';

// 🎯 COMPREHENSIVE FIX: Enhanced Search Entities with Category Inference
interface SearchEntities {
  brands: string[];
  models: string[];
  categories: string[];
  priceRange?: { min?: number; max?: number };
  inferredCategories?: string[]; // Auto-inferred from brands
}

export class IntelligentVendor {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private conversationHistories: Map<string, any[]> = new Map();

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY not found');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash', // ✅ FIXED: Updated to gemini-2.5-flash (gemini-1.5-flash is deprecated as of Sept 2025)
      generationConfig: {
        temperature: 0.7, // 🎯 FIX: Reduced from 0.9 for more focused responses
        topP: 0.9,        // 🎯 FIX: Reduced from 0.95
        topK: 30,         // 🎯 FIX: Reduced from 40
        maxOutputTokens: 120, // 🎯 FIX: Reduced from 150 for conciseness
      }
    });

    memoryManager.initialize(1000);
  }

  /**
   * 🎯 POINT 5: Verificar e garantir criação de sessão
   */
  private ensureSession(userId: string): void {
    const memory = memoryManager.getMemory(userId);
    
    if (!memory.shortTerm.lastInteractions || memory.shortTerm.lastInteractions.length === 0) {
      console.log(`🆕 [V2] POINT 5: Criando nova sessão para usuário ${userId}`);
      memoryManager.initializeMemory(userId);
    } else {
      console.log(`✅ [V2] POINT 5: Sessão existente encontrada para ${userId} (${memory.shortTerm.lastInteractions.length} interações)`);
    }
  }

  /**
   * 🎯 NEW: Remove stopwords and clean search term
   */
  private cleanSearchTerm(message: string): string {
    const stopwords = ['e', 'o', 'a', 'os', 'as', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'uns', 'umas', 'para', 'com', 'por', 'que', 'se', 'tem', 'temos', 'voce', 'você', 'vocês'];
    
    // Remove punctuation and extra spaces
    let cleaned = message.toLowerCase()
      .replace(/[?!.,;:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remove stopwords
    const words = cleaned.split(' ');
    const filtered = words.filter(word => !stopwords.includes(word) && word.length > 0);
    
    return filtered.join(' ');
  }

  /**
   * 🎯 NEW: Normalize text for better matching (handles plurals, accents)
   */
  private normalizeForMatching(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/s$/, ''); // Remove trailing 's' for basic plural handling
  }

  /**
   * 🎯 COMPREHENSIVE FIX: Enhanced entity extraction with automatic category inference
   */
  private extractSearchEntities(message: string): SearchEntities {
    const messageLower = message.toLowerCase();
    const entities: SearchEntities = {
      brands: [],
      models: [],
      categories: [],
      inferredCategories: []
    };

    // 🎯 FIX: Brand patterns with associated categories for auto-inference
    const brandPatterns: Record<string, { patterns: string[], categories: string[] }> = {
      'apple': { 
        patterns: ['apple', 'iphone', 'ipad', 'macbook'], 
        categories: ['celular', 'smartphone', 'tablet', 'notebook'] 
      },
      'samsung': { 
        patterns: ['samsung', 'galaxy'], 
        categories: ['celular', 'smartphone', 'tv', 'eletronicos'] 
      },
      'xiaomi': { 
        patterns: ['xiaomi', 'redmi', 'poco'], 
        categories: ['celular', 'smartphone', 'eletronicos'] 
      },
      'motorola': { 
        patterns: ['motorola', 'moto'], 
        categories: ['celular', 'smartphone'] 
      },
      'lg': { 
        patterns: ['lg'], 
        categories: ['celular', 'smartphone', 'tv', 'eletronicos'] 
      },
      'sony': { 
        patterns: ['sony', 'playstation', 'ps5', 'ps4'], 
        categories: ['eletronicos', 'games', 'console'] 
      },
      'dell': { 
        patterns: ['dell'], 
        categories: ['notebook', 'computador', 'laptop'] 
      },
      'hp': { 
        patterns: ['hp'], 
        categories: ['notebook', 'computador', 'laptop'] 
      },
      'lenovo': { 
        patterns: ['lenovo'], 
        categories: ['notebook', 'computador', 'laptop'] 
      },
      'asus': { 
        patterns: ['asus'], 
        categories: ['notebook', 'computador', 'laptop'] 
      },
      'acer': { 
        patterns: ['acer'], 
        categories: ['notebook', 'computador', 'laptop'] 
      }
    };

    // 🎯 FIX: Detect brands and AUTO-INFER categories
    for (const [brand, config] of Object.entries(brandPatterns)) {
      if (config.patterns.some(p => messageLower.includes(p))) {
        entities.brands.push(brand);
        // Auto-infer categories from brand
        config.categories.forEach(cat => {
          if (!entities.inferredCategories!.includes(cat)) {
            entities.inferredCategories!.push(cat);
          }
        });
        console.log(`🏷️ [V2] Marca detectada: "${brand}" → Categorias inferidas: [${config.categories.join(', ')}]`);
      }
    }

    // Modelos específicos
    const modelPatterns = [
      /iphone\s*(\d+)(\s*pro)?(\s*max)?/i,
      /galaxy\s*s(\d+)/i,
      /galaxy\s*a(\d+)/i,
      /redmi\s*(\d+)/i,
      /moto\s*g(\d+)/i
    ];

    for (const pattern of modelPatterns) {
      const match = message.match(pattern);
      if (match) {
        entities.models.push(match[0].trim());
      }
    }

    // 🎯 POINT 3: Detectar números isolados (2-3 dígitos) como modelos
    const isolatedNumberPattern = /\b(\d{2,3})\b/g;
    const isolatedNumbers = message.match(isolatedNumberPattern);
    if (isolatedNumbers) {
      isolatedNumbers.forEach(num => {
        if (!entities.models.includes(num)) {
          entities.models.push(num);
          console.log(`🔢 [V2] POINT 3: Número isolado detectado como modelo: "${num}"`);
        }
      });
    }

    // 🎯 POINT 3: Detectar padrões "modelo X", "versão X", "geração X"
    const modelKeywordPattern = /(?:modelo|versão|version|geração)\s+(\d{2,3})/gi;
    const modelKeywordMatches = message.matchAll(modelKeywordPattern);
    for (const match of modelKeywordMatches) {
      const modelNumber = match[1];
      if (!entities.models.includes(modelNumber)) {
        entities.models.push(modelNumber);
        console.log(`🔢 [V2] POINT 3: Modelo detectado via palavra-chave: "${match[0]}" → "${modelNumber}"`);
      }
    }

    // 🎯 NEW FIX: Enhanced category patterns with plural support and missing categories
    const categoryPatterns = {
      'celular': ['celular', 'celulares', 'smartphone', 'smartphones', 'telefone', 'telefones', 'iphone', 'galaxy'],
      'notebook': ['notebook', 'notebooks', 'laptop', 'laptops', 'computador', 'computadores'],
      'tv': ['tv', 'tvs', 'televisão', 'televisao', 'televisões', 'televisoes', 'smart tv'],
      'perfume': ['perfume', 'perfumes', 'fragrância', 'fragrancia', 'fragrâncias', 'fragrancias'],
      'roupa': ['roupa', 'roupas', 'camisa', 'camisas', 'calça', 'calças', 'vestido', 'vestidos', 'blusa', 'blusas'],
      'sapato': ['sapato', 'sapatos', 'tênis', 'tenis', 'sandália', 'sandalia', 'sandálias', 'sandalias'],
      'relógio': ['relógio', 'relogio', 'relógios', 'relogios'],
      'fone': ['fone', 'fones', 'headphone', 'headphones', 'earphone', 'earphones', 'airpods'],
      'tablet': ['tablet', 'tablets', 'ipad'],
      'drone': ['drone', 'drones'],
      'bolsa': ['bolsa', 'bolsas', 'mochila', 'mochilas'],
      'eletronicos': ['eletronico', 'eletronicos', 'eletrônico', 'eletrônicos', 'gadget', 'gadgets']
    };

    // 🎯 NEW: Use normalized matching for better category detection
    const messageNormalized = this.normalizeForMatching(messageLower);
    
    for (const [category, patterns] of Object.entries(categoryPatterns)) {
      const hasMatch = patterns.some(p => {
        const patternNormalized = this.normalizeForMatching(p);
        return messageNormalized.includes(patternNormalized);
      });
      
      if (hasMatch) {
        entities.categories.push(category);
        console.log(`📦 [V2] Categoria detectada: "${category}"`);
      }
    }

    // 🎯 FIX: Merge inferred categories with explicit ones
    if (entities.inferredCategories && entities.inferredCategories.length > 0) {
      entities.inferredCategories.forEach(cat => {
        if (!entities.categories.includes(cat)) {
          entities.categories.push(cat);
        }
      });
    }

    // Faixa de preço
    const priceMatch = messageLower.match(/(?:até|max|máximo|maximo)\s*(?:r\$|usd?)?\s*(\d+)/i);
    if (priceMatch) {
      entities.priceRange = { max: parseInt(priceMatch[1]) };
    }

    console.log('🔍 [V2] Entidades extraídas:', entities);
    return entities;
  }

  /**
   * 🎯 POINT 2: Usar contexto salvo quando extração de entidades falhar
   */
  private enrichEntitiesWithContext(userId: string, message: string, entities: SearchEntities): { entities: SearchEntities; searchTerm: string } {
    const savedContext = memoryManager.getConversationalContext(userId);
    
    // Se não há contexto salvo ou entidades foram extraídas com sucesso, retornar como está
    if (!savedContext || (entities.brands.length > 0 || entities.categories.length > 0)) {
      return { entities, searchTerm: message.trim() };
    }

    console.log(`🧠 [V2] POINT 2: Enriquecendo entidades com contexto salvo`);
    
    let enriched = false;
    let reconstructedSearchTerm = message.trim();

    // Se detectamos um número isolado e temos um foco atual (ex: "iphone")
    if (entities.models.length > 0 && savedContext.focoAtual) {
      console.log(`🔗 [V2] POINT 2: Modelo "${entities.models[0]}" + Foco "${savedContext.focoAtual}"`);
      
      // Adicionar marca do contexto
      if (savedContext.marcaAtual && !entities.brands.includes(savedContext.marcaAtual)) {
        entities.brands.push(savedContext.marcaAtual);
        enriched = true;
        console.log(`✅ [V2] POINT 2: Marca adicionada do contexto: "${savedContext.marcaAtual}"`);
      }
      
      // Adicionar categoria do contexto
      if (savedContext.categoriaAtual && !entities.categories.includes(savedContext.categoriaAtual)) {
        entities.categories.push(savedContext.categoriaAtual);
        enriched = true;
        console.log(`✅ [V2] POINT 2: Categoria adicionada do contexto: "${savedContext.categoriaAtual}"`);
      }
      
      // Reconstruir termo de busca: "{foco} {modelo}"
      reconstructedSearchTerm = `${savedContext.focoAtual} ${entities.models[0]}`;
      console.log(`🔄 [V2] POINT 2: Termo de busca reconstruído: "${message}" → "${reconstructedSearchTerm}"`);
    }

    if (enriched) {
      console.log(`✅ [V2] POINT 2: Entidades enriquecidas com sucesso:`, entities);
    } else {
      console.log(`⚠️ [V2] POINT 2: Nenhum enriquecimento aplicado`);
    }

    return { entities, searchTerm: reconstructedSearchTerm };
  }

  /**
   * 🎯 COMPREHENSIVE FIX: Strict category-aware product search with enhanced filtering
   */
  private async searchProducts(userId: string, message: string, limit: number = 10): Promise<any[]> {
    try {
      // 🎯 POINT 5: Garantir que sessão existe antes da busca
      this.ensureSession(userId);

      // 🎯 NEW: Clean search term first (remove stopwords, punctuation)
      const cleanedMessage = this.cleanSearchTerm(message);
      console.log(`🧹 [V2] Termo limpo: "${message}" → "${cleanedMessage}"`);

      let searchTerm = cleanedMessage.toLowerCase();
      let entities = this.extractSearchEntities(cleanedMessage);
      
      // 🎯 POINT 2: Enriquecer entidades com contexto salvo se necessário
      const enriched = this.enrichEntitiesWithContext(userId, cleanedMessage, entities);
      entities = enriched.entities;
      searchTerm = enriched.searchTerm.toLowerCase();
      
      console.log(`🔍 [V2] Busca contextual para: "${searchTerm}"`, { entities });
      
      // 🎯 COMPREHENSIVE FIX: Determine if strict category filtering is needed
      const hasSpecificBrandOrModel = entities.brands.length > 0 || entities.models.length > 0;
      const shouldEnforceCategory = hasSpecificBrandOrModel && entities.categories.length > 0;
      
      if (shouldEnforceCategory) {
        console.log(`🔒 [V2] STRICT MODE: Enforcing category filter for brands/models`);
      }
      
      // ✅ FIX CRÍTICO: Separar condições obrigatórias (AND) das opcionais (OR)
      const mandatoryConditions: any[] = [
        eq(products.isActive, true),
        eq(stores.isActive, true)
      ];

      // 🎯 COMPREHENSIVE FIX: Add mandatory category filter when brand/model detected
      if (shouldEnforceCategory) {
        mandatoryConditions.push(
          or(...entities.categories.map(category => 
            sql`LOWER(${products.category}) LIKE ${`%${category}%`}`
          ))
        );
        console.log(`🔒 [V2] Categoria obrigatória adicionada: [${entities.categories.join(', ')}]`);
      }

      // Condições OPCIONAIS de busca (aplicadas com OR entre si, mas AND com obrigatórias)
      const searchConditions: any[] = [];

      // Filtro por marca
      if (entities.brands.length > 0) {
        searchConditions.push(
          or(...entities.brands.map(brand => 
            sql`LOWER(${products.brand}) LIKE ${`%${brand}%`}`
          ))
        );
      }

      // Filtro por modelo
      if (entities.models.length > 0) {
        searchConditions.push(
          or(...entities.models.map(model => 
            sql`LOWER(${products.name}) LIKE ${`%${model}%`}`
          ))
        );
      }

      // 🎯 FIX: Only add category to search conditions if NOT in strict mode
      if (!shouldEnforceCategory && entities.categories.length > 0) {
        searchConditions.push(
          or(...entities.categories.map(category => 
            sql`LOWER(${products.category}) LIKE ${`%${category}%`}`
          ))
        );
      }

      // 🎯 NEW FIX: Enhanced text search with normalized matching
      // Split search term into tokens for better matching
      const searchTokens = searchTerm.split(/\s+/).filter(t => t.length >= 2);
      
      if (searchTokens.length > 0) {
        // Create OR conditions for each token in name/brand/category
        const tokenConditions = searchTokens.map(token => 
          or(
            sql`LOWER(${products.name}) LIKE ${`%${token}%`}`,
            sql`LOWER(${products.brand}) LIKE ${`%${token}%`}`,
            sql`LOWER(${products.category}) LIKE ${`%${token}%`}`
          )
        );
        
        // At least one token must match
        searchConditions.push(or(...tokenConditions));
        console.log(`🔍 [V2] Tokens de busca: [${searchTokens.join(', ')}]`);
      } else {
        // Fallback to full term search
        searchConditions.push(
          or(
            sql`LOWER(${products.name}) LIKE ${`%${searchTerm}%`}`,
            sql`LOWER(${products.brand}) LIKE ${`%${searchTerm}%`}`
          )
        );
      }

      // Filtro por faixa de preço (obrigatório se especificado)
      if (entities.priceRange?.max) {
        mandatoryConditions.push(sql`${products.price} <= ${entities.priceRange.max}`);
      }

      // ✅ FIX: Combinar condições corretamente
      const finalCondition = searchConditions.length > 0
        ? and(...mandatoryConditions, or(...searchConditions))
        : and(...mandatoryConditions);

      console.log(`🔍 [V2] DEBUG: Modo ${shouldEnforceCategory ? 'STRICT' : 'NORMAL'} | Obrigatórias: ${mandatoryConditions.length} | Busca: ${searchConditions.length}`);
      console.log(`🔍 [V2] DEBUG: Entidades - Brands: [${entities.brands.join(', ')}], Models: [${entities.models.join(', ')}], Categories: [${entities.categories.join(', ')}]`);
      
      const searchResults = await db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          imageUrl: products.imageUrl,
          category: products.category,
          brand: products.brand,
          description: products.description,
          storeId: products.storeId,
          storeName: stores.name,
          storeLogoUrl: stores.logoUrl,
          storeSlug: stores.slug,
          storeThemeColor: stores.themeColor,
          storePremium: stores.isPremium,
          isFeatured: products.isFeatured
        })
        .from(products)
        .innerJoin(stores, eq(products.storeId, stores.id))
        .where(finalCondition)
        .orderBy(
          desc(stores.isPremium),
          desc(products.isFeatured),
          asc(products.price)
        )
        .limit(limit * 2); // 🎯 FIX: Get more results for better filtering

      // 🎯 COMPREHENSIVE FIX: Enhanced relevance scoring with category validation
      const conversationContext = this.getConversationContext(userId);
      
      const rankedResults = searchResults.map(product => {
        const relevanceScore = this.calculateRelevanceScore(
          product, 
          searchTerm, 
          entities, 
          conversationContext,
          shouldEnforceCategory // Pass strict mode flag
        );
        return { ...product, relevanceScore };
      });

      // 🎯 COMPREHENSIVE FIX: Filter with HIGHER threshold and category validation
      const minScoreThreshold = shouldEnforceCategory ? 50 : 30; // Higher threshold in strict mode
      
      const validResults = rankedResults.filter(product => {
        // Remove products with score below threshold
        if (product.relevanceScore < minScoreThreshold) {
          console.log(`❌ [V2] Score baixo: "${product.name}" (${product.category}) - Score: ${product.relevanceScore} < ${minScoreThreshold}`);
          return false;
        }
        
        // 🎯 FIX: In strict mode, double-check category match
        if (shouldEnforceCategory) {
          const productCategory = this.normalizeForMatching(product.category || '');
          const categoryMatch = entities.categories.some(cat => 
            productCategory.includes(this.normalizeForMatching(cat))
          );
          
          if (!categoryMatch) {
            console.log(`❌ [V2] Categoria inválida: "${product.name}" (${product.category}) não está em [${entities.categories.join(', ')}]`);
            return false;
          }
        }
        
        return true;
      });

      // Ordenar por relevância
      validResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      console.log(`🔍 [V2] ✅ ${validResults.length} produtos VÁLIDOS (${searchResults.length - validResults.length} removidos)`);
      if (validResults.length > 0) {
        console.log(`🔍 [V2] Top 3:`, validResults.slice(0, 3).map(p => 
          `${p.name} (${p.brand}) - Score: ${p.relevanceScore}`
        ));
      }

      // Limit to requested amount
      const finalResults = validResults.slice(0, limit);

      // 🎯 POINT 1: Salvar contexto após busca bem-sucedida
      if (finalResults.length > 0) {
        const topProduct = finalResults[0];
        const detectedModels = entities.models.length > 0 ? entities.models : 
          (topProduct.name.match(/\d{2,3}/g) || []);
        
        memoryManager.saveConversationalContext(userId, {
          focoAtual: entities.brands.length > 0 ? entities.brands[0] : 
                     (topProduct.brand?.toLowerCase() || topProduct.name.split(' ')[0].toLowerCase()),
          marcaAtual: entities.brands.length > 0 ? entities.brands[0] : topProduct.brand?.toLowerCase(),
          categoriaAtual: entities.categories.length > 0 ? entities.categories[0] : topProduct.category?.toLowerCase(),
          ultimaQuery: searchTerm,
          ultimosModelos: detectedModels,
          produtosEncontrados: finalResults.length
        });
        
        console.log(`💾 [V2] POINT 1: Contexto salvo (${finalResults.length} produtos)`);
      }

      // 🎯 FALLBACK: Se busca específica retornar 0, tentar busca ampla (apenas se não estiver em modo strict)
      if (finalResults.length === 0 && !shouldEnforceCategory && (entities.brands.length > 0 || entities.models.length > 0)) {
        console.log('🔄 [V2] Busca específica = 0. Tentando busca ampla...');
        
        const broadConditions: any[] = [
          eq(products.isActive, true),
          eq(stores.isActive, true),
          or(
            sql`LOWER(${products.name}) LIKE ${`%${searchTerm}%`}`,
            sql`LOWER(${products.brand}) LIKE ${`%${searchTerm}%`}`,
            sql`LOWER(${products.category}) LIKE ${`%${searchTerm}%`}`
          )
        ];

        const broadResults = await db
          .select({
            id: products.id,
            name: products.name,
            price: products.price,
            imageUrl: products.imageUrl,
            category: products.category,
            brand: products.brand,
            description: products.description,
            storeId: products.storeId,
            storeName: stores.name,
            storeLogoUrl: stores.logoUrl,
            storeSlug: stores.slug,
            storeThemeColor: stores.themeColor,
            storePremium: stores.isPremium,
            isFeatured: products.isFeatured
          })
          .from(products)
          .innerJoin(stores, eq(products.storeId, stores.id))
          .where(and(...broadConditions))
          .orderBy(
            desc(stores.isPremium),
            desc(products.isFeatured),
            asc(products.price)
          )
          .limit(limit);

        const broadRanked = broadResults.map(product => {
          const relevanceScore = this.calculateRelevanceScore(product, searchTerm, entities, conversationContext, false);
          return { ...product, relevanceScore };
        });

        const validBroadResults = broadRanked.filter(p => p.relevanceScore >= 30);
        validBroadResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
        console.log(`🔄 [V2] Busca ampla: ${validBroadResults.length} produtos`);
        return validBroadResults.slice(0, limit);
      }

      return finalResults;
    } catch (error) {
      console.error('❌ [V2] Erro na busca:', error);
      return [];
    }
  }

  /**
   * 🎯 NOVA: Obter contexto conversacional do usuário
   */
  private getConversationContext(userId: string): { recentProducts: string[], recentBrands: string[], recentCategories: string[] } {
    const memory = memoryManager.getMemory(userId);
    const context = {
      recentProducts: [] as string[],
      recentBrands: [] as string[],
      recentCategories: [] as string[]
    };

    if (!memory.shortTerm.lastInteractions || memory.shortTerm.lastInteractions.length === 0) {
      console.log(`⚠️ [V2] getConversationContext: No interactions for ${userId}`);
      return context;
    }

    const recentInteractions = memory.shortTerm.lastInteractions.slice(-5);
    console.log(`📝 [V2] Processing ${recentInteractions.length} interactions`);
    
    for (const interaction of recentInteractions) {
      const content = interaction.content.toLowerCase();
      
      const productPatterns = [
        /iphone\s*(\d+)?/gi,
        /galaxy\s*[sa]?(\d+)?/gi,
        /redmi\s*(\d+)?/gi,
        /moto\s*g?(\d+)?/gi
      ];
      
      for (const pattern of productPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          context.recentProducts.push(...matches.map((m: string) => m.toLowerCase()));
        }
      }
      
      const brands = ['apple', 'samsung', 'xiaomi', 'motorola', 'lg', 'sony'];
      for (const brand of brands) {
        if (content.includes(brand)) {
          context.recentBrands.push(brand);
        }
      }
      
      const categories = ['celular', 'notebook', 'tv', 'perfume', 'roupa', 'sapato', 'fone'];
      for (const category of categories) {
        if (content.includes(category)) {
          context.recentCategories.push(category);
        }
      }
    }

    context.recentProducts = [...new Set(context.recentProducts)];
    context.recentBrands = [...new Set(context.recentBrands)];
    context.recentCategories = [...new Set(context.recentCategories)];

    console.log(`🧠 [V2] Contexto para ${userId}:`, context);
    return context;
  }

  /**
   * 🔧 Normalizar texto (legacy method - kept for compatibility)
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * 🎯 COMPREHENSIVE FIX: Enhanced relevance scoring with category validation and penalties
   */
  private calculateRelevanceScore(
    product: any, 
    searchTerm: string, 
    entities: SearchEntities, 
    conversationContext: any,
    strictMode: boolean = false
  ): number {
    let score = 0;
    
    // 🎯 NEW: Use normalizeForMatching for better plural/accent handling
    const productName = this.normalizeForMatching(product.name || '');
    const productBrand = this.normalizeForMatching(product.brand || '');
    const productCategory = this.normalizeForMatching(product.category || '');
    const searchNormalized = this.normalizeForMatching(searchTerm);

    // 🎯 NEW: Lower minimum token length from 3 to 2 for better matching
    const searchTokens = searchNormalized
      .split(/\s+/)
      .filter(token => token.length >= 2);

    console.log(`📊 [V2] Score para "${product.name}" | Busca: "${searchTerm}" | Strict: ${strictMode}`);

    // 🎯 PRIORITY 1: Exact match in name (150 points)
    if (productName.includes(searchNormalized)) {
      score += 150;
      console.log(`✅ Match exato no nome: +150`);
    }

    // 🎯 PRIORITY 2: Token matching with higher weights
    searchTokens.forEach(token => {
      if (productName.includes(token)) {
        score += 60; // Increased from 50
        console.log(`✅ Token "${token}" no nome: +60`);
      } else if (productBrand.includes(token)) {
        score += 50; // Increased from 40
        console.log(`✅ Token "${token}" na marca: +50`);
      } else if (productCategory.includes(token)) {
        score += 40; // Increased from 30
        console.log(`✅ Token "${token}" na categoria: +40`);
      }
      // 🎯 FIX: Removed description matching to avoid false positives
    });

    // 🎯 PRIORITY 3: Exact number matching (120 points)
    const numberPattern = /\d+/g;
    const searchNumbers = searchTerm.match(numberPattern);
    const productNumbers = product.name.match(numberPattern);
    
    if (searchNumbers && productNumbers) {
      const exactNumberMatch = searchNumbers.some(num => productNumbers.includes(num));
      if (exactNumberMatch) {
        score += 120;
        console.log(`✅ Número exato: +120`);
      }
    }

    // Model matching (60 points)
    if (entities.models.length > 0) {
      const modelMatch = entities.models.some(model => 
        productName.includes(this.normalizeForMatching(model))
      );
      if (modelMatch) {
        score += 60;
        console.log(`✅ Modelo específico: +60`);
      }
    }

    // Brand matching (40 points)
    if (entities.brands.length > 0) {
      const brandMatch = entities.brands.some(brand => {
        const brandNormalized = this.normalizeForMatching(brand);
        return productBrand.includes(brandNormalized) || productName.includes(brandNormalized);
      });
      if (brandMatch) {
        score += 40;
        console.log(`✅ Marca: +40`);
      }
    }

    // 🎯 COMPREHENSIVE FIX: Category validation with bonus/penalty
    if (entities.categories.length > 0) {
      const categoryMatch = entities.categories.some(cat => 
        productCategory.includes(this.normalizeForMatching(cat))
      );
      
      if (categoryMatch) {
        score += 30;
        console.log(`✅ Categoria correta: +30`);
      } else if (strictMode) {
        // 🎯 FIX: Heavy penalty for wrong category in strict mode
        score -= 100;
        console.log(`❌ Categoria errada (strict mode): -100`);
      }
    }

    // Conversation context - recent brand (20 points)
    if (conversationContext.recentBrands.some((brand: string) => {
      const brandNormalized = this.normalizeForMatching(brand);
      return productBrand.includes(brandNormalized) || productName.includes(brandNormalized);
    })) {
      score += 20;
      console.log(`✅ Contexto marca: +20`);
    }

    // Conversation context - recent category (15 points)
    if (conversationContext.recentCategories.some((cat: string) => 
      productCategory.includes(this.normalizeForMatching(cat))
    )) {
      score += 15;
      console.log(`✅ Contexto categoria: +15`);
    }

    // Premium store (5 points)
    if (product.storePremium) {
      score += 5;
    }

    // Featured product (3 points)
    if (product.isFeatured) {
      score += 3;
    }

    console.log(`📊 [V2] Score final: ${score}`);
    return Math.max(0, score); // Never return negative scores
  }

  /**
   * 🎯 CORRIGIDA: Buscar produtos relacionados/sugestões
   */
  private async getSuggestedProducts(baseProduct: any, limit: number = 5): Promise<any[]> {
    try {
      console.log(`💡 [V2] Buscando sugestões para: ${baseProduct.name} (${baseProduct.category})`);

      const categoryRelations: Record<string, string[]> = {
        'celular': ['capinha', 'película', 'carregador', 'fone', 'suporte'],
        'smartphone': ['capinha', 'película', 'carregador', 'fone', 'suporte'],
        'notebook': ['mouse', 'teclado', 'mochila', 'suporte', 'hub usb'],
        'tv': ['suporte', 'controle', 'cabo hdmi', 'soundbar'],
        'perfume': ['perfume', 'colônia', 'desodorante', 'body splash'],
        'roupa': ['roupa', 'acessório', 'calçado'],
        'sapato': ['sapato', 'tênis', 'sandália', 'meia']
      };

      const baseCategory = baseProduct.category?.toLowerCase() || '';
      const relatedCategories = categoryRelations[baseCategory] || [baseCategory];

      console.log(`💡 [V2] Categorias relacionadas:`, relatedCategories);

      const suggestions = await db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          imageUrl: products.imageUrl,
          category: products.category,
          brand: products.brand,
          description: products.description,
          storeId: products.storeId,
          storeName: stores.name,
          storeLogoUrl: stores.logoUrl,
          storeSlug: stores.slug,
          storeThemeColor: stores.themeColor,
          storePremium: stores.isPremium,
          isFeatured: products.isFeatured
        })
        .from(products)
        .innerJoin(stores, eq(products.storeId, stores.id))
        .where(and(
          eq(products.isActive, true),
          eq(stores.isActive, true),
          sql`${products.id} != ${baseProduct.id}`,
          or(
            and(
              sql`LOWER(${products.brand}) = LOWER(${baseProduct.brand})`,
              or(...relatedCategories.map(cat => 
                sql`LOWER(${products.category}) LIKE ${`%${cat}%`}`
              ))
            ),
            and(
              or(...relatedCategories.map(cat => 
                sql`LOWER(${products.category}) LIKE ${`%${cat}%`}`
              )),
              sql`LOWER(${products.name}) LIKE ${`%${baseCategory}%`}`
            )
          )
        ))
        .orderBy(
          desc(stores.isPremium),
          desc(products.isFeatured),
          asc(products.price)
        )
        .limit(limit * 3);

      const filteredSuggestions = suggestions
        .filter(s => {
          const suggestionName = s.name?.toLowerCase() || '';
          const suggestionCategory = s.category?.toLowerCase() || '';
          const baseName = baseProduct.name?.toLowerCase() || '';
          
          const baseKeywords = baseName.split(' ').filter((w: string) => w.length > 3);
          const mainKeyword = baseKeywords[0] || baseCategory;
          
          const hasKeywordMatch = suggestionName.includes(mainKeyword);
          const hasCategoryMatch = relatedCategories.some(cat => 
            suggestionCategory.includes(cat)
          );
          
          return hasKeywordMatch || hasCategoryMatch;
        })
        .slice(0, limit);

      console.log(`💡 [V2] ✅ ${filteredSuggestions.length} sugestões`);
      return filteredSuggestions;
    } catch (error) {
      console.error('❌ [V2] Erro ao buscar sugestões:', error);
      return [];
    }
  }

  /**
   * Determina se deve buscar produtos
   */
  private shouldSearchProducts(message: string, intent: string): boolean {
    const messageLower = message.toLowerCase();
    
    const searchKeywords = [
      'iphone', 'samsung', 'celular', 'smartphone', 'telefone',
      'notebook', 'laptop', 'computador', 'pc',
      'tv', 'televisão', 'smart tv',
      'perfume', 'perfumes', 'fragrância',
      'roupa', 'roupas', 'camisa', 'calça', 'vestido',
      'sapato', 'sapatos', 'tênis', 'sandália',
      'relógio', 'relógios',
      'fone', 'fones', 'headphone', 'earphone',
      'tablet', 'ipad',
      'quero', 'preciso', 'busco', 'procuro', 'onde encontro'
    ];

    const messageWords = messageLower.split(/\s+/);
    const hasSearchKeyword = searchKeywords.some(keyword => 
      messageWords.some(word => word.includes(keyword) || keyword.includes(word))
    );

    const modelPatterns = [
      /modelo\s+\d+/i,
      /versão\s+\d+/i,
      /geração\s+\d+/i,
      /\d+\s*(pro|max|plus|ultra|mini)/i,
      /(pro|max|plus|ultra|mini)\s*\d+/i,
      /\biphone\s*\d+/i,
      /\bgalaxy\s*[sa]\d+/i,
      /\bredmi\s*\d+/i,
      /\bmoto\s*g?\d+/i
    ];
    
    const hasModelPattern = modelPatterns.some(pattern => pattern.test(messageLower));

    const searchIntents = ['search', 'purchase_intent', 'price_inquiry', 'comparison'];
    const hasSearchIntent = searchIntents.includes(intent);

    const shouldSearch = hasSearchKeyword || hasSearchIntent || hasModelPattern;
    
    console.log(`🔍 [V2] shouldSearch: ${shouldSearch} (keyword:${hasSearchKeyword}, model:${hasModelPattern}, intent:${hasSearchIntent})`);

    return shouldSearch;
  }

  async processMessage(userId: string, message: string, storeId?: number): Promise<IntelligentVendorResponse> {
    const startTime = Date.now();
    
    try {
      this.ensureSession(userId);

      const memory = memoryManager.getMemory(userId);
      const emotionalState = emotionalAnalyzer.analyzeEmotion(message);
      const intent = extractIntent(message);
      const insights = generateProactiveInsights(memory);
      
      const interaction: InteractionRecord = {
        timestamp: new Date(),
        type: this.mapIntentToInteractionType(intent),
        content: message,
        context: { storeId },
        sentiment: emotionalState,
        userId
      };
      
      memoryManager.addInteraction(userId, interaction);
      memoryManager.updateCurrentContext(userId, message, this.inferContextType(intent));
      
      const systemPrompt = buildSystemPrompt(memory, emotionalState, insights);
      const searchContext = buildSearchContext(memory);
      
      let conversationHistory = this.conversationHistories.get(userId) || [];
      if (conversationHistory.length === 0) {
        conversationHistory.push({
          role: 'user',
          parts: [{ text: systemPrompt }]
        });
        conversationHistory.push({
          role: 'model',
          parts: [{ text: 'Entendido! Como posso ajudar?' }]
        });
      }
      
      conversationHistory.push({
        role: 'user',
        parts: [{ text: `${searchContext}\n\nMensagem: ${message}` }]
      });
      
      if (conversationHistory.length > 20) {
        conversationHistory = [conversationHistory[0], conversationHistory[1], ...conversationHistory.slice(-18)];
      }
      
      const chat = this.model.startChat({
        history: conversationHistory.slice(0, -1)
      });
      
      const result = await chat.sendMessage(conversationHistory[conversationHistory.length - 1].parts[0].text);
      const responseText = result.response.text();
      
      conversationHistory.push({
        role: 'model',
        parts: [{ text: responseText }]
      });
      
      this.conversationHistories.set(userId, conversationHistory);
      
      const followUpRules = followUpManager.evaluateRules(memory);
      const followUpSuggestions = followUpRules.slice(0, 2).map(rule => 
        followUpManager.generateMessage(rule, memory)
      );
      
      const highPriorityInsights = insights.filter(i => i.priority >= 8).slice(0, 2);
      
      const processingTime = Date.now() - startTime;
      
      const response: IntelligentVendorResponse = {
        id: `msg_${Date.now()}_${userId}`,
        userId,
        content: responseText,
        timestamp: new Date(),
        metadata: {
          intent: { type: intent, confidence: 0.8 },
          emotionalState,
          proactiveInsights: highPriorityInsights,
          processingTime,
          confidence: 0.85
        },
        suggestions: this.extractSuggestions(responseText),
        recommendedProducts: [],
        followUpSuggestions
      };
      
      return response;
      
    } catch (error) {
      console.error('❌ Erro no IntelligentVendor:', error);
      
      return {
        id: `error_${Date.now()}`,
        userId,
        content: 'Desculpe, tive um problema. Pode tentar novamente?',
        timestamp: new Date(),
        metadata: {
          processingTime: Date.now() - startTime,
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestions: [],
        recommendedProducts: [],
        followUpSuggestions: []
      };
    }
  }

  async *streamMessage(userId: string, message: string, storeId?: number): AsyncGenerator<string, void, unknown> {
    try {
      this.ensureSession(userId);

      // 🎯 FIX: Yield immediately to keep connection alive
      yield ''; // Keep-alive signal
      
      const memory = memoryManager.getMemory(userId);
      const emotionalState = emotionalAnalyzer.analyzeEmotion(message);
      const intent = extractIntent(message);
      const insights = generateProactiveInsights(memory);
      
      const interaction: InteractionRecord = {
        timestamp: new Date(),
        type: this.mapIntentToInteractionType(intent),
        content: message,
        context: { storeId },
        sentiment: emotionalState,
        userId
      };
      
      memoryManager.addInteraction(userId, interaction);
      memoryManager.updateCurrentContext(userId, message, this.inferContextType(intent));
      
      let foundProducts: any[] = [];
      let suggestedProducts: any[] = [];
      
      if (this.shouldSearchProducts(message, intent)) {
        console.log(`🔍 [V2] Searching products for: "${message}"`);
        foundProducts = await this.searchProducts(userId, message, 10);
        
        if (foundProducts.length > 0) {
          console.log(`🛍️ [V2] Found ${foundProducts.length} products`);
          
          foundProducts.forEach(product => {
            memoryManager.addRecentProduct(userId, product.id);
          });
          
          const topProducts = foundProducts.slice(0, 3);
          
          // 🎯 FIX: Use marker format so route handler can emit proper SSE event
          yield `\n\n__PRODUCTS__${JSON.stringify({ products: foundProducts })}`;
          
          if (foundProducts.length > 0) {
            suggestedProducts = await this.getSuggestedProducts(foundProducts[0], 5);
            if (suggestedProducts.length > 0) {
              console.log(`💡 [V2] Found ${suggestedProducts.length} suggestions`);
              // 🎯 FIX: Use marker format for suggestions too
              yield `\n\n__SUGGESTIONS__${JSON.stringify({ suggestions: suggestedProducts })}`;
            }
          }
        } else {
          console.log(`❌ [V2] No products found`);
        }
      }
      
      const systemPrompt = buildSystemPrompt(memory, emotionalState, insights);
      const searchContext = buildSearchContext(memory);
      
      let conversationHistory = this.conversationHistories.get(userId) || [];
      if (conversationHistory.length === 0) {
        conversationHistory.push({
          role: 'user',
          parts: [{ text: systemPrompt }]
        });
        conversationHistory.push({
          role: 'model',
          parts: [{ text: 'Entendido! Como posso ajudar?' }]
        });
      }
      
      // 🎯 FIX: More concise context for AI
      let contextWithProducts = `${searchContext}\n\nMensagem: ${message}`;
      
      if (foundProducts.length > 0) {
        const topProducts = foundProducts.slice(0, 3);
        const productDetails = topProducts.map(p => 
          `• ${p.name} - ${p.price} guaranis`
        ).join('\n');
        contextWithProducts += `\n\n🛍️ TOP 3:\n${productDetails}\n\n⚡ Seja breve e direto. Apresente os produtos de forma concisa.`;
      } else {
        contextWithProducts += `\n\n⚠️ Nenhum produto encontrado. Sugira alternativas brevemente.`;
      }
      
      conversationHistory.push({
        role: 'user',
        parts: [{ text: contextWithProducts }]
      });
      
      const chat = this.model.startChat({
        history: conversationHistory.slice(0, -1)
      });
      
      const result = await chat.sendMessageStream(conversationHistory[conversationHistory.length - 1].parts[0].text);
      
      let fullResponse = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        yield chunkText;
      }
      
      conversationHistory.push({
        role: 'model',
        parts: [{ text: fullResponse }]
      });
      
      if (conversationHistory.length > 20) {
        conversationHistory = [conversationHistory[0], conversationHistory[1], ...conversationHistory.slice(-18)];
      }
      
      this.conversationHistories.set(userId, conversationHistory);
      
      const metadata = {
        emotionalState,
        intent,
        insights: insights.filter(i => i.priority >= 8).slice(0, 2),
        foundProducts: foundProducts.length > 0 ? foundProducts : undefined,
        suggestedProducts: suggestedProducts.length > 0 ? suggestedProducts : undefined
      };
      
      yield `\n\n__METADATA__${JSON.stringify(metadata)}`;
      
    } catch (error) {
      console.error('❌ Erro no streaming:', error);
      yield 'Desculpe, ocorreu um erro. Pode tentar novamente?';
    }
  }

  private mapIntentToInteractionType(intent: string): InteractionRecord['type'] {
    const mapping: Record<string, InteractionRecord['type']> = {
      price_inquiry: 'price_inquiry',
      purchase_intent: 'purchase_intent',
      comparison: 'comparison',
      search: 'query',
      information: 'message',
      help: 'message',
      general: 'message'
    };
    
    return mapping[intent] || 'message';
  }

  private inferContextType(intent: string): 'product' | 'category' | 'comparison' | 'problem' | 'goal' {
    if (intent === 'comparison') return 'comparison';
    if (intent === 'purchase_intent') return 'product';
    if (intent === 'help') return 'problem';
    if (intent === 'search') return 'category';
    return 'goal';
  }

  private extractSuggestions(responseText: string): string[] {
    const suggestions: string[] = [];
    
    const bullets = responseText.match(/[•\-*]\s*(.+)/g);
    if (bullets) {
      suggestions.push(...bullets.slice(0, 3).map(b => b.replace(/[•\-*]\s*/, '').trim()));
    }
    
    const questions = responseText.match(/\?/g);
    if (questions && questions.length > 0) {
      const questionMatch = responseText.match(/([^.!?]+\?)/);
      if (questionMatch) {
        suggestions.push(questionMatch[1].trim());
      }
    }
    
    return suggestions.slice(0, 3);
  }

  clearUserHistory(userId: string): void {
    this.conversationHistories.delete(userId);
    memoryManager.clearMemory(userId);
  }

  getUserMemory(userId: string) {
    return memoryManager.getMemory(userId);
  }

  getEmotionalState(message: string) {
    return emotionalAnalyzer.analyzeEmotion(message);
  }
}

export const intelligentVendor = new IntelligentVendor();
