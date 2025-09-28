/**
 * Sistema de templates com rotação por sessão - IA Vendedor
 */

import { nextVariant } from "../core/session.js";
import { CatalogItem } from "../../shared/schema.js";

export type DecisionContext = {
  shouldAskForClarification: boolean;
  shouldOfferCrossSell: boolean;
  shouldContinueSearch: boolean;
  clarificationFocus?: "modelo" | "cor" | "preco" | "categoria";
  crossSellSuggestions?: string[];
  responseType: "results" | "clarification" | "cross_sell" | "not_found";
};

export type TemplateContext = {
  sessionId: string;
  results: CatalogItem[];
  decision: DecisionContext;
  userMessage: string;
};

/**
 * Gera resposta baseada no contexto e decisão
 * @param ctx - Contexto do template
 * @returns Resposta formatada
 */
export function generateResponse(ctx: TemplateContext): string {
  switch (ctx.decision.responseType) {
    case "results":
      return generateResultsResponse(ctx);
    case "clarification":
      return generateClarificationResponse(ctx);
    case "cross_sell":
      return generateCrossSellResponse(ctx);
    case "not_found":
      return generateNotFoundResponse(ctx);
    default:
      return "Desculpe, não entendi. Pode reformular sua pergunta?";
  }
}

/**
 * Gera resposta com resultados
 */
function generateResultsResponse(ctx: TemplateContext): string {
  const { results, sessionId } = ctx;
  
  if (results.length === 0) {
    return generateNotFoundResponse(ctx);
  }
  
  const intros = [
    "Encontrei estas opções para você:",
    "Aqui estão os produtos que encontrei:",
    "Veja o que temos disponível:",
    "Achei estes produtos interessantes:"
  ];
  
  const intro = intros[nextVariant(sessionId, "results_intro", intros.length)];
  const items = results.slice(0, 5).map(formatProduct).join("\n");
  
  let response = `${intro}\n\n${items}`;
  
  // Adiciona cross-sell se disponível
  if (ctx.decision.shouldOfferCrossSell && ctx.decision.crossSellSuggestions?.length) {
    const crossSell = generateCrossSellText(ctx.sessionId, ctx.decision.crossSellSuggestions);
    response += `\n\n${crossSell}`;
  }
  
  return response;
}

/**
 * Gera resposta de clarificação
 */
function generateClarificationResponse(ctx: TemplateContext): string {
  const { sessionId, decision } = ctx;
  
  switch (decision.clarificationFocus) {
    case "modelo":
      const modelQuestions = [
        "Qual modelo você prefere?",
        "Tem algum modelo específico em mente?",
        "Que versão você está procurando?"
      ];
      return modelQuestions[nextVariant(sessionId, "model_clarification", modelQuestions.length)];
      
    case "preco":
      const priceQuestions = [
        "Qual é o seu orçamento?",
        "Tem alguma faixa de preço em mente?",
        "Quer algo mais em conta ou pode investir mais?"
      ];
      return priceQuestions[nextVariant(sessionId, "price_clarification", priceQuestions.length)];
      
    case "cor":
      const colorQuestions = [
        "Tem alguma cor de preferência?",
        "Que cor você gostaria?",
        "Prefere alguma cor específica?"
      ];
      return colorQuestions[nextVariant(sessionId, "color_clarification", colorQuestions.length)];
      
    case "categoria":
      const categoryQuestions = [
        "Pode ser mais específico sobre o que procura?",
        "Que tipo exatamente você quer?",
        "Tem alguma característica específica em mente?"
      ];
      return categoryQuestions[nextVariant(sessionId, "category_clarification", categoryQuestions.length)];
      
    default:
      return "Pode me dar mais detalhes sobre o que você procura?";
  }
}

/**
 * Gera resposta de cross-sell
 */
function generateCrossSellResponse(ctx: TemplateContext): string {
  if (!ctx.decision.crossSellSuggestions?.length) {
    return "";
  }
  
  return generateCrossSellText(ctx.sessionId, ctx.decision.crossSellSuggestions);
}

/**
 * Gera resposta para nenhum resultado
 */
function generateNotFoundResponse(ctx: TemplateContext): string {
  const { sessionId } = ctx;
  
  const notFoundMessages = [
    "Não encontrei exatamente o que você procura.",
    "Hmm, não achei esse produto específico.",
    "Parece que não temos isso disponível no momento."
  ];
  
  let response = notFoundMessages[nextVariant(sessionId, "not_found", notFoundMessages.length)];
  
  // Adiciona sugestões se disponíveis
  if (ctx.decision.crossSellSuggestions?.length) {
    const suggestions = ctx.decision.crossSellSuggestions.slice(0, 3).join(", ");
    response += ` Que tal dar uma olhada em: ${suggestions}?`;
  }
  
  return response;
}

/**
 * Formata um produto para exibição
 */
function formatProduct(item: CatalogItem): string {
  const price = item.price ? `R$ ${item.price.toFixed(2)}` : "Consulte preço";
  const stock = item.in_stock ? "✅ Em estoque" : "❌ Indisponível";
  const brand = item.brand ? ` - ${item.brand}` : "";
  
  return `🔹 **${item.title}**${brand}\n   💰 ${price} | ${stock}`;
}

/**
 * Gera texto de cross-sell
 */
function generateCrossSellText(sessionId: string, suggestions: string[]): string {
  const crossSellIntros = [
    "Você também pode se interessar por:",
    "Outros produtos relacionados:",
    "Que tal dar uma olhada em:",
    "Talvez você goste de:"
  ];
  
  const intro = crossSellIntros[nextVariant(sessionId, "cross_sell_intro", crossSellIntros.length)];
  const items = suggestions.slice(0, 3).join(", ");
  
  return `${intro} ${items}`;
}