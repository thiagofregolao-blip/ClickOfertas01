/**
 * Extração de sinais de preço de mensagens em português/espanhol
 */

import { norm } from "./normalize.js";

export type PriceSignals = {
  price_min?: number;
  price_max?: number;
  sort?: "relevance" | "price.asc" | "price.desc";
  offset?: number;
};

/**
 * Extrai sinais de preço da mensagem do usuário
 * @param msgRaw - Mensagem original do usuário
 * @returns Objeto com sinais de preço detectados
 */
export function extractPriceSignals(msgRaw: string): PriceSignals {
  const msg = norm(msgRaw);

  // "segundo mais barato" - busca o segundo item na ordenação por preço
  if (/\bsegundo\s+(mais|mas)\s+barat\w+\b/.test(msg)) {
    return { sort: "price.asc", offset: 1 };
  }

  // "mais barato", "mais em conta", "mais económico"
  if (/\b(mais|mas)\s+(barat\w+|economic\w+)\b/.test(msg) || /\b(em\s+conta)\b/.test(msg)) {
    return { sort: "price.asc" };
  }

  // "mais caro", "premium", "top de linha"
  if (/\b(mais|mas)\s+car\w+\b/.test(msg) || /\bpremium\b/.test(msg) || /\btop\s+de\s+linha\b/.test(msg)) {
    return { sort: "price.desc" };
  }

  // Preço máximo: "até R$ 1000", "hasta 1000", "por menos de 500"
  const mMax = msg.match(/\b(ate|hasta|maxim\w+|por\s+menos\s+de)\s+([\p{Sc}]?\s?[\d\.\,]+)/u);
  if (mMax) {
    const val = parseMoney(mMax[2]);
    if (!Number.isNaN(val)) return { price_max: val };
  }

  // Preço mínimo: "desde R$ 500", "a partir de 1000", "mínimo 300"
  const mMin = msg.match(/\b(desde|a\s+partir\s+de|minim\w+)\s+([\p{Sc}]?\s?[\d\.\,]+)/u);
  if (mMin) {
    const val = parseMoney(mMin[2]);
    if (!Number.isNaN(val)) return { price_min: val };
  }

  // Faixa de preço: "entre R$ 1000 e R$ 2000", "de 500 a 1500"
  const mRange = msg.match(/\b(entre|de)\s+([\p{Sc}]?\s?[\d\.\,]+)\s+(e|a)\s+([\p{Sc}]?\s?[\d\.\,]+)/u);
  if (mRange) {
    const a = parseMoney(mRange[2]);
    const b = parseMoney(mRange[4]);
    if (!Number.isNaN(a) && !Number.isNaN(b)) {
      const [min, max] = a < b ? [a, b] : [b, a];
      return { price_min: min, price_max: max };
    }
  }

  return {};
}

/**
 * Converte string de dinheiro para número
 * @param s - String contendo valor monetário
 * @returns Valor numérico ou NaN se inválido
 */
export function parseMoney(s: string): number {
  let x = s.trim()
    .replace(/^r\$\s*/i, "")      // Remove R$
    .replace(/^gs\s*/i, "")       // Remove GS (Guarani)
    .replace(/^usd\s*/i, "")      // Remove USD
    .replace(/\./g, "")           // Remove pontos de milhares
    .replace(/,/g, ".");          // Converte vírgula decimal para ponto
  
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}