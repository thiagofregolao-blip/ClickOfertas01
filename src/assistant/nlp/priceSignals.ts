/**
 * Detecção de sinais de preço em mensagens
 */

import type { PriceSignals, SortKey } from "../types.js";

// Padrões regex para sinais de preço
const PATTERNS = {
  // "mais barato", "mais em conta", "menor preço"
  cheapest: /\b(mais\s*(barato|em\s*conta|economico|econômico)|menor\s*pre[cç]o|pre[cç]o\s*menor|baratinho|baratao|baratão)\b/i,
  
  // "mais caro", "premium", "top de linha"
  expensive: /\b(mais\s*caro|premium|top\s*de\s*linha|luxo|sofisticado|pre[cç]o\s*alto)\b/i,
  
  // Faixas de preço: "entre X e Y", "de X a Y", "até X"
  range: /\b(?:entre|de)\s*(?:r\$\s*)?(\d+(?:\.\d{3})*(?:,\d{2})?)\s*(?:e|a)\s*(?:r\$\s*)?(\d+(?:\.\d{3})*(?:,\d{2})?)\b/i,
  
  // Preço máximo: "até X", "máximo X", "no máximo X"
  maxPrice: /\b(?:até|max(?:imo|ímimo)?|no\s*max(?:imo|ímimo)?)\s*(?:r\$\s*)?(\d+(?:\.\d{3})*(?:,\d{2})?)\b/i,
  
  // Preço mínimo: "a partir de X", "pelo menos X"
  minPrice: /\b(?:a\s*partir\s*de|pelo\s*menos|m[ií]nimo\s*de?)\s*(?:r\$\s*)?(\d+(?:\.\d{3})*(?:,\d{2})?)\b/i,
  
  // Promoção/desconto
  promotion: /\b(promo[cç][aã]o|desconto|oferta|queima|liquida[cç][aã]o|pechincha)\b/i,
  
  // Em estoque/disponível
  inStock: /\b(em\s*estoque|dispon[ií]vel|tem\s*aqui|pronta\s*entrega)\b/i,
};

/**
 * Extrai sinais de preço de uma mensagem
 * @param message - Mensagem do usuário
 * @returns Sinais de preço detectados
 */
export function extractPriceSignals(message: string): PriceSignals {
  const result: PriceSignals = {};
  const msg = message.toLowerCase();
  
  // Detecta "mais barato" -> ordena por preço crescente + filtra em estoque
  if (PATTERNS.cheapest.test(msg)) {
    result.mais_barato = true;
    result.sort = "price.asc";
  }
  
  // Detecta "mais caro" -> ordena por preço decrescente
  if (PATTERNS.expensive.test(msg)) {
    result.sort = "price.desc";
  }
  
  // Detecta faixa de preço
  const rangeMatch = msg.match(PATTERNS.range);
  if (rangeMatch) {
    result.price_min = parsePrice(rangeMatch[1]);
    result.price_max = parsePrice(rangeMatch[2]);
  }
  
  // Detecta preço máximo
  const maxMatch = msg.match(PATTERNS.maxPrice);
  if (maxMatch && !rangeMatch) { // Não sobrescreve se já tem range
    result.price_max = parsePrice(maxMatch[1]);
  }
  
  // Detecta preço mínimo
  const minMatch = msg.match(PATTERNS.minPrice);
  if (minMatch && !rangeMatch) { // Não sobrescreve se já tem range
    result.price_min = parsePrice(minMatch[1]);
  }
  
  // Validação: min <= max
  if (result.price_min && result.price_max && result.price_min > result.price_max) {
    // Troca os valores
    [result.price_min, result.price_max] = [result.price_max, result.price_min];
  }
  
  return result;
}

/**
 * Converte string de preço em número
 * @param priceStr - String do preço (ex: "1.500,00" ou "1500")
 * @returns Valor numérico
 */
function parsePrice(priceStr: string): number {
  // Remove R$, espaços e normaliza formato brasileiro
  const cleaned = priceStr
    .replace(/r\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "") // Remove separadores de milhares
    .replace(/,/g, "."); // Vírgula decimal vira ponto
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Detecta sinais de ordenação específicos
 * @param message - Mensagem do usuário
 * @returns Tipo de ordenação sugerida
 */
export function detectSortSignal(message: string): SortKey {
  const msg = message.toLowerCase();
  
  if (PATTERNS.cheapest.test(msg)) {
    return "price.asc";
  }
  
  if (PATTERNS.expensive.test(msg)) {
    return "price.desc";
  }
  
  // Sinais de relevância
  if (/\b(melhor|top|recomend|popular|vendido)\b/i.test(msg)) {
    return "relevance";
  }
  
  return "relevance"; // Default
}

/**
 * Verifica se mensagem indica preferência por produtos em estoque
 * @param message - Mensagem do usuário
 * @returns Se deve filtrar por estoque
 */
export function shouldFilterInStock(message: string): boolean {
  const msg = message.toLowerCase();
  
  // Explicitamente pede em estoque
  if (PATTERNS.inStock.test(msg)) {
    return true;
  }
  
  // "Mais barato" implica disponibilidade imediata
  if (PATTERNS.cheapest.test(msg)) {
    return true;
  }
  
  // Urgência temporal
  if (/\b(hoje|agora|já|urgente|rápido|imediato)\b/i.test(msg)) {
    return true;
  }
  
  return false;
}

/**
 * Detecta sinais de promoção/desconto
 * @param message - Mensagem do usuário
 * @returns Se busca promoções
 */
export function isPromotionQuery(message: string): boolean {
  return PATTERNS.promotion.test(message);
}

/**
 * Formata preço para exibição
 * @param price - Valor numérico
 * @param currency - Moeda (default: R$)
 * @returns String formatada
 */
export function formatPrice(price: number, currency: string = "R$"): string {
  return `${currency} ${price.toLocaleString("pt-BR", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

/**
 * Valida se faixa de preço é razoável
 * @param min - Preço mínimo
 * @param max - Preço máximo
 * @returns Se é válida
 */
export function isValidPriceRange(min?: number, max?: number): boolean {
  if (!min && !max) return true; // Sem filtro é válido
  if (min && min < 0) return false; // Preço negativo
  if (max && max < 0) return false; // Preço negativo
  if (min && max && min > max) return false; // Min > Max
  if (max && max > 1000000) return false; // Preço muito alto (1M)
  
  return true;
}