
/**
 * Tipos Estendidos para Vendedor Inteligente V2
 * Inclui novos tipos para memória, emoções e proatividade
 */

// Re-exportar tipos originais
export * from "./types.js";

// Novos tipos para V2
export interface IntelligentVendorConfig {
  memory: {
    enabled: boolean;
    maxMessages: number;
    maxContextFrames: number;
    maxBehaviorPatterns: number;
    cleanupIntervalHours: number;
  };
  emotional: {
    enabled: boolean;
    sentimentThreshold: number;
    adaptResponseTone: boolean;
    detectUrgency: boolean;
    trackSatisfaction: boolean;
  };
  proactive: {
    enabled: boolean;
    maxInsightsPerSession: number;
    minConfidenceThreshold: number;
    enableFollowUp: boolean;
    followUpDelayMinutes: number;
  };
  prompts: {
    useOptimizedPrompts: boolean;
    adaptToEmotion: boolean;
    personalizeResponses: boolean;
    rotateVariants: boolean;
  };
  learning: {
    enabled: boolean;
    trackBehaviorPatterns: boolean;
    adaptToUserPreferences: boolean;
    improveOverTime: boolean;
  };
}

export interface VendorPerformanceMetrics {
  session: {
    totalSessions: number;
    averageSessionDuration: number;
    averageMessagesPerSession: number;
    completionRate: number;
  };
  emotional: {
    averageSentiment: number;
    emotionDistribution: Record<string, number>;
    satisfactionScore: number;
    frustrationRate: number;
  };
  proactive: {
    insightsGenerated: number;
    actionsExecuted: number;
    followUpsSent: number;
    proactiveSuccessRate: number;
  };
  conversion: {
    searchToResultsRate: number;
    resultsToInterestRate: number;
    interestToActionRate: number;
    overallConversionRate: number;
  };
}

export interface UserJourneyStage {
  stage: "awareness" | "interest" | "consideration" | "intent" | "evaluation" | "purchase";
  confidence: number;
  indicators: string[];
  nextActions: string[];
  estimatedTimeToNext: number; // em minutos
}

export interface ConversationQuality {
  coherence: number; // 0-1
  relevance: number; // 0-1
  helpfulness: number; // 0-1
  naturalness: number; // 0-1
  engagement: number; // 0-1
  overallScore: number; // 0-1
}

export interface SmartRecommendation {
  type: "product" | "category" | "brand" | "price_range" | "feature";
  item: string;
  reason: string;
  confidence: number;
  personalizedMessage: string;
  expectedOutcome: "engagement" | "conversion" | "satisfaction" | "retention";
  priority: number;
}

export interface ConversationInsight {
  type: "user_preference" | "pain_point" | "opportunity" | "risk" | "trend";
  description: string;
  evidence: string[];
  confidence: number;
  actionable: boolean;
  suggestedActions: string[];
}

export interface AdaptiveResponse {
  originalResponse: string;
  adaptedResponse: string;
  adaptations: ResponseAdaptation[];
  confidence: number;
  expectedImpact: "positive" | "neutral" | "negative";
}

export interface ResponseAdaptation {
  type: "tone" | "formality" | "length" | "content" | "personalization";
  from: string;
  to: string;
  reason: string;
}

export interface LearningEvent {
  sessionId: string;
  timestamp: Date;
  eventType: "user_feedback" | "behavior_pattern" | "outcome_observed" | "preference_detected";
  data: Record<string, any>;
  impact: "positive" | "negative" | "neutral";
  confidence: number;
}

export interface VendorPersonality {
  traits: {
    enthusiasm: number; // 0-1
    empathy: number; // 0-1
    professionalism: number; // 0-1
    humor: number; // 0-1
    patience: number; // 0-1
  };
  communicationStyle: {
    formality: "casual" | "professional" | "adaptive";
    verbosity: "concise" | "moderate" | "detailed";
    emoji_usage: "none" | "minimal" | "moderate" | "frequent";
    technical_level: "basic" | "intermediate" | "advanced" | "adaptive";
  };
  specialties: string[];
  limitations: string[];
}

export interface ContextualMemory {
  shortTerm: {
    currentTopic: string;
    recentEntities: Record<string, any>;
    activeGoals: string[];
    temporaryPreferences: Record<string, any>;
  };
  longTerm: {
    userProfile: any;
    behaviorPatterns: any[];
    preferences: Record<string, any>;
    historicalInteractions: any[];
  };
  working: {
    currentTask: string;
    subTasks: string[];
    progress: number;
    blockers: string[];
  };
}

export interface IntelligentResponse {
  content: string;
  confidence: number;
  reasoning: string[];
  alternatives: string[];
  metadata: {
    emotionalTone: string;
    personalizations: string[];
    proactiveElements: string[];
    learningOpportunities: string[];
  };
}

// Interfaces para análise avançada
export interface ConversationAnalytics {
  flow: {
    stages: UserJourneyStage[];
    transitions: Array<{from: string; to: string; probability: number}>;
    bottlenecks: string[];
    optimizationOpportunities: string[];
  };
  engagement: {
    responseTime: number;
    messageLength: number;
    questionFrequency: number;
    emotionalVariation: number;
  };
  effectiveness: {
    goalAchievement: number;
    userSatisfaction: number;
    taskCompletion: number;
    informationRetrieval: number;
  };
}

export interface PredictiveModel {
  userBehavior: {
    nextAction: string;
    probability: number;
    timeframe: string;
    confidence: number;
  };
  conversationOutcome: {
    likelyOutcome: "success" | "abandonment" | "escalation" | "continuation";
    probability: number;
    factors: string[];
  };
  businessImpact: {
    conversionProbability: number;
    revenueImpact: number;
    customerLifetimeValue: number;
    retentionProbability: number;
  };
}

// Tipos para integração com sistemas externos
export interface ExternalIntegration {
  crm: {
    enabled: boolean;
    syncUserProfile: boolean;
    trackInteractions: boolean;
    updatePreferences: boolean;
  };
  analytics: {
    enabled: boolean;
    trackEvents: boolean;
    customMetrics: boolean;
    realTimeReporting: boolean;
  };
  notifications: {
    enabled: boolean;
    channels: string[];
    triggers: string[];
    personalization: boolean;
  };
}

// Tipos para A/B testing e otimização
export interface ExperimentConfig {
  id: string;
  name: string;
  description: string;
  variants: ExperimentVariant[];
  trafficAllocation: Record<string, number>;
  successMetrics: string[];
  duration: number;
  status: "draft" | "running" | "paused" | "completed";
}

export interface ExperimentVariant {
  id: string;
  name: string;
  config: Partial<IntelligentVendorConfig>;
  weight: number;
}

export interface ExperimentResult {
  variantId: string;
  metrics: Record<string, number>;
  significance: number;
  confidence: number;
  recommendation: "adopt" | "reject" | "continue_testing";
}
