/**
 * Normaliza texto em português brasileiro:
 * - Converte para minúscula
 * - Remove acentos
 * - Normaliza espaços
 * - Expansões comuns PT-BR para melhorar matching
 */
export function normPTBR(s: string): string {
  const base = (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // remove pontuação ?!.,:
    .replace(/\s+/g, " ")
    .trim();
  // Expansões comuns PT-BR para melhorar matching
  return base
    .replace(/\bvc\b/g, "voce")
    .replace(/\bvcs\b/g, "voces")
    .replace(/\bq\b/g, "que")
    .replace(/\bpra\b/g, "para")
    .replace(/\btb\b/g, "tambem")
    .replace(/\bpq\b/g, "porque")
    .replace(/\bblz\b/g, "beleza")
    .replace(/\btv's\b/g, "tvs")
    .replace(/\biphone's\b/g, "iphones");
}

export const NUM_EXTENSO: Record<string, string> = {
  "doze": "12",
  "doze pro": "12 pro",
  "treze": "13",
  "treze pro": "13 pro",
  "quatorze": "14",
  "quatorze pro": "14 pro",
  "quinze": "15",
  "quinze pro": "15 pro",
};

// --- NOVO: dicionários canônicos (sempre no singular) ---
// Produtos (itens buscáveis)
export const PRODUCT_CANON: Record<string, string> = {
  // celulares
  "celular": "celular",
  "celulares": "celular",
  "telefone": "celular",
  "telefones": "celular",
  "smartphone": "celular",
  "smartphones": "celular",
  // variantes ES
  "telefono": "celular",
  "telefonos": "celular",

  // iPhone / Galaxy (marcas/modelos)
  "iphone": "iphone",
  "iphones": "iphone",
  "apple": "iphone",
  "galaxy": "galaxy",
  "galaxys": "galaxy",
  "samsung": "galaxy",

  // drones
  "drone": "drone",
  "drones": "drone",
  "mavic": "drone",
  "dji": "drone",

  // câmeras / camaras
  "camera": "camera",
  "cameras": "camera",
  "câmera": "camera",
  "câmeras": "camera",
  "camara": "camera",
  "camaras": "camera",
  "camara deportiva": "camera",
  "camaras deportivas": "camera",
  "action cam": "camera",
  "gopro": "camera",
  "filmadora": "camera",
  "filmadoras": "camera",

  // áudio
  "fone": "fone",
  "fones": "fone",
  "fone de ouvido": "fone",
  "fones de ouvido": "fone",
  "auricular": "fone",
  "auriculares": "fone",
  "headset": "fone",
  "headsets": "fone",
  "caixa de som": "speaker",
  "caixas de som": "speaker",
  "alto falante": "speaker",
  "alto-falante": "speaker",
  "alto falantes": "speaker",
  "alto-falantes": "speaker",
  "parlante": "speaker",
  "parlantes": "speaker",
  "soundbar": "soundbar",
  "soundbars": "soundbar",

  // wearables
  "smartwatch": "smartwatch",
  "smartwatches": "smartwatch",
  "relogio inteligente": "smartwatch",
  "relogios inteligentes": "smartwatch",
  "reloj inteligente": "smartwatch",
  "relojes inteligentes": "smartwatch",

  // informática
  "notebook": "notebook",
  "notebooks": "notebook",
  "laptop": "notebook",
  "laptops": "notebook",
  "computador": "computador",
  "computadores": "computador",
  "pc": "computador",
  "pcs": "computador",
  "monitor": "monitor",
  "monitores": "monitor",
  "teclado": "teclado",
  "teclados": "teclado",
  "mouse": "mouse",
  "mouses": "mouse",
  "raton": "mouse",
  "ratones": "mouse",
  "tablet": "tablet",
  "tablets": "tablet",
  "impresora": "impressora",
  "impresoras": "impressora",
  "impressora": "impressora",
  "impressoras": "impressora",

  // tv
  "tv": "tv",
  "tvs": "tv",
  "televisao": "tv",
  "televisoes": "tv",
  "televisão": "tv",
  "televisões": "tv",
  "televisor": "tv",
  "televisores": "tv",

  // perfumes
  "perfume": "perfume",
  "perfumes": "perfume",
  "perfumaria": "perfume",
  "perfumeria": "perfume",

  // cosméticos
  "cosmetico": "cosmetico",
  "cosmeticos": "cosmetico",
  "cosmético": "cosmetico",
  "cosméticos": "cosmetico",
  "cosmetica": "cosmetico",

  // bebidas
  "bebida": "bebida",
  "bebidas": "bebida",
  "vino": "bebida",
  "vinos": "bebida",
  "whisky": "bebida",
  "gin": "bebida",
  "vodka": "bebida",
  "cerveja": "bebida",
  "cervejas": "bebida",

  // alimentos / comestibles (inclui chocolates)
  "alimento": "alimento",
  "alimentos": "alimento",
  "comestible": "alimento",
  "comestibles": "alimento",
  "chocolate": "alimento",
  "chocolates": "alimento",
  "biscoito": "alimento",
  "biscoitos": "alimento",
  "galleta": "alimento",
  "galletas": "alimento",

  // calçados / calzados
  "calcado": "calcado",
  "calçados": "calcado",
  "calçado": "calcado",
  "calzados": "calcado",
  "tenis": "calcado",
  "tênis": "calcado",
  "zapatilla": "calcado",
  "zapatillas": "calcado",
  "zapato": "calcado",
  "zapatos": "calcado",
  "bota": "calcado",
  "botas": "calcado",

  // esportes / deportes
  "esporte": "esporte",
  "esportes": "esporte",
  "deporte": "esporte",
  "deportes": "esporte",
  "bicicleta": "bicicleta",
  "bicicletas": "bicicleta",
  "raquete": "raquete",
  "raquetas": "raquete",
  "raqueta": "raquete",

  // eletrodomésticos / electrodomesticos
  "eletrodomestico": "eletrodomestico",
  "eletrodomesticos": "eletrodomestico",
  "eletrodoméstico": "eletrodomestico",
  "eletrodomésticos": "eletrodomestico",
  "electrodomestico": "eletrodomestico",
  "electrodomesticos": "eletrodomestico",
  "airfryer": "eletrodomestico",
  "geladeira": "eletrodomestico",
  "cafeteira": "eletrodomestico",
  "aspirador": "eletrodomestico",
  "licuadora": "eletrodomestico",
  "batidora": "eletrodomestico",
  "heladera": "eletrodomestico",

  // casa e decoração / casa y decoración
  "decoracao": "decoracao",
  "decoração": "decoracao",
  "decoracion": "decoracao",
  "casa": "decoracao",
  "hogar": "decoracao",
  "utilidades": "decoracao",

  // camping
  "camping": "camping",
  "acampamento": "camping",

  // brinquedos (comum no mix da loja)
  "brinquedo": "brinquedo",
  "brinquedos": "brinquedo",
  "juguete": "brinquedo",
  "juguetes": "brinquedo",

  // roupas / moda
  "roupa": "roupa",
  "roupas": "roupa",
  "moda": "roupa",
  "vestimenta": "roupa",
  "ropa": "roupa",
  "ropas": "roupa",
  // --- MODA / VESTUÁRIO
  "blusa": "blusa",
  "blusas": "blusa",
  "camisa": "blusa",
  "camisas": "blusa",
  "camiseta": "camiseta",
  "camisetas": "camiseta",
  "vestido": "vestido",
  "vestidos": "vestido",
  "saia": "saia",
  "saias": "saia",
  "calca": "calca",
  "calcas": "calca",
  "calça": "calca",
  "calças": "calca",
  "jaqueta": "jaqueta",
  "jaquetas": "jaqueta",
  "casaco": "jaqueta",
  "casacos": "jaqueta",

  // games / consoles
  "console": "console",
  "consoles": "console",
  "videogame": "console",
  "videogames": "console",
  "videojuego": "console",
  "videojuegos": "console",
  "acessorio": "acessorio",
  "acessorios": "acessorio",
  "accesorio": "acessorio",
  "accesorios": "acessorio",
  "juego": "console",
  "juegos": "console",
};

// Categorias (navegação/top-level)
export const CATEGORY_CANON: Record<string, string> = {
  // Eletrônicos / Electrónica
  "eletronico": "eletronico",
  "eletronicos": "eletronico",
  "eletrônico": "eletronico",
  "eletrônicos": "eletronico",
  "electronico": "eletronico",
  "electronicos": "eletronico",
  "electronica": "eletronico",
  "electronicas": "eletronico",

  // Celulares
  "celular": "celular",
  "celulares": "celular",
  "smartphone": "celular",
  "smartphones": "celular",
  "telefono": "celular",
  "telefonos": "celular",

  // Câmeras
  "camera": "camera",
  "cameras": "camera",
  "camara": "camera",
  "camaras": "camera",

  // Drones
  "drone": "drone",
  "drones": "drone",

  // TV
  "tv": "tv",
  "tvs": "tv",
  "televisor": "tv",
  "televisores": "tv",

  // Informática
  "notebook": "informatica",
  "notebooks": "informatica",
  "laptop": "informatica",
  "laptops": "informatica",
  "computador": "informatica",
  "computadores": "informatica",
  "pc": "informatica",
  "pcs": "informatica",
  "tablet": "informatica",
  "tablets": "informatica",
  "monitor": "informatica",
  "monitores": "informatica",
  "teclado": "informatica",
  "mouse": "informatica",
  "raton": "informatica",

  // Perfumes / Cosméticos
  "perfume": "perfumaria",
  "perfumes": "perfumaria",
  "perfumaria": "perfumaria",
  "perfumeria": "perfumaria",
  "cosmetico": "cosmetico",
  "cosmeticos": "cosmetico",
  "cosmetica": "cosmetico",
  "cosmético": "cosmetico",
  "cosméticos": "cosmetico",

  // Bebidas
  "bebida": "bebida",
  "bebidas": "bebida",
  "vino": "bebida",
  "whisky": "bebida",
  "cerveja": "bebida",

  // Alimentos / Comestibles
  "alimento": "alimento",
  "alimentos": "alimento",
  "comestible": "alimento",
  "comestibles": "alimento",
  "chocolate": "alimento",

  // Calçados / Calzados
  "calcado": "calcado",
  "calçados": "calcado",
  "calzado": "calcado",
  "calzados": "calcado",
  "zapatilla": "calcado",
  "zapato": "calcado",

  // Esportes / Deportes
  "esporte": "esporte",
  "esportes": "esporte",
  "deporte": "esporte",
  "deportes": "esporte",
  "bicicleta": "esporte",
  "raquete": "esporte",

  // Eletrodomésticos
  "eletrodomestico": "eletrodomestico",
  "eletrodoméstico": "eletrodomestico",
  "electrodomestico": "eletrodomestico",
  "electrodomesticos": "eletrodomestico",

  // Casa e Decoração
  "casa": "decoracao",
  "hogar": "decoracao",
  "decoracao": "decoracao",
  "decoracion": "decoracao",
  "utilidades": "decoracao",

  // Camping
  "camping": "camping",
  "acampamento": "camping",

  // Brinquedos
  "brinquedo": "brinquedo",
  "juguete": "brinquedo",

  // Moda/Roupas
  "roupa": "roupa",
  "moda": "roupa",
  "ropa": "roupa",
  "vestuario": "roupa",
  "vestuário": "roupa",
  "blusa": "roupa",
  "camisa": "roupa",
  "camiseta": "roupa",
  "vestido": "roupa",
  "saia": "roupa",
  "calca": "roupa",
  "calça": "roupa",
  "jaqueta": "roupa",
  "casaco": "roupa",
};

export function toSingularPTBR(word: string): string {
  const w = normPTBR(word);
  if (PRODUCT_CANON[w]) return PRODUCT_CANON[w]; // dicionário vence
  // plurais mais comuns em PT-BR
  if (w.endsWith("oes")) return w.slice(0, -3) + "ao";   // televisoes -> televisao
  if (w.endsWith("aes")) return w.slice(0, -3) + "ao";   // paes -> pao
  if (w.endsWith("ais")) return w.slice(0, -3) + "al";   // canais -> canal
  if (w.endsWith("eis")) return w.slice(0, -3) + "el";   // papeis -> papel
  if (w.endsWith("is"))  return w.slice(0, -1) + "l";    // funis -> funil
  if (w.endsWith("ns"))  return w.slice(0, -2) + "m";    // bons -> bom
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1); // perfumes -> perfume
  return w;
}

// Palavras de enchimento que não definem intenção
const STOPWORDS = new Set([
  "e","tambem","também","mais","por","favor","pf","porfa",
  "quero","queria","gostaria","mostra","mostrar","me","ver",
  "algum","alguns","alguma","algumas","tem","temos","voc","voce","voces",
  "de","do","da","os","as","um","uma","uns","umas","ai","aí","porfavor"
]);

export function tokenizePTBR(msg: string): string[] {
  return normPTBR(msg).split(/\s+/g).filter(t => t && !STOPWORDS.has(t));
}

export function canonicalProductFromText(msg: string): string | null {
  const normalizedMsg = normPTBR(msg);
  
  // 1. Ordenar chaves do dicionário por comprimento (mais longo primeiro) para priorizar frases
  const sortedKeys = Object.keys(PRODUCT_CANON).sort((a, b) => b.length - a.length);
  
  // 2. Procurar pela frase mais longa primeiro (n-grams)
  for (const key of sortedKeys) {
    if (normalizedMsg.includes(key)) {
      console.log(`🏷️ [canonicalProduct] Detectado frase: "${key}" → "${PRODUCT_CANON[key]}"`);
      return PRODUCT_CANON[key];
    }
  }
  
  // 3. Fallback: busca por tokens individuais (comportamento antigo)
  const toks = tokenizePTBR(msg);
  for (const t of toks) {
    const canon = PRODUCT_CANON[t] ?? PRODUCT_CANON[toSingularPTBR(t)];
    if (canon) {
      console.log(`🏷️ [canonicalProduct] Detectado token: "${t}" → "${canon}"`);
      return canon;
    }
  }
  
  return null;
}

export function canonicalCategoryFromText(msg: string): string | null {
  const normalizedMsg = normPTBR(msg);
  
  // 1. Ordenar chaves do dicionário por comprimento (mais longo primeiro) para priorizar frases
  const sortedKeys = Object.keys(CATEGORY_CANON).sort((a, b) => b.length - a.length);
  
  // 2. Procurar pela frase mais longa primeiro (n-grams)
  for (const key of sortedKeys) {
    if (normalizedMsg.includes(key)) {
      console.log(`🏷️ [canonicalCategory] Detectado frase: "${key}" → "${CATEGORY_CANON[key]}"`);
      return CATEGORY_CANON[key];
    }
  }
  
  // 3. Fallback: busca por tokens individuais (comportamento antigo)
  const toks = tokenizePTBR(msg);
  for (const t of toks) {
    const c = CATEGORY_CANON[t] ?? CATEGORY_CANON[toSingularPTBR(t)];
    if (c) {
      console.log(`🏷️ [canonicalCategory] Detectado token: "${t}" → "${c}"`);
      return c;
    }
  }
  
  return null;
}