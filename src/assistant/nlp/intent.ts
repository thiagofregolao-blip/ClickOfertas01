/**
 * Classificador de intenções para IA Vendedor
 */

import { tokensPTES } from "./normalize.js";
import { fromTokensToProductCategory } from "./productCanon.js";
import type { Intent, QuerySignal, ClassificationResult } from "../types.js";

// Padrões regex para intenções específicas
const PATTERNS = {
  greetings: /\b(oi|ola|ol[aá]|bom dia|boa tarde|boa noite|tudo bem|como vai|hey|hello|hola)\b/i,
  help: /\b(ajuda|help|como funciona|o que voce faz|o que você faz|dica|sugestao|sugestão|que produtos|o que tem)\b/i,
  time: /\b(que horas sao|que horas são|hora agora|que hora|horario|horário)\b/i,
  whoami: /\b(seu nome|quem é voce|quem e voce|quem é você|quem e você|o que é voce|o que e voce)\b/i,
  thanks: /\b(obrigad[oa]|valeu|vlw|thanks|gracias|brigad[oa])\b/i,
};

/**
 * Classifica intenção de uma mensagem
 * @param message - Mensagem do usuário
 * @returns Resultado da classificação
 */
export function classify(message: string): ClassificationResult {
  const msg = message.toLowerCase().trim();
  
  // Mensagens muito curtas ou vazias
  if (!msg || msg.length < 2) {
    return { intent: "UNKNOWN", base: {} };
  }
  
  // Intenções específicas por padrão
  if (PATTERNS.greetings.test(msg)) {
    return { intent: "SMALL_TALK", base: {} };
  }
  
  if (PATTERNS.help.test(msg)) {
    return { intent: "HELP", base: {} };
  }
  
  if (PATTERNS.time.test(msg)) {
    return { intent: "TIME_QUERY", base: {} };
  }
  
  if (PATTERNS.whoami.test(msg)) {
    return { intent: "WHOAMI", base: {} };
  }
  
  if (PATTERNS.thanks.test(msg)) {
    return { intent: "SMALL_TALK", base: {} };
  }
  
  // Busca por produtos usando canonização
  const tokens = tokensPTES(message);
  const productQuery = fromTokensToProductCategory(tokens);
  
  // Se encontrou produto ou categoria, é busca de produto
  if (productQuery.produto || productQuery.categoria) {
    return { 
      intent: "PRODUCT_SEARCH", 
      base: productQuery 
    };
  }
  
  // Fallback: se tem pelo menos uma palavra válida, tenta busca
  const validTokens = tokens.filter(t => t.length >= 3 && /^[a-z0-9\-]+$/i.test(t));
  if (validTokens.length === 1) {
    return { 
      intent: "PRODUCT_SEARCH", 
      base: { produto: validTokens[0] } 
    };
  }
  
  // Última tentativa: busca por palavras-chave genéricas
  const productKeywords = [
    "produto", "item", "coisa", "negocio", "vender", "comprar",
    "oferta", "promocao", "desconto", "barato", "caro", "preco"
  ];
  
  for (const keyword of productKeywords) {
    if (msg.includes(keyword)) {
      return { intent: "HELP", base: {} };
    }
  }
  
  // NEW: frases apenas de preço → deixa base vazia (rota herdará da sessão)
  const priceOnly = /\b(mais|mas)\s+(barat\w+|car\w+)\b|\b(em\s+conta)\b|\b(ate|hasta|por\s+menos\s+de|a\s+partir\s+de)\b/i.test(msg);
  if (priceOnly) return { intent: "PRODUCT_SEARCH", base: {} };
  
  return { intent: "UNKNOWN", base: {} };
}

/**
 * Classifica múltiplas mensagens em lote
 * @param messages - Array de mensagens
 * @returns Array de resultados
 */
export function classifyBatch(messages: string[]): ClassificationResult[] {
  return messages.map(classify);
}

/**
 * Obtém confiança da classificação (0-1)
 * @param message - Mensagem original
 * @param result - Resultado da classificação
 * @returns Nível de confiança
 */
export function getConfidence(message: string, result: ClassificationResult): number {
  const msg = message.toLowerCase();
  
  // Intenções específicas têm alta confiança
  if (result.intent !== "PRODUCT_SEARCH" && result.intent !== "UNKNOWN") {
    return 0.9;
  }
  
  // Busca de produto com match exato tem alta confiança
  if (result.intent === "PRODUCT_SEARCH" && result.base.produto) {
    return 0.8;
  }
  
  // Busca de produto com categoria tem confiança média
  if (result.intent === "PRODUCT_SEARCH" && result.base.categoria) {
    return 0.6;
  }
  
  // UNKNOWN tem baixa confiança
  if (result.intent === "UNKNOWN") {
    return 0.1;
  }
  
  return 0.5; // Default
}

/**
 * Sugere intenções alternativas para mensagens ambíguas
 * @param message - Mensagem original
 * @returns Array de intenções possíveis
 */
export function suggestAlternatives(message: string): Intent[] {
  const alternatives: Intent[] = [];
  const msg = message.toLowerCase();
  
  // Se não é claramente produto, pode ser ajuda
  if (!fromTokensToProductCategory(tokensPTES(message)).produto) {
    alternatives.push("HELP");
  }
  
  // Se tem palavras de cortesia, pode ser small talk
  if (/\b(por favor|obrigad|desculp|com licenca)\b/i.test(msg)) {
    alternatives.push("SMALL_TALK");
  }
  
  // Se menciona tempo/horário
  if (/\b(hora|tempo|quando|agora)\b/i.test(msg)) {
    alternatives.push("TIME_QUERY");
  }
  
  return alternatives;
}