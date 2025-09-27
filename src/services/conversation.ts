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

// Usar função de busca real do projeto com canonicalização automática
async function searchProducts(query: string): Promise<{ items: unknown[] }> {
  try {
    const { singularizePhrase } = await import("../utils/singularize.js");
    const { buscarOfertas } = await import("../../server/lib/gemini/busca.js");
    
    // 1) Sempre canonicalizar antes da busca
    const canonQuery = singularizePhrase(query);
    console.log(`🔍 [searchProducts] Original: "${query}" → Canônico: "${canonQuery}"`);
    
    // 2) Busca com query canônica
    let produtos = await buscarOfertas({ query: canonQuery });
    console.log(`📦 [searchProducts] Resultados para "${canonQuery}": ${produtos.length} produtos`);
    
    // 3) Retry se veio vazio e a query original era diferente
    if (produtos.length === 0 && query.trim().toLowerCase() !== canonQuery) {
      console.log(`🔄 [searchProducts] Retry com query original "${query}"`);
      produtos = await buscarOfertas({ query });
      console.log(`📦 [searchProducts] Resultados retry para "${query}": ${produtos.length} produtos`);
    }
    
    return { items: produtos };
  } catch (error) {
    console.error('❌ [searchProducts] Erro na busca:', error);
    return { items: [] };
  }
}

export async function runAssistant(sessionId: string, userMsg: string): Promise<AssistantResult> {
  const { singularizePhrase } = await import("../utils/singularize.js");
  
  // 🔄 CORREÇÃO CRÍTICA: Canonicalizar mensagem ANTES de qualquer processamento
  const msgCanonica = singularizePhrase(userMsg);
  console.log(`🔄 [runAssistant] Original: "${userMsg}" → Canônica: "${msgCanonica}"`);
  
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
  const novoFoco = detectarFoco(msgCanonica); // Usar versão canônica
  if (novoFoco) await salvarContextoSessao(sessionId, { focoAtual: novoFoco });
  const foco = novoFoco ?? (sess as any).focoAtual ?? null;

  // Se usuário só disse "linha 12", tenta compor com foco
  const temModelo = !!extrairModeloPTBR(msgCanonica); // Usar versão canônica
  const queryFinal = montarConsulta(msgCanonica, foco ?? undefined); // Usar versão canônica

  // Se não temos foco e nem produto explícito, e também não há modelo → fora de domínio
  if (!foco && !temModelo && intent.intent !== "PRODUCT_SEARCH") {
    return {
      kind: "OUT_OF_DOMAIN",
      text: replyOutOfDomain("Posso buscar por iPhone 12, Galaxy 15, drone com câmera, perfumes…"),
    };
  }

  // 3) Busca de produto - agora aproveita categoria quando disponível
  let queryComCategoria = queryFinal;
  if (intent.entities?.category && intent.entities.category !== intent.entities?.product) {
    queryComCategoria = `${queryFinal} categoria:${intent.entities.category}`;
    console.log(`🏷️ [Conversation] Enriquecendo busca com categoria: "${queryComCategoria}"`);
  }
  
  const { items } = await searchProducts(queryComCategoria);
  console.log(`🔍 [Conversation] Busca realizada: query="${queryComCategoria}", resultados=${items.length}`);
  return { kind: "PRODUCT", queryFinal: queryComCategoria, items };
}