/**
 * Dicionário canônico para mapeamento de produtos e categorias
 */

import { tokensPTES } from "./normalize.js";

// Mapeamento de termos para produtos canônicos
const PRODUCT_CANON: Record<string, string> = {
  // Apple/iPhone
  iphone: "iphone",
  iphones: "iphone", 
  apple: "iphone",
  
  // Samsung/Galaxy
  galaxy: "galaxy",
  samsung: "galaxy",
  
  // Drones
  drone: "drone",
  dji: "drone",
  mavic: "drone",
  drones: "drone",
  
  // Perfumaria
  perfume: "perfume",
  perfumes: "perfume",
  fragancia: "perfume",
  colonia: "perfume",
  
  // TV/Televisores
  tv: "tv",
  televisor: "tv",
  televisores: "tv",
  television: "tv",
  
  // Roupas
  blusa: "blusa",
  camisa: "blusa",
  camiseta: "camiseta",
  camisetas: "camiseta",
  
  // Notebooks
  notebook: "notebook",
  laptop: "notebook",
  computador: "notebook"
};

// Mapeamento de produtos para categorias
const CATEGORY_MAP: Record<string, string> = {
  iphone: "celular",
  galaxy: "celular",
  tv: "tv",
  drone: "drone",
  perfume: "perfumaria",
  blusa: "roupa",
  camiseta: "roupa",
  notebook: "notebook"
};

export type ProductCategory = {
  produto?: string;
  categoria?: string;
};

/**
 * Extrai produto e categoria canônicos a partir de tokens
 * @param toks - Array de tokens normalizados
 * @returns Objeto com produto e categoria detectados
 */
export function fromTokensToProductCategory(toks: string[]): ProductCategory {
  for (const t of toks) {
    const p = PRODUCT_CANON[t];
    if (p) {
      return { 
        produto: p, 
        categoria: CATEGORY_MAP[p] 
      };
    }
  }
  return {};
}

/**
 * Busca produto canônico diretamente por termo
 * @param term - Termo a ser buscado
 * @returns Produto canônico ou undefined
 */
export function getCanonicalProduct(term: string): string | undefined {
  return PRODUCT_CANON[term.toLowerCase()];
}

/**
 * Busca categoria por produto canônico
 * @param product - Produto canônico
 * @returns Categoria correspondente ou undefined
 */
export function getCategoryByProduct(product: string): string | undefined {
  return CATEGORY_MAP[product];
}