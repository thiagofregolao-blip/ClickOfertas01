/**
 * Sistema canônico de produtos e categorias
 */

import { tokensPTES } from "./normalize.js";
import { loadCanon } from "./canon.store.js";
import type { QuerySignal } from "../types.js";

/**
 * Converte tokens em produto/categoria canônicos
 * @param tokens - Array de tokens normalizados
 * @returns Sinal de query com produto/categoria identificados
 */
export function fromTokensToProductCategory(tokens: string[]): QuerySignal {
  const canon = loadCanon();
  const result: QuerySignal = {};
  
  // Busca produto canônico
  for (const token of tokens) {
    const canonical = canon.productCanon[token];
    if (canonical) {
      result.produto = canonical;
      
      // Mapeia produto para categoria automaticamente
      const category = canon.productToCategory[canonical];
      if (category) {
        result.categoria = category;
      }
      break; // Primeiro match wins
    }
  }
  
  // Se não encontrou produto, busca categoria diretamente
  if (!result.produto) {
    for (const token of tokens) {
      const canonical = canon.categoryCanon[token];
      if (canonical) {
        result.categoria = canonical;
        break;
      }
    }
  }
  
  return result;
}

/**
 * Busca fuzzy em produtos canônicos
 * @param query - Texto da query
 * @returns Matches ordenados por relevância
 */
export function fuzzySearchProducts(query: string): Array<{product: string, score: number}> {
  const canon = loadCanon();
  const tokens = tokensPTES(query);
  const matches: Array<{product: string, score: number}> = [];
  
  // Busca exata tem score máximo
  for (const token of tokens) {
    if (canon.productCanon[token]) {
      matches.push({ product: canon.productCanon[token], score: 1.0 });
    }
  }
  
  // Busca parcial com score menor
  const queryNorm = query.toLowerCase();
  for (const [key, value] of Object.entries(canon.productCanon)) {
    if (key.includes(queryNorm) || queryNorm.includes(key)) {
      const score = Math.max(key.length, queryNorm.length) / 
                   Math.min(key.length, queryNorm.length) * 0.7;
      matches.push({ product: value, score });
    }
  }
  
  // Remove duplicatas e ordena por score
  const unique = new Map<string, number>();
  for (const match of matches) {
    const current = unique.get(match.product) ?? 0;
    unique.set(match.product, Math.max(current, match.score));
  }
  
  return Array.from(unique.entries())
    .map(([product, score]) => ({ product, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Top 5 matches
}

/**
 * Sugere produtos relacionados por categoria
 * @param product - Produto base
 * @returns Array de produtos relacionados
 */
export function getRelatedProducts(product: string): string[] {
  const canon = loadCanon();
  const category = canon.productToCategory[product];
  
  if (!category) return [];
  
  return Object.entries(canon.productToCategory)
    .filter(([prod, cat]) => cat === category && prod !== product)
    .map(([prod]) => prod)
    .slice(0, 3); // Máximo 3 relacionados
}

/**
 * Obtém todas as categorias disponíveis
 * @returns Array de categorias
 */
export function getAllCategories(): string[] {
  const canon = loadCanon();
  return Array.from(new Set(Object.values(canon.categoryCanon))).sort();
}

/**
 * Obtém todos os produtos de uma categoria
 * @param category - Categoria a buscar
 * @returns Array de produtos da categoria
 */
export function getProductsByCategory(category: string): string[] {
  const canon = loadCanon();
  return Object.entries(canon.productToCategory)
    .filter(([, cat]) => cat === category)
    .map(([prod]) => prod)
    .sort();
}