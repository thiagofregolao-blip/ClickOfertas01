// src/services/conversation.ts
import { classifyIntent } from "../nlp/intent";
import { montarConsulta, detectarFoco, extrairModeloPTBR } from "../../server/lib/gemini/query-builder.js";
import { obterContextoSessao, salvarContextoSessao } from "../../server/lib/gemini/context-storage.js";
import { replyHelp, replyOutOfDomain, replySmallTalk, replyTime } from "./smalltalk";

export interface AssistantResult {
  kind: "SMALL_TALK" | "HELP" | "TIME" | "PRODUCT" | "OUT_OF_DOMAIN";
  text?: string;
  queryFinal?: string;
  items?: unknown[];
}

// Usar função de busca real do projeto
async function searchProducts(query: string): Promise<{ items: unknown[] }> {
  try {
    const { buscarOfertas } = await import("../../server/lib/gemini/busca.js");
    const produtos = await buscarOfertas({ query });
    return { items: produtos };
  } catch (error) {
    console.error('Erro na busca de produtos:', error);
    return { items: [] };
  }
}

export async function runAssistant(sessionId: string, userMsg: string): Promise<AssistantResult> {
  const intent = classifyIntent(userMsg);

  // 1) Small talk / help / time
  if (intent.intent === "SMALL_TALK") {
    return { kind: "SMALL_TALK", text: replySmallTalk() };
  }
  if (intent.intent === "HELP") {
    return { kind: "HELP", text: replyHelp() };
  }
  if (intent.intent === "TIME_QUERY") {
    return { kind: "TIME", text: replyTime() };
  }

  // 2) Produto (ou UNKNOWN que podemos resolver por contexto)
  const sess = (await obterContextoSessao(sessionId)) ?? {};
  const novoFoco = detectarFoco(userMsg);
  if (novoFoco) await salvarContextoSessao(sessionId, { focoAtual: novoFoco });
  const foco = novoFoco ?? (sess as any).focoAtual ?? null;

  // Se usuário só disse "linha 12", tenta compor com foco
  const temModelo = !!extrairModeloPTBR(userMsg);
  const queryFinal = montarConsulta(userMsg, foco ?? undefined);

  // Se não temos foco e nem produto explícito, e também não há modelo → fora de domínio
  const pareceProduto = /\b(iphone|galaxy|samsung|apple|xiaomi|motorola|pixel|celular|telefone|smartphone|drone|perfume|notebook|laptop|tv|televis[aã]o)\b/i.test(
    userMsg
  );
  if (!pareceProduto && !foco && !temModelo && intent.intent !== "PRODUCT_SEARCH") {
    return {
      kind: "OUT_OF_DOMAIN",
      text: replyOutOfDomain("Posso buscar por iPhone 12, Galaxy 15, drone com câmera, perfumes…"),
    };
  }

  // 3) Busca de produto
  const { items } = await searchProducts(queryFinal);
  return { kind: "PRODUCT", queryFinal, items };
}