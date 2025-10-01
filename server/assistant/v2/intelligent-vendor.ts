
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
  private async searchProducts(message: string, limit: number = 10): Promise<any[]> {
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

      // 🎯 MELHORIA 1: Ranking de relevância
      const rankedResults = searchResults.map(product => {
        let relevanceScore = 0;

        // Pontuação por correspondência de marca
        if (entities.brands.some(brand => product.brand?.toLowerCase().includes(brand))) {
          relevanceScore += 10;
        }

        // Pontuação por correspondência de modelo
        if (entities.models.some(model => product.name?.toLowerCase().includes(model.toLowerCase()))) {
          relevanceScore += 15;
        }

        // Pontuação por correspondência de categoria
        if (entities.categories.some(cat => product.category?.toLowerCase().includes(cat))) {
          relevanceScore += 8;
        }

        // Pontuação por loja premium
        if (product.storePremium) {
          relevanceScore += 5;
        }

        // Pontuação por produto em destaque
        if (product.isFeatured) {
          relevanceScore += 3;
        }

        return { ...product, relevanceScore };
      });

      // Ordenar por relevância
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
   * 🎯 MELHORIA 3: Buscar produtos relacionados/sugestões
   */
  private async getSuggestedProducts(baseProduct: any, limit: number = 5): Promise<any[]> {
    try {
      console.log(`💡 [V2] Buscando sugestões relacionadas a: ${baseProduct.name}`);

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
          storePremium: stores.isPremium
        })
        .from(products)
        .innerJoin(stores, eq(products.storeId, stores.id))
        .where(and(
          eq(products.isActive, true),
          eq(stores.isActive, true),
          sql`${products.id} != ${baseProduct.id}`, // Excluir o produto base
          or(
            // Mesma categoria
            sql`LOWER(${products.category}) = LOWER(${baseProduct.category})`,
            // Mesma marca
            sql`LOWER(${products.brand}) = LOWER(${baseProduct.brand})`,
            // Faixa de preço similar (±30%)
            and(
              sql`${products.price} >= ${baseProduct.price * 0.7}`,
              sql`${products.price} <= ${baseProduct.price * 1.3}`
            )
          )
        ))
        .orderBy(
          desc(stores.isPremium),
          desc(products.isFeatured),
          asc(products.price)
        )
        .limit(limit);

      console.log(`💡 [V2] ✅ ${suggestions.length} sugestões encontradas`);
      return suggestions;
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
        foundProducts = await this.searchProducts(message, 10);
        
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
