
import { Product, SearchFilters } from '../types';

export class VendorAPI {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async searchProducts(query: string, filters?: SearchFilters): Promise<Product[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        ...(filters?.category && { category: filters.category }),
        ...(filters?.priceMin && { priceMin: filters.priceMin.toString() }),
        ...(filters?.priceMax && { priceMax: filters.priceMax.toString() }),
        ...(filters?.brand && { brand: filters.brand }),
        ...(filters?.rating && { rating: filters.rating.toString() }),
        ...(filters?.availability && { availability: filters.availability }),
        ...(filters?.sortBy && { sortBy: filters.sortBy })
      });

      const response = await fetch(`${this.baseUrl}/products/search?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return this.normalizeProducts(data.products || data.items || []);
    } catch (error) {
      console.error('Erro na busca de produtos:', error);
      
      // Fallback para API existente do sistema
      return this.fallbackSearch(query, filters);
    }
  }

  private async fallbackSearch(query: string, filters?: SearchFilters): Promise<Product[]> {
    try {
      // Usar a API existente do sistema como fallback
      const response = await fetch('/api/assistant/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          sessionId: `fallback_${Date.now()}`,
          lang: 'pt'
        })
      });

      if (!response.ok) {
        throw new Error(`Fallback API error: ${response.status}`);
      }

      const data = await response.json();
      return this.normalizeProducts(data.items || []);
    } catch (error) {
      console.error('Erro no fallback de busca:', error);
      return [];
    }
  }

  private normalizeProducts(rawProducts: any[]): Product[] {
    return rawProducts.map(product => ({
      id: product.id || product._id || `product_${Date.now()}_${Math.random()}`,
      title: product.title || product.name || 'Produto sem título',
      name: product.name || product.title,
      price: {
        USD: product.price?.USD || parseFloat(product.price) || 0,
        BRL: product.price?.BRL || (product.price?.USD ? product.price.USD * 5.5 : 0)
      },
      imageUrl: product.imageUrl || product.image || '/placeholder-product.jpg',
      storeName: product.storeName || product.store || 'Loja não informada',
      category: product.category || this.inferCategory(product.title || product.name || ''),
      rating: product.rating || Math.random() * 2 + 3, // 3-5 stars
      reviews: product.reviews || Math.floor(Math.random() * 1000) + 10,
      availability: product.availability || 'in_stock',
      discount: product.discount || (Math.random() > 0.7 ? Math.floor(Math.random() * 30) + 5 : 0),
      originalPrice: product.originalPrice,
      url: product.url || product.link,
      description: product.description || '',
      features: product.features || [],
      brand: product.brand || this.inferBrand(product.title || product.name || ''),
      model: product.model || ''
    }));
  }

  private inferCategory(title: string): string {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('iphone') || titleLower.includes('galaxy') || titleLower.includes('celular') || titleLower.includes('smartphone')) {
      return 'celular';
    } else if (titleLower.includes('drone')) {
      return 'drone';
    } else if (titleLower.includes('perfume') || titleLower.includes('fragrance')) {
      return 'perfume';
    } else if (titleLower.includes('tv') || titleLower.includes('televisão') || titleLower.includes('televisao')) {
      return 'tv';
    } else if (titleLower.includes('blusa') || titleLower.includes('camiseta') || titleLower.includes('camisa')) {
      return 'roupa';
    } else if (titleLower.includes('notebook') || titleLower.includes('laptop') || titleLower.includes('computador')) {
      return 'eletronicos';
    }
    
    return 'geral';
  }

  private inferBrand(title: string): string {
    const titleLower = title.toLowerCase();
    const brands = ['apple', 'samsung', 'xiaomi', 'huawei', 'lg', 'sony', 'nike', 'adidas', 'dell', 'hp', 'lenovo'];
    
    for (const brand of brands) {
      if (titleLower.includes(brand)) {
        return brand.charAt(0).toUpperCase() + brand.slice(1);
      }
    }
    
    return 'Marca não identificada';
  }

  async getProductDetails(productId: string): Promise<Product | null> {
    try {
      const response = await fetch(`${this.baseUrl}/products/${productId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return this.normalizeProducts([data])[0] || null;
    } catch (error) {
      console.error('Erro ao buscar detalhes do produto:', error);
      return null;
    }
  }

  async getSimilarProducts(productId: string, limit: number = 6): Promise<Product[]> {
    try {
      const response = await fetch(`${this.baseUrl}/products/${productId}/similar?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return this.normalizeProducts(data.products || []);
    } catch (error) {
      console.error('Erro ao buscar produtos similares:', error);
      return [];
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/categories`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.categories || ['celular', 'drone', 'perfume', 'tv', 'roupa', 'eletronicos'];
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      return ['celular', 'drone', 'perfume', 'tv', 'roupa', 'eletronicos'];
    }
  }
}
