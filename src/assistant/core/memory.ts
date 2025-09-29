
/**
 * Sistema de Memória Conversacional Avançado
 * Gerencia contexto, histórico e aprendizado do vendedor inteligente
 */

import type { SessionState } from "../types.js";
import { getSession, updateSession } from "./session.js";

export interface ConversationMemory {
  sessionId: string;
  messages: ConversationMessage[];
  userProfile: UserProfile;
  contextStack: ContextFrame[];
  preferences: UserPreferences;
  behaviorPatterns: BehaviorPattern[];
  lastInteraction: Date;
  conversationFlow: ConversationFlow;
}

export interface ConversationMessage {
  id: string;
  timestamp: Date;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  entities?: Record<string, any>;
  sentiment?: SentimentAnalysis;
  responseTime?: number;
}

export interface UserProfile {
  interests: string[];
  preferredCategories: string[];
  priceRange: { min?: number; max?: number };
  purchaseHistory: string[];
  communicationStyle: "formal" | "casual" | "technical";
  responsePreference: "quick" | "detailed" | "visual";
}

export interface ContextFrame {
  topic: string;
  entities: Record<string, any>;
  timestamp: Date;
  relevanceScore: number;
  resolved: boolean;
}

export interface UserPreferences {
  language: "pt" | "es";
  currency: "BRL" | "USD" | "PYG";
  brands: string[];
  avoidBrands: string[];
  maxPrice?: number;
  preferredStores: string[];
  notificationSettings: {
    priceAlerts: boolean;
    newProducts: boolean;
    recommendations: boolean;
  };
}

export interface BehaviorPattern {
  pattern: string;
  frequency: number;
  lastSeen: Date;
  context: string[];
  outcome: "positive" | "negative" | "neutral";
}

export interface ConversationFlow {
  currentStage: "greeting" | "discovery" | "search" | "comparison" | "decision" | "followup";
  stageHistory: string[];
  nextSuggestedActions: string[];
  completionScore: number;
}

export interface SentimentAnalysis {
  polarity: number; // -1 to 1
  confidence: number; // 0 to 1
  emotions: string[];
  urgency: "low" | "medium" | "high";
}

// Armazenamento em memória (substituível por Redis/DB em produção)
const CONVERSATION_MEMORIES = new Map<string, ConversationMemory>();

/**
 * Obtém ou cria memória conversacional para uma sessão
 */
export function getConversationMemory(sessionId: string): ConversationMemory {
  if (!CONVERSATION_MEMORIES.has(sessionId)) {
    CONVERSATION_MEMORIES.set(sessionId, {
      sessionId,
      messages: [],
      userProfile: {
        interests: [],
        preferredCategories: [],
        priceRange: {},
        purchaseHistory: [],
        communicationStyle: "casual",
        responsePreference: "quick"
      },
      contextStack: [],
      preferences: {
        language: "pt",
        currency: "BRL",
        brands: [],
        avoidBrands: [],
        preferredStores: [],
        notificationSettings: {
          priceAlerts: false,
          newProducts: false,
          recommendations: true
        }
      },
      behaviorPatterns: [],
      lastInteraction: new Date(),
      conversationFlow: {
        currentStage: "greeting",
        stageHistory: [],
        nextSuggestedActions: [],
        completionScore: 0
      }
    });
  }
  
  return CONVERSATION_MEMORIES.get(sessionId)!;
}

/**
 * Adiciona mensagem ao histórico conversacional
 */
export function addMessage(
  sessionId: string, 
  role: "user" | "assistant", 
  content: string,
  metadata?: Partial<ConversationMessage>
): void {
  const memory = getConversationMemory(sessionId);
  
  const message: ConversationMessage = {
    id: `${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    role,
    content,
    ...metadata
  };
  
  memory.messages.push(message);
  memory.lastInteraction = new Date();
  
  // Manter apenas últimas 50 mensagens para performance
  if (memory.messages.length > 50) {
    memory.messages = memory.messages.slice(-50);
  }
  
  // Atualizar fluxo conversacional
  updateConversationFlow(sessionId, role, content, metadata?.intent);
}

/**
 * Atualiza contexto da conversa
 */
export function updateContext(
  sessionId: string, 
  topic: string, 
  entities: Record<string, any>,
  relevanceScore: number = 1.0
): void {
  const memory = getConversationMemory(sessionId);
  
  // Verificar se contexto já existe
  const existingContext = memory.contextStack.find(ctx => ctx.topic === topic);
  
  if (existingContext) {
    existingContext.entities = { ...existingContext.entities, ...entities };
    existingContext.timestamp = new Date();
    existingContext.relevanceScore = Math.max(existingContext.relevanceScore, relevanceScore);
  } else {
    memory.contextStack.push({
      topic,
      entities,
      timestamp: new Date(),
      relevanceScore,
      resolved: false
    });
  }
  
  // Manter apenas contextos relevantes (últimos 10)
  memory.contextStack = memory.contextStack
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10);
}

/**
 * Obtém contexto relevante para a conversa atual
 */
export function getRelevantContext(sessionId: string, limit: number = 5): ContextFrame[] {
  const memory = getConversationMemory(sessionId);
  
  return memory.contextStack
    .filter(ctx => !ctx.resolved)
    .sort((a, b) => {
      // Ordenar por relevância e recência
      const scoreA = a.relevanceScore * (1 - (Date.now() - a.timestamp.getTime()) / (1000 * 60 * 60)); // Decay por hora
      const scoreB = b.relevanceScore * (1 - (Date.now() - b.timestamp.getTime()) / (1000 * 60 * 60));
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

/**
 * Aprende padrões de comportamento do usuário
 */
export function learnBehaviorPattern(
  sessionId: string,
  pattern: string,
  context: string[],
  outcome: "positive" | "negative" | "neutral"
): void {
  const memory = getConversationMemory(sessionId);
  
  const existingPattern = memory.behaviorPatterns.find(p => p.pattern === pattern);
  
  if (existingPattern) {
    existingPattern.frequency++;
    existingPattern.lastSeen = new Date();
    existingPattern.outcome = outcome;
    existingPattern.context = [...new Set([...existingPattern.context, ...context])];
  } else {
    memory.behaviorPatterns.push({
      pattern,
      frequency: 1,
      lastSeen: new Date(),
      context,
      outcome
    });
  }
  
  // Manter apenas padrões mais frequentes (últimos 20)
  memory.behaviorPatterns = memory.behaviorPatterns
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 20);
}

/**
 * Atualiza perfil do usuário baseado na interação
 */
export function updateUserProfile(
  sessionId: string,
  updates: Partial<UserProfile>
): void {
  const memory = getConversationMemory(sessionId);
  
  // Merge inteligente dos arrays
  if (updates.interests) {
    memory.userProfile.interests = [...new Set([...memory.userProfile.interests, ...updates.interests])];
  }
  
  if (updates.preferredCategories) {
    memory.userProfile.preferredCategories = [...new Set([...memory.userProfile.preferredCategories, ...updates.preferredCategories])];
  }
  
  if (updates.purchaseHistory) {
    memory.userProfile.purchaseHistory = [...new Set([...memory.userProfile.purchaseHistory, ...updates.purchaseHistory])];
  }
  
  // Atualizar outros campos
  Object.assign(memory.userProfile, {
    ...updates,
    interests: memory.userProfile.interests,
    preferredCategories: memory.userProfile.preferredCategories,
    purchaseHistory: memory.userProfile.purchaseHistory
  });
}

/**
 * Atualiza fluxo conversacional
 */
function updateConversationFlow(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  intent?: string
): void {
  const memory = getConversationMemory(sessionId);
  const flow = memory.conversationFlow;
  
  // Determinar próximo estágio baseado no intent e conteúdo
  if (role === "user") {
    if (intent === "PRODUCT_SEARCH" || content.toLowerCase().includes("procur") || content.toLowerCase().includes("quer")) {
      flow.currentStage = "search";
    } else if (intent === "PRICE_COMPARISON" || content.toLowerCase().includes("compar") || content.toLowerCase().includes("melhor preço")) {
      flow.currentStage = "comparison";
    } else if (content.toLowerCase().includes("comprar") || content.toLowerCase().includes("decidir")) {
      flow.currentStage = "decision";
    } else if (flow.currentStage === "greeting") {
      flow.currentStage = "discovery";
    }
  }
  
  // Atualizar histórico de estágios
  if (!flow.stageHistory.includes(flow.currentStage)) {
    flow.stageHistory.push(flow.currentStage);
  }
  
  // Calcular score de completude
  flow.completionScore = Math.min(flow.stageHistory.length / 5, 1.0);
  
  // Sugerir próximas ações
  flow.nextSuggestedActions = generateNextActions(flow.currentStage, memory);
}

/**
 * Gera sugestões de próximas ações baseadas no estágio atual
 */
function generateNextActions(stage: ConversationFlow["currentStage"], memory: ConversationMemory): string[] {
  const actions: string[] = [];
  
  switch (stage) {
    case "greeting":
      actions.push("Perguntar sobre preferências", "Mostrar produtos em destaque", "Oferecer ajuda específica");
      break;
    case "discovery":
      actions.push("Identificar necessidades", "Sugerir categorias", "Perguntar sobre orçamento");
      break;
    case "search":
      actions.push("Refinar busca", "Mostrar alternativas", "Comparar opções");
      break;
    case "comparison":
      actions.push("Destacar vantagens", "Mostrar reviews", "Oferecer desconto");
      break;
    case "decision":
      actions.push("Facilitar compra", "Oferecer garantia", "Sugerir produtos complementares");
      break;
    case "followup":
      actions.push("Verificar satisfação", "Sugerir novos produtos", "Oferecer suporte");
      break;
  }
  
  return actions;
}

/**
 * Obtém resumo da conversa para contexto
 */
export function getConversationSummary(sessionId: string): string {
  const memory = getConversationMemory(sessionId);
  const recentMessages = memory.messages.slice(-10);
  
  const userMessages = recentMessages.filter(m => m.role === "user").map(m => m.content);
  const interests = memory.userProfile.interests.join(", ");
  const currentContext = memory.contextStack.slice(0, 3).map(c => c.topic).join(", ");
  
  return `Usuário interessado em: ${interests}. Contexto atual: ${currentContext}. Últimas mensagens: ${userMessages.join("; ")}`;
}

/**
 * Limpa memória antiga (manutenção)
 */
export function cleanupOldMemories(maxAgeHours: number = 24): void {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  
  for (const [sessionId, memory] of CONVERSATION_MEMORIES.entries()) {
    if (memory.lastInteraction < cutoff) {
      CONVERSATION_MEMORIES.delete(sessionId);
    }
  }
}

/**
 * Exporta memória para backup/análise
 */
export function exportMemory(sessionId: string): ConversationMemory | null {
  return CONVERSATION_MEMORIES.get(sessionId) || null;
}

/**
 * Importa memória de backup
 */
export function importMemory(memory: ConversationMemory): void {
  CONVERSATION_MEMORIES.set(memory.sessionId, memory);
}
