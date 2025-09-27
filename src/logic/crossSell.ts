// src/logic/crossSell.ts

// Mapeamento produto → categoria para cross-sell
export const PROD_TO_CAT: Record<string, string> = {
  // vestuário → roupa
  "blusa": "roupa",
  "camiseta": "roupa", 
  "vestido": "roupa",
  "saia": "roupa",
  "calca": "roupa",
  "jaqueta": "roupa",
  
  // celulares → celular
  "celular": "celular",
  "iphone": "celular",
  "galaxy": "celular",
  
  // eletrônicos
  "drone": "drone",
  "tv": "tv",
  "perfume": "perfume",
  "notebook": "informatica",
  "computador": "informatica"
};

export const ACCESSORIES_BY_CATEGORY: Record<string, string[]> = {
  celular: ["capinha", "película", "carregador turbo", "fones bluetooth", "power bank", "cabo usb-c"],
  drone: ["bateria extra", "hélices", "case rígido", "cartão sd", "hub de carga", "protetor de hélices"],
  perfume: ["kit presente", "necessaire", "miniatura"],
  tv: ["soundbar", "suporte parede", "cabo hdmi", "controle universal"],
  // novo: vestuário
  roupa: ["cinto", "bolsa", "meia-calça", "lenço", "organizador de armário"]
};

// Resolver de categoria para acessórios (previne cross-contamination)
export function resolveAccessoryCategory(query: { produto?: string; categoria?: string }): string | null {
  // 1. Se categoria existe e é válida, usar ela
  if (query.categoria && ACCESSORIES_BY_CATEGORY[query.categoria]) {
    return query.categoria;
  }
  
  // 2. Se produto existe, mapear para categoria via PROD_TO_CAT
  if (query.produto) {
    const mappedCat = PROD_TO_CAT[query.produto];
    if (mappedCat && ACCESSORIES_BY_CATEGORY[mappedCat]) {
      return mappedCat;
    }
  }
  
  // 3. Fallback: categoria mesmo que não tenha acessórios
  return query.categoria ?? null;
}

export function nextAccessorySuggestion(cat?: string, already: string[] = []): string[] {
  if (!cat) return [];
  const pool = ACCESSORIES_BY_CATEGORY[cat] ?? [];
  return pool.filter(x => !already.includes(x)).slice(0, 2);
}