
/**
 * Sistema de Proatividade Inteligente
 * Antecipa necessidades e oferece sugestões baseadas em comportamento
 */

import type { ConversationMemory, BehaviorPattern } from "../core/memory.js";
import { getConversationMemory, learnBehaviorPattern } from "../core/memory.js";

export interface ProactiveInsight {
  type: "suggestion" | "warning" | "opportunity" | "followup";
  priority: "low" | "medium" | "high";
  message: string;
  action: string;
  confidence: number;
  triggers: string[];
}

export interface BehaviorAnalysis {
  patterns: BehaviorPattern[];
  trends: BehaviorTrend[];
  predictions: BehaviorPrediction[];
  recommendations: ProactiveRecommendation[];
}

export interface BehaviorTrend {
  pattern: string;
  direction: "increasing" | "decreasing" | "stable";
  strength: number;
  timeframe: string;
}

export interface BehaviorPrediction {
  event: string;
  probability: number;
  timeframe: string;
  confidence: number;
}

export interface ProactiveRecommendation {
  action: string;
  reason: string;
  expectedOutcome: string;
  priority: number;
}

/**
 * Analisa comportamento do usuário e gera insights proativos
 */
export function generateProactiveInsights(sessionId: string): ProactiveInsight[] {
  const memory = getConversationMemory(sessionId);
  const insights: ProactiveInsight[] = [];
  
  // Analisar padrões de busca
  insights.push(...analyzeSearchPatterns(memory));
  
  // Analisar padrões de preço
  insights.push(...analyzePricePatterns(memory));
  
  // Analisar padrões temporais
  insights.push(...analyzeTemporalPatterns(memory));
  
  // Analisar abandono de conversa
  insights.push(...analyzeAbandonmentPatterns(memory));
  
  // Analisar satisfação
  insights.push(...analyzeSatisfactionPatterns(memory));
  
  // Ordenar por prioridade e confiança
  return insights
    .sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const scoreA = priorityWeight[a.priority] * a.confidence;
      const scoreB = priorityWeight[b.priority] * b.confidence;
      return scoreB - scoreA;
    })
    .slice(0, 5); // Máximo 5 insights por vez
}

/**
 * Analisa padrões de busca do usuário
 */
function analyzeSearchPatterns(memory: ConversationMemory): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];
  const searchMessages = memory.messages.filter(m => 
    m.role === "user" && (m.intent === "PRODUCT_SEARCH" || m.content.toLowerCase().includes("procur"))
  );
  
  if (searchMessages.length >= 3) {
    // Usuário faz muitas buscas - pode estar indeciso
    const recentSearches = searchMessages.slice(-3);
    const categories = recentSearches.map(m => extractCategory(m.content));
    const uniqueCategories = new Set(categories);
    
    if (uniqueCategories.size > 2) {
      insights.push({
        type: "suggestion",
        priority: "medium",
        message: "Percebi que você está explorando várias categorias. Que tal eu te ajudar a focar no que é mais importante para você agora?",
        action: "offer_category_guidance",
        confidence: 0.7,
        triggers: ["multiple_categories", "indecision_pattern"]
      });
    }
  }
  
  // Padrão de busca repetitiva
  const lastSearches = searchMessages.slice(-5).map(m => m.content.toLowerCase());
  const repeatedSearches = lastSearches.filter((search, index) => 
    lastSearches.indexOf(search) !== index
  );
  
  if (repeatedSearches.length > 0) {
    insights.push({
      type: "warning",
      priority: "high",
      message: "Vejo que você está buscando pelo mesmo produto várias vezes. Posso te mostrar opções mais específicas ou alternativas?",
      action: "refine_search_criteria",
      confidence: 0.8,
      triggers: ["repeated_search", "search_refinement_needed"]
    });
  }
  
  return insights;
}

/**
 * Analisa padrões relacionados a preço
 */
function analyzePricePatterns(memory: ConversationMemory): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];
  const priceMessages = memory.messages.filter(m => 
    m.content.toLowerCase().includes("preço") || 
    m.content.toLowerCase().includes("barato") ||
    m.content.toLowerCase().includes("caro") ||
    m.content.toLowerCase().includes("desconto")
  );
  
  if (priceMessages.length >= 2) {
    const recentPriceQueries = priceMessages.slice(-3);
    const hasPriceConcerns = recentPriceQueries.some(m => 
      m.content.toLowerCase().includes("caro") || 
      m.content.toLowerCase().includes("muito")
    );
    
    if (hasPriceConcerns) {
      insights.push({
        type: "opportunity",
        priority: "high",
        message: "Notei sua preocupação com preços. Posso te mostrar as melhores ofertas e promoções disponíveis agora!",
        action: "show_best_deals",
        confidence: 0.9,
        triggers: ["price_sensitivity", "discount_opportunity"]
      });
    }
  }
  
  // Padrão de comparação de preços
  const comparisonMessages = memory.messages.filter(m =>
    m.content.toLowerCase().includes("compar") ||
    m.content.toLowerCase().includes("melhor preço") ||
    m.content.toLowerCase().includes("mais barato")
  );
  
  if (comparisonMessages.length >= 1) {
    insights.push({
      type: "suggestion",
      priority: "medium",
      message: "Vejo que você gosta de comparar preços. Posso criar uma comparação detalhada dos produtos que você está considerando!",
      action: "create_price_comparison",
      confidence: 0.8,
      triggers: ["price_comparison", "decision_support"]
    });
  }
  
  return insights;
}

/**
 * Analisa padrões temporais de comportamento
 */
function analyzeTemporalPatterns(memory: ConversationMemory): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];
  const now = new Date();
  const conversationDuration = now.getTime() - memory.messages[0]?.timestamp.getTime();
  
  // Conversa muito longa sem decisão
  if (conversationDuration > 20 * 60 * 1000 && memory.conversationFlow.currentStage !== "decision") {
    insights.push({
      type: "suggestion",
      priority: "medium",
      message: "Vejo que estamos conversando há um tempo. Que tal eu resumir as melhores opções para facilitar sua decisão?",
      action: "summarize_options",
      confidence: 0.7,
      triggers: ["long_conversation", "decision_delay"]
    });
  }
  
  // Padrão de horário (se usuário sempre busca em determinado horário)
  const messageHours = memory.messages.map(m => m.timestamp.getHours());
  const currentHour = now.getHours();
  const sameHourMessages = messageHours.filter(h => Math.abs(h - currentHour) <= 1);
  
  if (sameHourMessages.length >= 3 && memory.messages.length >= 5) {
    insights.push({
      type: "followup",
      priority: "low",
      message: "Percebi que você sempre busca produtos neste horário. Posso te enviar notificações de ofertas especiais neste período!",
      action: "offer_time_based_notifications",
      confidence: 0.6,
      triggers: ["temporal_pattern", "notification_opportunity"]
    });
  }
  
  return insights;
}

/**
 * Analisa padrões de abandono de conversa
 */
function analyzeAbandonmentPatterns(memory: ConversationMemory): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];
  const lastMessage = memory.messages[memory.messages.length - 1];
  
  if (!lastMessage) return insights;
  
  const timeSinceLastMessage = Date.now() - lastMessage.timestamp.getTime();
  
  // Usuário parou de responder após ver produtos
  if (timeSinceLastMessage > 5 * 60 * 1000 && 
      lastMessage.role === "assistant" && 
      memory.conversationFlow.currentStage === "search") {
    
    insights.push({
      type: "followup",
      priority: "medium",
      message: "Vi que você estava interessado nos produtos que mostrei. Tem alguma dúvida específica que posso esclarecer?",
      action: "reengage_after_product_view",
      confidence: 0.6,
      triggers: ["conversation_pause", "product_interest"]
    });
  }
  
  // Padrão de abandono após pergunta sobre preço
  const lastUserMessage = memory.messages.filter(m => m.role === "user").slice(-1)[0];
  if (lastUserMessage && 
      timeSinceLastMessage > 3 * 60 * 1000 &&
      lastUserMessage.content.toLowerCase().includes("preço")) {
    
    insights.push({
      type: "opportunity",
      priority: "high",
      message: "Ainda está pensando no preço? Posso verificar se temos alguma promoção especial ou condição de pagamento que ajude!",
      action: "offer_payment_options",
      confidence: 0.8,
      triggers: ["price_hesitation", "payment_assistance"]
    });
  }
  
  return insights;
}

/**
 * Analisa padrões de satisfação do usuário
 */
function analyzeSatisfactionPatterns(memory: ConversationMemory): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];
  const satisfactionMessages = memory.messages.filter(m =>
    m.role === "user" && (
      m.content.toLowerCase().includes("obrigad") ||
      m.content.toLowerCase().includes("valeu") ||
      m.content.toLowerCase().includes("legal") ||
      m.content.toLowerCase().includes("bom")
    )
  );
  
  if (satisfactionMessages.length >= 2) {
    insights.push({
      type: "opportunity",
      priority: "medium",
      message: "Fico feliz que esteja gostando do atendimento! Que tal eu te mostrar alguns produtos relacionados que podem te interessar?",
      action: "suggest_related_products",
      confidence: 0.7,
      triggers: ["high_satisfaction", "cross_sell_opportunity"]
    });
  }
  
  // Detectar frustração
  const frustrationMessages = memory.messages.filter(m =>
    m.role === "user" && (
      m.content.toLowerCase().includes("não encontr") ||
      m.content.toLowerCase().includes("difícil") ||
      m.content.toLowerCase().includes("complicado")
    )
  );
  
  if (frustrationMessages.length >= 1) {
    insights.push({
      type: "warning",
      priority: "high",
      message: "Percebo que pode estar sendo difícil encontrar o que procura. Posso te ajudar de uma forma diferente?",
      action: "offer_alternative_approach",
      confidence: 0.8,
      triggers: ["user_frustration", "service_recovery"]
    });
  }
  
  return insights;
}

/**
 * Extrai categoria provável de uma mensagem de busca
 */
function extractCategory(message: string): string {
  const categoryKeywords = {
    "eletrônicos": ["celular", "smartphone", "tablet", "notebook", "tv", "televisão"],
    "casa": ["cama", "mesa", "cadeira", "sofá", "geladeira", "fogão"],
    "moda": ["roupa", "sapato", "tênis", "camisa", "calça", "vestido"],
    "beleza": ["perfume", "maquiagem", "creme", "shampoo", "batom"],
    "esporte": ["bicicleta", "tênis", "academia", "futebol", "corrida"]
  };
  
  const lowerMessage = message.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return category;
    }
  }
  
  return "geral";
}

/**
 * Executa ação proativa baseada no insight
 */
export function executeProactiveAction(
  sessionId: string, 
  insight: ProactiveInsight
): string {
  // Registrar o padrão de comportamento
  learnBehaviorPattern(
    sessionId,
    insight.action,
    insight.triggers,
    "neutral" // Será atualizado baseado na resposta do usuário
  );
  
  // Retornar mensagem personalizada
  return insight.message;
}

/**
 * Analisa comportamento geral e gera relatório
 */
export function analyzeBehavior(sessionId: string): BehaviorAnalysis {
  const memory = getConversationMemory(sessionId);
  
  const trends = generateBehaviorTrends(memory);
  const predictions = generateBehaviorPredictions(memory);
  const recommendations = generateProactiveRecommendations(memory);
  
  return {
    patterns: memory.behaviorPatterns,
    trends,
    predictions,
    recommendations
  };
}

/**
 * Gera tendências de comportamento
 */
function generateBehaviorTrends(memory: ConversationMemory): BehaviorTrend[] {
  const trends: BehaviorTrend[] = [];
  
  // Analisar tendência de frequência de mensagens
  const recentMessages = memory.messages.slice(-10);
  const olderMessages = memory.messages.slice(-20, -10);
  
  if (recentMessages.length > olderMessages.length) {
    trends.push({
      pattern: "message_frequency",
      direction: "increasing",
      strength: 0.7,
      timeframe: "recent"
    });
  }
  
  // Analisar tendência de satisfação
  const recentSatisfaction = recentMessages.filter(m => 
    m.content.toLowerCase().includes("obrigad") || 
    m.content.toLowerCase().includes("bom")
  ).length;
  
  const olderSatisfaction = olderMessages.filter(m => 
    m.content.toLowerCase().includes("obrigad") || 
    m.content.toLowerCase().includes("bom")
  ).length;
  
  if (recentSatisfaction > olderSatisfaction) {
    trends.push({
      pattern: "satisfaction",
      direction: "increasing",
      strength: 0.8,
      timeframe: "conversation"
    });
  }
  
  return trends;
}

/**
 * Gera predições de comportamento
 */
function generateBehaviorPredictions(memory: ConversationMemory): BehaviorPrediction[] {
  const predictions: BehaviorPrediction[] = [];
  
  // Predição de compra baseada no estágio da conversa
  if (memory.conversationFlow.currentStage === "comparison") {
    predictions.push({
      event: "purchase_decision",
      probability: 0.7,
      timeframe: "next_10_minutes",
      confidence: 0.8
    });
  }
  
  // Predição de abandono baseada em padrões
  const frustrationMessages = memory.messages.filter(m =>
    m.content.toLowerCase().includes("difícil") ||
    m.content.toLowerCase().includes("não encontr")
  );
  
  if (frustrationMessages.length >= 2) {
    predictions.push({
      event: "conversation_abandonment",
      probability: 0.6,
      timeframe: "next_5_minutes",
      confidence: 0.7
    });
  }
  
  return predictions;
}

/**
 * Gera recomendações proativas
 */
function generateProactiveRecommendations(memory: ConversationMemory): ProactiveRecommendation[] {
  const recommendations: ProactiveRecommendation[] = [];
  
  // Recomendação baseada no estágio da conversa
  switch (memory.conversationFlow.currentStage) {
    case "search":
      recommendations.push({
        action: "offer_product_comparison",
        reason: "Usuário está na fase de busca, comparação pode ajudar na decisão",
        expectedOutcome: "Acelerar processo de decisão",
        priority: 8
      });
      break;
      
    case "comparison":
      recommendations.push({
        action: "highlight_best_value",
        reason: "Usuário está comparando, destacar melhor custo-benefício",
        expectedOutcome: "Facilitar decisão de compra",
        priority: 9
      });
      break;
  }
  
  // Recomendação baseada em preferências
  if (memory.userProfile.interests.length > 0) {
    recommendations.push({
      action: "suggest_related_categories",
      reason: "Usuário tem interesses definidos, pode gostar de produtos relacionados",
      expectedOutcome: "Aumentar engajamento e vendas cruzadas",
      priority: 6
    });
  }
  
  return recommendations.sort((a, b) => b.priority - a.priority);
}
