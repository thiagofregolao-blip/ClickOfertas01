/**
 * MercadoLibre Paraguay API integration
 * Busca produtos e extrai imagens/dados para complementar Icecat
 */

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
    const searchUrl = `https://api.mercadolibre.com/sites/MPY/search?q=${encodedQuery}&limit=${limit}`;
    
    console.log(`🔍 Buscando no MercadoLibre Paraguay: "${query}"`);
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'ClickOfertas/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`MercadoLibre API error: ${response.status} ${response.statusText}`);
    }

    const data: MercadoLibreSearchResult = await response.json();
    
    console.log(`✅ MercadoLibre encontrou ${data.results.length} produtos para "${query}"`);
    
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
    console.log(`🔍 Buscando detalhes do produto MercadoLibre: ${itemId}`);
    
    const detailUrl = `https://api.mercadolibre.com/items/${itemId}`;
    
    const response = await fetch(detailUrl, {
      headers: {
        'User-Agent': 'ClickOfertas/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`MercadoLibre item API error: ${response.status} ${response.statusText}`);
    }

    const product: MercadoLibreProduct = await response.json();
    
    console.log(`✅ Detalhes carregados para produto: ${product.title}`);
    
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
  // Extrair categoria do MercadoLibre
  const getCategory = (categoryId: string): string => {
    if (categoryId.includes('celulares') || categoryId.includes('smartphones')) return 'Smartphones';
    if (categoryId.includes('audio') || categoryId.includes('parlantes') || categoryId.includes('auriculares')) return 'Áudio';
    if (categoryId.includes('computacion') || categoryId.includes('notebook') || categoryId.includes('pc')) return 'Computadores';
    if (categoryId.includes('gaming') || categoryId.includes('juegos') || categoryId.includes('consolas')) return 'Consoles';
    if (categoryId.includes('casa') || categoryId.includes('hogar') || categoryId.includes('electrodomesticos')) return 'Eletroportáteis';
    if (categoryId.includes('accesorios') || categoryId.includes('cables') || categoryId.includes('cargadores')) return 'Acessórios';
    if (categoryId.includes('redes') || categoryId.includes('wifi') || categoryId.includes('router')) return 'Redes';
    if (categoryId.includes('almacenamiento') || categoryId.includes('pendrive') || categoryId.includes('memoria')) return 'Armazenamento';
    return 'Eletrônicos'; // fallback
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
    category: getCategory(mlProduct.category_id),
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