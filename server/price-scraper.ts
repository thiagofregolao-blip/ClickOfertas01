import cheerio from 'cheerio';
import axios from 'axios';
import { UserAgent } from 'user-agents';
import type { InsertBrazilianPrice } from '@shared/schema';

// Configuração para scraping robusto
const SCRAPING_CONFIG = {
  timeout: 10000,
  maxRetries: 3,
  delay: { min: 1000, max: 3000 },
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
    name: 'Americanas',
    baseUrl: 'https://www.americanas.com.br',
    searchUrl: 'https://www.americanas.com.br/busca',
    selectors: {
      productContainer: '[data-testid="product-card"]',
      productName: '[data-testid="product-name"]',
      productPrice: '[data-testid="price-value"]',
      productUrl: '[data-testid="product-card"] a',
      availability: '[data-testid="availability"]'
    },
    priceParser: (price: string) => {
      const cleaned = price.replace(/[R$\s.,]/g, '').replace(/(\d{2})$/, '.$1');
      return parseFloat(cleaned) || 0;
    },
    urlBuilder: (searchTerm: string) => `https://www.americanas.com.br/busca/${encodeURIComponent(searchTerm)}`
  },
  {
    name: 'Magazine Luiza',
    baseUrl: 'https://www.magazineluiza.com.br',
    searchUrl: 'https://www.magazineluiza.com.br/busca',
    selectors: {
      productContainer: '[data-testid="product-card"]',
      productName: '[data-testid="product-title"]',
      productPrice: '[data-testid="price-value"]',
      productUrl: '[data-testid="product-card"] a'
    },
    priceParser: (price: string) => {
      const cleaned = price.replace(/[R$\s.,]/g, '').replace(/(\d{2})$/, '.$1');
      return parseFloat(cleaned) || 0;
    },
    urlBuilder: (searchTerm: string) => `https://www.magazineluiza.com.br/busca/${encodeURIComponent(searchTerm)}`
  },
  {
    name: 'Mercado Livre',
    baseUrl: 'https://www.mercadolivre.com.br',
    searchUrl: 'https://lista.mercadolivre.com.br',
    selectors: {
      productContainer: '.ui-search-result',
      productName: '.ui-search-item__title',
      productPrice: '.andes-money-amount__fraction',
      productUrl: '.ui-search-item__group__element a'
    },
    priceParser: (price: string) => {
      const cleaned = price.replace(/[R$\s.,]/g, '').replace(/(\d{2})$/, '.$1');
      return parseFloat(cleaned) || 0;
    },
    urlBuilder: (searchTerm: string) => `https://lista.mercadolivre.com.br/${encodeURIComponent(searchTerm)}`
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
  const results: InsertBrazilianPrice[] = [];
  
  try {
    await randomDelay();
    
    const searchUrl = store.urlBuilder(searchTerm);
    console.log(`🔍 Buscando em ${store.name}: ${searchUrl}`);
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: SCRAPING_CONFIG.timeout,
      validateStatus: (status) => status < 500, // Aceitar redirects
    });
    
    if (response.status !== 200) {
      console.warn(`⚠️ Status ${response.status} para ${store.name}`);
      return results;
    }
    
    const $ = cheerio.load(response.data);
    const products = $(store.selectors.productContainer).slice(0, 10); // Limitar a 10 produtos
    
    console.log(`📦 Encontrados ${products.length} produtos em ${store.name}`);
    
    products.each((index, element) => {
      try {
        const $product = $(element);
        
        const name = $product.find(store.selectors.productName).text().trim();
        const priceText = $product.find(store.selectors.productPrice).text().trim();
        const relativeUrl = $product.find(store.selectors.productUrl).attr('href');
        
        if (!name || !priceText || !relativeUrl) return;
        
        const price = store.priceParser(priceText);
        if (price <= 0) return;
        
        const productUrl = relativeUrl.startsWith('http') 
          ? relativeUrl 
          : `${store.baseUrl}${relativeUrl}`;
        
        const availability = store.selectors.availability 
          ? $product.find(store.selectors.availability).text().trim() 
          : 'in_stock';
        
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
          availability: availability.toLowerCase().includes('estoque') ? 'in_stock' : 'in_stock',
          isActive: true,
        });
        
      } catch (error) {
        console.error(`❌ Erro ao processar produto ${index + 1} em ${store.name}:`, error);
      }
    });
    
  } catch (error) {
    console.error(`❌ Erro ao fazer scraping em ${store.name}:`, error);
  }
  
  return results;
}

// Função principal para buscar preços em todas as lojas
export async function scrapeBrazilianPrices(productName: string): Promise<InsertBrazilianPrice[]> {
  console.log(`🌎 Iniciando busca por: ${productName}`);
  
  const searchTerm = normalizeProductName(productName);
  const allResults: InsertBrazilianPrice[] = [];
  
  // Fazer scraping em paralelo com limite
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
  const suggestions = [];
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