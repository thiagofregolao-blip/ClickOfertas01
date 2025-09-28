/**
 * Política de decisão para conversação: 1 pergunta por vez + cross-sell
 */

import { getSession } from "../core/session.js";
import type { DecisionContext, ConversationDecision, CatalogItem, QuerySignal } from "../types.js";

// Mapeamento de categorias para cross-sell
const CROSS_SELL_MAP: Record<string, string[]> = {
  "celular": ["capas para celular", "carregadores", "fones de ouvido", "películas"],
  "iphone": ["capas para celular", "carregadores", "fones de ouvido", "películas"],
  "tv": ["suportes para TV", "soundbar", "controles remotos", "cabos HDMI"],
  "notebook": ["mouses", "teclados", "mochilas para notebook", "coolers"],
  "perfume": ["hidratantes", "desodorantes", "sabonetes", "cremes"],
  "roupa": ["cintos", "bolsas", "acessórios", "calçados"],
  "drone": ["baterias extras", "hélices reserva", "cases para drone", "cartões de memória"],
  "calcado": ["meias", "palmilhas", "cuidados para calçados", "tênis"],
  "eletrodomestico": ["filtros", "acessórios", "extensões", "organizadores"],
};

/**
 * Decide estratégia de resposta baseada no contexto
 * @param context - Contexto da decisão
 * @returns Decisão de conversa
 */
export function decide(context: DecisionContext): ConversationDecision {
  const { sessionId, userMessage, query, results, hasResults } = context;
  const session = getSession(sessionId);
  
  const decision: ConversationDecision = {
    shouldAskForClarification: false,
    shouldOfferCrossSell: false,
    shouldContinueSearch: false,
    crossSellSuggestions: [],
    responseType: "results"
  };
  
  // Se não tem resultados
  if (!hasResults) {
    decision.responseType = "not_found";
    decision.shouldAskForClarification = shouldAskClarification(query, userMessage);
    return decision;
  }
  
  // Se tem resultados
  decision.responseType = "results";
  decision.shouldOfferCrossSell = shouldOfferCrossSell(query, results, session.lastQuery);
  
  // Gera sugestões de cross-sell
  if (decision.shouldOfferCrossSell) {
    decision.crossSellSuggestions = getCrossSellSuggestions(query);
  }
  
  return decision;
}

/**
 * Decide se deve pedir clarificação
 * @param query - Query processada
 * @param userMessage - Mensagem original
 * @returns Se deve pedir clarificação
 */
function shouldAskClarification(query: QuerySignal, userMessage: string): boolean {
  // Se query é muito vaga (só categoria, sem produto)
  if (!query.produto && query.categoria) {
    return true;
  }
  
  // Se mensagem é muito curta e ambígua
  if (userMessage.length < 5 && !query.produto) {
    return true;
  }
  
  // Se não detectou produto nem categoria
  if (!query.produto && !query.categoria) {
    return true;
  }
  
  return false;
}

/**
 * Decide se deve oferecer cross-sell
 * @param query - Query processada
 * @param results - Resultados encontrados
 * @param lastQuery - Última query da sessão
 * @returns Se deve oferecer cross-sell
 */
function shouldOfferCrossSell(query: QuerySignal, results: CatalogItem[], lastQuery?: string | null): boolean {
  // Sempre oferece cross-sell quando tem resultados
  if (results.length > 0) {
    return true;
  }
  
  // Não oferece se é continuação da mesma consulta
  if (lastQuery && query.produto === lastQuery) {
    return false;
  }
  
  return true;
}

/**
 * Gera sugestões de cross-sell baseadas na query
 * @param query - Query processada
 * @returns Array de sugestões
 */
export function getCrossSellSuggestions(query: QuerySignal): string[] {
  const suggestions: string[] = [];
  
  // Busca por produto específico
  if (query.produto) {
    const produtoLower = query.produto.toLowerCase();
    
    // Busca cross-sell direto por produto
    for (const [key, values] of Object.entries(CROSS_SELL_MAP)) {
      if (produtoLower.includes(key) || key.includes(produtoLower)) {
        suggestions.push(...values);
        break;
      }
    }
  }
  
  // Busca por categoria se não encontrou por produto
  if (suggestions.length === 0 && query.categoria) {
    const categoriaLower = query.categoria.toLowerCase();
    
    if (CROSS_SELL_MAP[categoriaLower]) {
      suggestions.push(...CROSS_SELL_MAP[categoriaLower]);
    }
  }
  
  // Sugestões genéricas se não encontrou nada específico
  if (suggestions.length === 0) {
    suggestions.push("acessórios", "produtos relacionados", "ofertas especiais");
  }
  
  // Limita a 3 sugestões e remove duplicatas
  return Array.from(new Set(suggestions)).slice(0, 3);
}

/**
 * Decide tom da resposta baseado no contexto
 * @param context - Contexto da decisão
 * @returns Tom sugerido
 */
export function decideTone(context: DecisionContext): string {
  const { hasResults, query } = context;
  
  // Tom entusiasmado quando encontra resultados
  if (hasResults) {
    return "entusiasmado";
  }
  
  // Tom empático quando não encontra
  if (!hasResults) {
    return "empatico";
  }
  
  // Tom consultivo para queries complexas
  if (query.price_min && query.price_max) {
    return "consultivo";
  }
  
  return "amigavel"; // Default
}

/**
 * Sugere próximas ações para o usuário
 * @param context - Contexto da decisão
 * @returns Array de ações sugeridas
 */
export function suggestNextActions(context: DecisionContext): string[] {
  const { hasResults, query } = context;
  const actions: string[] = [];
  
  if (hasResults) {
    actions.push("Ver detalhes do produto");
    actions.push("Comparar com outros");
    actions.push("Buscar acessórios");
  } else {
    actions.push("Tentar outra marca");
    actions.push("Ampliar faixa de preço");
    actions.push("Ver produtos similares");
  }
  
  return actions;
}

/**
 * Calcula prioridade de uma pergunta de clarificação
 * @param query - Query processada
 * @returns Prioridade 0-1 (maior = mais importante)
 */
export function calculateClarificationPriority(query: QuerySignal): number {
  let priority = 0;
  
  // Falta produto específico
  if (!query.produto) priority += 0.4;
  
  // Tem faixa de preço mas sem produto
  if ((query.price_min || query.price_max) && !query.produto) priority += 0.3;
  
  // Tem atributos mas sem produto principal
  if (query.atributos && query.atributos.length > 0 && !query.produto) priority += 0.2;
  
  // Query muito genérica
  if (query.categoria === "produto" || query.categoria === "item") priority += 0.1;
  
  return Math.min(priority, 1.0);
}

/**
 * Política específica para diferentes tipos de resposta
 * @param lang - Idioma da resposta
 * @param itemCount - Número de items encontrados
 * @param query - Query processada
 * @returns Informações para política
 */
export function policyAnswer(itemCount: number, query: QuerySignal, lang: "pt" | "es") {
  return {
    catOrProd: query.produto || query.categoria || "produtos",
    ask: itemCount === 0 ? (lang === "es" ? "¿Quieres probar con otra marca?" : "Quer tentar outra marca?") : null,
    cross: itemCount > 0 ? getCrossSellSuggestions(query) : []
  };
}