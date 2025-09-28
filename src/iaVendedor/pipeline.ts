/**
 * Pipeline completo do IA Vendedor
 */

import { classify } from "../nlp/iaVendedorIntent.js";
import { extractPriceSignals } from "../nlp/priceSignals.js";
import { extractModeloGBCor } from "../nlp/slots.js";
import { buildQuery, runQueryLocal, CatalogItem } from "../query/builder.js";
import { decide } from "../policy/decide.js";
import { generateResponse } from "../nlg/iaVendedorTemplates.js";
import { getSession, updateSession } from "../core/session.js";
import { QuerySignal } from "../../shared/schema.js";

// Mock data - em produção viria da base de dados
import catalogData from "../../data/catalogo.sample.json" assert { type: "json" };

export type PipelineInput = {
  sessionId: string;
  userMessage: string;
  preferInStockCheapest?: boolean;
};

export type PipelineOutput = {
  response: string;
  results: CatalogItem[];
  queryUsed: QuerySignal;
  intent: string;
  debug?: any;
};

/**
 * Executa pipeline completo do IA Vendedor
 * @param input - Entrada do pipeline
 * @returns Resposta processada
 */
export async function runIAVendedorPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const { sessionId, userMessage, preferInStockCheapest = true } = input;
  
  // 1. Classificação de intenção
  const classification = classify(userMessage);
  
  // Se não é busca de produto, resposta direta
  if (classification.intent !== "PRODUCT_SEARCH") {
    return handleNonProductIntent(classification.intent, userMessage);
  }
  
  // 2. Extração de slots
  const slots = extractModeloGBCor(userMessage);
  
  // 3. Construção da query
  const query = buildQuery({
    base: classification.base,
    text: userMessage,
    preferInStockCheapest,
    slots: {
      attrs: slots.attrs,
      modelo: slots.modelo
    }
  });
  
  // 4. Execução local da busca
  const results = runQueryLocal(catalogData as CatalogItem[], query);
  
  // 5. Atualização da sessão
  const session = getSession(sessionId);
  updateSession(sessionId, {
    focoAtual: query.produto,
    categoriaAtual: query.categoria,
    lastQuery: userMessage
  });
  
  // 6. Decisão de conversa
  const decision = decide({
    sessionId,
    userMessage,
    query,
    results,
    hasResults: results.length > 0
  });
  
  // 7. Geração de resposta
  const response = generateResponse({
    sessionId,
    results,
    decision,
    userMessage
  });
  
  return {
    response,
    results,
    queryUsed: query,
    intent: classification.intent,
    debug: {
      classification,
      slots,
      decision,
      sessionState: session
    }
  };
}

/**
 * Lida com intenções que não são busca de produto
 */
function handleNonProductIntent(intent: string, message: string): PipelineOutput {
  let response = "";
  
  switch (intent) {
    case "SMALL_TALK":
      response = "Olá! Como posso ajudar você a encontrar o melhor produto hoje?";
      break;
    case "HELP":
      response = "Posso ajudar você a encontrar produtos como iPhone, drone, perfume, TV e muito mais. Me diga o que procura!";
      break;
    case "TIME_QUERY":
      response = `Agora são ${new Date().toLocaleTimeString("pt-BR")}. Em que posso ajudar?`;
      break;
    case "WHOAMI":
      response = "Sou seu assistente de compras especializado em encontrar as melhores ofertas!";
      break;
    default:
      response = "Não entendi bem. Pode me dizer que produto você procura?";
  }
  
  return {
    response,
    results: [],
    queryUsed: {},
    intent
  };
}