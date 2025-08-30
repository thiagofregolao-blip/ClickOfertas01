import axios from 'axios';
import type { InsertBrazilianPrice } from '@shared/schema';

// Configuração para Google Shopping API
const GOOGLE_SHOPPING_CONFIG = {
  baseUrl: 'https://serpapi.com/search.json',
  timeout: 10000,
  maxResults: 10
};

// Interface para resultado do Google Shopping
interface GoogleShoppingResult {
  title: string;
  price: string;
  extracted_price: number;
  link: string;
  source: string;
  rating?: number;
  reviews?: number;
  delivery?: string;
  thumbnail?: string;
  position: number;
}

// Função para fazer busca no Google Shopping brasileiro
async function searchGoogleShoppingBrazil(productName: string): Promise<GoogleShoppingResult[]> {
  try {
    const params = {
      engine: 'google_shopping',
      q: productName,
      google_domain: 'google.com.br',
      gl: 'br', // País: Brasil
      hl: 'pt', // Idioma: Português
      api_key: process.env.SERPAPI_KEY,
      num: GOOGLE_SHOPPING_CONFIG.maxResults
    };
    
    console.log(`🛍️ Buscando no Google Shopping Brasil: ${productName}`);
    
    const response = await axios.get(GOOGLE_SHOPPING_CONFIG.baseUrl, {
      params,
      timeout: GOOGLE_SHOPPING_CONFIG.timeout
    });
    
    if (response.data.shopping_results) {
      console.log(`✅ Encontrados ${response.data.shopping_results.length} produtos no Google Shopping`);
      return response.data.shopping_results;
    }
    
    console.log('⚠️ Nenhum resultado encontrado no Google Shopping');
    return [];
    
  } catch (error: any) {
    console.error('❌ Erro ao buscar no Google Shopping:', error.message);
    return [];
  }
}

// Função para converter resultados do Google Shopping para nosso formato
function convertGoogleShoppingResults(results: GoogleShoppingResult[], productName: string): InsertBrazilianPrice[] {
  const converted: InsertBrazilianPrice[] = [];
  
  results.forEach((item, index) => {
    try {
      if (!item.extracted_price || item.extracted_price <= 0) return;
      
      const { brand, model, variant } = extractProductInfo(item.title);
      
      // Extrair nome da loja a partir da fonte
      const storeName = extractStoreName(item.source || item.link);
      
      converted.push({
        productName: item.title,
        productBrand: brand || null,
        productModel: model || null,
        productVariant: variant || null,
        storeName: storeName,
        storeUrl: extractDomainFromUrl(item.link),
        productUrl: item.link,
        price: item.extracted_price.toString(),
        currency: 'BRL',
        availability: 'in_stock',
        isActive: true,
      });
    } catch (error) {
      console.error(`❌ Erro ao converter produto ${index + 1}:`, error);
    }
  });
  
  return converted;
}

// Função para extrair nome da loja a partir da URL ou fonte
function extractStoreName(source: string): string {
  if (source.toLowerCase().includes('mercadolivre') || source.toLowerCase().includes('mercadolibre')) {
    return 'Mercado Livre';
  }
  if (source.toLowerCase().includes('americanas')) {
    return 'Americanas';
  }
  if (source.toLowerCase().includes('magazineluiza') || source.toLowerCase().includes('magazine')) {
    return 'Magazine Luiza';
  }
  if (source.toLowerCase().includes('amazon')) {
    return 'Amazon Brasil';
  }
  if (source.toLowerCase().includes('shopee')) {
    return 'Shopee';
  }
  if (source.toLowerCase().includes('casasbahia')) {
    return 'Casas Bahia';
  }
  if (source.toLowerCase().includes('extra')) {
    return 'Extra';
  }
  
  // Se não reconhecer, tentar extrair do domínio
  try {
    const domain = new URL(source).hostname.replace('www.', '');
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  } catch {
    return source;
  }
}

// Função para extrair domínio da URL
function extractDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}`;
  } catch {
    return url;
  }
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


// Função principal para buscar preços usando Google Shopping
export async function scrapeBrazilianPrices(productName: string): Promise<InsertBrazilianPrice[]> {
  console.log(`🌎 Iniciando busca por: ${productName}`);
  
  try {
    // Buscar no Google Shopping brasileiro
    const googleResults = await searchGoogleShoppingBrazil(productName);
    
    if (googleResults.length === 0) {
      console.log('⚠️ Nenhum resultado encontrado no Google Shopping');
      return [];
    }
    
    // Converter resultados para nosso formato
    const convertedResults = convertGoogleShoppingResults(googleResults, productName);
    
    console.log(`🎯 Total encontrado: ${convertedResults.length} produtos no Google Shopping Brasil`);
    
    // Ordenar por preço (menor primeiro)
    return convertedResults.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    
  } catch (error) {
    console.error('❌ Erro na busca do Google Shopping:', error);
    return [];
  }
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