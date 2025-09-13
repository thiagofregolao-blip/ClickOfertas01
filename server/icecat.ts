import fetch from 'node-fetch';

interface IcecatProduct {
  id: string;
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  images: string[];
}

interface IcecatGalleryItem {
  Pic?: string;
  Pic500x500?: string;
  ThumbPic?: string;
}

interface IcecatApiResponse {
  Gallery?: IcecatGalleryItem[];
  data?: {
    Gallery?: IcecatGalleryItem[];
    GeneralInfo?: {
      Title?: string;
      Description?: string;
      Brand?: string;
      Category?: {
        Name?: string;
      };
    };
  };
  GeneralInfo?: {
    Title?: string;
    Description?: string;
    Brand?: string;
    Category?: {
      Name?: string;
    };
  };
}

const ICECAT_API_BASE = 'https://live.icecat.biz/api';

/**
 * Busca produto no Icecat via GTIN/EAN/UPC
 */
export async function searchProductByGTIN(gtin: string): Promise<IcecatProduct | null> {
  try {
    console.log(`🔍 Buscando produto no Icecat com GTIN: ${gtin}`);

    const headers = {
      'api_token': process.env.ICECAT_API_TOKEN!,
      'content_token': process.env.ICECAT_CONTENT_TOKEN!,
    };

    // Buscar apenas galeria para ter imagens
    const shopname = process.env.ICECAT_USER?.trim() || '';
    const cleanGtin = gtin.trim();
    const galleryUrl = `${ICECAT_API_BASE}?lang=PT&shopname=${encodeURIComponent(shopname)}&GTIN=${encodeURIComponent(cleanGtin)}&content=gallery`;
    
    console.log(`📡 Fazendo requisição para galeria: ${galleryUrl}`);
    const galleryResponse = await fetch(galleryUrl, { headers });
    
    if (!galleryResponse.ok) {
      const errorText = await galleryResponse.text();
      console.warn(`⚠️ Erro na API do Icecat (galeria): ${galleryResponse.status} ${galleryResponse.statusText}`);
      console.warn(`📄 Resposta de erro:`, errorText);
      console.warn(`🔧 Headers enviados:`, JSON.stringify(headers, null, 2));
      return null;
    }

    const galleryData: IcecatApiResponse = await galleryResponse.json();
    console.log(`📸 Resposta da galeria:`, JSON.stringify(galleryData, null, 2));

    // Buscar informações gerais do produto
    const infoUrl = `${ICECAT_API_BASE}?lang=PT&shopname=${encodeURIComponent(shopname)}&GTIN=${encodeURIComponent(cleanGtin)}&content=essentialinfo`;
    
    console.log(`📡 Fazendo requisição para info: ${infoUrl}`);
    const infoResponse = await fetch(infoUrl, { headers });
    
    let infoData: IcecatApiResponse = {};
    if (infoResponse.ok) {
      infoData = await infoResponse.json();
      console.log(`📋 Resposta das informações:`, JSON.stringify(infoData, null, 2));
    }

    // Extrair galeria de imagens
    const gallery = galleryData.Gallery || galleryData?.data?.Gallery || [];
    const images = gallery
      .map(item => item.Pic)
      .filter(Boolean)
      .slice(0, 3); // Máximo 3 imagens

    console.log(`🖼️ Imagens encontradas: ${images.length}`);

    // Extrair informações do produto
    const generalInfo = infoData.GeneralInfo || infoData?.data?.GeneralInfo || {};
    
    const product: IcecatProduct = {
      id: gtin,
      name: generalInfo.Title || `Produto ${gtin}`,
      description: generalInfo.Description || '',
      brand: generalInfo.Brand || '',
      category: generalInfo.Category?.Name || 'Eletrônicos',
      images
    };

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
    let infoData: IcecatApiResponse = {};
    if (infoResponse.ok) {
      infoData = await infoResponse.json();
    }

    // Extrair dados
    const gallery = galleryData.Gallery || galleryData?.data?.Gallery || [];
    const images = gallery
      .map(item => item.Pic)
      .filter(Boolean)
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