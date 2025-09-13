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
 * Busca produto no Icecat via texto/nome
 */
export async function searchProductByText(searchText: string, lang: string = 'BR'): Promise<IcecatProduct[]> {
  try {
    console.log(`🔍 Buscando produtos no Icecat por texto: "${searchText}" (lang: ${lang})`);

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
    
    // Busca por texto
    const url = `${ICECAT_API_BASE}?lang=${lang}&shopname=${encodeURIComponent(shopname)}&SearchText=${encodeURIComponent(searchText)}&limit=5&content=essentialinfo,gallery`;
    
    console.log(`📡 Fazendo busca por texto: ${url.replace(/&?(api-token|content-token)=[^&]*/g, '')}`);
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      console.warn(`⚠️ Erro na busca por texto: ${response.status} ${response.statusText}`);
      
      // Tentar fallback para EN se foi BR
      if (lang === 'BR') {
        console.log('🔄 Tentando fallback para EN...');
        return searchProductByText(searchText, 'EN');
      }
      
      const errorText = await response.text();
      console.warn(`📄 Resposta de erro:`, errorText);
      return [];
    }

    const data: any = await response.json();
    
    console.log(`📊 Busca por texto - resultados encontrados: ${data.products?.length || 0}`);
    
    if (process.env.ICECAT_DEBUG === 'true') {
      console.log(`🔍 Payload de busca:`, JSON.stringify(data, null, 2));
    }

    // Parse dos produtos da busca
    const products = (data.products || []).map((item: any) => {
      const generalInfo = item.GeneralInfo || {};
      const gallery = item.Gallery || [];
      
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
      let name = unwrapValue(generalInfo.Title) || unwrapValue(generalInfo.ProductName) || unwrapValue(item.name);
      let description = unwrapValue(generalInfo.Description) || unwrapValue(generalInfo.ShortDesc) || unwrapValue(generalInfo.LongDesc);
      let brand = unwrapValue(generalInfo.Brand) || unwrapValue(generalInfo.Supplier) || unwrapValue(generalInfo.Vendor);
      let category = unwrapValue(generalInfo.Category?.Name) || unwrapValue(generalInfo.CategoryName) || 'Eletrônicos';
      
      // Se o nome está muito genérico, tentar melhorar
      if (!name || name.includes('Produto ') || name.length < 3) {
        const gtin = item.GTIN || item.ID || '';
        name = brand && gtin ? `${brand} ${gtin}` : (gtin || 'Produto sem nome');
      }

      return {
        id: item.GTIN || item.ID || `search-${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        brand: brand.trim(),
        category: category.trim(),
        images
      } as IcecatProduct;
    }).slice(0, 5); // Máximo 5 resultados

    console.log(`✅ ${products.length} produtos processados da busca por texto`);
    return products;

  } catch (error) {
    console.error(`❌ Erro ao buscar por texto no Icecat:`, error);
    return [];
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