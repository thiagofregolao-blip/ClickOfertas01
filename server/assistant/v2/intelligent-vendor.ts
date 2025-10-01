
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

// 🎯 MELHORIA 1: Extração de Entidades de Busca
interface SearchEntities {
  brands: string[];
  models: string[];
  categories: string[];
  priceRange?: { min?: number; max?: number };
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
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 150, // 🎯 MELHORIA 2: Reduzir tokens de saída
      }
    });

    memoryManager.initialize(1000);
  }

  /**
   * 🎯 MELHORIA 1: Extrair entidades de busca (marca, modelo, categoria)
   */
  private extractSearchEntities(message: string): SearchEntities {
    const messageLower = message.toLowerCase();
    const entities: SearchEntities = {
      brands: [],
      models: [],
      categories: []
    };

    // Marcas conhecidas
    const brandPatterns = {
      'apple': ['apple', 'iphone', 'ipad', 'macbook'],
      'samsung': ['samsung', 'galaxy'],
      'xiaomi': ['xiaomi', 'redmi', 'poco'],
      'motorola': ['motorola', 'moto'],
      'lg': ['lg'],
      'sony': ['sony', 'playstation', 'ps5', 'ps4'],
      'dell': ['dell'],
      'hp': ['hp'],
      'lenovo': ['lenovo'],
      'asus': ['asus'],
      'acer': ['acer']
    };

    // Detectar marcas
    for (const [brand, patterns] of Object.entries(brandPatterns)) {
      if (patterns.some(p => messageLower.includes(p))) {
        entities.brands.push(brand);
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

    // Categorias
    const categoryPatterns = {
      'celular': ['celular', 'smartphone', 'telefone', 'iphone', 'galaxy'],
      'notebook': ['notebook', 'laptop', 'computador'],
      'tv': ['tv', 'televisão', 'televisao', 'smart tv'],
      'perfume': ['perfume', 'fragrância', 'fragrancia'],
      'roupa': ['roupa', 'camisa', 'calça', 'vestido', 'blusa'],
      'sapato': ['sapato', 'tênis', 'tenis', 'sandália', 'sandalia'],
      'relógio': ['relógio', 'relogio'],
      'fone': ['fone', 'headphone', 'earphone', 'airpods'],
      'tablet': ['tablet', 'ipad']
    };

    for (const [category, patterns] of Object.entries(categoryPatterns)) {
      if (patterns.some(p => messageLower.includes(p))) {
        entities.categories.push(category);
      }
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
   * 🎯 MELHORIA 1: Busca contextual com filtros SQL inteligentes e ranking de relevância
   */
  private async searchProducts(userId: string, message: string, limit: number = 10): Promise<any[]> {
    try {
      const searchTerm = message.trim().toLowerCase();
      const entities = this.extractSearchEntities(message);
      
      console.log(`🔍 [V2] Busca contextual para: "${searchTerm}"`, { entities });
      
      // Construir condições de busca baseadas nas entidades
      const conditions: any[] = [
        eq(products.isActive, true),
        eq(stores.isActive, true)
      ];

      // Filtro por marca
      if (entities.brands.length > 0) {
        conditions.push(
          or(...entities.brands.map(brand => 
            sql`LOWER(${products.brand}) LIKE ${`%${brand}%`}`
          ))
        );
      }

      // Filtro por modelo
      if (entities.models.length > 0) {
        conditions.push(
          or(...entities.models.map(model => 
            sql`LOWER(${products.name}) LIKE ${`%${model}%`}`
          ))
        );
      }

      // Filtro por categoria
      if (entities.categories.length > 0) {
        conditions.push(
          or(...entities.categories.map(category => 
            sql`LOWER(${products.category}) LIKE ${`%${category}%`}`
          ))
        );
      }

      // Filtro por faixa de preço
      if (entities.priceRange?.max) {
        conditions.push(sql`${products.price} <= ${entities.priceRange.max}`);
      }

      // Se não houver filtros específicos, usar busca textual ampla
      if (entities.brands.length === 0 && entities.models.length === 0 && entities.categories.length === 0) {
        conditions.push(
          or(
            sql`LOWER(${products.name}) LIKE ${`%${searchTerm}%`}`,
            sql`LOWER(${products.brand}) LIKE ${`%${searchTerm}%`}`,
            sql`LOWER(${products.category}) LIKE ${`%${searchTerm}%`}`,
            sql`LOWER(${products.description}) LIKE ${`%${searchTerm}%`}`
          )
        );
      }

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
        .where(and(...conditions))
        .orderBy(
          desc(stores.isPremium),
          desc(products.isFeatured),
          asc(products.price) // Ordenar por preço crescente
        )
        .limit(limit);

      // 🎯 MELHORIA 1: Ranking de relevância com contexto conversacional
      const conversationContext = this.getConversationContext(userId);
      
      const rankedResults = searchResults.map(product => {
        const relevanceScore = this.calculateRelevanceScore(product, searchTerm, entities, conversationContext);
        return { ...product, relevanceScore };
      });

      // Ordenar por relevância (score mais alto primeiro)
      rankedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      console.log(`🔍 [V2] ✅ ${rankedResults.length} produtos encontrados com ranking de relevância`);
      if (rankedResults.length > 0) {
        console.log(`🔍 [V2] Top 3:`, rankedResults.slice(0, 3).map(p => 
          `${p.name} (${p.brand}) - Score: ${p.relevanceScore}`
        ));
      }

      return rankedResults;
    } catch (error) {
      console.error('❌ [V2] Erro na busca de produtos:', error);
      return [];
    }
  }

  /**
   * 🎯 NOVA: Obter contexto conversacional do usuário
   * Lembra produtos mencionados recentemente para entender referências como "modelo 13", "esse", etc.
   */
  private getConversationContext(userId: string): { recentProducts: string[], recentBrands: string[], recentCategories: string[] } {
    const memory = memoryManager.getMemory(userId);
    const context = {
      recentProducts: [] as string[],
      recentBrands: [] as string[],
      recentCategories: [] as string[]
    };

    // Extrair produtos, marcas e categorias das últimas 5 interações
    const recentInteractions = memory.interactions.slice(-5);
    
    for (const interaction of recentInteractions) {
      const content = interaction.content.toLowerCase();
      
      // Detectar produtos mencionados (iPhone, Galaxy, etc)
      const productPatterns = [
        /iphone\s*(\d+)?/gi,
        /galaxy\s*[sa]?(\d+)?/gi,
        /redmi\s*(\d+)?/gi,
        /moto\s*g?(\d+)?/gi
      ];
      
      for (const pattern of productPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          context.recentProducts.push(...matches.map(m => m.toLowerCase()));
        }
      }
      
      // Detectar marcas
      const brands = ['apple', 'samsung', 'xiaomi', 'motorola', 'lg', 'sony'];
      for (const brand of brands) {
        if (content.includes(brand)) {
          context.recentBrands.push(brand);
        }
      }
      
      // Detectar categorias
      const categories = ['celular', 'notebook', 'tv', 'perfume', 'roupa', 'sapato', 'fone'];
      for (const category of categories) {
        if (content.includes(category)) {
          context.recentCategories.push(category);
        }
      }
    }

    // Remover duplicatas
    context.recentProducts = [...new Set(context.recentProducts)];
    context.recentBrands = [...new Set(context.recentBrands)];
    context.recentCategories = [...new Set(context.recentCategories)];

    console.log(`🧠 [V2] Contexto conversacional para ${userId}:`, context);
    return context;
  }

  /**
   * 🎯 NOVA: Calcular score de relevância inteligente
   * Prioriza correspondências exatas de números (ex: "iPhone 13" → produtos com "13" valem 100 pontos)
   */
  private calculateRelevanceScore(product: any, searchTerm: string, entities: SearchEntities, conversationContext: any): number {
    let score = 0;
    const productName = product.name?.toLowerCase() || '';
    const productBrand = product.brand?.toLowerCase() || '';
    const productCategory = product.category?.toLowerCase() || '';
    const searchLower = searchTerm.toLowerCase();

    // 🎯 PRIORIDADE MÁXIMA: Números exatos no nome do produto (100 pontos)
    const numberPattern = /\d+/g;
    const searchNumbers = searchTerm.match(numberPattern);
    const productNumbers = productName.match(numberPattern);
    
    if (searchNumbers && productNumbers) {
      const exactNumberMatch = searchNumbers.some(num => productNumbers.includes(num));
      if (exactNumberMatch) {
        score += 100;
        console.log(`🎯 [V2] Número exato encontrado em "${product.name}": +100 pontos`);
      }
    }

    // Correspondência de modelo específico (50 pontos)
    if (entities.models.length > 0) {
      const modelMatch = entities.models.some(model => 
        productName.includes(model.toLowerCase())
      );
      if (modelMatch) {
        score += 50;
      }
    }

    // Correspondência de marca (30 pontos)
    if (entities.brands.length > 0) {
      const brandMatch = entities.brands.some(brand => 
        productBrand.includes(brand) || productName.includes(brand)
      );
      if (brandMatch) {
        score += 30;
      }
    }

    // Correspondência de categoria (20 pontos)
    if (entities.categories.length > 0) {
      const categoryMatch = entities.categories.some(cat => 
        productCategory.includes(cat)
      );
      if (categoryMatch) {
        score += 20;
      }
    }

    // Contexto conversacional - marca mencionada recentemente (15 pontos)
    if (conversationContext.recentBrands.some((brand: string) => 
      productBrand.includes(brand) || productName.includes(brand)
    )) {
      score += 15;
    }

    // Contexto conversacional - categoria mencionada recentemente (10 pontos)
    if (conversationContext.recentCategories.some((cat: string) => 
      productCategory.includes(cat)
    )) {
      score += 10;
    }

    // Loja premium (5 pontos)
    if (product.storePremium) {
      score += 5;
    }

    // Produto em destaque (3 pontos)
    if (product.isFeatured) {
      score += 3;
    }

    // Correspondência textual no nome (10 pontos)
    if (productName.includes(searchLower)) {
      score += 10;
    }

    return score;
  }

  /**
   * 🎯 CORRIGIDA: Buscar produtos relacionados/sugestões
   * Agora busca por CATEGORIA e MARCA relacionadas, não por preço aleatório
   */
  private async getSuggestedProducts(baseProduct: any, limit: number = 5): Promise<any[]> {
    try {
      console.log(`💡 [V2] Buscando sugestões relacionadas a: ${baseProduct.name} (${baseProduct.category}, ${baseProduct.brand})`);

      // Determinar categoria relacionada para sugestões inteligentes
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

      console.log(`💡 [V2] Categorias relacionadas para "${baseCategory}":`, relatedCategories);

      // Buscar produtos relacionados por categoria/marca, NÃO por preço
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
          sql`${products.id} != ${baseProduct.id}`, // Excluir o produto base
          // ✅ FIX: Trocar OR amplo por AND com validação específica
          // Produtos devem ter relação REAL: mesma marca OU categoria relacionada (não ambos aleatórios)
          or(
            // Opção 1: Mesma marca E categoria relacionada (acessórios da mesma marca)
            and(
              sql`LOWER(${products.brand}) = LOWER(${baseProduct.brand})`,
              or(...relatedCategories.map(cat => 
                sql`LOWER(${products.category}) LIKE ${`%${cat}%`}`
              ))
            ),
            // Opção 2: Categoria relacionada com palavra-chave do produto base no nome
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
        .limit(limit * 3); // Buscar mais para filtrar depois

      console.log(`🔍 [DEBUG] SQL retornou ${suggestions.length} sugestões brutas`);

      // ✅ FIX: Filtro JavaScript expandido para TODOS os produtos (não só iPhone)
      const filteredSuggestions = suggestions
        .filter(s => {
          const suggestionName = s.name?.toLowerCase() || '';
          const suggestionCategory = s.category?.toLowerCase() || '';
          const baseName = baseProduct.name?.toLowerCase() || '';
          
          // Extrair palavra-chave principal do produto base (primeira palavra significativa)
          const baseKeywords = baseName.split(' ').filter(w => w.length > 3);
          const mainKeyword = baseKeywords[0] || baseCategory;
          
          console.log(`🔍 [DEBUG] Validando: "${s.name}" | Categoria: "${s.category}" | Keyword: "${mainKeyword}"`);
          
          // Validação: produto sugerido deve ter relação com o produto base
          // 1. Nome contém palavra-chave do produto base OU
          // 2. Categoria está na lista de categorias relacionadas
          const hasKeywordMatch = suggestionName.includes(mainKeyword);
          const hasCategoryMatch = relatedCategories.some(cat => 
            suggestionCategory.includes(cat)
          );
          
          const isValid = hasKeywordMatch || hasCategoryMatch;
          
          if (!isValid) {
            console.log(`❌ [DEBUG] Rejeitado: "${s.name}" - sem relação com "${baseName}"`);
          } else {
            console.log(`✅ [DEBUG] Aprovado: "${s.name}"`);
          }
          
          return isValid;
        })
        .slice(0, limit);

      console.log(`💡 [V2] ✅ ${filteredSuggestions.length} sugestões encontradas:`, 
        filteredSuggestions.map(s => `${s.name} (${s.category})`));
      
      return filteredSuggestions;
    } catch (error) {
      console.error('❌ [V2] Erro ao buscar sugestões:', error);
      return [];
    }
  }

  /**
   * Determina se a mensagem indica intenção de busca de produtos
   */
  private shouldSearchProducts(message: string, intent: string): boolean {
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

    const messageWords = message.toLowerCase().split(/\s+/);
    const hasSearchKeyword = searchKeywords.some(keyword => 
      messageWords.some(word => word.includes(keyword) || keyword.includes(word))
    );

    const searchIntents = ['search', 'purchase_intent', 'price_inquiry', 'comparison'];
    const hasSearchIntent = searchIntents.includes(intent);

    const shouldSearch = hasSearchKeyword || hasSearchIntent;
    console.log(`🔍 [V2] shouldSearchProducts("${message}", "${intent}") = ${shouldSearch}`);

    return shouldSearch;
  }

  async processMessage(userId: string, message: string, storeId?: number): Promise<IntelligentVendorResponse> {
    const startTime = Date.now();
    
    try {
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
          parts: [{ text: 'Entendido! Estou pronto para ajudar com inteligência emocional e memória conversacional. Como posso te ajudar hoje?' }]
        });
      }
      
      conversationHistory.push({
        role: 'user',
        parts: [{ text: `${searchContext}\n\nMensagem do cliente: ${message}` }]
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
        content: 'Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente?',
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
      
      // 🔍 BUSCAR PRODUTOS SE NECESSÁRIO (Ask-then-Show pattern)
      let foundProducts: any[] = [];
      let suggestedProducts: any[] = [];
      
      if (this.shouldSearchProducts(message, intent)) {
        console.log(`🔍 [V2] Searching products for: "${message}"`);
        foundProducts = await this.searchProducts(userId, message, 10);
        
        if (foundProducts.length > 0) {
          console.log(`🛍️ [V2] Found ${foundProducts.length} products:`, foundProducts.map(p => p.name));
          
          // Adicionar produtos encontrados à memória
          foundProducts.forEach(product => {
            memoryManager.addRecentProduct(userId, product.id);
          });
          
          // 🎯 MELHORIA 2: Reduzir produtos no contexto (5 → 3)
          const topProducts = foundProducts.slice(0, 3);
          
          // Enviar produtos imediatamente via streaming
          yield `\n\n__PRODUCTS__${JSON.stringify({ products: foundProducts })}`;
          
          // 🎯 MELHORIA 3: Buscar sugestões de produtos relacionados
          if (foundProducts.length > 0) {
            suggestedProducts = await this.getSuggestedProducts(foundProducts[0], 5);
            if (suggestedProducts.length > 0) {
              console.log(`💡 [V2] Found ${suggestedProducts.length} suggested products`);
              yield `\n\n__SUGGESTIONS__${JSON.stringify({ suggestions: suggestedProducts })}`;
            }
          }
        } else {
          console.log(`❌ [V2] No products found for: "${message}"`);
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
      
      // 🎯 MELHORIA 2: Incluir apenas top 3 produtos no contexto
      let contextWithProducts = `${searchContext}\n\nMensagem: ${message}`;
      if (foundProducts.length > 0) {
        const topProducts = foundProducts.slice(0, 3);
        const productDetails = topProducts.map(p => 
          `• ${p.name} - ${p.price} guaranis (${p.brand || 'Sem marca'})`
        ).join('\n');
        contextWithProducts += `\n\n🛍️ TOP 3 PRODUTOS (${foundProducts.length} total):\n${productDetails}\n\nApresente estes produtos ao cliente.`;
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
