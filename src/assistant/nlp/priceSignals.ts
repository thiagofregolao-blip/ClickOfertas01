import { QuerySignal } from "../types";
import { normalize } from "./normalize";

export function extractPriceSignals(
  msgRaw: string
): Pick<QuerySignal, "price_min" | "price_max" | "sort" | "offset"> & { hasPriceIntent?: boolean } {
  const msg = normalize(msgRaw);

  // palavras que sinalizam intenção de preço (sem precisar de produto)
  const priceWords = [
    "barato", "barata", "economico", "econômico", "economica", "econômica",
    "mais barato", "mas barato", "baratinho",
    "caro", "cara", "mais caro", "top de linha", "premium",
    "ate", "hasta", "por menos de", "a partir de", "entre", "de"
  ];
  const hasPriceIntent = priceWords.some(w => msg.includes(normalize(w)));

  // 2º mais barato
  if (/\b(segundo|2o|2º)\s+(mais|mas)\s+barat[ao]s?\b/.test(msg))
    return { sort: "price.asc", offset: 1, hasPriceIntent: true };

  // Mais barato
  if (/\b(qual\s+o\s+)?(mais|mas)\s+barat[ao]s?\b/.test(msg) || /\b(em\s+conta)\b/.test(msg))
    return { sort: "price.asc", hasPriceIntent: true };

  // Mais caro / premium
  if (/\b(mais|mas)\s+car[ao]s?\b/.test(msg) || /\bpremium\b/.test(msg) || /\btop\s+de\s+linha\b/.test(msg))
    return { sort: "price.desc", hasPriceIntent: true };

  // Até X
  const mMax = msg.match(/\b(ate|hasta|maximo?|por\s+menos\s+de)\s+([\p{Sc}]?\s?[\d\.,]+)/u);
  if (mMax) {
    const val = parseMoney(mMax[2]);
    if (!Number.isNaN(val)) return { price_max: val, hasPriceIntent: true };
  }

  // A partir de X
  const mMin = msg.match(/\b(desde|a\s+partir\s+de|minimo?)\s+([\p{Sc}]?\s?[\d\.,]+)/u);
  if (mMin) {
    const val = parseMoney(mMin[2]);
    if (!Number.isNaN(val)) return { price_min: val, hasPriceIntent: true };
  }

  // Entre X e Y
  const mRange = msg.match(/\b(entre|de)\s+([\p{Sc}]?\s?[\d\.,]+)\s+(e|a)\s+([\p{Sc}]?\s?[\d\.,]+)/u);
  if (mRange) {
    const a = parseMoney(mRange[2]);
    const b = parseMoney(mRange[4]);
    if (!Number.isNaN(a) && !Number.isNaN(b)) {
      const [min, max] = a < b ? [a, b] : [b, a];
      return { price_min: min, price_max: max, hasPriceIntent: true };
    }
  }
  return { hasPriceIntent };
}

export function parseMoney(s: string): number {
  let x = s
    .trim()
    .replace(/^r\$\s*/i, "")
    .replace(/^gs\s*/i, "")
    .replace(/^usd\s*/i, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}

// Compatibilidade com o sistema existente
export function detectSortSignal(message: string): "price.asc" | "price.desc" | "relevance" {
  const signals = extractPriceSignals(message);
  return signals.sort || "relevance";
}

export function shouldFilterInStock(message: string): boolean {
  const signals = extractPriceSignals(message);
  return signals.hasPriceIntent || false;
}