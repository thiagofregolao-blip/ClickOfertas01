
/**
 * Configuração do Vendedor Inteligente V2
 * Configurações centralizadas para todos os módulos
 */

import type { IntelligentVendorConfig, VendorPersonality } from "../types-v2.js";

// Configuração padrão do sistema
export const DEFAULT_CONFIG: IntelligentVendorConfig = {
  memory: {
    enabled: true,
    maxMessages: 50,
    maxContextFrames: 10,
    maxBehaviorPatterns: 20,
    cleanupIntervalHours: 24
  },
  emotional: {
    enabled: true,
    sentimentThreshold: 0.3,
    adaptResponseTone: true,
    detectUrgency: true,
    trackSatisfaction: true
  },
  proactive: {
    enabled: true,
    maxInsightsPerSession: 5,
    minConfidenceThreshold: 0.6,
    enableFollowUp: true,
    followUpDelayMinutes: 10
  },
  prompts: {
    useOptimizedPrompts: true,
    adaptToEmotion: true,
    personalizeResponses: true,
    rotateVariants: true
  },
  learning: {
    enabled: true,
    trackBehaviorPatterns: true,
    adaptToUserPreferences: true,
    improveOverTime: true
  }
};

// Personalidade padrão do vendedor "Clique"
export const CLIQUE_PERSONALITY: VendorPersonality = {
  traits: {
    enthusiasm: 0.8,
    empathy: 0.9,
    professionalism: 0.7,
    humor: 0.6,
    patience: 0.8
  },
  communicationStyle: {
    formality: "adaptive",
    verbosity: "moderate",
    emoji_usage: "moderate",
    technical_level: "adaptive"
  },
  specialties: [
    "Eletrônicos",
    "Smartphones",
    "Comparação de preços",
    "Ofertas e promoções",
    "Produtos do Paraguai"
  ],
  limitations: [
    "Não pode processar pagamentos",
    "Não tem acesso a estoque em tempo real",
    "Não pode fazer reservas de produtos"
  ]
};

// Configurações por ambiente
export const ENVIRONMENT_CONFIGS = {
  development: {
    ...DEFAULT_CONFIG,
    memory: {
      ...DEFAULT_CONFIG.memory,
      cleanupIntervalHours: 1 // Limpeza mais frequente em dev
    },
    proactive: {
      ...DEFAULT_CONFIG.proactive,
      followUpDelayMinutes: 2 // Follow-up mais rápido para testes
    }
  },
  
  staging: {
    ...DEFAULT_CONFIG,
    learning: {
      ...DEFAULT_CONFIG.learning,
      improveOverTime: false // Não aprender em staging
    }
  },
  
  production: DEFAULT_CONFIG
};

// Configurações específicas por funcionalidade
export const MEMORY_CONFIG = {
  // Configurações de retenção
  retention: {
    messages: {
      shortTerm: 10, // Últimas 10 mensagens sempre acessíveis
      mediumTerm: 50, // Até 50 mensagens mantidas em memória
      longTerm: 200 // Até 200 mensagens em storage persistente
    },
    context: {
      activeFrames: 5, // Contextos ativos simultâneos
      totalFrames: 20, // Total de contextos mantidos
      decayRate: 0.1 // Taxa de decaimento de relevância por hora
    },
    patterns: {
      maxPatterns: 30, // Máximo de padrões por usuário
      minFrequency: 2, // Frequência mínima para manter padrão
      maxAge: 30 // Idade máxima em dias
    }
  },
  
  // Configurações de performance
  performance: {
    batchSize: 10, // Tamanho do batch para operações em lote
    cacheTimeout: 300, // Timeout do cache em segundos
    maxConcurrentSessions: 1000, // Máximo de sessões simultâneas
    memoryLimit: 100 * 1024 * 1024 // Limite de memória em bytes (100MB)
  }
};

export const EMOTIONAL_CONFIG = {
  // Thresholds para detecção emocional
  thresholds: {
    sentiment: {
      veryNegative: -0.7,
      negative: -0.3,
      neutral: 0.3,
      positive: 0.7,
      veryPositive: 0.9
    },
    confidence: {
      low: 0.3,
      medium: 0.6,
      high: 0.8
    },
    urgency: {
      low: 0.2,
      medium: 0.5,
      high: 0.8
    }
  },
  
  // Configurações de adaptação
  adaptation: {
    toneAdjustment: {
      enabled: true,
      intensity: 0.7, // Intensidade da adaptação (0-1)
      preserveCore: true // Preservar personalidade core
    },
    responseLength: {
      brief: 50, // Máximo de caracteres para resposta breve
      moderate: 150, // Máximo para resposta moderada
      detailed: 300 // Máximo para resposta detalhada
    },
    personalization: {
      useUserName: true,
      referenceHistory: true,
      adaptToPreferences: true,
      contextualReferences: true
    }
  }
};

export const PROACTIVE_CONFIG = {
  // Configurações de insights
  insights: {
    generation: {
      intervalMinutes: 5, // Intervalo para gerar novos insights
      maxPerSession: 5, // Máximo de insights por sessão
      minConfidence: 0.6, // Confiança mínima para insight
      priorityThreshold: 0.7 // Threshold para insights de alta prioridade
    },
    
    triggers: {
      searchAbandonment: {
        enabled: true,
        timeoutMinutes: 10,
        minMessages: 2
      },
      priceHesitation: {
        enabled: true,
        keywords: ["caro", "preço", "barato", "desconto"],
        sentimentThreshold: -0.2
      },
      comparisonDelay: {
        enabled: true,
        timeoutMinutes: 15,
        stage: "comparison"
      },
      satisfactionHigh: {
        enabled: true,
        sentimentThreshold: 0.5,
        minPositiveMessages: 2
      }
    }
  },
  
  // Configurações de follow-up
  followUp: {
    scheduling: {
      enabled: true,
      defaultDelayMinutes: 10,
      maxAttempts: 3,
      intervalMinutes: 30
    },
    
    timeWindows: {
      start: "09:00",
      end: "22:00",
      timezone: "America/Sao_Paulo"
    },
    
    rules: {
      abandonedSearch: {
        priority: 8,
        delay: 10,
        maxAttempts: 2
      },
      priceHesitation: {
        priority: 9,
        delay: 5,
        maxAttempts: 1
      },
      satisfactionFollowUp: {
        priority: 5,
        delay: 1440, // 24 horas
        maxAttempts: 1
      }
    }
  }
};

export const PROMPT_CONFIG = {
  // Configurações de seleção de prompts
  selection: {
    useOptimized: true,
    adaptToEmotion: true,
    personalizeContent: true,
    rotateVariants: true,
    cachePrompts: true
  },
  
  // Configurações de personalização
  personalization: {
    useUserName: true,
    referenceInterests: true,
    adaptToHistory: true,
    includeContext: true,
    maxPersonalizations: 3
  },
  
  // Configurações de variantes
  variants: {
    rotationStrategy: "weighted", // "random" | "weighted" | "sequential"
    weightDecay: 0.1, // Decaimento do peso após uso
    minWeight: 0.1, // Peso mínimo para variante
    resetThreshold: 0.05 // Threshold para reset de pesos
  },
  
  // Configurações de validação
  validation: {
    enabled: true,
    minLength: 10,
    maxLength: 500,
    checkToneConsistency: true,
    validatePersonalization: true
  }
};

export const LEARNING_CONFIG = {
  // Configurações de aprendizado
  patterns: {
    detection: {
      enabled: true,
      minOccurrences: 3, // Mínimo de ocorrências para detectar padrão
      confidenceThreshold: 0.7,
      maxPatterns: 50 // Máximo de padrões por usuário
    },
    
    adaptation: {
      enabled: true,
      adaptationRate: 0.1, // Taxa de adaptação (0-1)
      maxAdaptations: 10, // Máximo de adaptações por sessão
      rollbackThreshold: 0.3 // Threshold para rollback de adaptação
    }
  },
  
  // Configurações de feedback
  feedback: {
    collection: {
      enabled: true,
      implicit: true, // Coletar feedback implícito
      explicit: true, // Coletar feedback explícito
      realTime: true // Processar feedback em tempo real
    },
    
    processing: {
      batchSize: 100,
      processingInterval: 300, // 5 minutos
      minConfidence: 0.5,
      weightDecay: 0.05 // Decaimento do peso do feedback ao longo do tempo
    }
  },
  
  // Configurações de melhoria contínua
  improvement: {
    enabled: true,
    evaluationInterval: 3600, // 1 hora
    minDataPoints: 10, // Mínimo de pontos de dados para melhoria
    improvementThreshold: 0.05, // Threshold mínimo de melhoria
    rollbackOnRegression: true // Rollback se houver regressão
  }
};

/**
 * Obtém configuração baseada no ambiente
 */
export function getConfig(environment: string = "production"): IntelligentVendorConfig {
  return ENVIRONMENT_CONFIGS[environment as keyof typeof ENVIRONMENT_CONFIGS] || DEFAULT_CONFIG;
}

/**
 * Valida configuração
 */
export function validateConfig(config: Partial<IntelligentVendorConfig>): boolean {
  // Validações básicas
  if (config.memory?.maxMessages && config.memory.maxMessages < 1) return false;
  if (config.emotional?.sentimentThreshold && Math.abs(config.emotional.sentimentThreshold) > 1) return false;
  if (config.proactive?.minConfidenceThreshold && (config.proactive.minConfidenceThreshold < 0 || config.proactive.minConfidenceThreshold > 1)) return false;
  
  return true;
}

/**
 * Mescla configurações
 */
export function mergeConfig(base: IntelligentVendorConfig, override: Partial<IntelligentVendorConfig>): IntelligentVendorConfig {
  return {
    memory: { ...base.memory, ...override.memory },
    emotional: { ...base.emotional, ...override.emotional },
    proactive: { ...base.proactive, ...override.proactive },
    prompts: { ...base.prompts, ...override.prompts },
    learning: { ...base.learning, ...override.learning }
  };
}

/**
 * Configuração dinâmica baseada em métricas
 */
export function getDynamicConfig(metrics: any): Partial<IntelligentVendorConfig> {
  const dynamicConfig: Partial<IntelligentVendorConfig> = {};
  
  // Ajustar configuração baseada na performance
  if (metrics.averageResponseTime > 2000) {
    // Se resposta está lenta, reduzir processamento
    dynamicConfig.memory = { ...DEFAULT_CONFIG.memory, maxMessages: 30 };
    dynamicConfig.proactive = { ...DEFAULT_CONFIG.proactive, maxInsightsPerSession: 3 };
  }
  
  // Ajustar baseado na satisfação do usuário
  if (metrics.satisfactionScore < 0.7) {
    // Se satisfação baixa, aumentar personalização
    dynamicConfig.emotional = { ...DEFAULT_CONFIG.emotional, adaptResponseTone: true };
    dynamicConfig.prompts = { ...DEFAULT_CONFIG.prompts, personalizeResponses: true };
  }
  
  // Ajustar baseado na taxa de conversão
  if (metrics.conversionRate < 0.1) {
    // Se conversão baixa, aumentar proatividade
    dynamicConfig.proactive = { 
      ...DEFAULT_CONFIG.proactive, 
      enableFollowUp: true,
      followUpDelayMinutes: 5
    };
  }
  
  return dynamicConfig;
}
