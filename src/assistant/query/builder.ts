/**
 * Query builder e execução local de buscas
 */

import { extractPriceSignals, detectSortSignal, shouldFilterInStock } from "../nlp/priceSignals.js";
import type { BuildOpts, QuerySignal, CatalogItem, SortKey } from "../types.js";

/**
 * Constrói query a partir de sinais detectados
 * @param opts - Opções de construção
 * @returns Query estruturada
 */
export function buildQuery(opts: BuildOpts): QuerySignal {
  const { base, text, preferInStockCheapest = false, slots } = opts;
  
  // Começa com query base (produto/categoria do intent)
  const query: QuerySignal = { ...base };
  
  // Extrai sinais de preço da mensagem
  const priceSignals = extractPriceSignals(text);
  
  // Aplica sinais de preço
  if (priceSignals.price_min !== undefined) {
    query.price_min = priceSignals.price_min;
  }
  
  if (priceSignals.price_max !== undefined) {
    query.price_max = priceSignals.price_max;
  }
  
  // Detecta ordenação
  query.sort = priceSignals.sort || detectSortSignal(text);
  
  // Não force in_stock no follow-up de preço.
  // Se quiser priorizar estoque, faça no servidor com fallback (Patch B).
  // Aplicar apenas se vier explicitamente na base query
  if (opts.base.in_stock !== undefined) {
    query.in_stock = opts.base.in_stock;
  }
  
  // Adiciona atributos dos slots
  if (slots?.attrs && slots.attrs.length > 0) {
    query.atributos = [...(query.atributos || []), ...slots.attrs];
    // Remove duplicatas
    query.atributos = Array.from(new Set(query.atributos));
  }
  
  // Adiciona modelo se detectado
  if (slots?.modelo) {
    query.modelo = slots.modelo;
  }
  
  return query;
}

/**
 * Executa query localmente em catálogo em memória
 * @param catalog - Array de items do catálogo
 * @param query - Query a executar
 * @returns Items filtrados e ordenados
 */
export function runQueryLocal(catalog: CatalogItem[], query: QuerySignal): CatalogItem[] {
  let results = [...catalog];
  
  // Filtro por produto
  if (query.produto) {
    results = results.filter(item => 
      item.title.toLowerCase().includes(query.produto!.toLowerCase()) ||
      item.category.toLowerCase().includes(query.produto!.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(query.produto!.toLowerCase())) ||
      (item.attrs && item.attrs.some(attr => 
        attr.toLowerCase().includes(query.produto!.toLowerCase())
      ))
    );
  }
  
  // Filtro por categoria
  if (query.categoria && !query.produto) {
    results = results.filter(item => 
      item.category.toLowerCase().includes(query.categoria!.toLowerCase())
    );
  }
  
  // Filtro por marca
  if (query.marca) {
    results = results.filter(item => 
      item.brand && item.brand.toLowerCase().includes(query.marca!.toLowerCase())
    );
  }
  
  // Filtro por modelo
  if (query.modelo) {
    results = results.filter(item => 
      item.title.toLowerCase().includes(query.modelo!.toLowerCase()) ||
      (item.attrs && item.attrs.some(attr => 
        attr.toLowerCase().includes(query.modelo!.toLowerCase())
      ))
    );
  }
  
  // Filtro por atributos
  if (query.atributos && query.atributos.length > 0) {
    results = results.filter(item => {
      if (!item.attrs) return false;
      
      // Pelo menos um atributo deve fazer match
      return query.atributos!.some(queryAttr => 
        item.attrs!.some(itemAttr => 
          itemAttr.toLowerCase().includes(queryAttr.toLowerCase()) ||
          queryAttr.toLowerCase().includes(itemAttr.toLowerCase())
        )
      );
    });
  }
  
  // Filtro por faixa de preço
  if (query.price_min !== undefined || query.price_max !== undefined) {
    results = results.filter(item => {
      if (item.price === undefined) return false;
      
      const price = item.price;
      const minOk = query.price_min === undefined || price >= query.price_min;
      const maxOk = query.price_max === undefined || price <= query.price_max;
      
      return minOk && maxOk;
    });
  }
  
  // Filtro por estoque
  if (query.in_stock) {
    results = results.filter(item => item.in_stock === true);
  }
  
  // Filtro por promoção (se implementado)
  if (query.on_sale) {
    results = results.filter(item => {
      // Implementar lógica de promoção quando disponível
      return true; // Placeholder
    });
  }
  
  // Ordenação
  results = sortResults(results, query.sort || "relevance");
  
  // Paginação
  if (query.offset && query.offset > 0) {
    results = results.slice(query.offset);
  }
  
  // Limita a 20 resultados por padrão
  return results.slice(0, 20);
}

/**
 * Ordena resultados por critério especificado
 * @param items - Items a ordenar
 * @param sort - Critério de ordenação
 * @returns Items ordenados
 */
function sortResults(items: CatalogItem[], sort: SortKey): CatalogItem[] {
  const sortedItems = [...items];
  
  switch (sort) {
    case "price.asc":
      return sortedItems.sort((a, b) => {
        const priceA = a.price ?? Infinity;
        const priceB = b.price ?? Infinity;
        return priceA - priceB;
      });
      
    case "price.desc":
      return sortedItems.sort((a, b) => {
        const priceA = a.price ?? 0;
        const priceB = b.price ?? 0;
        return priceB - priceA;
      });
      
    case "relevance":
    default:
      // Ordenação por relevância: em estoque primeiro, depois por preço
      return sortedItems.sort((a, b) => {
        // Prioriza items em estoque
        if (a.in_stock && !b.in_stock) return -1;
        if (!a.in_stock && b.in_stock) return 1;
        
        // Depois por preço (menor primeiro)
        const priceA = a.price ?? Infinity;
        const priceB = b.price ?? Infinity;
        return priceA - priceB;
      });
  }
}

/**
 * Calcula score de relevância para um item
 * @param item - Item do catálogo
 * @param query - Query original
 * @returns Score 0-1
 */
export function calculateRelevanceScore(item: CatalogItem, query: QuerySignal): number {
  let score = 0;
  
  // Match exato no produto
  if (query.produto) {
    const produtoLower = query.produto.toLowerCase();
    if (item.title.toLowerCase().includes(produtoLower)) score += 0.4;
    if (item.brand?.toLowerCase().includes(produtoLower)) score += 0.3;
    if (item.category.toLowerCase().includes(produtoLower)) score += 0.2;
  }
  
  // Match na categoria
  if (query.categoria) {
    const categoriaLower = query.categoria.toLowerCase();
    if (item.category.toLowerCase().includes(categoriaLower)) score += 0.3;
  }
  
  // Atributos matched
  if (query.atributos && item.attrs) {
    const matchedAttrs = query.atributos.filter(queryAttr =>
      item.attrs!.some(itemAttr => 
        itemAttr.toLowerCase().includes(queryAttr.toLowerCase())
      )
    );
    score += (matchedAttrs.length / query.atributos.length) * 0.2;
  }
  
  // Boost para items em estoque
  if (item.in_stock) score += 0.1;
  
  return Math.min(score, 1.0);
}

/**
 * Sugere queries relacionadas
 * @param originalQuery - Query original
 * @param results - Resultados obtidos
 * @returns Array de queries sugeridas
 */
export function suggestRelatedQueries(originalQuery: QuerySignal, results: CatalogItem[]): QuerySignal[] {
  const suggestions: QuerySignal[] = [];
  
  // Se encontrou poucos resultados, sugere query mais ampla
  if (results.length < 3 && originalQuery.produto) {
    suggestions.push({
      categoria: originalQuery.categoria,
      sort: originalQuery.sort
    });
  }
  
  // Sugere variações de preço
  if (originalQuery.price_min || originalQuery.price_max) {
    const avgPrice = results.reduce((sum, item) => sum + (item.price || 0), 0) / results.length;
    
    if (avgPrice > 0) {
      suggestions.push({
        ...originalQuery,
        price_max: avgPrice * 1.5,
        price_min: undefined
      });
    }
  }
  
  return suggestions;
}