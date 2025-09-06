import { getJson } from "serpapi";
import type { InsertBrazilianPrice, InsertPriceHistory } from '@shared/schema';
import { nanoid } from 'nanoid';
import { db } from './db';
import { priceHistory } from '@shared/schema';

// Lojas confiáveis brasileiras (prioridade alta)
const TRUSTED_BRAZILIAN_STORES = [
  'mercadolivre.com.br', 'mercado livre',
  'amazon.com.br', 'amazon brasil',
  'magazineluiza.com.br', 'magazine luiza', 'magazine',
  'americanas.com.br', 'americanas',
  'casasbahia.com.br', 'casas bahia',
  'extra.com.br', 'extra',
  'carrefour.com.br', 'carrefour',
  'submarino.com.br', 'submarino',
  'kabum.com.br', 'kabum',
  'shopee.com.br', 'shopee brasil',
  'zoom.com.br', 'zoom',
  'fastshop.com.br', 'fast shop',
  'pontofrio.com.br', 'ponto frio',
  'saraiva.com.br', 'saraiva',
  'walmart.com.br', 'walmart',
  'netshoes.com.br', 'netshoes',
  'centauro.com.br', 'centauro',
  'drogasil.com.br', 'drogasil',
  'riachuelo.com.br', 'riachuelo',
  // Lojas especializadas legítimas
  'iplace', 'rei do celular', 'smiles', 'smiles.com.br',
  'buscape.com.br', 'buscape', 'buscapé',
  'terabyteshop.com.br', 'terabyte',
  'pichau.com.br', 'pichau',
  'girafa.com.br', 'girafa',
  'mobly.com.br', 'mobly',
  'tok&stok', 'tokstok.com.br'
];

// Lojas internacionais confiáveis (limitadas)
const TRUSTED_INTERNATIONAL_STORES = [
  'apple.com', 'apple store',
  'samsung.com', 'samsung',
  'sony.com', 'sony',
  'dell.com', 'dell',
  'hp.com', 'hp',
  'lenovo.com', 'lenovo',
  'microsoft.com', 'microsoft',
  'nike.com', 'nike',
  'adidas.com', 'adidas'
];

// Padrões de vendedores duvidosos para bloquear
const BLOCKED_SELLER_PATTERNS = [
  // Vendedores genéricos do eBay
  /^[a-z0-9_-]+\d+$/i, // padrões como "seller123", "user_456"
  /wireless/i,
  /electronics/i,
  /gadgets/i,
  /store\d+/i,
  /shop\d+/i,
  /outlet/i,
  /deals/i,
  /marketplace/i,
  // Vendedores específicos problemáticos
  /itsworthmore/i,
  /amazing-wireless/i,
  /tech-deals/i,
  /phone-shop/i,
  /mobile-store/i
];

// Função para verificar se uma loja é confiável
function isTrustedStore(storeName: string): boolean {
  if (!storeName) return false;
  
  const storeNameLower = storeName.toLowerCase().trim();
  
  // Verificar se está na lista de lojas brasileiras confiáveis
  const isBrazilianTrusted = TRUSTED_BRAZILIAN_STORES.some(trusted => 
    storeNameLower.includes(trusted.toLowerCase()) || 
    trusted.toLowerCase().includes(storeNameLower)
  );
  
  if (isBrazilianTrusted) {
    console.log(`✅ LOJA CONFIÁVEL (brasileira): ${storeName}`);
    return true;
  }
  
  // Verificar se está na lista de lojas internacionais confiáveis
  const isInternationalTrusted = TRUSTED_INTERNATIONAL_STORES.some(trusted => 
    storeNameLower.includes(trusted.toLowerCase()) || 
    trusted.toLowerCase().includes(storeNameLower)
  );
  
  if (isInternationalTrusted) {
    console.log(`✅ LOJA CONFIÁVEL (internacional): ${storeName}`);
    return true;
  }
  
  // Verificar se corresponde a padrões de vendedores duvidosos
  const isBlockedSeller = BLOCKED_SELLER_PATTERNS.some(pattern => 
    pattern.test(storeNameLower)
  );
  
  if (isBlockedSeller) {
    console.log(`🚫 VENDEDOR BLOQUEADO: ${storeName}`);
    return false;
  }
  
  // Se não está nas listas confiáveis nem bloqueadas, é suspeito
  console.log(`⚠️ LOJA SUSPEITA (não verificada): ${storeName}`);
  return false; // Bloquear por padrão lojas não verificadas
}

/**
 * Função para buscar preços médios usando SerpAPI Google Shopping
 * Baseada no código limpo fornecido pelo usuário
 */
export async function getAveragePrices(productName: string): Promise<{
  query: string;
  currency: string | null;
  average_price: number | null;
  count: number;
  results: Array<{
    title: string;
    store: string;
    link: string;
    price: number;
    currency: string;
  }>;
  note?: string;
}> {
  try {
    const q = productName.trim();
    const gl = "br"; // país Brasil
    const hl = "pt-br"; // idioma português

    if (!q) {
      return {
        query: q,
        currency: null,
        average_price: null,
        count: 0,
        results: [],
        note: "Nome do produto é obrigatório."
      };
    }

    console.log(`🎯 Buscando preços para: "${q}"`);

    // Consulta no Google Shopping via SerpApi
    const data = await getJson({
      engine: "google_shopping",
      q,
      gl,         // país (geo)
      hl,         // idioma
      api_key: process.env.SERPAPI_KEY,
      num: 30     // mais resultados para melhor amostra
    });

    const items = (data.shopping_results || [])
      // remove anúncios "shopping_ads" e resultados sem preço
      .filter((it: any) => !it.position || it.position >= 1)
      .map((it: any) => {
        // Preferir extracted_price (numérico). Se não existir, tentar parse de "price".
        let p = it.extracted_price;
        if (typeof p !== "number" && typeof it.price === "string") {
          // tenta extrair dígitos, vírgulas e pontos
          const raw = it.price.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
          const asNum = Number(raw);
          if (!Number.isNaN(asNum)) p = asNum;
        }
        return {
          title: it.title,
          source: it.source,       // loja
          link: it.link || it.product_link,
          currency: it.currency || 'BRL',
          price: typeof p === "number" ? p : null,
        };
      })
      .filter((it: any) => it.price !== null && it.price > 0);

    console.log(`📦 Encontrados ${items.length} produtos com preços válidos`);

    // Filtrar apenas produtos principais (não acessórios) E de lojas confiáveis
    const mainProducts = items.filter((item: any) => {
      const title = item.title?.toLowerCase() || '';
      const isAccessory = title.includes('capa') || title.includes('película') || 
                        title.includes('protetor') || title.includes('cabo') || 
                        title.includes('adaptador') || title.includes('case') ||
                        title.includes('capinha') || title.includes('cover') ||
                        title.includes('carregador') || title.includes('suporte');
      
      // Verificar se a loja é confiável
      const isFromTrustedStore = isTrustedStore(item.source || '');
      
      // Verificar preço mínimo por categoria
      const searchLower = q.toLowerCase();
      let minPrice = 50;
      let maxPrice = 30000;
      
      if (searchLower.includes('iphone')) {
        minPrice = 1500;
        maxPrice = 15000;
      } else if (searchLower.includes('samsung') || searchLower.includes('galaxy')) {
        minPrice = 800;
        maxPrice = 8000;
      } else if (searchLower.includes('notebook') || searchLower.includes('laptop')) {
        minPrice = 1200;
        maxPrice = 12000;
      }

      const isValidPrice = item.price >= minPrice && item.price <= maxPrice;
      const isMainProduct = !isAccessory && isValidPrice && isFromTrustedStore;
      
      const status = !isFromTrustedStore ? 'LOJA BLOQUEADA' : 
                    isAccessory ? 'ACESSÓRIO' : 
                    !isValidPrice ? 'PREÇO INVÁLIDO' : 'VÁLIDO';
      
      console.log(`🔍 ${item.title?.substring(0, 50)}... - R$ ${item.price} - ${item.source} - ${status}`);
      
      return isMainProduct;
    });

    // Opcional: deduplicar por loja (pega o menor preço por loja)
    const byStore = new Map();
    for (const item of mainProducts) {
      const key = (item.source || "").toLowerCase().trim();
      if (!byStore.has(key) || item.price < byStore.get(key).price) {
        byStore.set(key, item);
      }
    }
    const cleaned = Array.from(byStore.values());

    if (!cleaned.length) {
      return {
        query: q,
        results: [],
        currency: null,
        average_price: null,
        count: 0,
        note: "Nenhum produto principal encontrado (apenas acessórios).",
      };
    }

    // Se as moedas divergirem, filtrar pela moeda majoritária
    const currencyCounts = cleaned.reduce((acc: any, it: any) => {
      const c = it.currency || "UNKNOWN";
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {});
    const dominantCurrency = Object.entries(currencyCounts).sort((a: any, b: any) => b[1]-a[1])[0][0];
    const sameCurrency = cleaned.filter((it: any) => (it.currency || "UNKNOWN") === dominantCurrency);

    // NOVA REGRA: Excluir 3 menores e 3 maiores preços para ter média mais confiável
    let pricesForAverage = sameCurrency;
    
    if (sameCurrency.length > 6) {
      // Ordenar por preço
      const sortedPrices = [...sameCurrency].sort((a: any, b: any) => a.price - b.price);
      
      // Remover 3 menores e 3 maiores
      pricesForAverage = sortedPrices.slice(3, -3);
      
      console.log(`📊 Aplicando regra de exclusão de extremos:`);
      console.log(`📊 Total inicial: ${sameCurrency.length} lojas`);
      console.log(`📊 Após exclusão: ${pricesForAverage.length} lojas`);
      console.log(`📊 Removidos: 3 menores (R$ ${sortedPrices.slice(0, 3).map(p => p.price).join(', ')}) + 3 maiores (R$ ${sortedPrices.slice(-3).map(p => p.price).join(', ')})`);
    } else {
      console.log(`📊 Poucos resultados (${sameCurrency.length}), usando todos para média`);
    }

    const avg = pricesForAverage.reduce((sum: number, it: any) => sum + it.price, 0) / pricesForAverage.length;

    console.log(`✅ RESULTADO FINAL:`);
    console.log(`📊 ${sameCurrency.length} lojas encontradas (${pricesForAverage.length} usadas para média)`);
    console.log(`💰 Preço médio: R$ ${avg.toFixed(2)}`);
    
    console.log(`🏪 Lojas usadas no cálculo da média:`);
    pricesForAverage.forEach((item: any, index: number) => {
      console.log(`🏪 ${index + 1}. ${item.source} - R$ ${item.price}`);
    });

    return {
      query: q,
      currency: dominantCurrency === "UNKNOWN" ? null : dominantCurrency,
      average_price: Number(avg.toFixed(2)),
      count: pricesForAverage.length, // Usar apenas as lojas consideradas no cálculo
      results: pricesForAverage
        .sort((a: any, b: any) => a.price - b.price)
        .map(({ title, source, link, price, currency }: any) => ({
          title, store: source, link, price, currency
        })),
    };
  } catch (err) {
    console.error('❌ Erro na busca de preços:', err);
    return {
      query: productName,
      currency: null,
      average_price: null,
      count: 0,
      results: [],
      note: "Falha ao consultar a SerpApi."
    };
  }
}

// Função para converter para o formato esperado pela aplicação
export async function scrapeBrazilianPricesNew(productName: string): Promise<InsertBrazilianPrice[]> {
  console.log(`🌎 Nova busca para: ${productName}`);
  
  const priceData = await getAveragePrices(productName);
  
  if (priceData.results.length === 0) {
    console.log('❌ Nenhum resultado encontrado');
    return [];
  }

  // Converter para formato da aplicação
  const convertedResults: InsertBrazilianPrice[] = priceData.results.map(item => ({
    productName: item.title || productName,
    productBrand: null,
    productModel: null,
    productVariant: null,
    storeName: item.store || 'Loja não identificada',
    storeUrl: '#',
    productUrl: item.link || '#',
    price: item.price.toFixed(2),
    currency: item.currency || 'BRL',
    availability: 'in_stock',
    isActive: true,
  }));

  // Salvar histórico
  await savePriceHistory(convertedResults);
  
  console.log(`✅ Convertidos ${convertedResults.length} resultados`);
  return convertedResults;
}

// Função para salvar histórico de preços
async function savePriceHistory(prices: InsertBrazilianPrice[]): Promise<void> {
  try {
    const historyEntries: InsertPriceHistory[] = prices.map(price => ({
      id: nanoid(),
      productName: price.productName,
      price: parseFloat(price.price).toString(),
      currency: price.currency || 'BRL',
      storeName: price.storeName,
      scrapedAt: new Date(),
      isActive: true
    }));

    if (historyEntries.length > 0) {
      await db.insert(priceHistory).values(historyEntries);
      console.log(`📊 Histórico salvo: ${historyEntries.length} preços registrados`);
    }
  } catch (error) {
    console.error('❌ Erro ao salvar histórico:', error);
  }
}