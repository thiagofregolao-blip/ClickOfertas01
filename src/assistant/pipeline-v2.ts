
/**
 * Pipeline V2 - Vendedor Inteligente Aprimorado
 * Integra memória conversacional, inteligência emocional e proatividade
 */

import { singularizePhrase } from "../utils/singularize.js";
import { classifyIntent } from "./nlp/intent.js";
import { replyHelp, replyOutOfDomain, replySmallTalk, replyTime, replyWhoAmI } from "../services/smalltalk.js";
import { montarConsulta, detectarFoco } from "../../server/lib/gemini/query-builder.js";
import { obterContextoSessao, salvarContextoSessao } from "../../server/lib/gemini/context-storage.js";
import { normPTBR, tokenCanonProduct } from "../utils/lang-ptbr.js";
import { productDefaultCategory } from "./nlp/canon.store.js";
import { strSeed, mulberry32 } from "../utils/rng.js";

// Novos imports para V2
import { 
  getConversationMemory, 
  addMessage, 
  updateContext, 
  updateUserProfile,
  getConversationSummary,
  learnBehaviorPattern
} from "./core/memory.js";
import { 
  generateEmotionalContext, 
  adaptResponse 
} from "./intelligence/emotional.js";
import { 
  generateProactiveInsights, 
  executeProactiveAction 
} from "./intelligence/proactive.js";
import { 
  scheduleFollowUp 
} from "./intelligence/followup.js";
import { 
  selectOptimalPrompt, 
  generateContextualPrompt 
} from "./prompts/optimized.js";

export interface PipelineV2Result {
  intent: string;
  canonMsg: string;
  query?: string;
  text?: string;
  shouldSearch: boolean;
  proactiveInsights?: any[];
  emotionalContext?: any;
  followUpScheduled?: boolean;
  debug: {
    original: string;
    canonMsg: string;
    intentType: string;
    query?: string;
    emotionalAnalysis?: any;
    memoryUpdated?: boolean;
    proactiveTriggered?: boolean;
  };
}

/**
 * Pipeline V2 - Processamento inteligente com memória e emoções
 */
export async function processUserMessageV2(sessionId: string, raw: string): Promise<PipelineV2Result> {
  console.log(`🔄 [Pipeline V2] Processando: "${raw}"`);
  
  // 1. Obter/inicializar memória conversacional
  const memory = getConversationMemory(sessionId);
  
  // 2. Análise emocional da mensagem
  const emotionalContext = generateEmotionalContext(raw, memory.messages.slice(-5).map(m => m.content));
  console.log(`🧠 [Emotional] Sentimento: ${emotionalContext.sentiment.polarity.toFixed(2)}, Emoções: ${emotionalContext.sentiment.emotions.join(", ")}`);
  
  // 3. Adicionar mensagem à memória
  addMessage(sessionId, "user", raw, {
    sentiment: emotionalContext.sentiment,
    intent: undefined // Será preenchido após classificação
  });
  
  // 4. Normalização + canonicalização (PT/ES + singular)
  const canonMsg = singularizePhrase(raw);
  console.log(`🔄 [Pipeline V2] Canonicalizada: "${raw}" → "${canonMsg}"`);
  
  // 5. Classificação de intenção
  const intent = classifyIntent(canonMsg);
  console.log(`🎯 [Pipeline V2] Intent: ${intent.intent}`, intent.entities);
  
  // 6. Atualizar contexto baseado na intenção
  if (intent.entities && Object.keys(intent.entities).length > 0) {
    updateContext(sessionId, intent.intent, intent.entities, 0.8);
  }
  
  // 7. Tratamento de intenções não-busca com prompts otimizados
  if (intent.intent === "SMALL_TALK") {
    const sess = (await obterContextoSessao(sessionId)) ?? {};
    let seed = (sess as any).rngSeed ?? strSeed(sessionId + ":" + Date.now());
    if (!(sess as any).rngSeed) {
      await salvarContextoSessao(sessionId, { rngSeed: seed });
    }
    const rng = mulberry32(seed);
    const nextSeed = (seed + 0x9E3779B9) >>> 0;
    await salvarContextoSessao(sessionId, { rngSeed: nextSeed });
    
    let response = replySmallTalk(rng);
    
    // Adaptar resposta baseada no contexto emocional
    response = adaptResponse(response, emotionalContext);
    
    // Adicionar resposta à memória
    addMessage(sessionId, "assistant", response);
    
    return {
      intent: intent.intent,
      canonMsg,
      text: response,
      shouldSearch: false,
      emotionalContext,
      debug: { 
        original: raw, 
        canonMsg, 
        intentType: intent.intent,
        emotionalAnalysis: emotionalContext,
        memoryUpdated: true
      }
    };
  }
  
  if (intent.intent === "HELP") {
    const context = {
      category: "greeting",
      messages_count: memory.messages.length,
      user_type: memory.messages.length > 5 ? "returning" : "new"
    };
    
    let response = selectOptimalPrompt("greeting", context, emotionalContext, memory);
    if (!response || response === "Como posso ajudar você hoje?") {
      response = replyHelp();
    }
    
    response = adaptResponse(response, emotionalContext);
    addMessage(sessionId, "assistant", response);
    
    return {
      intent: intent.intent,
      canonMsg,
      text: response,
      shouldSearch: false,
      emotionalContext,
      debug: { 
        original: raw, 
        canonMsg, 
        intentType: intent.intent,
        emotionalAnalysis: emotionalContext,
        memoryUpdated: true
      }
    };
  }
  
  if (intent.intent === "TIME_QUERY") {
    let response = replyTime();
    response = adaptResponse(response, emotionalContext);
    addMessage(sessionId, "assistant", response);
    
    return {
      intent: intent.intent,
      canonMsg,
      text: response,
      shouldSearch: false,
      emotionalContext,
      debug: { original: raw, canonMsg, intentType: intent.intent }
    };
  }
  
  if (intent.intent === "WHOAMI") {
    let response = replyWhoAmI();
    response = adaptResponse(response, emotionalContext);
    addMessage(sessionId, "assistant", response);
    
    return {
      intent: intent.intent,
      canonMsg,
      text: response,
      shouldSearch: false,
      emotionalContext,
      debug: { original: raw, canonMsg, intentType: intent.intent }
    };
  }
  
  // 8. Processamento de buscas de produto com contexto inteligente
  const sess = (await obterContextoSessao(sessionId)) ?? {};
  
  // Inicializar rngSeed uma vez por sessão
  if (!(sess as any).rngSeed) {
    await salvarContextoSessao(sessionId, { rngSeed: strSeed(sessionId + ":" + Date.now()) });
  }
  
  // Regra de continuação: "e perfumes", "mais drone", etc.
  const firstToken = normPTBR(raw).split(/\s+/)[0];
  const startsWithAnd = ["e", "tambem", "também", "mais"].includes(firstToken);
  
  // Tentar produto do texto (canon), senão usar foco/último
  let novoProduto = undefined as string | undefined;
  for (const t of raw.split(/\s+/)) {
    const p = tokenCanonProduct(t);
    if (p) { novoProduto = p; break; }
  }
  const novoFoco = startsWithAnd && novoProduto ? novoProduto : detectarFoco(canonMsg);
  
  // Reset de foco quando há novo produto explícito
  if (novoFoco) {
    console.log(`🎯 [Pipeline V2] Novo foco detectado: "${novoFoco}"`);
    
    // Inferir categoria baseada no produto usando canonização dinâmica
    const novaCategoria = productDefaultCategory(novoFoco) ?? null;
    
    await salvarContextoSessao(sessionId, { 
      focoAtual: novoFoco, 
      categoriaAtual: novaCategoria,
      ultimaQuery: null,
      lastUpdated: new Date().toISOString()
    });
    
    // Atualizar perfil do usuário
    updateUserProfile(sessionId, {
      interests: novoFoco ? [novoFoco] : [],
      preferredCategories: novaCategoria ? [novaCategoria] : []
    });
    
    // Atualizar contexto
    updateContext(sessionId, "product_search", {
      product: novoFoco,
      category: novaCategoria
    }, 1.0);
  }
  
  const foco = novoFoco ?? (sess as any).focoAtual ?? null;
  
  // 9. Construção da query estruturada (slot filling)
  const query = montarConsulta(canonMsg, foco ?? undefined);
  console.log(`📊 [Pipeline V2] Query final: "${query}" com foco: "${foco}"`);
  
  // 10. Verificar se é busca válida ou fora de domínio
  if (!query || query.trim().length < 2) {
    // Gerar resposta contextual para domínio desconhecido
    const context = {
      category: "error",
      intent: "UNCLEAR",
      suggestions: "iPhone 12, Galaxy 15, drone com câmera, perfumes"
    };
    
    let response = selectOptimalPrompt("error", context, emotionalContext, memory);
    if (!response || response.includes("Como posso ajudar")) {
      response = replyOutOfDomain("Posso buscar por iPhone 12, Galaxy 15, drone com câmera, perfumes…");
    }
    
    response = adaptResponse(response, emotionalContext);
    addMessage(sessionId, "assistant", response);
    
    // Agendar follow-up se usuário parecer frustrado
    if (emotionalContext.sentiment.emotions.includes("frustration")) {
      scheduleFollowUp(sessionId, "search_difficulty", {
        product: foco || "produto",
        frustration_level: "high"
      });
    }
    
    return {
      intent: "OUT_OF_DOMAIN",
      canonMsg,
      text: response,
      shouldSearch: false,
      emotionalContext,
      followUpScheduled: emotionalContext.sentiment.emotions.includes("frustration"),
      debug: { 
        original: raw, 
        canonMsg, 
        intentType: "OUT_OF_DOMAIN", 
        query,
        emotionalAnalysis: emotionalContext,
        memoryUpdated: true
      }
    };
  }
  
  // 11. Gerar insights proativos
  const proactiveInsights = generateProactiveInsights(sessionId);
  console.log(`🚀 [Proactive] Gerados ${proactiveInsights.length} insights`);
  
  // 12. Aprender padrões de comportamento
  learnBehaviorPattern(
    sessionId,
    `search_${intent.intent}`,
    [foco || "unknown", emotionalContext.sentiment.emotions[0] || "neutral"],
    "neutral"
  );
  
  // 13. Agendar follow-up baseado no comportamento
  if (emotionalContext.sentiment.emotions.includes("price_sensitivity")) {
    scheduleFollowUp(sessionId, "price_concern", {
      product: foco,
      price_sensitivity: true
    });
  }
  
  if (emotionalContext.sentiment.urgency === "high") {
    scheduleFollowUp(sessionId, "urgency_detected", {
      product: foco,
      urgency_level: "high"
    });
  }
  
  // 14. Atualizar mensagem com intent classificado
  const lastMessage = memory.messages[memory.messages.length - 1];
  if (lastMessage) {
    lastMessage.intent = intent.intent;
  }
  
  return {
    intent: intent.intent,
    canonMsg,
    query,
    shouldSearch: true,
    proactiveInsights,
    emotionalContext,
    followUpScheduled: true,
    debug: { 
      original: raw, 
      canonMsg, 
      intentType: intent.intent, 
      query,
      emotionalAnalysis: emotionalContext,
      memoryUpdated: true,
      proactiveTriggered: proactiveInsights.length > 0
    }
  };
}

/**
 * Processa resposta do assistente e adiciona à memória
 */
export function processAssistantResponse(
  sessionId: string,
  response: string,
  context: {
    resultsCount?: number;
    products?: string[];
    intent?: string;
  }
): string {
  const memory = getConversationMemory(sessionId);
  
  // Gerar contexto emocional para adaptar resposta
  const lastUserMessage = memory.messages.filter(m => m.role === "user").slice(-1)[0];
  let emotionalContext;
  
  if (lastUserMessage) {
    emotionalContext = generateEmotionalContext(lastUserMessage.content);
  }
  
  // Adaptar resposta se contexto emocional disponível
  let adaptedResponse = response;
  if (emotionalContext) {
    adaptedResponse = adaptResponse(response, emotionalContext);
  }
  
  // Adicionar resposta à memória
  addMessage(sessionId, "assistant", adaptedResponse, {
    responseTime: Date.now() - (lastUserMessage?.timestamp.getTime() || Date.now())
  });
  
  // Atualizar contexto baseado nos resultados
  if (context.resultsCount !== undefined) {
    updateContext(sessionId, "search_results", {
      count: context.resultsCount,
      products: context.products || [],
      timestamp: new Date().toISOString()
    }, 0.9);
  }
  
  // Aprender padrão de sucesso/falha
  const outcome = context.resultsCount && context.resultsCount > 0 ? "positive" : "negative";
  learnBehaviorPattern(
    sessionId,
    `search_result_${outcome}`,
    context.products || [],
    outcome
  );
  
  return adaptedResponse;
}

/**
 * Executa ações proativas quando apropriado
 */
export function executeProactiveActions(sessionId: string): string[] {
  const insights = generateProactiveInsights(sessionId);
  const executedActions: string[] = [];
  
  // Executar apenas insights de alta prioridade
  const highPriorityInsights = insights.filter(i => i.priority === "high" && i.confidence > 0.7);
  
  for (const insight of highPriorityInsights.slice(0, 2)) { // Máximo 2 ações por vez
    const actionResult = executeProactiveAction(sessionId, insight);
    executedActions.push(actionResult);
    
    console.log(`🎯 [Proactive] Executada ação: ${insight.action}`);
  }
  
  return executedActions;
}

/**
 * Obtém resumo da sessão para debug/análise
 */
export function getSessionSummary(sessionId: string): {
  conversationSummary: string;
  emotionalProfile: any;
  behaviorPatterns: any[];
  proactiveOpportunities: any[];
} {
  const memory = getConversationMemory(sessionId);
  const conversationSummary = getConversationSummary(sessionId);
  
  // Análise emocional geral
  const recentMessages = memory.messages.filter(m => m.role === "user").slice(-5);
  const emotionalProfile = recentMessages.length > 0 ? 
    generateEmotionalContext(recentMessages.map(m => m.content).join(" ")) : null;
  
  // Insights proativos
  const proactiveOpportunities = generateProactiveInsights(sessionId);
  
  return {
    conversationSummary,
    emotionalProfile,
    behaviorPatterns: memory.behaviorPatterns,
    proactiveOpportunities
  };
}
