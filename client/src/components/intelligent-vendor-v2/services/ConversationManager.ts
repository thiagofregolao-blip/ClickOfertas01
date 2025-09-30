
import { VendorConfig, VendorSession, Product } from '../types';

export interface MessageAnalysis {
  intent: 'search' | 'compare' | 'price_inquiry' | 'feature_inquiry' | 'greeting' | 'help' | 'other';
  confidence: number;
  extractedProduct?: string;
  extractedCategory?: string;
  extractedBrand?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  searchQuery?: string;
  shouldSearch: boolean;
  suggestedStage?: VendorSession['context']['conversationStage'];
  keywords: string[];
}

export interface ResponseGeneration {
  text: string;
  suggestedActions?: string[];
  followUpQuestions?: string[];
}

export class ConversationManager {
  private intentPatterns = {
    search: [
      /procur(o|ando)|quer(o|ia)|precis(o|ava)|busca(ndo|r)?/i,
      /mostr(e|a)|encontr(e|ar)|vej(o|a)/i,
      /tem|há|existe/i
    ],
    compare: [
      /compar(ar|e|ação)|diferença|melhor|pior/i,
      /qual.*melhor|versus|vs|entre/i,
      /vantag(em|ens)|desvantag(em|ens)/i
    ],
    price_inquiry: [
      /preço|valor|cust(a|o)|barato|caro|mais.*barato|mais.*caro/i,
      /quanto.*cust|por.*quanto|faixa.*preço/i,
      /desconto|promoção|oferta/i
    ],
    feature_inquiry: [
      /especificaç(ão|ões)|característica|funcionalidade/i,
      /como.*funciona|o.*que.*faz|para.*que.*serve/i,
      /tem.*função|possui.*recurso/i
    ],
    greeting: [
      /oi|olá|ola|hey|e aí|eai|bom.*dia|boa.*tarde|boa.*noite/i,
      /tudo.*bem|como.*vai|prazer/i
    ],
    help: [
      /ajud(a|ar|e)|socorro|não.*sei|como.*usar/i,
      /explicar|ensinar|tutorial/i
    ]
  };

  private productPatterns = {
    celular: /iphone|galaxy|celular|smartphone|telefone|mobile/i,
    drone: /drone|quadricóptero|quadcopter/i,
    perfume: /perfume|fragrance|colônia|eau.*de/i,
    tv: /tv|televisão|televisao|smart.*tv|led|oled/i,
    roupa: /blusa|camiseta|camisa|roupa|vestido|calça/i,
    eletronicos: /notebook|laptop|computador|pc|tablet|fone/i
  };

  private brandPatterns = {
    apple: /apple|iphone|ipad|macbook|mac/i,
    samsung: /samsung|galaxy/i,
    xiaomi: /xiaomi|redmi|mi/i,
    huawei: /huawei|honor/i,
    lg: /lg/i,
    sony: /sony|playstation|xperia/i
  };

  async analyzeMessage(
    message: string,
    context: VendorSession['context'],
    config: VendorConfig
  ): Promise<MessageAnalysis> {
    const messageLower = message.toLowerCase().trim();
    
    // Detectar intenção
    const intent = this.detectIntent(messageLower);
    
    // Extrair entidades
    const extractedProduct = this.extractProduct(messageLower);
    const extractedCategory = this.extractCategory(messageLower);
    const extractedBrand = this.extractBrand(messageLower);
    const priceRange = this.extractPriceRange(messageLower);
    
    // Gerar query de busca
    const searchQuery = this.generateSearchQuery(
      messageLower,
      extractedProduct,
      extractedCategory,
      extractedBrand,
      context
    );
    
    // Determinar se deve buscar produtos
    const shouldSearch = this.shouldSearchProducts(intent, extractedProduct, extractedCategory);
    
    // Sugerir próximo estágio da conversa
    const suggestedStage = this.suggestConversationStage(intent, context.conversationStage);
    
    // Extrair palavras-chave
    const keywords = this.extractKeywords(messageLower);
    
    return {
      intent,
      confidence: this.calculateConfidence(intent, extractedProduct, extractedCategory),
      extractedProduct,
      extractedCategory,
      extractedBrand,
      priceRange,
      searchQuery,
      shouldSearch,
      suggestedStage,
      keywords
    };
  }

  private detectIntent(message: string): MessageAnalysis['intent'] {
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      if (patterns.some(pattern => pattern.test(message))) {
        return intent as MessageAnalysis['intent'];
      }
    }
    return 'other';
  }

  private extractProduct(message: string): string | undefined {
    // Procurar por produtos específicos mencionados
    const productMentions = [];
    
    if (message.includes('iphone')) productMentions.push('iPhone');
    if (message.includes('galaxy')) productMentions.push('Galaxy');
    if (message.includes('drone')) productMentions.push('drone');
    if (message.includes('perfume')) productMentions.push('perfume');
    if (message.includes('notebook')) productMentions.push('notebook');
    
    return productMentions[0];
  }

  private extractCategory(message: string): string | undefined {
    for (const [category, pattern] of Object.entries(this.productPatterns)) {
      if (pattern.test(message)) {
        return category;
      }
    }
    return undefined;
  }

  private extractBrand(message: string): string | undefined {
    for (const [brand, pattern] of Object.entries(this.brandPatterns)) {
      if (pattern.test(message)) {
        return brand;
      }
    }
    return undefined;
  }

  private extractPriceRange(message: string): { min?: number; max?: number } | undefined {
    const priceMatches = message.match(/(\d+(?:\.\d+)?)/g);
    if (!priceMatches) return undefined;

    const prices = priceMatches.map(p => parseFloat(p)).filter(p => p > 0 && p < 100000);
    
    if (prices.length === 1) {
      if (message.includes('até') || message.includes('máximo') || message.includes('max')) {
        return { max: prices[0] };
      } else if (message.includes('acima') || message.includes('mínimo') || message.includes('min')) {
        return { min: prices[0] };
      }
    } else if (prices.length >= 2) {
      return { min: Math.min(...prices), max: Math.max(...prices) };
    }

    return undefined;
  }

  private generateSearchQuery(
    message: string,
    product?: string,
    category?: string,
    brand?: string,
    context?: VendorSession['context']
  ): string {
    const parts = [];
    
    if (product) parts.push(product);
    if (brand) parts.push(brand);
    if (category && !product) parts.push(category);
    
    // Se não extraiu nada específico, usar contexto anterior
    if (parts.length === 0) {
      if (context?.currentProduct) parts.push(context.currentProduct);
      else if (context?.currentCategory) parts.push(context.currentCategory);
      else {
        // Extrair palavras-chave relevantes da mensagem
        const keywords = message
          .split(' ')
          .filter(word => word.length > 3 && !['para', 'com', 'que', 'uma', 'uns', 'das', 'dos'].includes(word))
          .slice(0, 3);
        parts.push(...keywords);
      }
    }
    
    return parts.join(' ').trim() || message.trim();
  }

  private shouldSearchProducts(
    intent: MessageAnalysis['intent'],
    product?: string,
    category?: string
  ): boolean {
    return (
      intent === 'search' ||
      intent === 'compare' ||
      intent === 'price_inquiry' ||
      intent === 'feature_inquiry' ||
      !!(product || category)
    );
  }

  private suggestConversationStage(
    intent: MessageAnalysis['intent'],
    currentStage: VendorSession['context']['conversationStage']
  ): VendorSession['context']['conversationStage'] {
    switch (intent) {
      case 'greeting':
        return 'greeting';
      case 'search':
        return 'discovery';
      case 'compare':
        return 'comparison';
      case 'price_inquiry':
        return 'recommendation';
      default:
        return currentStage;
    }
  }

  private extractKeywords(message: string): string[] {
    return message
      .split(' ')
      .filter(word => word.length > 3)
      .filter(word => !['para', 'com', 'que', 'uma', 'uns', 'das', 'dos', 'pela', 'pelo'].includes(word))
      .slice(0, 5);
  }

  private calculateConfidence(
    intent: MessageAnalysis['intent'],
    product?: string,
    category?: string
  ): number {
    let confidence = 0.5;
    
    if (intent !== 'other') confidence += 0.2;
    if (product) confidence += 0.2;
    if (category) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  async generateResponse(
    analysis: MessageAnalysis,
    products: Product[],
    context: VendorSession['context'],
    config: VendorConfig
  ): Promise<ResponseGeneration> {
    const { intent, extractedProduct, extractedCategory } = analysis;
    
    switch (intent) {
      case 'greeting':
        return this.generateGreetingResponse(config);
      
      case 'search':
        return this.generateSearchResponse(products, extractedProduct, extractedCategory, config);
      
      case 'compare':
        return this.generateComparisonResponse(products, config);
      
      case 'price_inquiry':
        return this.generatePriceResponse(products, analysis.priceRange, config);
      
      case 'feature_inquiry':
        return this.generateFeatureResponse(products, config);
      
      case 'help':
        return this.generateHelpResponse(config);
      
      default:
        return this.generateDefaultResponse(products, config);
    }
  }

  async generateWelcomeMessage(config: VendorConfig): Promise<string> {
    const welcomeMessages = [
      "E aí! 👋 Bora achar uns produtos maneiros?",
      "Opa! 🛍️ Me fala o que tá procurando que eu te ajudo!",
      "Fala! 😎 Vamos às compras?"
    ];
    return welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
  }

  private generateGreetingResponse(config: VendorConfig): ResponseGeneration {
    const responses = [
      "Oi! 😊 Me conta o que você tá procurando!",
      "E aí! 👋 Bora ver uns produtos?",
      "Fala! 🤙 Que tipo de produto você quer?"
    ];
    return {
      text: responses[Math.floor(Math.random() * responses.length)]
    };
  }

  private generateSearchResponse(
    products: Product[],
    product?: string,
    category?: string,
    config?: VendorConfig
  ): ResponseGeneration {
    if (products.length === 0) {
      return {
        text: `Opa, não achei nada de "${product || category}" 😅 Tenta com outros termos?`
      };
    }

    const count = products.length;
    const minPrice = Math.min(...products.map(p => p.price?.USD || 0));
    const maxPrice = Math.max(...products.map(p => p.price?.USD || 0));

    const responses = [
      `Achei ${count} ${count === 1 ? 'produto' : 'produtos'} massa! 🎯 De $${minPrice.toFixed(2)} até $${maxPrice.toFixed(2)}.`,
      `Olha só, ${count} opções legais aqui! 💰 Preços entre $${minPrice.toFixed(2)} e $${maxPrice.toFixed(2)}.`,
      `Bora! ${count} produtos pra você 🚀 Faixa de $${minPrice.toFixed(2)} a $${maxPrice.toFixed(2)}.`
    ];

    return {
      text: responses[Math.floor(Math.random() * responses.length)]
    };
  }

  private generateComparisonResponse(products: Product[], config: VendorConfig): ResponseGeneration {
    if (products.length < 2) {
      return {
        text: "Preciso de pelo menos 2 produtos pra comparar! 🤔 Busca mais opções?"
      };
    }

    const sorted = [...products].sort((a, b) => (a.price?.USD || 0) - (b.price?.USD || 0));
    const cheapest = sorted[0];
    const expensive = sorted[sorted.length - 1];

    return {
      text: `O mais barato é "${cheapest.title}" ($${cheapest.price?.USD?.toFixed(2)}) e o mais caro "${expensive.title}" ($${expensive.price?.USD?.toFixed(2)}). Cada um tem suas vantagens! 💡`
    };
  }

  private generatePriceResponse(
    products: Product[],
    priceRange?: { min?: number; max?: number },
    config?: VendorConfig
  ): ResponseGeneration {
    if (products.length === 0) {
      return {
        text: "Não achei nada nessa faixa de preço 💸 Ajusta o orçamento?"
      };
    }

    const sorted = [...products].sort((a, b) => (a.price?.USD || 0) - (b.price?.USD || 0));
    const cheapest = sorted[0];
    const discounted = products.filter(p => p.discount && p.discount > 0);

    let text = `O mais barato é "${cheapest.title}" por $${cheapest.price?.USD?.toFixed(2)}! 💰`;
    if (discounted.length > 0) {
      text += ` E tem ${discounted.length} com desconto! 🏷️`;
    }

    return { text };
  }

  private generateFeatureResponse(products: Product[], config: VendorConfig): ResponseGeneration {
    if (products.length === 0) {
      return {
        text: "Me fala qual produto te interessa que eu explico! 🤔"
      };
    }

    const product = products[0];
    let text = `"${product.title}"`;
    
    if (product.rating) {
      text += ` tem ${product.rating.toFixed(1)}⭐`;
    }
    
    if (product.brand) {
      text += ` da ${product.brand}`;
    }
    
    text += `. Quer saber mais? 🔍`;

    return { text };
  }

  private generateHelpResponse(config: VendorConfig): ResponseGeneration {
    return {
      text: "Posso te ajudar a achar produtos, comparar preços e mais! 🤝 Me fala o que você precisa!"
    };
  }

  private generateDefaultResponse(products: Product[], config: VendorConfig): ResponseGeneration {
    if (products.length > 0) {
      return {
        text: "Olha essas opções! 🎯 Quer saber mais de alguma?"
      };
    }

    return {
      text: "Me conta mais sobre o que você tá procurando! 🤔"
    };
  }
}
