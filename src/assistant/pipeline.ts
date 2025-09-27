// src/assistant/pipeline.ts
import { singularizePhrase } from "../utils/singularize.js";
import { classifyIntent } from "../nlp/intent.js";
import { replyHelp, replyOutOfDomain, replySmallTalk, replyTime, replyWhoAmI } from "../services/smalltalk.js";
import { montarConsulta, detectarFoco } from "../../server/lib/gemini/query-builder.js";
import { obterContextoSessao, salvarContextoSessao } from "../../server/lib/gemini/context-storage.js";
import { normPTBR, tokenCanonProduct } from "../utils/lang-ptbr.js";
import { productDefaultCategory } from "../nlp/canon.store.js";
import { strSeed, mulberry32 } from "../utils/rng.js";

// Sistema dinâmico de canonização substituiu o PROD_TO_CAT hardcoded

export interface PipelineResult {
  intent: string;
  canonMsg: string;
  query?: string;
  text?: string;
  shouldSearch: boolean;
  debug: {
    original: string;
    canonMsg: string;
    intentType: string;
    query?: string;
  };
}

/**
 * Pipeline único obrigatório - toda entrada deve passar por aqui
 * normalize → tokenize → canônico → intent → slot-filling → busca estruturada
 */
export async function processUserMessage(sessionId: string, raw: string): Promise<PipelineResult> {
  console.log(`🔄 [Pipeline] Processando: "${raw}"`);
  
  // 1. Normalização + canonicalização (PT/ES + singular)
  const canonMsg = singularizePhrase(raw);
  console.log(`🔄 [Pipeline] Canonicalizada: "${raw}" → "${canonMsg}"`);
  
  // 2. Classificação de intenção
  const intent = classifyIntent(canonMsg);
  console.log(`🎯 [Pipeline] Intent: ${intent.intent}`, intent.entities);
  
  // 3. Tratamento de intenções não-busca
  if (intent.intent === "SMALL_TALK") {
    // Buscar seed da sessão para smalltalk consistente
    const sess = (await obterContextoSessao(sessionId)) ?? {};
    let seed = (sess as any).rngSeed ?? strSeed(sessionId + ":" + Date.now());
    if (!(sess as any).rngSeed) {
      await salvarContextoSessao(sessionId, { rngSeed: seed });
    }
    const rng = mulberry32(seed);
    const nextSeed = (seed + 0x9E3779B9) >>> 0;
    await salvarContextoSessao(sessionId, { rngSeed: nextSeed });
    console.log(`🎲 [RNG] Pipeline small talk seed: ${seed} → next: ${nextSeed}`);
    
    return {
      intent: intent.intent,
      canonMsg,
      text: replySmallTalk(rng),
      shouldSearch: false,
      debug: { original: raw, canonMsg, intentType: intent.intent }
    };
  }
  
  if (intent.intent === "HELP") {
    return {
      intent: intent.intent,
      canonMsg,
      text: replyHelp(),
      shouldSearch: false,
      debug: { original: raw, canonMsg, intentType: intent.intent }
    };
  }
  
  if (intent.intent === "TIME_QUERY") {
    return {
      intent: intent.intent,
      canonMsg,
      text: replyTime(),
      shouldSearch: false,
      debug: { original: raw, canonMsg, intentType: intent.intent }
    };
  }
  
  if (intent.intent === "WHOAMI") {
    return {
      intent: intent.intent,
      canonMsg,
      text: replyWhoAmI(),
      shouldSearch: false,
      debug: { original: raw, canonMsg, intentType: intent.intent }
    };
  }
  
  // 4. Slot filling + gestão de foco para buscas de produto
  const sess = (await obterContextoSessao(sessionId)) ?? {};
  
  // inicializa rngSeed uma vez por sessão
  if (!(sess as any).rngSeed) {
    await salvarContextoSessao(sessionId, { rngSeed: strSeed(sessionId + ":" + Date.now()) });
  }
  
  // Regra de continuação: "e perfumes", "mais drone", etc.
  const firstToken = normPTBR(raw).split(/\s+/)[0];
  const startsWithAnd = ["e", "tambem", "também", "mais"].includes(firstToken);
  // tenta produto do texto (canon), senão usa foco/último
  let novoProduto = undefined as string | undefined;
  for (const t of raw.split(/\s+/)) {
    const p = tokenCanonProduct(t);
    if (p) { novoProduto = p; break; }
  }
  const novoFoco = startsWithAnd && novoProduto ? novoProduto : detectarFoco(canonMsg);
  
  // Reset de foco quando há novo produto explícito
  if (novoFoco) {
    console.log(`🎯 [Pipeline] Novo foco detectado: "${novoFoco}"`);
    
    // Inferir categoria baseada no produto usando canonização dinâmica
    const novaCategoria = productDefaultCategory(novoFoco) ?? null;
    
    await salvarContextoSessao(sessionId, { 
      focoAtual: novoFoco, 
      categoriaAtual: novaCategoria,
      ultimaQuery: null,
      lastUpdated: new Date().toISOString()
    });
  }
  
  const foco = novoFoco ?? (sess as any).focoAtual ?? null;
  
  // 5. Construção da query estruturada (slot filling)
  const query = montarConsulta(canonMsg, foco ?? undefined);
  
  console.log(`📊 [Pipeline] Query final: "${query}" com foco: "${foco}"`);
  
  // Verificar se é busca válida ou fora de domínio
  if (!query || query.trim().length < 2) {
    return {
      intent: "OUT_OF_DOMAIN",
      canonMsg,
      text: replyOutOfDomain("Posso buscar por iPhone 12, Galaxy 15, drone com câmera, perfumes…"),
      shouldSearch: false,
      debug: { original: raw, canonMsg, intentType: "OUT_OF_DOMAIN", query }
    };
  }
  
  return {
    intent: intent.intent,
    canonMsg,
    query,
    shouldSearch: true,
    debug: { original: raw, canonMsg, intentType: intent.intent, query }
  };
}