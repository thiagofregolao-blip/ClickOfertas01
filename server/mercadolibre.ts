/**
 * MercadoLibre Paraguay API integration
 * Busca produtos e extrai imagens/dados para complementar Icecat
 */

// Cache in-memory para chamadas MercadoLibre (5min TTL)
class MercadoLibreCache {
  private cache = new Map<string, { data: any; expires: number }>();

  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  clear() {
    this.cache.clear();
  }
}

const mlCache = new MercadoLibreCache();

// Fetch com timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (controller.signal.aborted) {
      throw new Error(`MercadoLibre API timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

export interface MercadoLibreProduct {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  condition: string;
  thumbnail: string;
  pictures?: Array<{
    id: string;
    url: string;
    secure_url: string;
    size: string;
    max_size: string;
  }>;
  attributes?: Array<{
    id: string;
    name: string;
    value_name: string;
  }>;
  category_id: string;
  seller_id: number;
  permalink: string;
}

export interface MercadoLibreSearchResult {
  site_id: string;
  query: string;
  results: MercadoLibreProduct[];
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
}

/**
 * Busca produtos no MercadoLibre Paraguay
 */
export async function searchMercadoLibreProducts(query: string, limit: number = 10): Promise<MercadoLibreProduct[]> {
  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const cacheKey = `ml_search:${encodedQuery}:${limit}`;
    
    // Check cache first
    const cached = mlCache.get(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit for MercadoLibre search: "${query}"`);
      return cached;
    }

    const searchUrl = `https://api.mercadolibre.com/sites/MPY/search?q=${encodedQuery}&limit=${limit}`;
    
    console.log(`🔍 Buscando no MercadoLibre Paraguay: "${query}"`);
    
    const response = await fetchWithTimeout(searchUrl, {
      headers: {
        'User-Agent': 'ClickOfertas/1.0',
      },
    }, 10000); // 10 second timeout

    if (!response.ok) {
      throw new Error(`MercadoLibre API error: ${response.status} ${response.statusText}`);
    }

    const data: MercadoLibreSearchResult = await response.json();
    
    console.log(`✅ MercadoLibre encontrou ${data.results.length} produtos para "${query}"`);
    
    // Cache results for 5 minutes
    mlCache.set(cacheKey, data.results);
    
    return data.results;
    
  } catch (error: any) {
    console.error('❌ Erro ao buscar no MercadoLibre:', error.message);
    throw new Error(`Falha na busca MercadoLibre: ${error.message}`);
  }
}

/**
 * Busca detalhes completos de um produto específico
 */
export async function getMercadoLibreProductDetails(itemId: string): Promise<MercadoLibreProduct> {
  try {
    const cacheKey = `ml_details:${itemId}`;
    
    // Check cache first
    const cached = mlCache.get(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit for MercadoLibre details: ${itemId}`);
      return cached;
    }

    console.log(`🔍 Buscando detalhes do produto MercadoLibre: ${itemId}`);
    
    const detailUrl = `https://api.mercadolibre.com/items/${itemId}`;
    
    const response = await fetchWithTimeout(detailUrl, {
      headers: {
        'User-Agent': 'ClickOfertas/1.0',
      },
    }, 10000); // 10 second timeout

    if (!response.ok) {
      throw new Error(`MercadoLibre item API error: ${response.status} ${response.statusText}`);
    }

    const product: MercadoLibreProduct = await response.json();
    
    console.log(`✅ Detalhes carregados para produto: ${product.title}`);
    
    // Cache results for 5 minutes
    mlCache.set(cacheKey, product);
    
    return product;
    
  } catch (error: any) {
    console.error('❌ Erro ao carregar detalhes MercadoLibre:', error.message);
    throw new Error(`Falha ao carregar produto: ${error.message}`);
  }
}

/**
 * Converte produto MercadoLibre para formato compatível com nosso sistema
 */
export function convertMercadoLibreToProduct(mlProduct: MercadoLibreProduct) {
  // 🎯 MAPEAMENTO INTELIGENTE: usa título (category_id são IDs técnicos como MPY123456)
  const getCategory = (product: MercadoLibreProduct): string => {
    const title = product.title.toLowerCase();
    
    // Eletrônicos mais populares no Paraguai
    if (title.includes('celular') || title.includes('móvil') || title.includes('smartphone') || title.includes('iphone') || title.includes('samsung galaxy')) {
      return 'Eletrônicos > Celulares';
    }
    if (title.includes('notebook') || title.includes('laptop') || title.includes('computador') || title.includes('pc') || title.includes('macbook')) {
      return 'Eletrônicos > Computadores';
    }
    if (title.includes('tablet') || title.includes('ipad')) {
      return 'Eletrônicos > Tablets';
    }
    if (title.includes('fone') || title.includes('auricular') || title.includes('headphone') || title.includes('earbuds') || title.includes('airpods')) {
      return 'Eletrônicos > Áudio';
    }
    if (title.includes('tv') || title.includes('televisor') || title.includes('smart tv') || title.includes('led') || title.includes('oled')) {
      return 'Eletrônicos > TVs';
    }
    
    // Perfumes e cosméticos (muito populares no turismo paraguaio)
    if (title.includes('perfume') || title.includes('colônia') || title.includes('fragancia') || title.includes('eau de')) {
      return 'Beleza > Perfumes';
    }
    if (title.includes('maquillaje') || title.includes('maquiagem') || title.includes('cosmético') || title.includes('labial') || title.includes('base')) {
      return 'Beleza > Maquiagem';
    }
    
    // Bebidas (outro forte do Paraguai)
    if (title.includes('whisky') || title.includes('vodka') || title.includes('gin') || title.includes('rum') || title.includes('licor')) {
      return 'Bebidas > Destilados';
    }
    if (title.includes('vinho') || title.includes('vino') || title.includes('cerveja') || title.includes('cerveza')) {
      return 'Bebidas > Vinhos e Cervejas';
    }
    
    // Moda
    if (title.includes('roupa') || title.includes('ropa') || title.includes('camiseta') || title.includes('camisa') || title.includes('vestido') || title.includes('calça')) {
      return 'Moda > Roupas';
    }
    if (title.includes('zapato') || title.includes('sapato') || title.includes('tênis') || title.includes('sneaker') || title.includes('sandália')) {
      return 'Moda > Calçados';
    }
    
    // Casa
    if (title.includes('mueble') || title.includes('móvel') || title.includes('mesa') || title.includes('silla') || title.includes('sofá')) {
      return 'Casa > Móveis';
    }
    
    return 'Geral > Diversos'; // fallback mais neutro
  };

  // Extrair marca dos atributos ou título
  const getBrand = (product: MercadoLibreProduct): string => {
    const brandAttribute = product.attributes?.find(attr => 
      attr.id === 'BRAND' || attr.name.toLowerCase().includes('marca')
    );
    
    if (brandAttribute) {
      return brandAttribute.value_name;
    }
    
    // Tentar extrair marca do título
    const title = product.title.toLowerCase();
    const commonBrands = [
      'samsung', 'apple', 'iphone', 'xiaomi', 'huawei', 'lg', 'sony', 'motorola',
      'hp', 'dell', 'lenovo', 'asus', 'acer', 'msi',
      'tp-link', 'tenda', 'mercusys', 'linksys',
      'kingston', 'sandisk', 'corsair', 'adata',
      'logitech', 'razer', 'steelseries',
      'jbl', 'beats', 'bose', 'marshall',
      'philips', 'braun', 'oral-b',
      'lego', 'mattel', 'hasbro'
    ];
    
    for (const brand of commonBrands) {
      if (title.includes(brand)) {
        return brand.charAt(0).toUpperCase() + brand.slice(1);
      }
    }
    
    return 'Diversos';
  };

  // Extrair imagens
  const images = mlProduct.pictures?.slice(0, 3).map(pic => pic.secure_url || pic.url) || [mlProduct.thumbnail];

  return {
    id: mlProduct.id,
    name: mlProduct.title,
    description: `Produto encontrado no MercadoLibre Paraguay. Preço: ${mlProduct.currency_id} ${mlProduct.price.toLocaleString()}. Condição: ${mlProduct.condition}`,
    category: getCategory(mlProduct),
    brand: getBrand(mlProduct),
    images: images.filter(Boolean), // Remove URLs vazias
    price: mlProduct.price,
    currency: mlProduct.currency_id,
    condition: mlProduct.condition,
    sourceType: 'mercadolibre',
    externalUrl: mlProduct.permalink,
    marketplaceData: {
      sellerId: mlProduct.seller_id,
      categoryId: mlProduct.category_id,
      mlItemId: mlProduct.id
    }
  };
}

/**
 * Busca híbrida: tenta encontrar produtos relevantes
 */
export async function hybridProductSearch(query: string) {
  try {
    console.log(`🔄 Iniciando busca híbrida para: "${query}"`);
    
    // Buscar no MercadoLibre Paraguay
    const mlProducts = await searchMercadoLibreProducts(query, 5);
    
    // Converter para formato padrão
    const products = mlProducts.map(convertMercadoLibreToProduct);
    
    // Buscar detalhes para os primeiros 3 produtos (com imagens)
    const detailedProducts = await Promise.all(
      products.slice(0, 3).map(async (product) => {
        try {
          const details = await getMercadoLibreProductDetails(product.id);
          return convertMercadoLibreToProduct(details);
        } catch (error) {
          console.warn(`⚠️ Não foi possível carregar detalhes para ${product.id}`);
          return product; // Retorna versão básica se falhar
        }
      })
    );
    
    console.log(`✅ Busca híbrida concluída: ${detailedProducts.length} produtos encontrados`);
    
    return detailedProducts;
    
  } catch (error: any) {
    console.error('❌ Erro na busca híbrida:', error.message);
    throw error;
  }
}