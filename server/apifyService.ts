import { ApifyClient } from 'apify-client';
import { passesWhitelist } from './whitelist';

interface PriceSearchResult {
  title: string;
  price: string;
  originalPrice?: string;
  currency: string;
  url: string;
  imageUrl?: string;
  availability: string;
  seller?: string;
  rating?: string;
  source: string;
  scrapedAt: string;
}

interface ApifySearchParams {
  searchQuery: string;
  maxItems?: number;
  country?: string;
  currency?: string;
}

class ApifyService {
  private client: ApifyClient;

  constructor() {
    if (!process.env.APIFY_TOKEN) {
      throw new Error('APIFY_TOKEN environment variable is required');
    }
    
    this.client = new ApifyClient({
      token: process.env.APIFY_TOKEN
    });
  }

  // Teste básico de conectividade
  async testConnection(): Promise<{ status: string; message: string }> {
    try {
      // Testa a conexão buscando informações da conta
      const user = await this.client.user().get();
      return {
        status: 'success',
        message: `Conectado com sucesso! Usuário: ${user.email}`
      };
    } catch (error) {
      console.error('Erro ao testar conexão Apify:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // Buscar preços na Amazon
  async searchAmazonPrices(params: ApifySearchParams): Promise<PriceSearchResult[]> {
    try {
      console.log('🔍 Iniciando busca na Amazon:', params.searchQuery);
      
      const input = {
        startUrls: [
          { 
            url: `https://www.amazon.com/s?k=${encodeURIComponent(params.searchQuery)}` 
          }
        ],
        maxItems: params.maxItems || 10,
        includeFullProductInfo: true,
        useProductApi: false
      };

      const run = await this.client
        .actor('junglee/free-amazon-product-scraper')
        .call(input);

      if (!run.defaultDatasetId) {
        throw new Error('Dataset não foi criado');
      }

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();

      const mapped = items.map((item: any) => ({
        title: item.title || 'N/A',
        price: item.price?.value?.toString() || item.price || 'N/A',
        originalPrice: item.previousPrice?.value?.toString() || item.previousPrice,
        currency: item.price?.currency || 'USD',
        url: item.url || item.detailUrl || '',
        imageUrl: item.thumbnailImage || item.image,
        availability: item.availability || item.inStock ? 'Disponível' : 'Indisponível',
        seller: item.seller || 'Amazon',
        rating: item.stars?.toString() || item.rating?.toString(),
        source: 'Amazon',
        scrapedAt: new Date().toISOString()
      }));

      const filtered = mapped.filter(p =>
        passesWhitelist({ seller: p.seller, source: p.source, url: p.url })
      );

      // Telemetria opcional
      console.info('[Apify Filter - Amazon]', {
        total: mapped.length,
        aprovados: filtered.length,
        bloqueados: mapped.length - filtered.length
      });

      return filtered;

    } catch (error) {
      console.error('Erro na busca Amazon:', error);
      throw error;
    }
  }

  // Buscar preços no Google Shopping
  async searchGoogleShopping(params: ApifySearchParams): Promise<PriceSearchResult[]> {
    try {
      console.log('🔍 Iniciando busca no Google Shopping:', params.searchQuery);
      
      const input = {
        queries: [params.searchQuery],
        maxPagesPerQuery: 2,
        resultsPerPage: params.maxItems || 10,
        countryCode: params.country || 'US',
        languageCode: 'en',
        includeProductDetails: true
      };

      const run = await this.client
        .actor('damilo/google-shopping-apify')
        .call(input);

      if (!run.defaultDatasetId) {
        throw new Error('Dataset não foi criado');
      }

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();

      const mapped = items.map((item: any) => ({
        title: item.title || 'N/A',
        price: item.price || 'N/A',
        originalPrice: item.originalPrice,
        currency: item.currency || 'USD',
        url: item.productUrl || item.url || '',
        imageUrl: item.imageUrl,
        availability: item.availability || 'N/A',
        seller: item.merchantName || item.seller || 'N/A',
        rating: item.rating?.toString(),
        source: 'Google Shopping',
        scrapedAt: new Date().toISOString()
      }));

      const filtered = mapped.filter(p =>
        passesWhitelist({ seller: p.seller, source: p.source, url: p.url })
      );

      // Telemetria opcional
      console.info('[Apify Filter - Google Shopping]', {
        total: mapped.length,
        aprovados: filtered.length,
        bloqueados: mapped.length - filtered.length
      });

      return filtered;

    } catch (error) {
      console.error('Erro na busca Google Shopping:', error);
      throw error;
    }
  }

  // Buscar preços no eBay
  async searchEbayPrices(params: ApifySearchParams): Promise<PriceSearchResult[]> {
    try {
      console.log('🔍 Iniciando busca no eBay:', params.searchQuery);
      
      const input = {
        startUrls: [
          { 
            url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(params.searchQuery)}` 
          }
        ],
        maxItems: params.maxItems || 10
      };

      const run = await this.client
        .actor('dtrungtin/ebay-items-scraper')
        .call(input);

      if (!run.defaultDatasetId) {
        throw new Error('Dataset não foi criado');
      }

      const { items } = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();

      const mapped = items.map((item: any) => ({
        title: item.title || 'N/A',
        price: item.price?.value?.toString() || item.price || 'N/A',
        originalPrice: item.originalPrice,
        currency: item.price?.currency || 'USD',
        url: item.itemUrl || item.url || '',
        imageUrl: item.image || item.galleryURL,
        availability: item.condition || 'N/A',
        seller: item.seller || 'eBay',
        rating: undefined,
        source: 'eBay',
        scrapedAt: new Date().toISOString()
      }));

      // eBay geralmente é marketplace com vendedores terceiros — whitelist vai cortar quase tudo
      const filtered = mapped.filter(p =>
        passesWhitelist({ seller: p.seller, source: p.source, url: p.url })
      );

      // Telemetria opcional
      console.info('[Apify Filter - eBay]', {
        total: mapped.length,
        aprovados: filtered.length,
        bloqueados: mapped.length - filtered.length
      });

      return filtered;

    } catch (error) {
      console.error('Erro na busca eBay:', error);
      throw error;
    }
  }

  // Busca combinada em múltiplas fontes
  async searchMultipleSources(params: ApifySearchParams): Promise<{
    amazon: PriceSearchResult[];
    googleShopping: PriceSearchResult[];
    ebay: PriceSearchResult[];
    summary: {
      totalResults: number;
      lowestPrice: { price: string; source: string; title: string } | null;
      averagePrice: number | null;
    }
  }> {
    try {
      console.log('🔍 Iniciando busca em múltiplas fontes:', params.searchQuery);

      // Executar buscas em paralelo para maior eficiência
      const [amazonResults, googleResults, ebayResults] = await Promise.allSettled([
        this.searchAmazonPrices(params),
        this.searchGoogleShopping(params),
        this.searchEbayPrices(params)
      ]);

      const amazon = amazonResults.status === 'fulfilled' ? amazonResults.value : [];
      const googleShopping = googleResults.status === 'fulfilled' ? googleResults.value : [];
      const ebay = ebayResults.status === 'fulfilled' ? ebayResults.value : [];

      // Calcular estatísticas
      const allResults = [...amazon, ...googleShopping, ...ebay];
      const validPrices = allResults
        .filter(item => item.price && item.price !== 'N/A')
        .map(item => {
          const priceStr = item.price.replace(/[^0-9.]/g, '');
          return parseFloat(priceStr);
        })
        .filter(price => !isNaN(price) && price > 0);

      const lowestPrice = validPrices.length > 0 
        ? allResults.find(item => {
            const priceStr = item.price.replace(/[^0-9.]/g, '');
            const price = parseFloat(priceStr);
            return price === Math.min(...validPrices);
          })
        : null;

      const averagePrice = validPrices.length > 0 
        ? validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length
        : null;

      return {
        amazon,
        googleShopping,
        ebay,
        summary: {
          totalResults: allResults.length,
          lowestPrice: lowestPrice ? {
            price: lowestPrice.price,
            source: lowestPrice.source,
            title: lowestPrice.title
          } : null,
          averagePrice
        }
      };

    } catch (error) {
      console.error('Erro na busca em múltiplas fontes:', error);
      throw error;
    }
  }

  // Listar scrapers disponíveis na loja Apify
  async getAvailableScrapers(): Promise<any[]> {
    try {
      // Buscar scrapers populares
      const searchResults = await this.client.actors().list({
        limit: 50
      });

      return searchResults.items.map(actor => ({
        id: actor.id,
        name: actor.name,
        username: actor.username
      }));

    } catch (error) {
      console.error('Erro ao listar scrapers:', error);
      throw error;
    }
  }
}

export const apifyService = new ApifyService();
export type { PriceSearchResult, ApifySearchParams };