// src/nlp/intent.ts
import { Intent, QuerySignal } from "../types";
import { tokensPTES } from "./normalize";
import { fromTokensToProductCategory } from "./productCanon";
import { hasPriceIntent } from "./priceSignals";

const RX = {
  small:/\b(oi|ola|ol[aá]|bom dia|boa tarde|boa noite|tudo bem|como vai|hola|buen[oa]s)\b/i,
  help:/\b(ajuda|como funciona|o que voce faz|dica|sugest[aã]o|ayuda|como usar)\b/i,
  time:/\b(que horas sao|que horas são|hora agora|que hora es|hora es)\b/i,
  who:/\b(seu nome|quem e voce|quem é voce|quien eres)\b/i
};

export function classify(message: string): { intent: Intent; base: QuerySignal; flags?: { priceOnlyFollowUp?: boolean } } {
  const msg = message.toLowerCase();
  if (RX.time.test(msg)) return { intent: "TIME_QUERY", base: {} };
  if (RX.small.test(msg)) return { intent: "SMALL_TALK", base: {} };
  if (RX.help.test(msg)) return { intent: "HELP", base: {} };
  if (RX.who.test(msg)) return { intent: "WHOAMI", base: {} };

  // 1) Tenta produto/categoria usando o sistema existente
  const toks = tokensPTES(message);
  const productQuery = fromTokensToProductCategory(toks);
  if (productQuery.produto || productQuery.categoria) {
    return { intent: "PRODUCT_SEARCH", base: productQuery };
  }

  // 2) Sem produto explícito? Se tem intenção de preço, trate como busca.
  if (hasPriceIntent(message)) {
    return { intent: "PRODUCT_SEARCH", base: {}, flags: { priceOnlyFollowUp: true } };
  }

  // 3) Fallback
  return { intent: "UNKNOWN", base: {} };
}