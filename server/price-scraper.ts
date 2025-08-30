import axios from 'axios';
import type { InsertBrazilianPrice } from '@shared/schema';
import { nanoid } from 'nanoid';

// Função para gerar ID único
function generateId(): string {
  return nanoid();
}

// Configuração para APIs de comparação
const API_CONFIG = {
  timeout: 10000,
  maxResults: 20 // Buscar até 20 produtos do Mercado Livre
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

// Interface para resultado do Mercado Livre
interface MercadoLivreResult {
  id: string;
  title: string;
  price: number;
  permalink: string;
  thumbnail: string;
  available_quantity: number;
  condition: string;
  shipping?: {
    free_shipping: boolean;
  };
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

// Sites brasileiros permitidos (.com.br)
const ALLOWED_BRAZILIAN_STORES = [
  'mercadolivre.com.br',
  'amazon.com.br', 
  'americanas.com.br',
  'submarino.com.br',
  'magazine.com.br',
  'casasbahia.com.br',
  'pontofrio.com.br',
  'extra.com.br',
  'carrefour.com.br',
  'kabum.com.br',
  'zoom.com.br',
  'buscape.com.br',
  'shopee.com.br',
  'olx.com.br',
  'enjoei.com.br',
  'claro.com.br'
];

// Função para verificar se uma loja deve ser bloqueada
function isStoreBlocked(storeName: string): boolean {
  const storeNameLower = storeName.toLowerCase();
  
  // Se contém .com.br, é brasileiro e permitido
  if (storeNameLower.includes('.com.br')) {
    console.log(`✅ PERMITIDO (brasileiro): ${storeName}`);
    return false;
  }
  
  // Se contém apenas .com (internacional), bloquear
  if (storeNameLower.includes('.com') && !storeNameLower.includes('.com.br')) {
    console.log(`🚫 BLOQUEADO (internacional .com): ${storeName}`);
    return true;
  }
  
  // Para lojas sem domínio explícito, verificar se está na lista de brasileiras conhecidas
  const isBrazilianKnown = ALLOWED_BRAZILIAN_STORES.some(allowedStore => 
    storeNameLower.includes(allowedStore.replace('.com.br', ''))
  );
  
  if (isBrazilianKnown) {
    console.log(`✅ PERMITIDO (brasileiro conhecido): ${storeName}`);
    return false;
  }
  
  // Se não é brasileiro conhecido e não tem .com.br, considerar suspeito
  console.log(`⚠️ SUSPEITO (origem incerta): ${storeName}`);
  return false; // Manter por enquanto, mas marcar como suspeito
}

// Função para filtrar e limitar resultados às 5 melhores ofertas
function filterAndLimitResults(results: InsertBrazilianPrice[]): InsertBrazilianPrice[] {
  console.log(`📊 Filtrando ${results.length} resultados...`);
  
  // Agrupar por loja e calcular preço médio
  const groupedResults = groupByStoreAndCalculateAverage(results);
  
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

// Função para buscar no Mercado Livre
async function searchMercadoLivre(productName: string): Promise<any[]> {
  try {
    const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(productName)}&limit=20`;
    console.log(`🛒 Buscando no Mercado Livre: ${productName}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Encontrados ${data.results?.length || 0} produtos no Mercado Livre`);
    
    return data.results || [];
  } catch (error) {
    console.error('❌ Erro ao buscar no Mercado Livre:', error);
    return [];
  }
}

// Função para extrair variante do produto
function extractVariant(title: string): string {
  const variants = title.match(/(\d+\s?(gb|tb|inch|"|polegadas?))/gi);
  return variants ? variants[0] : '';
}

// Função para converter resultados do Mercado Livre
function convertMercadoLivreResults(results: any[], productName: string): InsertBrazilianPrice[] {
  return results.map(item => ({
    productName: item.title || productName,
    productBrand: null,
    productModel: null,
    productVariant: extractVariant(item.title || ''),
    storeName: 'Mercado Livre',
    storeUrl: 'https://mercadolivre.com.br',
    productUrl: item.permalink || '',
    price: (item.price || 0).toFixed(2),
    currency: 'BRL',
    availability: item.available_quantity > 0 ? 'in_stock' : 'out_of_stock',
    isActive: true
  }));
}

// Função principal para buscar preços usando Mercado Livre
export async function scrapeBrazilianPrices(productName: string): Promise<InsertBrazilianPrice[]> {
  console.log(`🌎 Iniciando busca por: ${productName}`);
  
  try {
    // Buscar no Mercado Livre
    const mercadoLivreResults = await searchMercadoLivre(productName);
    
    if (mercadoLivreResults.length === 0) {
      console.log('⚠️ Nenhum resultado encontrado no Mercado Livre');
      return [];
    }
    
    // Converter resultados para nosso formato
    const convertedResults = convertMercadoLivreResults(mercadoLivreResults, productName);
    
    console.log(`🎯 Total encontrado: ${convertedResults.length} produtos no Mercado Livre Brasil`);
    
    // Filtrar e limitar resultados (apenas 5 melhores ofertas do Mercado Livre)
    return filterAndLimitResults(convertedResults);
    
  } catch (error) {
    console.error('❌ Erro na busca do Mercado Livre:', error);
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