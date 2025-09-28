/**
 * Política de decisão para conversação: 1 pergunta por vez + cross-sell
 */

import { QuerySignal, CatalogItem } from "../../shared/schema.js";
import { getSession, updateSession } from "../core/session.js";

export type DecisionContext = {
  sessionId: string;
  userMessage: string;
  query: QuerySignal;
  results: CatalogItem[];
  hasResults: boolean;
};

export type ConversationDecision = {
  shouldAskForClarification: boolean;
  shouldOfferCrossSell: boolean;
  shouldContinueSearch: boolean;
  clarificationFocus?: "modelo" | "cor" | "preco" | "categoria";
  crossSellSuggestions?: string[];
  responseType: "results" | "clarification" | "cross_sell" | "not_found";
};

/**
 * Decide próxima ação na conversação baseado no contexto
 * @param ctx - Contexto da decisão
 * @returns Decisão sobre como proceder
 */
export function decide(ctx: DecisionContext): ConversationDecision {
  const session = getSession(ctx.sessionId);
  
  // Se não há resultados, tenta clarificação
  if (!ctx.hasResults || ctx.results.length === 0) {
    return handleNoResults(ctx);
  }
  
  // Se há muitos resultados (>5), tenta afunilar
  if (ctx.results.length > 5) {
    return handleTooManyResults(ctx);
  }
  
  // Se há poucos resultados (1-5), mostra + cross-sell
  if (ctx.results.length <= 5) {
    return handleGoodResults(ctx);
  }
  
  // Fallback: apenas mostra resultados
  return {
    shouldAskForClarification: false,
    shouldOfferCrossSell: false,
    shouldContinueSearch: false,
    responseType: "results"
  };
}

/**
 * Lida com caso de nenhum resultado
 */
function handleNoResults(ctx: DecisionContext): ConversationDecision {
  const session = getSession(ctx.sessionId);
  
  // Se já tentou clarificar, sugere produtos similares
  if (session.lastQuery && session.focoAtual) {
    return {
      shouldAskForClarification: false,
      shouldOfferCrossSell: true,
      shouldContinueSearch: false,
      crossSellSuggestions: getSimilarProducts(ctx.query),
      responseType: "not_found"
    };
  }
  
  // Primeira tentativa: pede clarificação
  const focus = determineClarificationFocus(ctx.query);
  return {
    shouldAskForClarification: true,
    shouldOfferCrossSell: false,
    shouldContinueSearch: true,
    clarificationFocus: focus,
    responseType: "clarification"
  };
}

/**
 * Lida com muitos resultados (>5)
 */
function handleTooManyResults(ctx: DecisionContext): ConversationDecision {
  const focus = determineClarificationFocus(ctx.query);
  
  return {
    shouldAskForClarification: true,
    shouldOfferCrossSell: false,
    shouldContinueSearch: true,
    clarificationFocus: focus,
    responseType: "clarification"
  };
}

/**
 * Lida com boa quantidade de resultados (1-5)
 */
function handleGoodResults(ctx: DecisionContext): ConversationDecision {
  return {
    shouldAskForClarification: false,
    shouldOfferCrossSell: true,
    shouldContinueSearch: false,
    crossSellSuggestions: getCrossSellSuggestions(ctx.results),
    responseType: "results"
  };
}

/**
 * Determina o foco da próxima clarificação
 */
function determineClarificationFocus(query: QuerySignal): "modelo" | "cor" | "preco" | "categoria" {
  // Se não tem modelo específico, pergunta modelo
  if (query.produto && !query.modelo) return "modelo";
  
  // Se não tem filtros de preço, pergunta sobre orçamento
  if (!query.price_min && !query.price_max && !query.sort) return "preco";
  
  // Se não tem atributos específicos, pergunta cor
  if (!query.atributos?.length) return "cor";
  
  // Fallback: categoria
  return "categoria";
}

/**
 * Gera sugestões de produtos similares
 */
function getSimilarProducts(query: QuerySignal): string[] {
  const suggestions: string[] = [];
  
  if (query.categoria === "celular") {
    suggestions.push("iPhone", "Galaxy", "smartphones Android");
  } else if (query.categoria === "tv") {
    suggestions.push("Smart TV", "TV 4K", "TV LED");
  } else if (query.categoria === "drone") {
    suggestions.push("DJI Mini", "drones 4K", "drones para iniciantes");
  } else if (query.categoria === "perfumaria") {
    suggestions.push("perfumes masculinos", "perfumes femininos", "colônias");
  }
  
  return suggestions;
}

/**
 * Gera sugestões de cross-sell baseado nos resultados
 */
function getCrossSellSuggestions(results: CatalogItem[]): string[] {
  const suggestions: string[] = [];
  const categories = new Set(results.map(r => r.category));
  
  if (categories.has("celular")) {
    suggestions.push("capas para celular", "carregadores", "fones de ouvido");
  }
  
  if (categories.has("tv")) {
    suggestions.push("suportes para TV", "controles remotos", "soundbars");
  }
  
  if (categories.has("drone")) {
    suggestions.push("baterias extras", "hélices reserva", "cases para drone");
  }
  
  if (categories.has("perfumaria")) {
    suggestions.push("outros perfumes", "desodorantes", "produtos de beleza");
  }
  
  return suggestions;
}