// src/nlp/priceSignals.ts
import { QuerySignal } from "../types";
import { normalize } from "./normalize";

export function extractPriceSignals(msgRaw: string): Pick<QuerySignal, "price_min"|"price_max"|"sort"|"offset"> {
  const msg = normalize(msgRaw);
  if (/\bsegundo\s+(mais|mas)\s+barat[ao]s?\b/.test(msg)) return { sort: "price.asc", offset: 1 };
  if (/\b(mais|mas)\s+(barat[ao]s?|economic[ao]s?)\b/.test(msg) || /\b(em\s+conta)\b/.test(msg)) return { sort: "price.asc" };
  if (/\b(mais|mas)\s+car[ao]s?\b/.test(msg) || /\bpremium\b/.test(msg) || /\btop\s+de\s+linha\b/.test(msg)) return { sort: "price.desc" };

  const mMax = msg.match(/\b(ate|hasta|maxim[ao]s?|por\s+menos\s+de)\s+([\p{Sc}]?\s?[\d.,]+)/u);
  if (mMax) { const val = parseMoney(mMax[2]); if (!Number.isNaN(val)) return { price_max: val }; }

  const mMin = msg.match(/\b(desde|a\s+partir\s+de|minim[ao]s?)\s+([\p{Sc}]?\s?[\d.,]+)/u);
  if (mMin) { const val = parseMoney(mMin[2]); if (!Number.isNaN(val)) return { price_min: val }; }

  const mRange = msg.match(/\b(entre|de)\s+([\p{Sc}]?\s?[\d.,]+)\s+(e|a)\s+([\p{Sc}]?\s?[\d.,]+)/u);
  if (mRange) {
    const a = parseMoney(mRange[2]); const b = parseMoney(mRange[4]);
    if (!Number.isNaN(a) && !Number.isNaN(b)) return { price_min: Math.min(a,b), price_max: Math.max(a,b) };
  }
  return {};
}

export function parseMoney(s: string): number {
  let x = s.trim().replace(/^r\$\s*/i, "").replace(/^gs\s*/i, "").replace(/^usd\s*/i, "").replace(/\./g, "").replace(/,/g, ".");
  const n = Number(x); return Number.isFinite(n) ? n : NaN;
}

// NOVO: helper para saber se há "intenção de preço" na frase
export function hasPriceIntent(msgRaw: string): boolean {
  const s = msgRaw.toLowerCase();
  return (
    /\b(mais|mas)\s+barat\w+/.test(s) ||
    /\b(mais|mas)\s+car\w+/.test(s) ||
    /\b(ate|hasta|maxim\w+|por\s+menos\s+de)\s+\d/.test(s) ||
    /\b(desde|a\s+partir\s+de|minim\w+)\s+\d/.test(s) ||
    /\b(entre|de)\s+\d+(\.|,)?\d*\s+(e|a)\s+\d+/.test(s) ||
    /\bsegundo\s+(mais|mas)\s+barat\w+/.test(s)
  );
}

// Compatibilidade com o sistema existente
export function detectSortSignal(message: string): "price.asc" | "price.desc" | "relevance" {
  const signals = extractPriceSignals(message);
  return signals.sort || "relevance";
}

export function shouldFilterInStock(message: string): boolean {
  const signals = extractPriceSignals(message);
  return hasPriceIntent(message);
}