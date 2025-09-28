/**
 * Query builder e execução local de buscas
 */

import { extractPriceSignals, PriceSignals } from "../nlp/priceSignals.js";
import { SortKey, QuerySignal, CatalogItem } from "../../shared/schema.js";

export type BuildOpts = {
  base: QuerySignal;
  text: string;
  preferInStockCheapest?: boolean;
  slots?: {
    attrs?: string[];
    modelo?: string;
  };
};

/**
 * Constrói query combinando base, sinais de preço e slots
 * @param opts - Opções para construção da query
 * @returns Query signal completa
 */
export function buildQuery(opts: BuildOpts): QuerySignal {
  const price = extractPriceSignals(opts.text);
  const sort: SortKey | undefined = price.sort ?? opts.base.sort ?? "relevance";
  const in_stock = (price.sort === "price.asc" && (opts.preferInStockCheapest ?? true)) ? true : opts.base.in_stock;
  const atributos = uniq([...(opts.base.atributos ?? []), ...(opts.slots?.attrs ?? [])]);

  return {
    ...opts.base,
    ...price,
    modelo: opts.slots?.modelo ?? opts.base.modelo,
    atributos,
    sort,
    in_stock
  };
}

/**
 * Executa query localmente em um catálogo
 * @param catalog - Array de itens do catálogo
 * @param q - Query signal para filtrar
 * @returns Array de itens filtrados e ordenados
 */
export function runQueryLocal(catalog: CatalogItem[], q: QuerySignal): CatalogItem[] {
  const filtered = catalog.filter(it => {
    // Filtro por categoria
    if (q.categoria && it.category !== q.categoria) return false;
    
    // Filtro por produto
    if (q.produto) {
      const t = it.title.toLowerCase();
      if (!t.includes(q.produto)) {
        // Exceção para celulares (iphone/galaxy)
        if (!(q.categoria === "celular" && (t.includes("iphone") || t.includes("galaxy")))) {
          return false;
        }
      }
    }
    
    // Filtros de preço
    if (q.price_min != null && (it.price ?? Infinity) < q.price_min) return false;
    if (q.price_max != null && (it.price ?? 0) > q.price_max) return false;
    
    // Filtro de estoque
    if (q.in_stock && !it.in_stock) return false;
    
    // Filtro por atributos
    if (q.atributos?.length) {
      const attrs = new Set((it.attrs ?? []).map(a => a.toLowerCase()));
      for (const a of q.atributos) {
        if (!attrs.has(a.toLowerCase())) return false;
      }
    }
    
    // Filtro por modelo
    if (q.modelo && !it.title.toLowerCase().includes(q.modelo)) return false;
    
    return true;
  });

  // Ordenação
  const sortKey = q.sort ?? "relevance";
  filtered.sort((a, b) => {
    if (sortKey === "price.asc") return (a.price ?? Infinity) - (b.price ?? Infinity);
    if (sortKey === "price.desc") return (b.price ?? 0) - (a.price ?? 0);
    
    // Para relevância, prioriza produtos em estoque
    const sa = a.in_stock ? 0 : 1;
    const sb = b.in_stock ? 0 : 1;
    if (sa !== sb) return sa - sb;
    
    // Depois ordena por preço crescente
    return (a.price ?? Infinity) - (b.price ?? Infinity);
  });

  // Paginação com offset
  const off = q.offset ?? 0;
  return filtered.slice(off, off + 10);
}

/**
 * Remove duplicatas de array
 */
function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}