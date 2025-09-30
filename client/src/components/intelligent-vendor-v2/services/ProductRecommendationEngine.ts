
import { Product, VendorSession } from '../types';
import { MessageAnalysis } from './ConversationManager';

export class ProductRecommendationEngine {
  async rankProducts(
    products: Product[],
    context: VendorSession['context'],
    analysis: MessageAnalysis
  ): Promise<Product[]> {
    if (products.length === 0) return products;

    // Calcular score para cada produto
    const scoredProducts = products.map(product => ({
      ...product,
      _score: this.calculateProductScore(product, context, analysis)
    }));

    // Ordenar por score (maior primeiro)
    scoredProducts.sort((a, b) => b._score - a._score);

    // Remover o score temporário e retornar
    return scoredProducts.map(({ _score, ...product }) => product);
  }

  private calculateProductScore(
    product: Product,
    context: VendorSession['context'],
    analysis: MessageAnalysis
  ): number {
    let score = 0;

    // Score base por rating
    if (product.rating) {
      score += product.rating * 10; // 0-50 pontos
    }

    // Score por disponibilidade
    if (product.availability === 'in_stock') {
      score += 20;
    } else if (product.availability === 'limited') {
      score += 10;
    }

    // Score por desconto
    if (product.discount && product.discount > 0) {
      score += product.discount * 0.5; // Até 15 pontos para 30% desconto
    }

    // Score por relevância de categoria
    if (analysis.extractedCategory && product.category === analysis.extractedCategory) {
      score += 30;
    }

    // Score por relevância de marca
    if (analysis.extractedBrand && product.brand?.toLowerCase().includes(analysis.extractedBrand.toLowerCase())) {
      score += 25;
    }

    // Score por faixa de preço
    if (analysis.priceRange) {
      const productPrice = product.price?.USD || 0;
      if (analysis.priceRange.min && analysis.priceRange.max) {
        if (productPrice >= analysis.priceRange.min && productPrice <= analysis.priceRange.max) {
          score += 40;
        }
      } else if (analysis.priceRange.max && productPrice <= analysis.priceRange.max) {
        score += 30;
      } else if (analysis.priceRange.min && productPrice >= analysis.priceRange.min) {
        score += 20;
      }
    }

    // Score por contexto de conversa
    if (context.currentProduct && product.title.toLowerCase().includes(context.currentProduct.toLowerCase())) {
      score += 35;
    }

    // Score por preferências do usuário
    if (context.preferences?.brands && context.preferences.brands.includes(product.brand || '')) {
      score += 25;
    }

    if (context.preferences?.maxPrice && product.price?.USD && product.price.USD <= context.preferences.maxPrice) {
      score += 15;
    }

    // Score por palavras-chave
    const titleLower = product.title.toLowerCase();
    analysis.keywords.forEach(keyword => {
      if (titleLower.includes(keyword.toLowerCase())) {
        score += 10;
      }
    });

    // Penalizar produtos muito caros se não foi especificado
    if (!analysis.priceRange && product.price?.USD && product.price.USD > 1000) {
      score -= 10;
    }

    // Bonus para produtos com muitas avaliações
    if (product.reviews && product.reviews > 100) {
      score += Math.min(product.reviews / 100, 10); // Até 10 pontos extras
    }

    return Math.max(score, 0);
  }

  async getSimilarProducts(
    baseProduct: Product,
    allProducts: Product[],
    limit: number = 6
  ): Promise<Product[]> {
    const similar = allProducts
      .filter(p => p.id !== baseProduct.id)
      .map(product => ({
        ...product,
        _similarity: this.calculateSimilarity(baseProduct, product)
      }))
      .sort((a, b) => b._similarity - a._similarity)
      .slice(0, limit);

    return similar.map(({ _similarity, ...product }) => product);
  }

  private calculateSimilarity(product1: Product, product2: Product): number {
    let similarity = 0;

    // Similaridade por categoria
    if (product1.category === product2.category) {
      similarity += 40;
    }

    // Similaridade por marca
    if (product1.brand === product2.brand) {
      similarity += 30;
    }

    // Similaridade por faixa de preço
    const price1 = product1.price?.USD || 0;
    const price2 = product2.price?.USD || 0;
    const priceDiff = Math.abs(price1 - price2);
    const avgPrice = (price1 + price2) / 2;
    
    if (avgPrice > 0) {
      const priceSimRatio = 1 - (priceDiff / avgPrice);
      similarity += priceSimRatio * 20;
    }

    // Similaridade por rating
    if (product1.rating && product2.rating) {
      const ratingDiff = Math.abs(product1.rating - product2.rating);
      similarity += (5 - ratingDiff) * 2; // Até 10 pontos
    }

    // Similaridade por palavras no título
    const words1 = product1.title.toLowerCase().split(' ');
    const words2 = product2.title.toLowerCase().split(' ');
    const commonWords = words1.filter(word => 
      word.length > 3 && words2.includes(word)
    );
    similarity += commonWords.length * 5;

    return Math.max(similarity, 0);
  }

  async getRecommendationsForUser(
    context: VendorSession['context'],
    allProducts: Product[],
    limit: number = 6
  ): Promise<Product[]> {
    // Recomendar baseado no histórico e preferências
    const scored = allProducts.map(product => ({
      ...product,
      _score: this.calculateUserRecommendationScore(product, context)
    }));

    scored.sort((a, b) => b._score - a._score);

    return scored.slice(0, limit).map(({ _score, ...product }) => product);
  }

  private calculateUserRecommendationScore(
    product: Product,
    context: VendorSession['context']
  ): number {
    let score = 0;

    // Score base por qualidade do produto
    if (product.rating) {
      score += product.rating * 8;
    }

    if (product.reviews && product.reviews > 50) {
      score += Math.min(product.reviews / 50, 15);
    }

    // Score por categoria de interesse
    if (context.currentCategory && product.category === context.currentCategory) {
      score += 25;
    }

    // Score por preferências
    if (context.preferences?.brands?.includes(product.brand || '')) {
      score += 20;
    }

    if (context.preferences?.maxPrice && product.price?.USD && product.price.USD <= context.preferences.maxPrice) {
      score += 15;
    }

    // Score por disponibilidade
    if (product.availability === 'in_stock') {
      score += 10;
    }

    // Score por desconto
    if (product.discount && product.discount > 0) {
      score += product.discount * 0.3;
    }

    // Penalizar produtos muito caros sem contexto
    if (!context.priceRange && product.price?.USD && product.price.USD > 500) {
      score -= 5;
    }

    return Math.max(score, 0);
  }

  async getTrendingProducts(
    allProducts: Product[],
    category?: string,
    limit: number = 6
  ): Promise<Product[]> {
    let filtered = allProducts;

    if (category) {
      filtered = allProducts.filter(p => p.category === category);
    }

    // Simular trending baseado em rating, reviews e desconto
    const trending = filtered
      .map(product => ({
        ...product,
        _trendScore: this.calculateTrendScore(product)
      }))
      .sort((a, b) => b._trendScore - a._trendScore)
      .slice(0, limit);

    return trending.map(({ _trendScore, ...product }) => product);
  }

  private calculateTrendScore(product: Product): number {
    let score = 0;

    // Score por rating alto
    if (product.rating && product.rating >= 4) {
      score += (product.rating - 3) * 20; // 0-40 pontos
    }

    // Score por muitas reviews (indica popularidade)
    if (product.reviews) {
      score += Math.min(product.reviews / 10, 30); // Até 30 pontos
    }

    // Score por desconto (indica promoção ativa)
    if (product.discount && product.discount > 0) {
      score += product.discount; // Até 30 pontos para 30% desconto
    }

    // Score por disponibilidade
    if (product.availability === 'in_stock') {
      score += 15;
    } else if (product.availability === 'limited') {
      score += 25; // Produtos limitados podem ser mais desejados
    }

    // Bonus para produtos com preço atrativo
    const price = product.price?.USD || 0;
    if (price > 0 && price < 200) {
      score += 10; // Produtos acessíveis
    }

    return score;
  }

  async getBestDeals(
    allProducts: Product[],
    limit: number = 6
  ): Promise<Product[]> {
    const deals = allProducts
      .filter(p => p.discount && p.discount > 0)
      .map(product => ({
        ...product,
        _dealScore: this.calculateDealScore(product)
      }))
      .sort((a, b) => b._dealScore - a._dealScore)
      .slice(0, limit);

    return deals.map(({ _dealScore, ...product }) => product);
  }

  private calculateDealScore(product: Product): number {
    let score = 0;

    // Score principal por desconto
    if (product.discount) {
      score += product.discount * 2; // Até 60 pontos para 30% desconto
    }

    // Score por qualidade do produto
    if (product.rating && product.rating >= 4) {
      score += (product.rating - 3) * 15;
    }

    // Score por valor absoluto economizado
    if (product.originalPrice && product.price?.USD) {
      const saved = product.originalPrice - product.price.USD;
      score += Math.min(saved / 10, 20); // Até 20 pontos
    }

    // Score por disponibilidade
    if (product.availability === 'in_stock') {
      score += 10;
    }

    return score;
  }
}
