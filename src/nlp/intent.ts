// src/nlp/intent.ts
import { normPTBR, canonicalProductFromText, canonicalCategoryFromText } from "../utils/lang-ptbr.js";

export type Intent =
  | "PRODUCT_SEARCH"
  | "SMALL_TALK"
  | "TIME_QUERY"
  | "WHOAMI"
  | "OUT_OF_DOMAIN"
  | "HELP"
  | "UNKNOWN";

export interface IntentResult {
  intent: Intent;
  entities?: { product?: string; category?: string; model?: string };
}

const SMALL_TALK_RX = /\b(oi|ol[aá]|bom dia|boa tarde|boa noite|tudo bem|como vai|e ai|e aí)\b/;
const HELP_RX = /\b(ajuda|como funciona|o que voc[eê] faz|menu|dica|sugest[aã]o)\b/;
const TIME_RX = /\b(que horas s[aã]o|hor[aá]rio|agora)\b/;
const WHOAMI_RX = /\b(qual seu nome|quem é voc[eê]|quem e voc[eê]|sua fun[cç][aã]o)\b/;
const PRODUCT_RX = /\b(iphone|galaxy|samsung|apple|xiaomi|motorola|pixel|celular|telefone|smartphone|drone|drones|perfume|notebook|laptop|tv|televis[aã]o)\b/;
const DRONE_RX = /\b(drone|drones|mavic|dj[ií])\b/;

export function classifyIntent(msg: string): IntentResult {
  const m = normPTBR(msg);

  if (m.length < 2) return { intent: "UNKNOWN" };
  if (TIME_RX.test(m)) return { intent: "TIME_QUERY" };
  if (SMALL_TALK_RX.test(m)) return { intent: "SMALL_TALK" };
  if (HELP_RX.test(m)) return { intent: "HELP" };
  if (WHOAMI_RX.test(m)) return { intent: "WHOAMI" };

  const productCanon = canonicalProductFromText(m);
  const categoryCanon = canonicalCategoryFromText(m);
  if (productCanon || categoryCanon) {
    const isDrone = DRONE_RX.test(m) || productCanon === "drone" || categoryCanon === "drone";
    return {
      intent: "PRODUCT_SEARCH",
      entities: {
        category: categoryCanon ?? (productCanon === "drone" ? "drone"
                    : productCanon === "iphone" || productCanon === "galaxy" ? "celular"
                    : productCanon ?? undefined),
        product: productCanon ?? undefined,
      },
    };
  }

  // Frases curtas tipo "linha 12" sem contexto caem em UNKNOWN.
  return { intent: "UNKNOWN" };
}