import { db } from "../db";
import {
  products,
  stores,
  savedProducts,
  productLikes,
  storyViews,
  algorithmSuggestions,
  scratchSystemConfig,
  type Product,
  type Store,
  type AlgorithmSuggestion,
  type ScratchSystemConfig,
} from "@shared/schema";
import { desc, sql, and, eq, gte } from "drizzle-orm";

interface ProductAnalysis {
  product: Product & { store: Store };
  popularityScore: number;
  priceScore: number;
  marginScore: number;
  noveltyScore: number;
  categoryScore: number;
  totalScore: number;
}

interface AlgorithmWeights {
  popularity: number;
  price: number;
  margin: number;
  novelty: number;
  category: number;
}

interface SuggestionConfig {
  minScore: number;
  maxSuggestions: number;
  prizeTypes: {
    product: { threshold: number };
    discount_20: { threshold: number };
    discount_30: { threshold: number };
    discount_50: { threshold: number };
    discount_70: { threshold: number };
  };
}

export class IntelligentScratchAlgorithm {
  
  /**
   * Gera sugestões inteligentes de produtos para prêmios
   */
  async generateProductSuggestions(): Promise<AlgorithmSuggestion[]> {
    console.log("🤖 Iniciando algoritmo inteligente de seleção...");
    
    try {
      // 1. Buscar configuração do sistema
      const config = await this.getSystemConfig();
      const weights = this.extractWeights(config);
      
      // 2. Buscar todos os produtos ativos das lojas parceiras
      const productsWithStores = await this.getActiveProducts();
      
      if (productsWithStores.length === 0) {
        console.log("⚠️  Nenhum produto ativo encontrado");
        return [];
      }
      
      console.log(`📦 Analisando ${productsWithStores.length} produtos...`);
      
      // 3. Analisar cada produto
      const analyses: ProductAnalysis[] = [];
      
      for (const productData of productsWithStores) {
        const analysis = await this.analyzeProduct(productData, weights);
        analyses.push(analysis);
      }
      
      // 4. Ordenar por score total
      analyses.sort((a, b) => b.totalScore - a.totalScore);
      
      // 5. Selecionar os melhores candidatos
      const suggestionConfig: SuggestionConfig = {
        minScore: 6.0,
        maxSuggestions: 10,
        prizeTypes: {
          product: { threshold: 8.5 }, // Produtos excelentes = prêmio total
          discount_70: { threshold: 8.0 }, // Score alto = desconto grande
          discount_50: { threshold: 7.0 },
          discount_30: { threshold: 6.5 },
          discount_20: { threshold: 6.0 }, // Score mínimo = desconto menor
        }
      };
      
      const topProducts = analyses
        .filter(analysis => analysis.totalScore >= suggestionConfig.minScore)
        .slice(0, suggestionConfig.maxSuggestions);
      
      console.log(`🎯 Selecionados ${topProducts.length} produtos para sugestão`);
      
      // 6. Gerar sugestões com recomendações
      const suggestions: AlgorithmSuggestion[] = [];
      
      for (const analysis of topProducts) {
        const suggestion = await this.createSuggestion(analysis, suggestionConfig);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
      
      console.log(`✨ ${suggestions.length} sugestões geradas com sucesso!`);
      
      return suggestions;
      
    } catch (error) {
      console.error("❌ Erro no algoritmo inteligente:", error);
      throw error;
    }
  }
  
  /**
   * Busca produtos ativos de todas as lojas
   */
  private async getActiveProducts() {
    return await db
      .select()
      .from(products)
      .innerJoin(stores, eq(products.storeId, stores.id))
      .where(
        and(
          eq(products.isActive, true),
          eq(stores.isActive, true)
        )
      )
      .orderBy(desc(products.createdAt));
  }
  
  /**
   * Analisa um produto individual com base nos critérios
   */
  private async analyzeProduct(
    productData: any, 
    weights: AlgorithmWeights
  ): Promise<ProductAnalysis> {
    
    const product = productData.products as Product;
    const store = productData.stores as Store;
    
    // Calcular cada score individual
    const popularityScore = await this.calculatePopularityScore(product);
    const priceScore = this.calculatePriceScore(product);
    const marginScore = this.calculateMarginScore(product, store);
    const noveltyScore = this.calculateNoveltyScore(product);
    const categoryScore = this.calculateCategoryScore(product);
    
    // Score final ponderado
    const totalScore = 
      (popularityScore * weights.popularity) +
      (priceScore * weights.price) +
      (marginScore * weights.margin) +
      (noveltyScore * weights.novelty) +
      (categoryScore * weights.category);
    
    return {
      product: { ...product, store },
      popularityScore: Math.round(popularityScore * 100) / 100,
      priceScore: Math.round(priceScore * 100) / 100,
      marginScore: Math.round(marginScore * 100) / 100,
      noveltyScore: Math.round(noveltyScore * 100) / 100,
      categoryScore: Math.round(categoryScore * 100) / 100,
      totalScore: Math.round(totalScore * 100) / 100,
    };
  }
  
  /**
   * Calcula score de popularidade baseado em likes e saves
   */
  private async calculatePopularityScore(product: Product): Promise<number> {
    try {
      // Contar likes
      const likesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(productLikes)
        .where(eq(productLikes.productId, product.id));
        
      // Contar saves
      const savesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(savedProducts)
        .where(eq(savedProducts.productId, product.id));
        
      // Contar views (via stories)
      const viewsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(storyViews)
        .where(eq(storyViews.productId, product.id));
      
      const likes = Number(likesResult[0]?.count || 0);
      const saves = Number(savesResult[0]?.count || 0);
      const views = Number(viewsResult[0]?.count || 0);
      
      // Fórmula: likes*3 + saves*2 + views*1, normalizado para 0-10
      const rawScore = (likes * 3) + (saves * 2) + (views * 1);
      
      // Normalizar para escala 0-10 (assumindo max de 100 interações)
      return Math.min(10, rawScore / 10);
      
    } catch (error) {
      console.error("Erro ao calcular popularidade:", error);
      return 5.0; // Score neutro em caso de erro
    }
  }
  
  /**
   * Calcula score de preço (produtos com preço ideal ganham mais pontos)
   */
  private calculatePriceScore(product: Product): number {
    const price = parseFloat(product.price.toString());
    
    // Faixas de preço ideais para prêmios
    if (price >= 20 && price <= 100) return 10; // Faixa perfeita
    if (price >= 10 && price <= 200) return 8;  // Faixa boa
    if (price >= 5 && price <= 300) return 6;   // Faixa ok
    if (price >= 1 && price <= 500) return 4;   // Faixa baixa
    return 2; // Muito caro ou muito barato
  }
  
  /**
   * Calcula score de margem (estimativa baseada em categoria)
   */
  private calculateMarginScore(product: Product, store: Store): number {
    const category = product.category?.toLowerCase() || "";
    
    // Estimativas de margem por categoria (score mais alto = margem melhor)
    const marginEstimates: Record<string, number> = {
      "perfumaria": 8.5,
      "cosméticos": 8.0,
      "moda": 7.5,
      "acessórios": 7.0,
      "eletrônicos": 5.0,
      "casa": 6.5,
      "alimentação": 4.0,
    };
    
    // Buscar categoria correspondente
    for (const [cat, score] of Object.entries(marginEstimates)) {
      if (category.includes(cat)) {
        return score;
      }
    }
    
    return 6.0; // Score neutro para categorias desconhecidas
  }
  
  /**
   * Calcula score de novidade (produtos mais recentes ganham mais pontos)
   */
  private calculateNoveltyScore(product: Product): number {
    const now = new Date();
    const createdAt = new Date(product.createdAt!);
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreation <= 7) return 10;   // Menos de 1 semana
    if (daysSinceCreation <= 30) return 8;   // Menos de 1 mês
    if (daysSinceCreation <= 90) return 6;   // Menos de 3 meses
    if (daysSinceCreation <= 180) return 4;  // Menos de 6 meses
    return 2; // Mais antigo
  }
  
  /**
   * Calcula score de categoria (algumas categorias são mais atrativas)
   */
  private calculateCategoryScore(product: Product): number {
    const category = product.category?.toLowerCase() || "";
    
    // Categorias mais atrativas para prêmios
    const categoryScores: Record<string, number> = {
      "perfumaria": 9.0,
      "cosméticos": 8.5,
      "moda": 8.0,
      "acessórios": 7.5,
      "eletrônicos": 9.5, // Muito desejável
      "casa": 6.0,
      "alimentação": 5.0,
    };
    
    for (const [cat, score] of Object.entries(categoryScores)) {
      if (category.includes(cat)) {
        return score;
      }
    }
    
    return 6.0; // Score neutro
  }
  
  /**
   * Cria uma sugestão baseada na análise
   */
  private async createSuggestion(
    analysis: ProductAnalysis,
    config: SuggestionConfig
  ): Promise<AlgorithmSuggestion | null> {
    
    // Determinar tipo de prêmio baseado no score
    const { suggestedPrizeType, discountPercentage } = this.determinePrizeType(
      analysis.totalScore, 
      config
    );
    
    // Calcular custo estimado
    const estimatedCost = this.calculateEstimatedCost(
      analysis.product,
      suggestedPrizeType,
      discountPercentage
    );
    
    try {
      // Salvar no banco
      const [suggestion] = await db.insert(algorithmSuggestions).values({
        suggestedProductId: analysis.product.id,
        algorithmScore: analysis.totalScore.toString(),
        popularityScore: analysis.popularityScore.toString(),
        priceScore: analysis.priceScore.toString(),
        marginScore: analysis.marginScore.toString(),
        noveltyScore: analysis.noveltyScore.toString(),
        categoryScore: analysis.categoryScore.toString(),
        suggestedPrizeType,
        suggestedDiscountPercentage: discountPercentage?.toString(),
        estimatedCost: estimatedCost.toString(),
        status: "pending",
      }).returning();
      
      return suggestion;
      
    } catch (error) {
      console.error("Erro ao salvar sugestão:", error);
      return null;
    }
  }
  
  /**
   * Determina o tipo de prêmio baseado no score
   */
  private determinePrizeType(score: number, config: SuggestionConfig) {
    if (score >= config.prizeTypes.product.threshold) {
      return { suggestedPrizeType: "product", discountPercentage: null };
    }
    if (score >= config.prizeTypes.discount_70.threshold) {
      return { suggestedPrizeType: "discount_70", discountPercentage: 70 };
    }
    if (score >= config.prizeTypes.discount_50.threshold) {
      return { suggestedPrizeType: "discount_50", discountPercentage: 50 };
    }
    if (score >= config.prizeTypes.discount_30.threshold) {
      return { suggestedPrizeType: "discount_30", discountPercentage: 30 };
    }
    return { suggestedPrizeType: "discount_20", discountPercentage: 20 };
  }
  
  /**
   * Calcula o custo estimado do prêmio
   */
  private calculateEstimatedCost(
    product: Product,
    prizeType: string,
    discountPercentage: number | null
  ): number {
    const productPrice = parseFloat(product.price.toString());
    
    if (prizeType === "product") {
      return productPrice; // Custo total do produto
    }
    
    if (discountPercentage) {
      return productPrice * (discountPercentage / 100); // Custo do desconto
    }
    
    return 0;
  }
  
  /**
   * Busca configuração do sistema ou usa padrões
   */
  private async getSystemConfig(): Promise<ScratchSystemConfig> {
    try {
      const [config] = await db
        .select()
        .from(scratchSystemConfig)
        .where(eq(scratchSystemConfig.isActive, true))
        .limit(1);
        
      if (config) {
        return config;
      }
      
      // Criar configuração padrão se não existir
      const [newConfig] = await db.insert(scratchSystemConfig).values({
        algorithmType: "weighted_random",
        guaranteedWinEvery: "1000",
        enableAutoProductSuggestion: true,
        suggestionRefreshHours: "24",
      }).returning();
      
      return newConfig;
      
    } catch (error) {
      console.error("Erro ao buscar config:", error);
      // Retornar config padrão em caso de erro
      return {
        id: "default",
        algorithmType: "weighted_random",
        guaranteedWinEvery: "1000",
        currentAttemptCount: "0",
        enableAutoProductSuggestion: true,
        suggestionRefreshHours: "24",
        popularityWeight: "0.30",
        priceWeight: "0.20",
        marginWeight: "0.20",
        noveltynWeight: "0.15",
        categoryWeight: "0.15",
        minPrizeValue: "10.00",
        maxPrizeValue: "500.00",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ScratchSystemConfig;
    }
  }
  
  /**
   * Extrai os pesos da configuração
   */
  private extractWeights(config: ScratchSystemConfig): AlgorithmWeights {
    return {
      popularity: parseFloat(config.popularityWeight?.toString() || "0.30"),
      price: parseFloat(config.priceWeight?.toString() || "0.20"),
      margin: parseFloat(config.marginWeight?.toString() || "0.20"),
      novelty: parseFloat(config.noveltynWeight?.toString() || "0.15"),
      category: parseFloat(config.categoryWeight?.toString() || "0.15"),
    };
  }
  
  /**
   * Limpa sugestões antigas (executar periodicamente)
   */
  async cleanOldSuggestions(olderThanDays: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    try {
      const result = await db
        .delete(algorithmSuggestions)
        .where(
          and(
            eq(algorithmSuggestions.status, "rejected"),
            gte(algorithmSuggestions.generatedAt, cutoffDate)
          )
        );
        
      console.log(`🧹 Limpeza concluída: sugestões antigas removidas`);
      
    } catch (error) {
      console.error("Erro na limpeza de sugestões:", error);
    }
  }
}

// Instância singleton
export const intelligentScratchAlgorithm = new IntelligentScratchAlgorithm();