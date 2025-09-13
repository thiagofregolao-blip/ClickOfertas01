// @ts-ignore
import fetch from 'node-fetch';

export interface IcecatProduct {
  id: string;        // GTIN
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  images: string[];
  raw?: any;         // opcional: payload bruto para debug
  demoAccount?: boolean;
}

interface IcecatGalleryItem {
  Pic?: string;
  Pic500x500?: string;
  ThumbPic?: string;
  LowPic?: string;
}

interface IcecatGeneralInfo {
  Title?: string;
  Description?: string | { Value?: string };
  Brand?: string;
  Category?: { Name?: string | { Value?: string } };
}

interface IcecatJsonResponse {
  msg?: string; // "OK" em sucesso
  statusCode?: number;
  message?: string;
  DemoAccount?: boolean;
  ContentErrors?: string;
  data?: {
    GeneralInfo?: IcecatGeneralInfo;
    Gallery?: IcecatGalleryItem[];
    Dictionary?: Record<string, any>;
    DemoAccount?: boolean;
    ContentErrors?: string;
  };
}

const ICECAT_API_BASE = 'https://live.icecat.biz/api';

function normalizeGTIN(gtin: string) {
  return gtin.replace(/[^0-9]/g, '').trim();
}

function getAuthHeader() {
  const user = process.env.ICECAT_USER?.trim();
  const pass = process.env.ICECAT_PASSWORD?.trim();
  if (user && pass) {
    const token = Buffer.from(`${user}:${pass}`).toString('base64');
    return `Basic ${token}`;
  }
  return undefined;
}

/**
 * Lista de marcas comuns para busca no Icecat
 */
const COMMON_BRANDS = [
  'Apple', 'Samsung', 'Sony', 'LG', 'Microsoft', 'Nintendo', 'Dell', 'HP', 'Lenovo', 
  'Asus', 'Acer', 'Canon', 'Nikon', 'Panasonic', 'Philips', 'Xiaomi', 'Huawei', 
  'OnePlus', 'Google', 'Amazon', 'Tesla', 'BMW', 'Mercedes', 'Volkswagen', 'Ford',
  'Adidas', 'Nike', 'Puma', 'Bosch', 'Siemens', 'GE', 'Intel', 'AMD', 'NVIDIA',
  'JBL', 'Bose', 'Beats', 'Sennheiser', 'Logitech', 'Razer', 'Corsair', 'SteelSeries'
];

/**
 * Busca produto no Icecat via Brand + ProductCode
 */
export async function searchProductByText(searchText: string, lang: string = 'BR'): Promise<IcecatProduct[]> {
  try {
    console.log(`🔍 Buscando produtos no Icecat por texto: "${searchText}" (lang: ${lang})`);

    // Dividir o texto para tentar identificar marca e modelo
    const combinations = extractBrandAndModel(searchText);
    
    if (combinations.length === 0) {
      console.warn('⚠️ Não foi possível extrair marca e modelo do texto de busca');
      return [];
    }

    const headers: Record<string, string> = {
      'api-token': process.env.ICECAT_API_TOKEN!,
      'content-token': process.env.ICECAT_CONTENT_TOKEN!,
    };

    // Adicionar Basic Auth se disponível
    const basicAuth = getAuthHeader();
    if (basicAuth) {
      headers['Authorization'] = basicAuth;
    }

    const shopname = process.env.ICECAT_USER?.trim() || '';
    const results: IcecatProduct[] = [];

    // Tentar cada combinação de marca + modelo
    for (const { brand, productCode } of combinations) {
      try {
        // Busca por Brand + ProductCode
        const url = `${ICECAT_API_BASE}?lang=${lang}&shopname=${encodeURIComponent(shopname)}&Brand=${encodeURIComponent(brand)}&ProductCode=${encodeURIComponent(productCode)}&content=essentialinfo,gallery`;
        
        console.log(`📡 Testando: ${brand} + ${productCode}`);
        const response = await fetch(url, { headers });
        
        if (response.ok) {
          const data: any = await response.json();
          
          if (data.data?.GeneralInfo) {
            const product = parseIcecatProduct(data, brand + ' ' + productCode);
            if (product) {
              results.push(product);
              console.log(`✅ Produto encontrado: ${product.name}`);
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao testar ${brand} + ${productCode}:`, error);
      }
      
      // Parar se encontrou produtos suficientes
      if (results.length >= 3) break;
    }

    // Tentar fallback para EN se não encontrou nada em BR
    if (results.length === 0 && lang === 'BR') {
      console.log('🔄 Tentando fallback para EN...');
      return searchProductByText(searchText, 'EN');
    }

    console.log(`✅ ${results.length} produtos encontrados na busca por texto`);
    return results;

  } catch (error) {
    console.error(`❌ Erro ao buscar por texto no Icecat:`, error);
    return [];
  }
}

/**
 * Extrai possíveis combinações de marca + modelo do texto de busca
 */
function extractBrandAndModel(searchText: string): Array<{ brand: string; productCode: string }> {
  const text = searchText.toLowerCase().trim();
  const words = text.split(/\s+/);
  const combinations: Array<{ brand: string; productCode: string }> = [];

  // Procurar por marcas conhecidas no texto
  for (const brand of COMMON_BRANDS) {
    const brandLower = brand.toLowerCase();
    
    // Verificar se a marca está presente no texto
    if (text.includes(brandLower)) {
      // Extrair o resto como código do produto
      const productCode = text
        .replace(new RegExp(brandLower, 'gi'), '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (productCode.length >= 2) {
        combinations.push({ 
          brand: brand, 
          productCode: productCode 
        });
        
        // Também tentar sem espaços
        const productCodeNoSpaces = productCode.replace(/\s+/g, '');
        if (productCodeNoSpaces !== productCode && productCodeNoSpaces.length >= 2) {
          combinations.push({ 
            brand: brand, 
            productCode: productCodeNoSpaces 
          });
        }
      }
    }
  }

  // Se não encontrou marca específica, tentar dividir o texto
  if (combinations.length === 0 && words.length >= 2) {
    // Primeira palavra como marca, resto como modelo
    const possibleBrand = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    const possibleModel = words.slice(1).join(' ');
    
    combinations.push({
      brand: possibleBrand,
      productCode: possibleModel
    });
    
    // Também tentar modelo sem espaços
    const modelNoSpaces = words.slice(1).join('');
    if (modelNoSpaces !== possibleModel) {
      combinations.push({
        brand: possibleBrand,
        productCode: modelNoSpaces
      });
    }
  }

  return combinations.slice(0, 5); // Máximo 5 combinações para evitar excesso de requests
}

/**
 * Parseia um produto do Icecat a partir da resposta da API
 */
function parseIcecatProduct(data: any, fallbackName: string): IcecatProduct | null {
  try {
    const generalInfo = data.data?.GeneralInfo || {};
    const gallery = data.data?.Gallery || [];
    
    // Função helper para unwrap campos que podem vir como { Value: "..." }
    const unwrapValue = (field: any): string => {
      if (!field) return '';
      if (typeof field === 'string') return field;
      if (field.Value) return field.Value;
      if (field.value) return field.value;
      return String(field);
    };
    
    // Prioritizar imagens de melhor qualidade
    const images = gallery
      .map((galleryItem: IcecatGalleryItem) => 
        galleryItem.Pic500x500 || galleryItem.Pic || galleryItem.ThumbPic || galleryItem.LowPic
      )
      .filter((url): url is string => Boolean(url))
      .slice(0, 3);

    // Extrair e normalizar informações do produto
    let name = unwrapValue(generalInfo.Title) || unwrapValue(generalInfo.ProductName) || unwrapValue(generalInfo.Name);
    let description = unwrapValue(generalInfo.Description) || unwrapValue(generalInfo.ShortDesc) || unwrapValue(generalInfo.LongDesc);
    let brand = unwrapValue(generalInfo.Brand) || unwrapValue(generalInfo.Supplier) || unwrapValue(generalInfo.Vendor);
    let category = unwrapValue(generalInfo.Category?.Name) || unwrapValue(generalInfo.CategoryName) || 'Eletrônicos';
    
    // Se o nome está muito genérico, usar o fallback
    if (!name || name.includes('Produto ') || name.length < 3) {
      name = fallbackName;
    }

    return {
      id: data.data?.GTIN || data.data?.ID || `icecat-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      brand: brand.trim(),
      category: category.trim(),
      images,
      demoAccount: data.DemoAccount === true
    } as IcecatProduct;

  } catch (error) {
    console.error('❌ Erro ao parsear produto Icecat:', error);
    return null;
  }
}

/**
 * Busca produto no Icecat via GTIN/EAN/UPC
 */
export async function searchProductByGTIN(gtin: string, lang: string = 'BR'): Promise<IcecatProduct | null> {
  try {
    const cleanGtin = normalizeGTIN(gtin);
    console.log(`🔍 Buscando produto no Icecat com GTIN: ${cleanGtin} (lang: ${lang})`);

    const headers: Record<string, string> = {
      'api-token': process.env.ICECAT_API_TOKEN!,
      'content-token': process.env.ICECAT_CONTENT_TOKEN!,
    };

    // Adicionar Basic Auth se disponível
    const basicAuth = getAuthHeader();
    if (basicAuth) {
      headers['Authorization'] = basicAuth;
    }

    const shopname = process.env.ICECAT_USER?.trim() || '';
    
    // Uma única chamada com conteúdo combinado
    const url = `${ICECAT_API_BASE}?lang=${lang}&shopname=${encodeURIComponent(shopname)}&GTIN=${encodeURIComponent(cleanGtin)}&content=essentialinfo,gallery`;
    
    console.log(`📡 Fazendo requisição: ${url.replace(/&?(api-token|content-token)=[^&]*/g, '')}`);
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      console.warn(`⚠️ Erro na API do Icecat: ${response.status} ${response.statusText}`);
      
      // Tentar fallback para EN se foi BR
      if (lang === 'BR') {
        console.log('🔄 Tentando fallback para EN...');
        return searchProductByGTIN(gtin, 'EN');
      }
      
      const errorText = await response.text();
      console.warn(`📄 Resposta de erro:`, errorText);
      return null;
    }

    const data: IcecatJsonResponse = await response.json();
    
    // Log de debug detalhado
    console.log(`📊 Status: ${data.statusCode}, Message: ${data.message}`);
    console.log(`🏢 DemoAccount: ${data.DemoAccount || data.data?.DemoAccount}`);
    console.log(`⚠️ ContentErrors: ${data.ContentErrors || data.data?.ContentErrors}`);
    
    if (process.env.ICECAT_DEBUG === 'true') {
      console.log(`🔍 Payload completo:`, JSON.stringify(data, null, 2));
    }

    // Verificar se há erros
    if (data.statusCode && data.statusCode !== 200) {
      console.warn(`❌ Icecat retornou erro: ${data.statusCode} - ${data.message}`);
      return null;
    }

    // Extrair informações gerais
    const generalInfo = data.data?.GeneralInfo || {};
    
    // Função helper para unwrap campos que podem vir como { Value: "..." }
    const unwrapValue = (field: any): string => {
      if (!field) return '';
      if (typeof field === 'string') return field;
      if (field.Value) return field.Value;
      if (field.value) return field.value;
      return String(field);
    };
    
    let title = unwrapValue(generalInfo.Title) || unwrapValue(generalInfo.ProductName) || unwrapValue(generalInfo.Name);
    let description = unwrapValue(generalInfo.Description) || unwrapValue(generalInfo.ShortDesc) || unwrapValue(generalInfo.LongDesc);
    let brand = unwrapValue(generalInfo.Brand) || unwrapValue(generalInfo.Supplier) || unwrapValue(generalInfo.Vendor);
    let categoryName = unwrapValue(generalInfo.Category?.Name) || unwrapValue(generalInfo.CategoryName);
    
    // Tratar campos que podem ter estrutura { Value: string }
    if (typeof description === 'object' && description?.Value) {
      description = description.Value;
    }
    if (typeof categoryName === 'object' && categoryName?.Value) {
      categoryName = categoryName.Value;
    }

    // Extrair galeria de imagens com prioridade
    const gallery = data.data?.Gallery || [];
    const images = gallery
      .map((item: IcecatGalleryItem) => item.Pic500x500 || item.Pic || item.ThumbPic || item.LowPic)
      .filter((url): url is string => Boolean(url))
      .slice(0, 3);

    console.log(`🖼️ Imagens encontradas: ${images.length}`);

    const product: IcecatProduct = {
      id: cleanGtin,
      name: title || `Produto ${cleanGtin}`,
      description: (description as string) || '',
      brand: brand || '',
      category: (categoryName as string) || 'Eletrônicos',
      images,
      demoAccount: data.DemoAccount || data.data?.DemoAccount
    };

    // Anexar payload bruto se debug estiver ativo
    if (process.env.ICECAT_DEBUG === 'true') {
      product.raw = data;
    }

    console.log(`✅ Produto encontrado:`, product);
    return product;

  } catch (error) {
    console.error(`❌ Erro ao buscar produto no Icecat:`, error);
    return null;
  }
}

/**
 * Busca produto no Icecat via Brand + Product Code
 */
export async function searchProductByBrandCode(brand: string, productCode: string): Promise<IcecatProduct | null> {
  try {
    console.log(`🔍 Buscando produto no Icecat com Brand: ${brand}, Code: ${productCode}`);

    const headers = {
      'api_token': process.env.ICECAT_API_TOKEN!,
      'content_token': process.env.ICECAT_CONTENT_TOKEN!,
    };

    // Buscar galeria
    const shopname = process.env.ICECAT_USER?.trim() || '';
    const galleryUrl = `${ICECAT_API_BASE}?lang=PT&shopname=${encodeURIComponent(shopname)}&Brand=${encodeURIComponent(brand)}&ProductCode=${encodeURIComponent(productCode)}&content=gallery`;
    
    const galleryResponse = await fetch(galleryUrl, { headers });
    
    if (!galleryResponse.ok) {
      console.warn(`⚠️ Erro na API do Icecat (galeria): ${galleryResponse.status}`);
      return null;
    }

    const galleryData: IcecatApiResponse = await galleryResponse.json();

    // Buscar informações gerais
    const infoUrl = `${ICECAT_API_BASE}?lang=PT&shopname=${encodeURIComponent(shopname)}&Brand=${encodeURIComponent(brand)}&ProductCode=${encodeURIComponent(productCode)}&content=essentialinfo`;
    
    const infoResponse = await fetch(infoUrl, { headers });
    let infoData: IcecatJsonResponse = {};
    if (infoResponse.ok) {
      infoData = await infoResponse.json();
    }

    // Extrair dados
    const gallery = galleryData.Gallery || galleryData?.data?.Gallery || [];
    const images = gallery
      .map((item: IcecatGalleryItem) => item.Pic)
      .filter((url): url is string => Boolean(url))
      .slice(0, 3);

    const generalInfo = infoData.GeneralInfo || infoData?.data?.GeneralInfo || {};
    
    const product: IcecatProduct = {
      id: `${brand}-${productCode}`,
      name: generalInfo.Title || `${brand} ${productCode}`,
      description: generalInfo.Description || '',
      brand: generalInfo.Brand || brand,
      category: generalInfo.Category?.Name || 'Eletrônicos',
      images
    };

    console.log(`✅ Produto encontrado via Brand+Code:`, product);
    return product;

  } catch (error) {
    console.error(`❌ Erro ao buscar produto no Icecat via Brand+Code:`, error);
    return null;
  }
}