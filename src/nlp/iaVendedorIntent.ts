/**
 * Intent classifier integrado com IA Vendedor
 */

import { Intent, QuerySignal } from "../../shared/schema.js";
import { tokensPTES } from "./normalize.js";
import { fromTokensToProductCategory } from "./productCanon.js";

const RX = {
  small: /\b(oi|ola|ol[aá]|bom dia|boa tarde|boa noite|tudo bem|como vai)\b/i,
  help: /\b(ajuda|como funciona|o que voce faz|dica|sugestao|sugestão)\b/i,
  time: /\b(que horas sao|que horas são|hora agora|que hora)\b/i,
  who: /\b(seu nome|quem é voce|quem e voce)\b/i
};

export type ClassificationResult = {
  intent: Intent;
  base: QuerySignal;
};

/**
 * Classifica intenção da mensagem usando sistema IA Vendedor
 * @param message - Mensagem do usuário
 * @returns Resultado da classificação
 */
export function classify(message: string): ClassificationResult {
  const msg = message.toLowerCase();
  
  // Intenções específicas
  if (RX.time.test(msg)) return { intent: "TIME_QUERY", base: {} };
  if (RX.small.test(msg)) return { intent: "SMALL_TALK", base: {} };
  if (RX.help.test(msg)) return { intent: "HELP", base: {} };
  if (RX.who.test(msg)) return { intent: "WHOAMI", base: {} };

  // Busca por produtos usando canonização
  const toks = tokensPTES(message);
  const pc = fromTokensToProductCategory(toks);
  
  if (pc.produto || pc.categoria) {
    return { 
      intent: "PRODUCT_SEARCH", 
      base: pc 
    };
  }

  // Fallback hardening: 1 palavra válida -> busca de produto
  if (toks.length === 1 && /^[a-z0-9\-]+$/i.test(toks[0])) {
    return { 
      intent: "PRODUCT_SEARCH", 
      base: { produto: toks[0] } 
    };
  }
  
  return { intent: "UNKNOWN", base: {} };
}

/**
 * Versão extendida que inclui extração de slots
 * @param message - Mensagem do usuário
 * @returns Classificação + slots extraídos
 */
export async function classifyWithSlots(message: string): Promise<ClassificationResult & { slots?: any }> {
  const baseResult = classify(message);
  
  if (baseResult.intent === "PRODUCT_SEARCH") {
    // Importa dinamicamente para evitar circular dependencies
    const { extractModeloGBCor } = await import("./slots.js");
    const slots = extractModeloGBCor(message);
    return {
      ...baseResult,
      slots
    };
  }
  
  return baseResult;
}