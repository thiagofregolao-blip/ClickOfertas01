
/**
 * Índice Principal do Vendedor Inteligente V2
 * Exporta todas as funcionalidades do sistema aprimorado
 */

// Core System
export * from "./core/memory.js";
export * from "./core/session.js";

// Intelligence Modules
export * from "./intelligence/emotional.js";
export * from "./intelligence/proactive.js";
export * from "./intelligence/followup.js";

// Optimized Prompts
export * from "./prompts/optimized.js";

// Pipeline V2
export * from "./pipeline-v2.js";

// Analytics & Metrics
export * from "./analytics/metrics.js";

// Configuration
export * from "./config/intelligent-vendor.js";

// Types V2
export * from "./types-v2.js";

// Routes V2
export { default as assistantRoutesV2 } from "./assistantRoutes-v2.js";

// Legacy exports (for backward compatibility)
export * from "./types.js";
export * from "./pipeline.js";
export { default as assistantRoutes } from "./assistantRoutes.js";

/**
 * Inicialização do Sistema V2
 */
export function initializeIntelligentVendor(config?: any) {
  console.log("🤖 Inicializando Vendedor Inteligente V2...");
  
  // Inicializar processador de follow-up
  const { startFollowUpProcessor } = require("./intelligence/followup.js");
  startFollowUpProcessor(1);
  
  // Inicializar limpeza automática de memória
  const { cleanupOldMemories } = require("./core/memory.js");
  setInterval(() => {
    cleanupOldMemories(24); // Limpar memórias antigas a cada 24h
  }, 60 * 60 * 1000); // Executar a cada hora
  
  // Inicializar limpeza de métricas
  const { cleanupOldMetrics } = require("./analytics/metrics.js");
  setInterval(() => {
    cleanupOldMetrics(168); // Limpar métricas antigas a cada 7 dias
  }, 24 * 60 * 60 * 1000); // Executar diariamente
  
  console.log("✅ Vendedor Inteligente V2 inicializado com sucesso!");
  
  return {
    version: "2.0",
    features: [
      "Memória Conversacional",
      "Inteligência Emocional", 
      "Sistema Proativo",
      "Follow-up Inteligente",
      "Prompts Otimizados",
      "Analytics Avançado"
    ],
    status: "ready"
  };
}

/**
 * Health Check do Sistema V2
 */
export function getSystemHealth() {
  const { getRealTimeMetrics } = require("./analytics/metrics.js");
  const { getFollowUpStats } = require("./intelligence/followup.js");
  
  try {
    const metrics = getRealTimeMetrics();
    const followUpStats = getFollowUpStats();
    
    return {
      status: "healthy",
      version: "2.0",
      timestamp: new Date().toISOString(),
      metrics: {
        activeSessions: metrics.activeSessions,
        messagesPerMinute: metrics.messagesPerMinute,
        averageSentiment: metrics.averageSentiment
      },
      followUp: {
        pending: followUpStats.pending,
        sent: followUpStats.sent
      },
      features: {
        memory: true,
        emotional: true,
        proactive: true,
        followUp: true,
        optimizedPrompts: true,
        analytics: true
      }
    };
  } catch (error) {
    return {
      status: "unhealthy",
      version: "2.0",
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
