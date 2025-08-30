import axios from 'axios';
import type { InsertBrazilianPrice } from '@shared/schema';

// Configuração para Google Shopping API
const GOOGLE_SHOPPING_CONFIG = {
  baseUrl: 'https://serpapi.com/search.json',
  timeout: 10000,
  maxResults: 40 // Buscar mais para filtrar os melhores
};

// Lojas brasileiras relevantes por prioridade
const RELEVANT_STORES = [
  { names: ['mercadolivre', 'mercadolibre', 'mercado livre'], priority: 1, display: 'Mercado Livre' },
  { names: ['amazon'], priority: 2, display: 'Amazon Brasil' },
  { names: ['magazineluiza', 'magazine luiza', 'magazine'], priority: 3, display: 'Magazine Luiza' },
  { names: ['americanas'], priority: 4, display: 'Americanas' },
  { names: ['casasbahia', 'casas bahia'], priority: 5, display: 'Casas Bahia' },
  { names: ['extra'], priority: 6, display: 'Extra' },
  { names: ['shopee'], priority: 7, display: 'Shopee' },
  { names: ['submarino'], priority: 8, display: 'Submarino' }
];

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
      
      // Extrair informações da loja
      const storeInfo = extractStoreInfo(item.source || item.link);
      
      converted.push({
        productName: item.title,
        productBrand: brand || null,
        productModel: model || null,
        productVariant: variant || null,
        storeName: storeInfo.name,
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

// Função para extrair nome da loja e sua prioridade
function extractStoreInfo(source: string): { name: string; priority: number; isRelevant: boolean } {
  const sourceLower = source.toLowerCase();
  
  for (const store of RELEVANT_STORES) {
    if (store.names.some(name => sourceLower.includes(name))) {
      return { 
        name: store.display, 
        priority: store.priority, 
        isRelevant: true 
      };
    }
  }
  
  // Se não reconhecer, tentar extrair do domínio
  try {
    const domain = new URL(source).hostname.replace('www.', '');
    const name = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    return { 
      name, 
      priority: 99, // Baixa prioridade para lojas não reconhecidas
      isRelevant: false 
    };
  } catch {
    return { 
      name: source, 
      priority: 99, 
      isRelevant: false 
    };
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

// Função para agrupar por loja e calcular preço médio
function groupByStoreAndCalculateAverage(results: InsertBrazilianPrice[]): InsertBrazilianPrice[] {
  console.log(`📊 Agrupando ${results.length} resultados por loja...`);
  
  // Agrupar produtos por nome da loja
  const groupedByStore: { [storeName: string]: InsertBrazilianPrice[] } = {};
  
  results.forEach(item => {
    if (!groupedByStore[item.storeName]) {
      groupedByStore[item.storeName] = [];
    }
    groupedByStore[item.storeName].push(item);
  });
  
  // Calcular preço médio para cada loja
  const averagedResults: InsertBrazilianPrice[] = [];
  
  Object.entries(groupedByStore).forEach(([storeName, storeItems]) => {
    const prices = storeItems.map(item => parseFloat(item.price)).filter(price => !isNaN(price));
    
    if (prices.length === 0) return;
    
    // Calcular preço médio
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    // Pegar o primeiro item como base e atualizar com preço médio
    const representative = { ...storeItems[0] };
    representative.price = averagePrice.toFixed(2);
    
    console.log(`🏪 ${storeName}: ${storeItems.length} produtos → Preço médio: R$ ${averagePrice.toFixed(2)}`);
    
    averagedResults.push(representative);
  });
  
  return averagedResults;
}

// Lista de sites bloqueados
const BLOCKED_STORES = [
  'ebay',
  'techinn.com',
  'techinn',
];

// Função para verificar se uma loja está bloqueada
function isStoreBlocked(storeName: string): boolean {
  const storeNameLower = storeName.toLowerCase();
  return BLOCKED_STORES.some(blockedStore => 
    storeNameLower.includes(blockedStore.toLowerCase())
  );
}

// Função para filtrar e limitar resultados às 5 melhores ofertas
function filterAndLimitResults(results: InsertBrazilianPrice[]): InsertBrazilianPrice[] {
  console.log(`📊 Filtrando ${results.length} resultados...`);
  
  // Primeiro filtrar sites bloqueados
  const filteredResults = results.filter(item => {
    const blocked = isStoreBlocked(item.storeName);
    if (blocked) {
      console.log(`🚫 Bloqueado: ${item.storeName}`);
    }
    return !blocked;
  });
  
  console.log(`✅ Após filtrar sites bloqueados: ${filteredResults.length} resultados`);
  
  // Primeiro agrupar por loja e calcular preço médio
  const groupedResults = groupByStoreAndCalculateAverage(filteredResults);
  
  // Separar lojas relevantes das irrelevantes
  const relevantStores = groupedResults.filter(item => {
    const storeInfo = extractStoreInfo(item.storeName);
    return storeInfo.isRelevant;
  });
  const otherStores = groupedResults.filter(item => {
    const storeInfo = extractStoreInfo(item.storeName);
    return !storeInfo.isRelevant;
  });
  
  console.log(`✅ Lojas relevantes: ${relevantStores.length}`);
  console.log(`⚪ Outras lojas: ${otherStores.length}`);
  
  // Ordenar lojas relevantes por prioridade e depois por preço
  const sortedRelevant = relevantStores.sort((a, b) => {
    const storeInfoA = extractStoreInfo(a.storeName);
    const storeInfoB = extractStoreInfo(b.storeName);
    const priceA = parseFloat(a.price);
    const priceB = parseFloat(b.price);
    
    // Primeiro critério: prioridade da loja
    if (storeInfoA.priority !== storeInfoB.priority) {
      return storeInfoA.priority - storeInfoB.priority;
    }
    // Segundo critério: menor preço
    return priceA - priceB;
  });
  
  // Ordenar outras lojas apenas por preço
  const sortedOthers = otherStores.sort((a, b) => {
    const priceA = parseFloat(a.price);
    const priceB = parseFloat(b.price);
    return priceA - priceB;
  });
  
  // Pegar até 5 resultados, priorizando lojas relevantes
  const maxResults = 5;
  let finalResults: InsertBrazilianPrice[] = [];
  
  // Primeiro, adicionar lojas relevantes (máximo 4 para deixar espaço)
  const relevantToAdd = Math.min(sortedRelevant.length, 4);
  finalResults = [...sortedRelevant.slice(0, relevantToAdd)];
  
  // Completar com outras lojas se necessário
  const remainingSlots = maxResults - finalResults.length;
  if (remainingSlots > 0 && sortedOthers.length > 0) {
    finalResults = [...finalResults, ...sortedOthers.slice(0, remainingSlots)];
  }
  
  console.log(`🎯 Resultado final: ${finalResults.length} lojas únicas`);
  finalResults.forEach((result, index) => {
    const storeInfo = extractStoreInfo(result.storeName);
    console.log(`${index + 1}. ${result.storeName} - R$ ${parseFloat(result.price).toFixed(2)} ${storeInfo.isRelevant ? '⭐' : ''}`);
  });
  
  return finalResults;
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
    
    // Filtrar e limitar resultados
    return filterAndLimitResults(convertedResults);
    
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