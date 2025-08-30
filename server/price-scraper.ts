import * as cheerio from 'cheerio';
import axios from 'axios';
import type { InsertBrazilianPrice } from '@shared/schema';

// Configuração para scraping robusto
const SCRAPING_CONFIG = {
  timeout: 15000,
  maxRetries: 2,
  delay: { min: 500, max: 1500 },
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0'
  ]
};

// Interface para configuração de cada loja
interface StoreConfig {
  name: string;
  baseUrl: string;
  searchUrl: string;
  selectors: {
    productContainer: string;
    productName: string;
    productPrice: string;
    productUrl: string;
    availability?: string;
  };
  priceParser: (priceText: string) => number;
  urlBuilder: (searchTerm: string) => string;
}

// Configurações das lojas brasileiras
const BRAZILIAN_STORES: StoreConfig[] = [
  {
    name: 'Mercado Livre',
    baseUrl: 'https://www.mercadolivre.com.br',
    searchUrl: 'https://lista.mercadolivre.com.br',
    selectors: {
      productContainer: '.ui-search-result, .ui-search-results__item',
      productName: '.ui-search-item__title, .ui-search-item__title-label, h2.ui-search-item__title',
      productPrice: '.andes-money-amount__fraction, .price-tag-fraction, .ui-search-price__part',
      productUrl: '.ui-search-item__group__element a, .ui-search-link'
    },
    priceParser: (price: string) => {
      const cleaned = price.replace(/[R$\s.]/g, '').replace(/,(\d{2})$/, '.$1');
      return parseFloat(cleaned) || 0;
    },
    urlBuilder: (searchTerm: string) => `https://lista.mercadolivre.com.br/${encodeURIComponent(searchTerm.replace(/\s+/g, '-'))}`
  },
  {
    name: 'Americanas',
    baseUrl: 'https://www.americanas.com.br',
    searchUrl: 'https://www.americanas.com.br/busca',
    selectors: {
      productContainer: '[data-testid="product-card"], .product-card, .card-product',
      productName: '[data-testid="product-name"], .product-name, .card-product__name, h3',
      productPrice: '[data-testid="price-value"], .price, .card-product__price, .price-value',
      productUrl: '[data-testid="product-card"] a, .product-card a, .card-product a'
    },
    priceParser: (price: string) => {
      const cleaned = price.replace(/[R$\s.]/g, '').replace(/,(\d{2})$/, '.$1');
      return parseFloat(cleaned) || 0;
    },
    urlBuilder: (searchTerm: string) => `https://www.americanas.com.br/busca/${encodeURIComponent(searchTerm)}`
  },
  {
    name: 'Magazine Luiza',
    baseUrl: 'https://www.magazineluiza.com.br',
    searchUrl: 'https://www.magazineluiza.com.br/busca',
    selectors: {
      productContainer: '[data-testid="product-card"], .product-card, .sc-product-card',
      productName: '[data-testid="product-title"], .product-title, .sc-product-card__name, h3',
      productPrice: '[data-testid="price-value"], .price, .sc-product-card__price, .price-value',
      productUrl: '[data-testid="product-card"] a, .product-card a, .sc-product-card a'
    },
    priceParser: (price: string) => {
      const cleaned = price.replace(/[R$\s.]/g, '').replace(/,(\d{2})$/, '.$1');
      return parseFloat(cleaned) || 0;
    },
    urlBuilder: (searchTerm: string) => `https://www.magazineluiza.com.br/busca/${encodeURIComponent(searchTerm)}`
  }
];

// Função para delay aleatório
const randomDelay = () => {
  const delay = Math.random() * (SCRAPING_CONFIG.delay.max - SCRAPING_CONFIG.delay.min) + SCRAPING_CONFIG.delay.min;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Função para obter User-Agent aleatório
const getRandomUserAgent = () => {
  return SCRAPING_CONFIG.userAgents[Math.floor(Math.random() * SCRAPING_CONFIG.userAgents.length)];
};

// Função avançada para scraping com multiple tentativas e headers rotativos
async function fallbackScrape(store: StoreConfig, searchTerm: string): Promise<InsertBrazilianPrice[]> {
  const results: InsertBrazilianPrice[] = [];
  
  for (let attempt = 0; attempt < SCRAPING_CONFIG.maxRetries; attempt++) {
    try {
      await randomDelay();
      
      const searchUrl = store.urlBuilder(searchTerm);
      console.log(`🔍 Tentativa ${attempt + 1} - Buscando em ${store.name}: ${searchUrl}`);
      
      // Headers mais completos e diversos
      const headers = {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://www.google.com.br/',
        'Origin': 'https://www.google.com.br'
      };
      
      const response = await axios.get(searchUrl, {
        headers,
        timeout: SCRAPING_CONFIG.timeout,
        validateStatus: (status) => status < 500,
        maxRedirects: 10,
        decompress: true,
        // Adicionar cookies de sessão
        withCredentials: false,
      });
      
      if (response.status === 200) {
        console.log(`✅ Sucesso na tentativa ${attempt + 1} para ${store.name}`);
        const $ = cheerio.load(response.data);
        
        // Tentar diferentes seletores
        let products = $(store.selectors.productContainer);
        
        // Se não encontrou, tentar seletores alternativos
        if (products.length === 0) {
          const altSelectors = [
            '.product-item', '.item', '.card', '.listing', 
            '[data-item]', '[data-product]', '.result'
          ];
          
          for (const selector of altSelectors) {
            products = $(selector);
            if (products.length > 0) break;
          }
        }
        
        console.log(`📦 Encontrados ${products.length} elementos em ${store.name}`);
        products.slice(0, 10).each((index, element) => {
          try {
            const $product = $(element);
            
            // Tentar múltiplos seletores para nome
            let name = '';
            const nameSelectors = store.selectors.productName.split(', ');
            for (const selector of nameSelectors) {
              name = $product.find(selector).text().trim();
              if (name) break;
            }
            
            // Tentar múltiplos seletores para preço
            let priceText = '';
            const priceSelectors = store.selectors.productPrice.split(', ');
            for (const selector of priceSelectors) {
              priceText = $product.find(selector).text().trim();
              if (priceText) break;
            }
            
            // Tentar múltiplos seletores para URL
            let relativeUrl = '';
            const urlSelectors = store.selectors.productUrl.split(', ');
            for (const selector of urlSelectors) {
              relativeUrl = $product.find(selector).attr('href') || '';
              if (relativeUrl) break;
            }
            
            if (!name || !priceText) return;
            
            const price = store.priceParser(priceText);
            if (price <= 0) return;
            
            const productUrl = relativeUrl && relativeUrl.startsWith('http') 
              ? relativeUrl 
              : relativeUrl ? `${store.baseUrl}${relativeUrl}` : `${store.baseUrl}/produto`;
            
            const { brand, model, variant } = extractProductInfo(name);
            
            results.push({
              productName: name,
              productBrand: brand || null,
              productModel: model || null,
              productVariant: variant || null,
              storeName: store.name,
              storeUrl: store.baseUrl,
              productUrl,
              price: price.toString(),
              currency: 'BRL',
              availability: 'in_stock',
              isActive: true,
            });
            
          } catch (error) {
            // Não logar erros menores para não poluir
          }
        });
        
        if (results.length > 0) {
          console.log(`✅ ${store.name}: Encontrados ${results.length} produtos válidos`);
          break; // Sucesso, sair do loop
        }
      } else {
        console.log(`⚠️ Status ${response.status} para ${store.name} na tentativa ${attempt + 1}`);
      }
      
    } catch (error: any) {
      console.log(`⚠️ Tentativa ${attempt + 1} falhou para ${store.name}: ${error.message?.substring(0, 100) || 'Erro desconhecido'}`);
      
      if (attempt === SCRAPING_CONFIG.maxRetries - 1) {
        console.error(`❌ Todas as tentativas falharam para ${store.name}`);
      }
    }
  }
  
  return results;
}

// Função para normalizar nome do produto para busca
export function normalizeProductName(productName: string): string {
  return productName
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Remove espaços extras
    .trim();
}

// Função para extrair marca e modelo do nome do produto
export function extractProductInfo(productName: string) {
  const normalized = normalizeProductName(productName);
  
  // Detectar marcas conhecidas
  const brands = ['apple', 'samsung', 'xiaomi', 'motorola', 'lg', 'sony', 'huawei', 'iphone', 'galaxy'];
  const brand = brands.find(b => normalized.includes(b)) || '';
  
  // Detectar modelos (números e letras após a marca)
  const modelMatch = normalized.match(/(\w+\s*\d+[\w\s]*)/);
  const model = modelMatch ? modelMatch[1].trim() : '';
  
  // Detectar variações de armazenamento
  const storageMatch = normalized.match(/(\d+\s*gb|\d+\s*tb)/i);
  const variant = storageMatch ? storageMatch[1].replace(/\s/g, '').toUpperCase() : '';
  
  return { brand, model, variant };
}

// Função principal para fazer scraping de uma loja
async function scrapeStore(store: StoreConfig, searchTerm: string): Promise<InsertBrazilianPrice[]> {
  return await fallbackScrape(store, searchTerm);
}

// Função principal para buscar preços em todas as lojas
export async function scrapeBrazilianPrices(productName: string): Promise<InsertBrazilianPrice[]> {
  console.log(`🌎 Iniciando busca por: ${productName}`);
  
  const searchTerm = normalizeProductName(productName);
  const allResults: InsertBrazilianPrice[] = [];
  
  // Fazer scraping em paralelo com retry automático
  const scrapePromises = BRAZILIAN_STORES.map(async (store) => {
    try {
      const storeResults = await scrapeStore(store, searchTerm);
      return storeResults;
    } catch (error) {
      console.error(`❌ Falha total em ${store.name}:`, error);
      return [];
    }
  });
  
  const results = await Promise.allSettled(scrapePromises);
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allResults.push(...result.value);
      console.log(`✅ ${BRAZILIAN_STORES[index].name}: ${result.value.length} produtos`);
    } else {
      console.error(`❌ ${BRAZILIAN_STORES[index].name}: Falhou`);
    }
  });
  
  console.log(`🎯 Total encontrado: ${allResults.length} produtos em ${results.length} lojas`);
  
  // Ordenar por preço (menor primeiro)
  return allResults.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
}

// Função para gerar sugestões de produtos similares
export function generateProductSuggestions(originalProduct: any, allProducts: any[]): any[] {
  const suggestions: any[] = [];
  const { brand, model } = extractProductInfo(originalProduct.name);
  
  // Buscar produtos da mesma marca
  const sameBrand = allProducts.filter(p => 
    p.id !== originalProduct.id && 
    extractProductInfo(p.name).brand === brand
  );
  
  // Sugerir variações de armazenamento
  const storageVariants = sameBrand.filter(p => {
    const { model: pModel } = extractProductInfo(p.name);
    return pModel === model;
  });
  
  storageVariants.slice(0, 3).forEach(product => {
    suggestions.push({
      name: product.name,
      difference: `${extractProductInfo(product.name).variant || 'Variação'} de armazenamento`,
      reason: `Mesmo modelo (${model}) com capacidade diferente`
    });
  });
  
  // Sugerir produtos da mesma categoria/marca
  sameBrand.slice(0, 2).forEach(product => {
    if (!storageVariants.includes(product)) {
      suggestions.push({
        name: product.name,
        difference: 'Modelo diferente',
        reason: `Mesma marca (${brand}) em categoria similar`
      });
    }
  });
  
  return suggestions;
}