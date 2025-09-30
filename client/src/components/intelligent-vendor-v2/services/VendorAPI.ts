
import { Product, SearchFilters } from '../types';

export class VendorAPI {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Enviar mensagem para o Assistente Inteligente V2
   */
  async sendMessageToV2(userId: string, message: string, storeId?: number): Promise<any> {
    try {
      console.log(`🤖 [V2] Enviando mensagem para API V2: "${message}"`);
      
      const response = await fetch('/api/assistant/v2/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ 
          userId,
          message,
          storeId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Se a resposta for SSE (Server-Sent Events)
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        return this.handleSSEResponse(response);
      }

      // Se for JSON normal
      const data = await response.json();
      console.log(`✅ [V2] Resposta recebida:`, data);
      return data;
      
    } catch (error) {
      console.error('❌ [V2] Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  /**
   * Processar resposta SSE (Server-Sent Events)
   */
  private async handleSSEResponse(response: Response): Promise<any> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body reader');

    let fullResponse = '';
    let products: any[] = [];
    let metadata: any = {};

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7).trim();
            continue;
          }
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Processar diferentes tipos de eventos SSE
              if (line.includes('"products"')) {
                console.log(`🛍️ [V2] Produtos recebidos via SSE:`, data.products);
                products = data.products || [];
              } else if (line.includes('"text"')) {
                fullResponse += data.text || '';
              } else if (line.includes('"emotion"')) {
                metadata.emotion = data;
              } else if (line.includes('"insights"')) {
                metadata.insights = data.insights;
              }
            } catch (e) {
              // Pode ser texto simples, adicionar à resposta
              const textData = line.slice(6);
              if (textData && !textData.startsWith('{')) {
                fullResponse += textData;
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    console.log(`✅ [V2] SSE processado - Resposta: ${fullResponse.length} chars, Produtos: ${products.length}`);

    return {
      content: fullResponse,
      products,
      metadata
    };
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
