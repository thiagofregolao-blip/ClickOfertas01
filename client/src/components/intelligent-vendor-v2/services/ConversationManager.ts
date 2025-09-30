
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
    const welcomeMessages = {
      friendly: [
        "Oi! 😊 Sou seu assistente pessoal de compras! Em que posso te ajudar hoje?",
        "Olá! 👋 Estou aqui para te ajudar a encontrar os melhores produtos. O que você está procurando?",
        "E aí! 🛍️ Pronto para encontrar ofertas incríveis? Me conta o que você precisa!"
      ],
      professional: [
        "Bem-vindo ao nosso assistente de compras inteligente. Como posso auxiliá-lo hoje?",
        "Olá. Estou aqui para ajudá-lo a encontrar os produtos ideais para suas necessidades.",
        "Bom dia. Sou seu consultor de produtos. Em que posso ser útil?"
      ],
      casual: [
        "Fala aí! 🤙 Bora achar uns produtos maneiros?",
        "E aí, beleza? 😎 Que tal encontrarmos algo legal pra você?",
        "Opa! 🚀 Vamos às compras? Me fala o que tá precisando!"
      ],
      expert: [
        "Olá! Sou especialista em recomendações de produtos. Vamos encontrar exatamente o que você precisa.",
        "Bem-vindo! Com minha expertise, vou te ajudar a fazer a melhor escolha. Qual produto te interessa?",
        "Olá! Baseado em análises detalhadas, posso te recomendar os melhores produtos. O que você busca?"
      ]
    };

    const messages = welcomeMessages[config.personality] || welcomeMessages.friendly;
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private generateGreetingResponse(config: VendorConfig): ResponseGeneration {
    const responses = {
      friendly: [
        "Oi! 😊 Que bom te ver por aqui! Em que posso te ajudar hoje?",
        "Olá! 👋 Estou super animado para te ajudar a encontrar produtos incríveis!",
        "E aí! 🌟 Pronto para descobrir ofertas fantásticas?"
      ],
      professional: [
        "Olá. Como posso auxiliá-lo em sua busca por produtos hoje?",
        "Bem-vindo. Estou à disposição para ajudá-lo com suas necessidades de compra.",
        "Bom dia. Em que posso ser útil em sua experiência de compras?"
      ],
      casual: [
        "Fala! 🤙 Bora ver uns produtos maneiros?",
        "E aí! 😄 Que tal acharmos algo legal pra você?",
        "Opa! 🎉 Vamos às compras?"
      ],
      expert: [
        "Olá! Estou aqui para oferecer recomendações especializadas. Qual categoria te interessa?",
        "Bem-vindo! Com análise detalhada, posso te guiar à melhor escolha. O que você procura?",
        "Olá! Baseado em dados e tendências, vou te ajudar a encontrar o produto ideal."
      ]
    };

    const messages = responses[config.personality] || responses.friendly;
    const text = messages[Math.floor(Math.random() * messages.length)];

    return {
      text,
      followUpQuestions: [
        "Que tipo de produto você está procurando?",
        "Tem alguma categoria específica em mente?",
        "Qual é seu orçamento aproximado?"
      ]
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
        text: `Hmm, não encontrei resultados para "${product || category}". Que tal tentar com termos diferentes? Posso te ajudar com outras opções! 🔍`,
        followUpQuestions: [
          "Quer tentar uma busca mais ampla?",
          "Tem alguma marca preferida?",
          "Qual sua faixa de preço?"
        ]
      };
    }

    const productCount = products.length;
    const avgPrice = products.reduce((sum, p) => sum + (p.price?.USD || 0), 0) / productCount;
    const minPrice = Math.min(...products.map(p => p.price?.USD || 0));
    const maxPrice = Math.max(...products.map(p => p.price?.USD || 0));

    let text = `Encontrei ${productCount} ${productCount === 1 ? 'produto' : 'produtos'} `;
    
    if (product) {
      text += `relacionado${productCount === 1 ? '' : 's'} a "${product}"! `;
    } else if (category) {
      text += `na categoria "${category}"! `;
    } else {
      text += `para você! `;
    }

    text += `Os preços variam de $${minPrice.toFixed(2)} a $${maxPrice.toFixed(2)}. `;
    
    if (productCount > 3) {
      text += `Selecionei os melhores para você! 🌟`;
    } else {
      text += `Vamos ver as opções! 👀`;
    }

    return {
      text,
      followUpQuestions: [
        "Quer ver mais detalhes de algum produto?",
        "Tem preferência por alguma marca?",
        "Quer comparar alguns produtos?"
      ]
    };
  }

  private generateComparisonResponse(products: Product[], config: VendorConfig): ResponseGeneration {
    if (products.length < 2) {
      return {
        text: "Para fazer uma comparação, preciso de pelo menos 2 produtos. Que tal buscar mais opções primeiro? 🔍",
        followUpQuestions: [
          "Quer buscar produtos similares?",
          "Tem alguma categoria específica?",
          "Qual característica é mais importante?"
        ]
      };
    }

    const sortedByPrice = [...products].sort((a, b) => (a.price?.USD || 0) - (b.price?.USD || 0));
    const cheapest = sortedByPrice[0];
    const mostExpensive = sortedByPrice[sortedByPrice.length - 1];

    let text = `Vou te ajudar a comparar! 📊 `;
    text += `Entre as opções, o mais barato é "${cheapest.title}" por $${cheapest.price?.USD?.toFixed(2)}, `;
    text += `e o mais caro é "${mostExpensive.title}" por $${mostExpensive.price?.USD?.toFixed(2)}. `;
    text += `Cada um tem suas vantagens! Quer que eu detalhe as diferenças? 🤔`;

    return {
      text,
      followUpQuestions: [
        "Quer saber as principais diferenças?",
        "Qual característica é mais importante?",
        "Prefere focar no custo-benefício?"
      ]
    };
  }

  private generatePriceResponse(
    products: Product[],
    priceRange?: { min?: number; max?: number },
    config?: VendorConfig
  ): ResponseGeneration {
    if (products.length === 0) {
      let text = "Não encontrei produtos ";
      if (priceRange?.min && priceRange?.max) {
        text += `entre $${priceRange.min} e $${priceRange.max}. `;
      } else if (priceRange?.max) {
        text += `até $${priceRange.max}. `;
      } else if (priceRange?.min) {
        text += `acima de $${priceRange.min}. `;
      } else {
        text += "nessa faixa de preço. ";
      }
      text += "Que tal ajustar o orçamento ou ver outras opções? 💰";

      return {
        text,
        followUpQuestions: [
          "Quer aumentar o orçamento?",
          "Tem flexibilidade no preço?",
          "Quer ver produtos similares?"
        ]
      };
    }

    const sortedByPrice = [...products].sort((a, b) => (a.price?.USD || 0) - (b.price?.USD || 0));
    const cheapest = sortedByPrice[0];
    const avgPrice = products.reduce((sum, p) => sum + (p.price?.USD || 0), 0) / products.length;

    let text = `Sobre preços: o mais barato que encontrei é "${cheapest.title}" por $${cheapest.price?.USD?.toFixed(2)}! 💸 `;
    text += `O preço médio dos produtos é $${avgPrice.toFixed(2)}. `;
    
    const discountedProducts = products.filter(p => p.discount && p.discount > 0);
    if (discountedProducts.length > 0) {
      text += `E olha só: ${discountedProducts.length} produto${discountedProducts.length === 1 ? '' : 's'} com desconto! 🏷️`;
    }

    return {
      text,
      followUpQuestions: [
        "Quer ver só os mais baratos?",
        "Tem interesse nos com desconto?",
        "Quer comparar custo-benefício?"
      ]
    };
  }

  private generateFeatureResponse(products: Product[], config: VendorConfig): ResponseGeneration {
    if (products.length === 0) {
      return {
        text: "Para falar sobre características, preciso saber qual produto te interessa! Me conta mais detalhes? 🤔",
        followUpQuestions: [
          "Qual produto específico?",
          "Que característica é importante?",
          "Tem alguma função em mente?"
        ]
      };
    }

    const product = products[0];
    let text = `Sobre "${product.title}": `;
    
    if (product.features && product.features.length > 0) {
      text += `As principais características são: ${product.features.slice(0, 3).join(', ')}. `;
    }
    
    if (product.rating) {
      text += `Tem avaliação de ${product.rating.toFixed(1)} estrelas ⭐ `;
    }
    
    if (product.brand) {
      text += `da marca ${product.brand}. `;
    }
    
    text += `Quer saber mais alguma coisa específica? 🔍`;

    return {
      text,
      followUpQuestions: [
        "Quer ver produtos similares?",
        "Tem dúvida sobre alguma função?",
        "Quer comparar com outros?"
      ]
    };
  }

  private generateHelpResponse(config: VendorConfig): ResponseGeneration {
    return {
      text: `Claro, estou aqui para ajudar! 🤝 Posso te ajudar a encontrar produtos, comparar preços, explicar características e muito mais. É só me falar o que você precisa!`,
      followUpQuestions: [
        "Que tipo de produto você procura?",
        "Quer dicas de como buscar?",
        "Tem alguma dúvida específica?"
      ]
    };
  }

  private generateDefaultResponse(products: Product[], config: VendorConfig): ResponseGeneration {
    if (products.length > 0) {
      return {
        text: `Encontrei algumas opções interessantes para você! 🎯 Dá uma olhada nos produtos abaixo. Posso te ajudar com mais detalhes sobre qualquer um deles!`,
        followUpQuestions: [
          "Quer saber mais sobre algum produto?",
          "Tem preferência por marca?",
          "Quer comparar alguns?"
        ]
      };
    }

    return {
      text: `Entendi! 🤔 Me conta um pouco mais sobre o que você está procurando? Assim posso te ajudar melhor!`,
      followUpQuestions: [
        "Que tipo de produto você precisa?",
        "Tem alguma categoria em mente?",
        "Qual seu orçamento aproximado?"
      ]
    };
  }
}
