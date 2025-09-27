// src/utils/singularize.ts
import { tokenizePTBR, toSingularPTBR, PRODUCT_CANON } from "./lang-ptbr.js";

/** Converte cada token para forma canônica/singular quando houver no dicionário. */
export function singularizePhrase(msg: string): string {
  const toks = tokenizePTBR(msg);
  const mapped = toks.map(t => PRODUCT_CANON[t] ?? PRODUCT_CANON[toSingularPTBR(t)] ?? t);
  const result = mapped.join(" ");
  
  // Debug log para rastrear transformação
  if (result !== msg.toLowerCase().trim()) {
    console.log(`🔄 [singularizePhrase] "${msg}" → "${result}"`);
  }
  
  return result;
}