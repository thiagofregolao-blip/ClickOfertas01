import { getJson } from "serpapi";
import type { InsertBrazilianPrice, InsertPriceHistory } from '@shared/schema';
import { nanoid } from 'nanoid';
import { db } from './db';
import { priceHistory } from '@shared/schema';

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

    // Filtrar apenas produtos principais (não acessórios)
    const mainProducts = items.filter((item: any) => {
      const title = item.title?.toLowerCase() || '';
      const isAccessory = title.includes('capa') || title.includes('película') || 
                        title.includes('protetor') || title.includes('cabo') || 
                        title.includes('adaptador') || title.includes('case') ||
                        title.includes('capinha') || title.includes('cover') ||
                        title.includes('carregador') || title.includes('suporte');
      
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
      const isMainProduct = !isAccessory && isValidPrice;
      
      console.log(`🔍 ${item.title?.substring(0, 50)}... - R$ ${item.price} - ${isAccessory ? 'ACESSÓRIO' : 'PRINCIPAL'} - ${isMainProduct ? 'VÁLIDO' : 'INVÁLIDO'}`);
      
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

    const avg = sameCurrency.reduce((sum: number, it: any) => sum + it.price, 0) / sameCurrency.length;

    console.log(`✅ RESULTADO FINAL:`);
    console.log(`📊 ${sameCurrency.length} lojas encontradas`);
    console.log(`💰 Preço médio: R$ ${avg.toFixed(2)}`);
    
    sameCurrency.forEach((item: any, index: number) => {
      console.log(`🏪 ${index + 1}. ${item.source} - R$ ${item.price}`);
    });

    return {
      query: q,
      currency: dominantCurrency === "UNKNOWN" ? null : dominantCurrency,
      average_price: Number(avg.toFixed(2)),
      count: sameCurrency.length,
      results: sameCurrency
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