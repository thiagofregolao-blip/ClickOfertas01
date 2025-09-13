// @ts-ignore
import fetch from 'node-fetch';

const ICECAT_API_BASE = 'https://live.icecat.biz/api';

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

/**
 * Mapeamento de aliases de marca para nomes corretos
 */
const BRAND_ALIASES = new Map([
  // Apple
  ["iphone", "Apple"],
  ["ipad", "Apple"],
  ["macbook", "Apple"],
  ["airpods", "Apple"],
  ["apple", "Apple"],
  // Sony
  ["playstation", "Sony"],
  ["ps5", "Sony"],
  ["ps4", "Sony"],
  ["ps3", "Sony"],
  ["sony", "Sony"],
  // Samsung
  ["galaxy", "Samsung"],
  ["note", "Samsung"],
  ["samsung", "Samsung"],
  // Microsoft
  ["xbox", "Microsoft"],
  ["surface", "Microsoft"],
  ["microsoft", "Microsoft"],
  // Outras marcas comuns
  ["xiaomi", "Xiaomi"],
  ["huawei", "Huawei"],
  ["lg", "LG"],
  ["motorola", "Motorola"],
  ["dell", "Dell"],
  ["hp", "HP"],
  ["lenovo", "Lenovo"],
  ["asus", "Asus"],
  ["acer", "Acer"]
]);

/**
 * Lista de marcas canônicas suportadas
 */
const CANONICAL_BRANDS = [
  "Apple", "Samsung", "Sony", "Xiaomi", "LG", "Motorola", 
  "Dell", "HP", "Lenovo", "Asus", "Acer", "Microsoft", "Huawei"
];

/**
 * Função helper para obter header de autenticação básica se disponível
 */
function getAuthHeader(): string | null {
  const user = process.env.ICECAT_USER;
  if (!user) return null;
  
  // Se tiver senha, usar Basic Auth  
  // (geralmente não é necessário para tokens, mas alguns casos podem exigir)
  return null; // Por enquanto, vamos usar apenas os tokens
}

/**
 * Extrai apenas dígitos de uma string
 */
function onlyDigits(s: string): string {
  return (s || "").replace(/\D+/g, "");
}

/**
 * Valida se um EAN-13 é válido
 */
function isValidEAN13(ean: string): boolean {
  if (!/^\d{13}$/.test(ean)) return false;
  const sum = ean.slice(0, 12).split("").reduce((acc, d, i) => acc + (i % 2 ? 3 : 1) * Number(d), 0);
  const cd = (10 - (sum % 10)) % 10;
  return cd === Number(ean[12]);
}

/**
 * Extrai GTINs válidos do texto
 */
function extractGTINs(text: string): string[] {
  const digits = (text.match(/\d{8,14}/g) || []).map(onlyDigits);
  // Normalizar para EAN-13 quando possível
  const eans13 = digits
    .map(d => d.length === 13 ? d : (d.length === 12 ? "0" + d : null))
    .filter((d): d is string => Boolean(d))
    .filter(isValidEAN13);
  return Array.from(new Set(eans13));
}

/**
 * Resolve marca a partir do texto usando aliases
 */
function resolveBrand(text: string): string | null {
  const t = text.toLowerCase();
  
  // Primeiro, verificar aliases
  for (const entry of BRAND_ALIASES.entries()) {
    const [alias, brand] = entry;
    if (t.includes(alias)) return brand;
  }
  
  // Fallback: marcas canônicas
  const hit = CANONICAL_BRANDS.find(b => t.includes(b.toLowerCase()));
  return hit || null;
}

/**
 * Extrai MPN (Model Part Number) por padrões conhecidos
 */
function extractMPN(text: string, brand: string): string | null {
  const t = text.toUpperCase().replace(/\s+/g, "");
  
  if (brand === "Sony") {
    // PS5: CFI-xxxxA/B (varia por região/lote)
    const m = t.match(/CFI-\d{4}[A-Z]/);
    if (m) return m[0];
  }
  
  if (brand === "Apple") {
    // iPhone: modelos tipo A2848/A3105 (não é "iPhone 15 Pro")
    const m = t.match(/\bA\d{4}\b/);
    if (m) return m[0];
  }
  
  return null;
}

/**
 * Log detalhado das chamadas Icecat para debug
 */
function logIcecatCall(url: any, headers: Record<string, string>, status: number, body: string) {
  console.log(`🔍 Icecat Debug:`, JSON.stringify({
    url: url.replace(/&?(api_token|content_token)=[^&]*/g, '&[TOKEN_HIDDEN]'),
    headers: Object.keys(headers),
    status,
    sample: body?.slice?.(0, 300)
  }, null, 2));
}

/**
 * Busca imagens por GTIN no Icecat
 */
async function fetchGalleryByGTIN(gtin: string, lang: string = 'PT'): Promise<string[]> {
  const headers: Record<string, string> = {
    'api_token': process.env.ICECAT_API_TOKEN!,        // underscore!
    'content_token': process.env.ICECAT_CONTENT_TOKEN! // underscore!
  };

  const shopname = process.env.ICECAT_USER?.trim() || '';
  const url = `${ICECAT_API_BASE}?lang=${lang}&shopname=${encodeURIComponent(shopname)}&GTIN=${encodeURIComponent(gtin)}&content=gallery`;
  
  console.log(`🔍 Buscando galeria por GTIN: ${gtin}`);
  
  const response = await fetch(url, { headers });
  const body = await response.text();
  
  if (!response.ok) {
    logIcecatCall(url, headers, response.status, body);
    throw new Error(`Icecat ${response.status}: ${body}`);
  }
  
  const json = JSON.parse(body);
  // Algumas contas retornam em json.Gallery; outras em json.data.Gallery
  const gallery = json.Gallery || json?.data?.Gallery || [];
  
  const images = gallery.map((g: IcecatGalleryItem) => g.Pic).filter(Boolean);
  console.log(`✅ Encontradas ${images.length} imagens para GTIN ${gtin}`);
  
  return images;
}

/**
 * Busca produto por Brand + ProductCode no Icecat
 */
async function fetchByBrandMPN(brand: string, productCode: string, lang: string = 'PT'): Promise<IcecatProduct | null> {
  const headers: Record<string, string> = {
    'api_token': process.env.ICECAT_API_TOKEN!,        // underscore!
    'content_token': process.env.ICECAT_CONTENT_TOKEN! // underscore!
  };

  const shopname = process.env.ICECAT_USER?.trim() || '';
  const url = `${ICECAT_API_BASE}?lang=${lang}&shopname=${encodeURIComponent(shopname)}&Brand=${encodeURIComponent(brand)}&ProductCode=${encodeURIComponent(productCode)}&content=essentialinfo,gallery`;
  
  console.log(`🔍 Buscando por Brand + MPN: ${brand} + ${productCode}`);
  
  const response = await fetch(url, { headers });
  const body = await response.text();
  
  if (!response.ok) {
    logIcecatCall(url, headers, response.status, body);
    return null;
  }
  
  const json = JSON.parse(body);
  
  if (json.data?.GeneralInfo) {
    const product = parseIcecatProduct(json, `${brand} ${productCode}`);
    if (product) {
      console.log(`✅ Produto encontrado: ${product.name}`);
      return product;
    }
  }
  
  return null;
}

/**
 * Busca produto no Icecat via texto (IMPLEMENTAÇÃO CORRIGIDA)
 * Algoritmo em 3 passos: GTIN → Brand+MPN → Erro explicativo
 */
export async function searchProductByText(searchText: string, lang: string = 'PT'): Promise<IcecatProduct[]> {
  try {
    console.log(`🔍 Buscando produtos no Icecat por texto: "${searchText}" (lang: ${lang})`);

    // PASSO 1: Tentar extrair GTIN do texto (melhor caminho)
    const gtins = extractGTINs(searchText);
    if (gtins.length > 0) {
      console.log(`🎯 GTIN encontrado: ${gtins[0]}`);
      try {
        const images = await fetchGalleryByGTIN(gtins[0], lang);
        if (images.length > 0) {
          // Buscar dados completos do produto
          const product = await searchProductByGTIN(gtins[0], lang);
          if (product) {
            return [product];
          }
        }
      } catch (error) {
        console.warn(`⚠️ GTIN ${gtins[0]} falhou:`, (error as Error).message);
      }
    }

    // PASSO 2: Tentar Brand + MPN (quando tem padrão confiável)
    const brand = resolveBrand(searchText);
    const mpn = extractMPN(searchText, brand || '');
    
    if (brand && mpn) {
      console.log(`🎯 Brand + MPN: ${brand} + ${mpn}`);
      const product = await fetchByBrandMPN(brand, mpn, lang);
      if (product) {
        return [product];
      }
    }

    // PASSO 2.5: Tentar busca simples por marca identificada
    if (brand) {
      console.log(`🎯 Tentando busca por marca: ${brand}`);
      // Extrair possível código do produto removendo a marca
      const cleanText = searchText.toLowerCase()
        .replace(new RegExp(brand.toLowerCase(), 'gi'), '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanText.length >= 2) {
        const product = await fetchByBrandMPN(brand, cleanText, lang);
        if (product) {
          return [product];
        }
        
        // Tentar também sem espaços
        const cleanTextNoSpaces = cleanText.replace(/\s+/g, '');
        if (cleanTextNoSpaces !== cleanText && cleanTextNoSpaces.length >= 2) {
          const product = await fetchByBrandMPN(brand, cleanTextNoSpaces, lang);
          if (product) {
            return [product];
          }
        }
      }
    }

    // Tentar fallback para EN se não encontrou nada em PT
    if (lang === 'PT') {
      console.log('🔄 Tentando fallback para EN...');
      return searchProductByText(searchText, 'EN');
    }

    // PASSO 3: Nenhum identificador encontrado
    console.warn('⚠️ Nenhum identificador (GTIN/MPN) válido encontrado no texto');
    console.log(`💡 Dica: Forneça um GTIN (código de barras) ou código de modelo específico`);
    console.log(`💡 Exemplos: "0711719709695" (GTIN PS5) ou "Sony CFI-1115A" (Brand + MPN)`);
    
    return [];

  } catch (error) {
    console.error(`❌ Erro ao buscar por texto no Icecat:`, error);
    return [];
  }
}

/**
 * Busca produto no Icecat via GTIN
 */
export async function searchProductByGTIN(gtin: string, lang: string = 'PT'): Promise<IcecatProduct | null> {
  try {
    console.log(`🔍 Buscando produto no Icecat via GTIN: ${gtin} (lang: ${lang})`);

    const headers: Record<string, string> = {
      'api_token': process.env.ICECAT_API_TOKEN!,        // underscore!
      'content_token': process.env.ICECAT_CONTENT_TOKEN! // underscore!
    };

    // Adicionar Basic Auth se disponível
    const basicAuth = getAuthHeader();
    if (basicAuth) {
      headers['Authorization'] = basicAuth;
    }

    const shopname = process.env.ICECAT_USER?.trim() || '';
    
    // Busca por GTIN
    const url = `${ICECAT_API_BASE}?lang=${lang}&shopname=${encodeURIComponent(shopname)}&GTIN=${encodeURIComponent(gtin)}&content=essentialinfo,gallery`;
    
    console.log(`📡 Fazendo busca por GTIN: ${gtin}`);
    const response = await fetch(url, { headers });
    const body = await response.text();
    
    if (!response.ok) {
      console.warn(`⚠️ Erro na busca por GTIN: ${response.status} ${response.statusText}`);
      logIcecatCall(url, headers, response.status, body);
      
      // Tentar fallback para EN se foi PT
      if (lang === 'PT') {
        console.log('🔄 Tentando fallback para EN...');
        return searchProductByGTIN(gtin, 'EN');
      }
      
      return null;
    }

    const data: any = JSON.parse(body);
    
    console.log(`📊 Busca por GTIN - produto encontrado: ${data.data ? 'Sim' : 'Não'}`);
    
    if (process.env.ICECAT_DEBUG === 'true') {
      console.log(`🔍 Payload de GTIN:`, JSON.stringify(data, null, 2));
    }

    if (data.data?.GeneralInfo) {
      return parseIcecatProduct(data, gtin);
    }

    return null;

  } catch (error) {
    console.error(`❌ Erro ao buscar GTIN no Icecat:`, error);
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