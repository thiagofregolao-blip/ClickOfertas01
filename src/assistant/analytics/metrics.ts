
/**
 * Sistema de Métricas e Analytics do Vendedor Inteligente
 * Coleta, processa e analisa dados de performance
 */

import type { 
  VendorPerformanceMetrics, 
  ConversationAnalytics, 
  PredictiveModel,
  ConversationQuality 
} from "../types-v2.js";
import { getConversationMemory } from "../core/memory.js";

// Armazenamento de métricas em memória
const METRICS_STORAGE = new Map<string, any>();
const SESSION_METRICS = new Map<string, any>();

export interface MetricEvent {
  sessionId: string;
  timestamp: Date;
  type: string;
  data: Record<string, any>;
  value?: number;
}

export interface MetricAggregation {
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
  stdDev: number;
}

/**
 * Registra evento de métrica
 */
export function recordMetric(event: MetricEvent): void {
  const key = `${event.type}_${event.sessionId}`;
  
  if (!METRICS_STORAGE.has(key)) {
    METRICS_STORAGE.set(key, []);
  }
  
  METRICS_STORAGE.get(key)!.push(event);
  
  // Atualizar métricas da sessão
  updateSessionMetrics(event.sessionId, event);
  
  console.log(`📊 [Metrics] Registrado: ${event.type} para sessão ${event.sessionId}`);
}

/**
 * Atualiza métricas da sessão
 */
function updateSessionMetrics(sessionId: string, event: MetricEvent): void {
  if (!SESSION_METRICS.has(sessionId)) {
    SESSION_METRICS.set(sessionId, {
      sessionId,
      startTime: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      searchCount: 0,
      resultViews: 0,
      emotionalEvents: [],
      proactiveActions: 0,
      followUpsSent: 0,
      satisfactionScore: 0,
      conversionEvents: []
    });
  }
  
  const metrics = SESSION_METRICS.get(sessionId)!;
  metrics.lastActivity = event.timestamp;
  
  switch (event.type) {
    case "message_sent":
      metrics.messageCount++;
      break;
    case "search_performed":
      metrics.searchCount++;
      break;
    case "results_viewed":
      metrics.resultViews++;
      break;
    case "emotional_event":
      metrics.emotionalEvents.push(event.data);
      break;
    case "proactive_action":
      metrics.proactiveActions++;
      break;
    case "followup_sent":
      metrics.followUpsSent++;
      break;
    case "satisfaction_feedback":
      metrics.satisfactionScore = event.value || 0;
      break;
    case "conversion_event":
      metrics.conversionEvents.push(event.data);
      break;
  }
}

/**
 * Calcula métricas de performance geral
 */
export function calculatePerformanceMetrics(): VendorPerformanceMetrics {
  const allSessions = Array.from(SESSION_METRICS.values());
  
  if (allSessions.length === 0) {
    return getEmptyMetrics();
  }
  
  // Métricas de sessão
  const sessionDurations = allSessions.map(s => 
    s.lastActivity.getTime() - s.startTime.getTime()
  );
  const messagesPerSession = allSessions.map(s => s.messageCount);
  const completedSessions = allSessions.filter(s => s.conversionEvents.length > 0);
  
  // Métricas emocionais
  const allEmotionalEvents = allSessions.flatMap(s => s.emotionalEvents);
  const sentiments = allEmotionalEvents.map(e => e.sentiment?.polarity || 0);
  const satisfactionScores = allSessions.map(s => s.satisfactionScore).filter(s => s > 0);
  
  // Métricas proativas
  const totalProactiveActions = allSessions.reduce((sum, s) => sum + s.proactiveActions, 0);
  const totalFollowUps = allSessions.reduce((sum, s) => sum + s.followUpsSent, 0);
  
  // Métricas de conversão
  const searchSessions = allSessions.filter(s => s.searchCount > 0);
  const resultViewSessions = allSessions.filter(s => s.resultViews > 0);
  const conversionSessions = allSessions.filter(s => s.conversionEvents.length > 0);
  
  return {
    session: {
      totalSessions: allSessions.length,
      averageSessionDuration: average(sessionDurations),
      averageMessagesPerSession: average(messagesPerSession),
      completionRate: completedSessions.length / allSessions.length
    },
    emotional: {
      averageSentiment: average(sentiments),
      emotionDistribution: calculateEmotionDistribution(allEmotionalEvents),
      satisfactionScore: average(satisfactionScores),
      frustrationRate: calculateFrustrationRate(allEmotionalEvents)
    },
    proactive: {
      insightsGenerated: totalProactiveActions,
      actionsExecuted: totalProactiveActions,
      followUpsSent: totalFollowUps,
      proactiveSuccessRate: calculateProactiveSuccessRate(allSessions)
    },
    conversion: {
      searchToResultsRate: resultViewSessions.length / Math.max(searchSessions.length, 1),
      resultsToInterestRate: calculateInterestRate(allSessions),
      interestToActionRate: calculateActionRate(allSessions),
      overallConversionRate: conversionSessions.length / allSessions.length
    }
  };
}

/**
 * Analisa qualidade da conversa
 */
export function analyzeConversationQuality(sessionId: string): ConversationQuality {
  const memory = getConversationMemory(sessionId);
  const sessionMetrics = SESSION_METRICS.get(sessionId);
  
  if (!sessionMetrics || memory.messages.length === 0) {
    return {
      coherence: 0,
      relevance: 0,
      helpfulness: 0,
      naturalness: 0,
      engagement: 0,
      overallScore: 0
    };
  }
  
  // Calcular coerência baseada na continuidade dos tópicos
  const coherence = calculateCoherence(memory);
  
  // Calcular relevância baseada na correspondência intent-resposta
  const relevance = calculateRelevance(memory);
  
  // Calcular utilidade baseada em resultados e satisfação
  const helpfulness = calculateHelpfulness(sessionMetrics);
  
  // Calcular naturalidade baseada na variação de respostas
  const naturalness = calculateNaturalness(memory);
  
  // Calcular engajamento baseado na interação do usuário
  const engagement = calculateEngagement(sessionMetrics);
  
  const overallScore = (coherence + relevance + helpfulness + naturalness + engagement) / 5;
  
  return {
    coherence,
    relevance,
    helpfulness,
    naturalness,
    engagement,
    overallScore
  };
}

/**
 * Gera analytics detalhados da conversa
 */
export function generateConversationAnalytics(sessionId: string): ConversationAnalytics {
  const memory = getConversationMemory(sessionId);
  const sessionMetrics = SESSION_METRICS.get(sessionId);
  
  if (!sessionMetrics) {
    throw new Error(`Métricas não encontradas para sessão ${sessionId}`);
  }
  
  // Analisar fluxo da conversa
  const stages = analyzeConversationStages(memory);
  const transitions = calculateStageTransitions(stages);
  const bottlenecks = identifyBottlenecks(stages, transitions);
  
  // Analisar engajamento
  const responseTime = calculateAverageResponseTime(memory);
  const messageLength = calculateAverageMessageLength(memory);
  const questionFrequency = calculateQuestionFrequency(memory);
  const emotionalVariation = calculateEmotionalVariation(sessionMetrics.emotionalEvents);
  
  // Analisar efetividade
  const goalAchievement = calculateGoalAchievement(sessionMetrics);
  const userSatisfaction = sessionMetrics.satisfactionScore;
  const taskCompletion = calculateTaskCompletion(sessionMetrics);
  const informationRetrieval = calculateInformationRetrieval(sessionMetrics);
  
  return {
    flow: {
      stages,
      transitions,
      bottlenecks,
      optimizationOpportunities: identifyOptimizationOpportunities(stages, bottlenecks)
    },
    engagement: {
      responseTime,
      messageLength,
      questionFrequency,
      emotionalVariation
    },
    effectiveness: {
      goalAchievement,
      userSatisfaction,
      taskCompletion,
      informationRetrieval
    }
  };
}

/**
 * Gera modelo preditivo para a sessão
 */
export function generatePredictiveModel(sessionId: string): PredictiveModel {
  const memory = getConversationMemory(sessionId);
  const sessionMetrics = SESSION_METRICS.get(sessionId);
  
  if (!sessionMetrics) {
    throw new Error(`Métricas não encontradas para sessão ${sessionId}`);
  }
  
  // Predizer próxima ação do usuário
  const nextAction = predictNextUserAction(memory, sessionMetrics);
  
  // Predizer resultado da conversa
  const conversationOutcome = predictConversationOutcome(memory, sessionMetrics);
  
  // Predizer impacto no negócio
  const businessImpact = predictBusinessImpact(memory, sessionMetrics);
  
  return {
    userBehavior: nextAction,
    conversationOutcome,
    businessImpact
  };
}

/**
 * Obtém métricas em tempo real
 */
export function getRealTimeMetrics(): {
  activeSessions: number;
  messagesPerMinute: number;
  averageSentiment: number;
  conversionRate: number;
} {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  
  const activeSessions = Array.from(SESSION_METRICS.values())
    .filter(s => s.lastActivity > fiveMinutesAgo).length;
  
  const recentMessages = Array.from(METRICS_STORAGE.values())
    .flat()
    .filter(e => e.type === "message_sent" && e.timestamp > fiveMinutesAgo);
  
  const messagesPerMinute = recentMessages.length / 5;
  
  const recentEmotionalEvents = Array.from(METRICS_STORAGE.values())
    .flat()
    .filter(e => e.type === "emotional_event" && e.timestamp > fiveMinutesAgo);
  
  const sentiments = recentEmotionalEvents.map(e => e.data.sentiment?.polarity || 0);
  const averageSentiment = average(sentiments);
  
  const recentConversions = Array.from(METRICS_STORAGE.values())
    .flat()
    .filter(e => e.type === "conversion_event" && e.timestamp > fiveMinutesAgo);
  
  const conversionRate = recentConversions.length / Math.max(activeSessions, 1);
  
  return {
    activeSessions,
    messagesPerMinute,
    averageSentiment,
    conversionRate
  };
}

// Funções auxiliares
function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

function getEmptyMetrics(): VendorPerformanceMetrics {
  return {
    session: {
      totalSessions: 0,
      averageSessionDuration: 0,
      averageMessagesPerSession: 0,
      completionRate: 0
    },
    emotional: {
      averageSentiment: 0,
      emotionDistribution: {},
      satisfactionScore: 0,
      frustrationRate: 0
    },
    proactive: {
      insightsGenerated: 0,
      actionsExecuted: 0,
      followUpsSent: 0,
      proactiveSuccessRate: 0
    },
    conversion: {
      searchToResultsRate: 0,
      resultsToInterestRate: 0,
      interestToActionRate: 0,
      overallConversionRate: 0
    }
  };
}

function calculateEmotionDistribution(emotionalEvents: any[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  
  for (const event of emotionalEvents) {
    const emotions = event.sentiment?.emotions || [];
    for (const emotion of emotions) {
      distribution[emotion] = (distribution[emotion] || 0) + 1;
    }
  }
  
  return distribution;
}

function calculateFrustrationRate(emotionalEvents: any[]): number {
  const frustrationEvents = emotionalEvents.filter(e => 
    e.sentiment?.emotions?.includes("frustration")
  );
  return frustrationEvents.length / Math.max(emotionalEvents.length, 1);
}

function calculateProactiveSuccessRate(sessions: any[]): number {
  const sessionsWithProactive = sessions.filter(s => s.proactiveActions > 0);
  const successfulProactive = sessionsWithProactive.filter(s => 
    s.conversionEvents.length > 0 || s.satisfactionScore > 0.7
  );
  return successfulProactive.length / Math.max(sessionsWithProactive.length, 1);
}

function calculateInterestRate(sessions: any[]): number {
  const sessionsWithResults = sessions.filter(s => s.resultViews > 0);
  const interestedSessions = sessionsWithResults.filter(s => 
    s.messageCount > s.searchCount * 2 // Mais mensagens indicam interesse
  );
  return interestedSessions.length / Math.max(sessionsWithResults.length, 1);
}

function calculateActionRate(sessions: any[]): number {
  const interestedSessions = sessions.filter(s => s.messageCount > 5);
  const actionSessions = interestedSessions.filter(s => s.conversionEvents.length > 0);
  return actionSessions.length / Math.max(interestedSessions.length, 1);
}

// Implementações simplificadas das funções de análise
function calculateCoherence(memory: any): number {
  // Análise simplificada de coerência baseada na continuidade de tópicos
  const topics = memory.contextStack.map((c: any) => c.topic);
  const uniqueTopics = new Set(topics);
  return Math.max(0, 1 - (uniqueTopics.size / Math.max(topics.length, 1)));
}

function calculateRelevance(memory: any): number {
  // Análise simplificada de relevância
  const userMessages = memory.messages.filter((m: any) => m.role === "user");
  const assistantMessages = memory.messages.filter((m: any) => m.role === "assistant");
  
  if (userMessages.length === 0 || assistantMessages.length === 0) return 0;
  
  // Assumir alta relevância se há respostas para cada pergunta
  return Math.min(1, assistantMessages.length / userMessages.length);
}

function calculateHelpfulness(sessionMetrics: any): number {
  let score = 0;
  
  if (sessionMetrics.resultViews > 0) score += 0.3;
  if (sessionMetrics.satisfactionScore > 0.5) score += 0.4;
  if (sessionMetrics.conversionEvents.length > 0) score += 0.3;
  
  return Math.min(1, score);
}

function calculateNaturalness(memory: any): number {
  // Análise simplificada de naturalidade baseada na variação de respostas
  const assistantMessages = memory.messages
    .filter((m: any) => m.role === "assistant")
    .map((m: any) => m.content);
  
  if (assistantMessages.length < 2) return 0.5;
  
  const uniqueResponses = new Set(assistantMessages);
  return uniqueResponses.size / assistantMessages.length;
}

function calculateEngagement(sessionMetrics: any): number {
  let score = 0;
  
  if (sessionMetrics.messageCount > 5) score += 0.3;
  if (sessionMetrics.searchCount > 1) score += 0.2;
  if (sessionMetrics.resultViews > 0) score += 0.2;
  if (sessionMetrics.proactiveActions > 0) score += 0.3;
  
  return Math.min(1, score);
}

// Implementações simplificadas das funções de análise avançada
function analyzeConversationStages(memory: any): any[] {
  return memory.conversationFlow.stageHistory.map((stage: string, index: number) => ({
    stage,
    order: index,
    confidence: 0.8,
    duration: 5 // minutos estimados
  }));
}

function calculateStageTransitions(stages: any[]): any[] {
  const transitions = [];
  for (let i = 0; i < stages.length - 1; i++) {
    transitions.push({
      from: stages[i].stage,
      to: stages[i + 1].stage,
      probability: 0.8
    });
  }
  return transitions;
}

function identifyBottlenecks(stages: any[], transitions: any[]): string[] {
  // Identificar estágios com baixa taxa de transição
  return stages
    .filter(stage => stage.duration > 10)
    .map(stage => stage.stage);
}

function identifyOptimizationOpportunities(stages: any[], bottlenecks: string[]): string[] {
  const opportunities = [];
  
  if (bottlenecks.includes("search")) {
    opportunities.push("Melhorar sugestões de busca");
  }
  
  if (bottlenecks.includes("comparison")) {
    opportunities.push("Simplificar comparação de produtos");
  }
  
  return opportunities;
}

function calculateAverageResponseTime(memory: any): number {
  const responseTimes = memory.messages
    .filter((m: any) => m.responseTime)
    .map((m: any) => m.responseTime);
  
  return average(responseTimes);
}

function calculateAverageMessageLength(memory: any): number {
  const lengths = memory.messages.map((m: any) => m.content.length);
  return average(lengths);
}

function calculateQuestionFrequency(memory: any): number {
  const questions = memory.messages.filter((m: any) => 
    m.content.includes("?")
  );
  return questions.length / Math.max(memory.messages.length, 1);
}

function calculateEmotionalVariation(emotionalEvents: any[]): number {
  if (emotionalEvents.length < 2) return 0;
  
  const sentiments = emotionalEvents.map(e => e.sentiment?.polarity || 0);
  const variance = sentiments.reduce((sum, s) => {
    const diff = s - average(sentiments);
    return sum + diff * diff;
  }, 0) / sentiments.length;
  
  return Math.sqrt(variance);
}

function calculateGoalAchievement(sessionMetrics: any): number {
  return sessionMetrics.conversionEvents.length > 0 ? 1 : 0.5;
}

function calculateTaskCompletion(sessionMetrics: any): number {
  return sessionMetrics.resultViews > 0 ? 0.8 : 0.3;
}

function calculateInformationRetrieval(sessionMetrics: any): number {
  return sessionMetrics.searchCount > 0 ? 0.9 : 0.1;
}

function predictNextUserAction(memory: any, sessionMetrics: any): any {
  // Predição simplificada baseada no estágio atual
  const currentStage = memory.conversationFlow.currentStage;
  
  const predictions: Record<string, any> = {
    "search": {
      nextAction: "view_results",
      probability: 0.8,
      timeframe: "next_2_minutes",
      confidence: 0.7
    },
    "comparison": {
      nextAction: "make_decision",
      probability: 0.6,
      timeframe: "next_5_minutes",
      confidence: 0.6
    },
    "decision": {
      nextAction: "convert",
      probability: 0.4,
      timeframe: "next_10_minutes",
      confidence: 0.5
    }
  };
  
  return predictions[currentStage] || {
    nextAction: "continue_conversation",
    probability: 0.5,
    timeframe: "next_5_minutes",
    confidence: 0.4
  };
}

function predictConversationOutcome(memory: any, sessionMetrics: any): any {
  let successProbability = 0.5;
  
  if (sessionMetrics.satisfactionScore > 0.7) successProbability += 0.2;
  if (sessionMetrics.resultViews > 0) successProbability += 0.1;
  if (sessionMetrics.proactiveActions > 0) successProbability += 0.1;
  
  return {
    likelyOutcome: successProbability > 0.6 ? "success" : "continuation",
    probability: successProbability,
    factors: ["user_satisfaction", "engagement_level", "proactive_assistance"]
  };
}

function predictBusinessImpact(memory: any, sessionMetrics: any): any {
  const conversionProbability = sessionMetrics.conversionEvents.length > 0 ? 0.8 : 0.2;
  
  return {
    conversionProbability,
    revenueImpact: conversionProbability * 100, // Valor estimado
    customerLifetimeValue: conversionProbability * 500, // Valor estimado
    retentionProbability: sessionMetrics.satisfactionScore
  };
}

/**
 * Limpa métricas antigas
 */
export function cleanupOldMetrics(maxAgeHours: number = 168): void { // 7 dias
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  
  for (const [key, events] of METRICS_STORAGE.entries()) {
    const filteredEvents = events.filter((e: MetricEvent) => e.timestamp > cutoff);
    if (filteredEvents.length === 0) {
      METRICS_STORAGE.delete(key);
    } else {
      METRICS_STORAGE.set(key, filteredEvents);
    }
  }
  
  for (const [sessionId, metrics] of SESSION_METRICS.entries()) {
    if (metrics.lastActivity < cutoff) {
      SESSION_METRICS.delete(sessionId);
    }
  }
}

/**
 * Exporta métricas para análise externa
 */
export function exportMetrics(): {
  events: MetricEvent[];
  sessions: any[];
  aggregated: VendorPerformanceMetrics;
} {
  const events = Array.from(METRICS_STORAGE.values()).flat();
  const sessions = Array.from(SESSION_METRICS.values());
  const aggregated = calculatePerformanceMetrics();
  
  return { events, sessions, aggregated };
}
