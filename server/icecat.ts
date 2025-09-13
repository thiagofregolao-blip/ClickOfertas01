// @ts-ignore
import fetch from 'node-fetch';

const ICECAT_API_BASE = 'https://live.icecat.biz/api';

// ==== CONFIG ====
const ICECAT_USER = process.env.ICECAT_USER;            // seu username (shopname)
const API_TOKEN   = process.env.ICECAT_API_TOKEN;       // datasheet
const CONTENT_TOK = process.env.ICECAT_CONTENT_TOKEN;   // assets/imagens

/**
 * Interface para produto do Icecat
 */
export interface IcecatProduct {
  id: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  images: string[];
  demoAccount?: boolean;
}

/**
 * Interface para galeria do Icecat
 */
interface IcecatGalleryItem {
  Pic?: string;
  Pic500x500?: string;
  ThumbPic?: string;
  LowPic?: string;
}

// ==== UTIL: EAN/UPC ====
const onlyDigits = (s: string) => (s || "").replace(/\D+/g, "");

function isValidEAN13(ean: string): boolean {
  if (!/^\d{13}$/.test(ean)) return false;
  const sum = ean.slice(0,12).split("").reduce((acc,d,i)=>acc+(i%2?3:1)*Number(d),0);
  const cd = (10 - (sum % 10)) % 10;
  return cd === Number(ean[12]);
}

// Extrai GTINs do texto e normaliza UPC-A (12) -> EAN-13 (prefixando 0)
function extractGTINs(text: string): string[] {
  const matches = (text.match(/\d{8,14}/g) || []).map(onlyDigits);
  const eans13 = matches.map(d => d.length === 13 ? d : (d.length === 12 ? "0"+d : null))
                        .filter(Boolean).filter(isValidEAN13);
  return Array.from(new Set(eans13));
}

// ==== LOG DE DIAGNÓSTICO ====
function logFail(ctx: any) {
  const { url, status, bodySample, reason } = ctx;
  console.error(JSON.stringify({
    icecat_call: { url, status, reason, bodySample }
  }, null, 2));
}

// ==== CHAMADAS ICECAT ====
async function fetchGalleryByGTIN(gtin: string): Promise<string[]> {
  const shopname = (ICECAT_USER || '').trim();
  const url = `${ICECAT_API_BASE}?lang=PT&shopname=${encodeURIComponent(shopname)}&GTIN=${encodeURIComponent(gtin)}&content=gallery`;
  const r = await fetch(url, { headers: { "api_token": API_TOKEN!, "content_token": CONTENT_TOK! }});
  const text = await r.text();
  
  if (!r.ok) { 
    logFail({ url, status: r.status, bodySample: text.slice(0,300), reason: "HTTP_NOT_OK" }); 
    throw new Error(`Icecat ${r.status}`); 
  }
  
  const json = JSON.parse(text);
  const gallery = json.Gallery || json?.data?.Gallery || [];
  
  if (!gallery.length) { 
    logFail({ url, status: r.status, bodySample: text.slice(0,300), reason: "EMPTY_GALLERY" }); 
  }
  
  console.log(`✅ Encontradas ${gallery.length} imagens para GTIN ${gtin}`);
  return gallery.map((g: IcecatGalleryItem) => g.Pic).filter(Boolean);
}

// (Opcional) Brand + MPN quando você tiver um MPN real (ex.: "CFI-1216A", "A2848", etc.)
async function fetchGalleryByBrandMPN(brand: string, mpn: string): Promise<string[]> {
  const shopname = (ICECAT_USER || '').trim();
  const url = `${ICECAT_API_BASE}?lang=PT&shopname=${encodeURIComponent(shopname)}&Brand=${encodeURIComponent(brand)}&ProductCode=${encodeURIComponent(mpn)}&content=gallery`;
  const r = await fetch(url, { headers: { "api_token": API_TOKEN!, "content_token": CONTENT_TOK! }});
  const text = await r.text();
  
  if (!r.ok) { 
    logFail({ url, status: r.status, bodySample: text.slice(0,300), reason: "HTTP_NOT_OK" }); 
    throw new Error(`Icecat ${r.status}`); 
  }
  
  const json = JSON.parse(text);
  const gallery = json.Gallery || json?.data?.Gallery || [];
  
  if (!gallery.length) { 
    logFail({ url, status: r.status, bodySample: text.slice(0,300), reason: "EMPTY_GALLERY" }); 
  }
  
  console.log(`✅ Encontradas ${gallery.length} imagens para ${brand} ${mpn}`);
  return gallery.map((g: IcecatGalleryItem) => g.Pic).filter(Boolean);
}

// ==== BUSCA COMPLETA COM DADOS DO PRODUTO ====
async function fetchProductByGTIN(gtin: string): Promise<IcecatProduct | null> {
  const shopname = (ICECAT_USER || '').trim();
  const url = `${ICECAT_API_BASE}?lang=PT&shopname=${encodeURIComponent(shopname)}&GTIN=${encodeURIComponent(gtin)}&content=essentialinfo,gallery`;
  const r = await fetch(url, { headers: { "api_token": API_TOKEN!, "content_token": CONTENT_TOK! }});
  const text = await r.text();
  
  if (!r.ok) { 
    logFail({ url, status: r.status, bodySample: text.slice(0,300), reason: "HTTP_NOT_OK" }); 
    return null;
  }
  
  const json = JSON.parse(text);
  
  // Se tem galeria mas não tem GeneralInfo, criar produto básico
  if (!json.data?.GeneralInfo) {
    if (json.data?.Gallery && json.data.Gallery.length > 0) {
      console.log(`⚠️ Produto ${gtin} tem galeria mas sem GeneralInfo - criando produto básico`);
      return createBasicProductFromGallery(gtin, json.data.Gallery, `Produto ${gtin}`);
    }
    logFail({ url, status: r.status, bodySample: text.slice(0,300), reason: "NO_GENERAL_INFO" });
    return null;
  }
  
  return parseIcecatProduct(json, gtin);
}

async function fetchProductByBrandMPN(brand: string, mpn: string): Promise<IcecatProduct | null> {
  const shopname = (ICECAT_USER || '').trim();
  const url = `${ICECAT_API_BASE}?lang=PT&shopname=${encodeURIComponent(shopname)}&Brand=${encodeURIComponent(brand)}&ProductCode=${encodeURIComponent(mpn)}&content=essentialinfo,gallery`;
  const r = await fetch(url, { headers: { "api_token": API_TOKEN!, "content_token": CONTENT_TOK! }});
  const text = await r.text();
  
  if (!r.ok) { 
    logFail({ url, status: r.status, bodySample: text.slice(0,300), reason: "HTTP_NOT_OK" }); 
    return null;
  }
  
  const json = JSON.parse(text);
  
  // Se tem galeria mas não tem GeneralInfo, criar produto básico
  if (!json.data?.GeneralInfo) {
    if (json.data?.Gallery && json.data.Gallery.length > 0) {
      console.log(`⚠️ Produto ${brand} ${mpn} tem galeria mas sem GeneralInfo - criando produto básico`);
      return createBasicProductFromGallery(`${brand}-${mpn}`, json.data.Gallery, `${brand} ${mpn}`);
    }
    logFail({ url, status: r.status, bodySample: text.slice(0,300), reason: "NO_GENERAL_INFO" });
    return null;
  }
  
  return parseIcecatProduct(json, `${brand} ${mpn}`);
}

/**
 * Cria um produto básico apenas com galeria (quando não há GeneralInfo)
 */
function createBasicProductFromGallery(id: string, gallery: any[], fallbackName: string): IcecatProduct | null {
  try {
    // Prioritizar imagens de melhor qualidade
    const images = gallery
      .map((galleryItem: IcecatGalleryItem) => 
        galleryItem.Pic500x500 || galleryItem.Pic || galleryItem.ThumbPic || galleryItem.LowPic
      )
      .filter((url): url is string => Boolean(url))
      .slice(0, 3);

    if (images.length === 0) {
      console.warn('❌ Galeria sem imagens válidas');
      return null;
    }

    // Tentar extrair marca do nome se possível
    let brand = 'Desconhecida';
    const lowerName = fallbackName.toLowerCase();
    for (const [alias, brandName] of BRAND_ALIASES.entries()) {
      if (lowerName.includes(alias)) {
        brand = brandName;
        break;
      }
    }

    const product: IcecatProduct = {
      id,
      name: fallbackName,
      description: `Produto encontrado no Icecat - ${images.length} imagens disponíveis`,
      brand,
      category: 'Eletrônicos',
      images,
      demoAccount: false
    };

    console.log(`✅ Produto básico criado: ${product.name} (${images.length} imagens)`);
    return product;

  } catch (error) {
    console.error('❌ Erro ao criar produto básico:', error);
    return null;
  }
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

    console.log(`✅ Produto parseado: ${name} (${brand})`);

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

// ==== MAPEAMENTO DE ALIASES CONHECIDOS ====
const KNOWN_MPNS = new Map([
  // PlayStation 5 (Sony)
  ["playstation5", "CFI-1115A"],
  ["playstation 5", "CFI-1115A"],
  ["ps5", "CFI-1115A"],
  
  // Xbox Series X (Microsoft)
  ["xbox series x", "FMT-00015"],
  ["xsx", "FMT-00015"],
  
  // Exemplos de iPhones (Apple) - códigos modelo reais  
  ["iphone15", "A3089"],
  ["iphone 15", "A3089"],
  ["iphone15pro", "A3102"],
  ["iphone 15 pro", "A3102"],
]);

const BRAND_ALIASES = new Map([
  ["playstation", "Sony"],
  ["ps5", "Sony"],
  ["ps4", "Sony"],
  ["xbox", "Microsoft"],
  ["iphone", "Apple"],
  ["ipad", "Apple"],
  ["macbook", "Apple"],
  ["galaxy", "Samsung"],
  ["surface", "Microsoft"],
]);

function resolveBrandAndMPN(text: string): { brand?: string; mpn?: string } {
  const lowerText = text.toLowerCase().trim();
  
  // Primeiro, verificar se o texto inteiro corresponde a um MPN conhecido
  if (KNOWN_MPNS.has(lowerText)) {
    const mpn = KNOWN_MPNS.get(lowerText)!;
    
    // Determinar a marca pelo MPN
    if (mpn.startsWith("CFI-")) return { brand: "Sony", mpn };
    if (mpn.startsWith("FMT-")) return { brand: "Microsoft", mpn };
    if (mpn.startsWith("A")) return { brand: "Apple", mpn };
  }
  
  // Segundo, tentar resolver pela marca no texto
  for (const [alias, brand] of BRAND_ALIASES.entries()) {
    if (lowerText.includes(alias)) {
      // Procurar por um MPN conhecido que contenha parte do texto
      for (const [textKey, mpn] of KNOWN_MPNS.entries()) {
        if (lowerText.includes(textKey.replace(/\s+/g, "")) || textKey.includes(alias)) {
          return { brand, mpn };
        }
      }
      
      return { brand }; // Apenas a marca, sem MPN específico
    }
  }
  
  return {};
}

// ==== ENTRADA TEXTO → PRODUTOS ====
export async function searchProductByText(texto: string, lang: string = 'PT'): Promise<IcecatProduct[]> {
  console.log(`🔍 Buscando produtos no Icecat por texto: "${texto}" (lang: ${lang})`);
  
  try {
    // 1) GTIN direto (melhor caminho)
    const gtins = extractGTINs(texto);
    if (gtins.length) {
      console.log(`🎯 GTIN encontrado: ${gtins[0]}`);
      try { 
        const product = await fetchProductByGTIN(gtins[0]);
        if (product) {
          return [product];
        }
      } catch (e) { 
        console.warn(`⚠️ GTIN ${gtins[0]} falhou:`, (e as Error).message);
      }
    }

    // 2) Brand+MPN (quando temos um MPN real)
    const { brand, mpn } = resolveBrandAndMPN(texto);
    if (brand && mpn) {
      console.log(`🎯 Brand + MPN identificados: ${brand} + ${mpn}`);
      try {
        const product = await fetchProductByBrandMPN(brand, mpn);
        if (product) {
          return [product];
        }
      } catch (e) {
        console.warn(`⚠️ Brand + MPN falhou:`, (e as Error).message);
      }
    }

    // 3) Fallback para EN se estava em PT
    if (lang === 'PT') {
      console.log('🔄 Tentando fallback para EN...');
      return searchProductByText(texto, 'EN');
    }

    // 4) Sem identificador -> falha clara
    console.warn("⚠️ Produto não encontrado: forneça um GTIN (EAN/UPC) válido ou Brand+MPN real.");
    console.log(`💡 Dicas:`);
    console.log(`   • GTIN válido: "0711719709695" (PS5)`);
    console.log(`   • Texto com MPN: "PlayStation 5" → Sony CFI-1115A`);
    console.log(`   • Marcas suportadas: ${Array.from(BRAND_ALIASES.values()).join(', ')}`);
    
    return [];

  } catch (error) {
    console.error(`❌ Erro ao buscar por texto no Icecat:`, error);
    return [];
  }
}

// ==== BUSCA POR GTIN (COMPATIBILIDADE) ====
export async function searchProductByGTIN(gtin: string, lang: string = 'PT'): Promise<IcecatProduct | null> {
  console.log(`🔍 Buscando produto no Icecat via GTIN: ${gtin} (lang: ${lang})`);
  
  try {
    return await fetchProductByGTIN(gtin);
  } catch (error) {
    console.error(`❌ Erro ao buscar GTIN no Icecat:`, error);
    
    // Tentar fallback para EN se foi PT
    if (lang === 'PT') {
      console.log('🔄 Tentando fallback para EN...');
      return searchProductByGTIN(gtin, 'EN');
    }
    
    return null;
  }
}

// ==== FUNÇÃO PÚBLICA PARA IMAGENS ====
export async function imagensPorTexto(texto: string, hints: { brand?: string; mpn?: string } = {}): Promise<string[]> {
  // 1) GTIN direto
  const gtins = extractGTINs(texto);
  if (gtins.length) {
    try { 
      return await fetchGalleryByGTIN(gtins[0]); 
    } catch (e) { 
      console.warn(`⚠️ GTIN ${gtins[0]} falhou:`, (e as Error).message);
    }
  }

  // 2) Brand+MPN (só se você tiver um MPN real; "iPhone 15 Pro" não é MPN)
  if (hints.brand && hints.mpn) {
    try {
      return await fetchGalleryByBrandMPN(hints.brand, hints.mpn);
    } catch (e) {
      console.warn(`⚠️ Brand+MPN ${hints.brand}+${hints.mpn} falhou:`, (e as Error).message);
    }
  }

  // 3) Tentar resolver automaticamente
  const { brand, mpn } = resolveBrandAndMPN(texto);
  if (brand && mpn) {
    try {
      return await fetchGalleryByBrandMPN(brand, mpn);
    } catch (e) {
      console.warn(`⚠️ Auto Brand+MPN ${brand}+${mpn} falhou:`, (e as Error).message);
    }
  }

  // 4) Sem identificador -> falha clara
  throw new Error("Produto não encontrado: forneça um GTIN (EAN/UPC) válido ou Brand+MPN real.");
}