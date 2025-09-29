
/**
 * Rotas V2 do Assistente Inteligente
 * Integra todas as funcionalidades do vendedor inteligente aprimorado
 */

import express from "express";
import { processUserMessageV2, processAssistantResponse, executeProactiveActions, getSessionSummary } from "./pipeline-v2.js";
import { getConversationMemory, addMessage, updateUserProfile, exportMemory, importMemory } from "./core/memory.js";
import { generateEmotionalContext } from "./intelligence/emotional.js";
import { generateProactiveInsights } from "./intelligence/proactive.js";
import { scheduleFollowUp, getFollowUpStats, startFollowUpProcessor } from "./intelligence/followup.js";
import { selectOptimalPrompt, generateContextualPrompt } from "./prompts/optimized.js";
import { getConfig, CLIQUE_PERSONALITY } from "./config/intelligent-vendor.js";
import { 
  recordMetric, 
  calculatePerformanceMetrics, 
  analyzeConversationQuality,
  generateConversationAnalytics,
  generatePredictiveModel,
  getRealTimeMetrics,
  exportMetrics
} from "./analytics/metrics.js";

const router = express.Router();

// Inicializar processador de follow-up
startFollowUpProcessor(1); // Processar a cada 1 minuto

/**
 * POST /api/assistant/v2/message
 * Processa mensagem do usuário com inteligência completa
 */
router.post("/v2/message", async (req, res) => {
  try {
    const { sessionId, message, context = {} } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({ 
        error: "sessionId e message são obrigatórios" 
      });
    }
    
    console.log(`🤖 [Assistant V2] Nova mensagem de ${sessionId}: "${message}"`);
    
    // Registrar métrica de mensagem recebida
    recordMetric({
      sessionId,
      timestamp: new Date(),
      type: "message_received",
      data: { message, context }
    });
    
    // Processar mensagem com pipeline V2
    const result = await processUserMessageV2(sessionId, message);
    
    // Registrar métricas do processamento
    recordMetric({
      sessionId,
      timestamp: new Date(),
      type: "message_processed",
      data: { 
        intent: result.intent,
        shouldSearch: result.shouldSearch,
        emotionalContext: result.emotionalContext
      }
    });
    
    // Se há contexto emocional, registrar
    if (result.emotionalContext) {
      recordMetric({
        sessionId,
        timestamp: new Date(),
        type: "emotional_event",
        data: result.emotionalContext,
        value: result.emotionalContext.sentiment.polarity
      });
    }
    
    // Executar ações proativas se apropriado
    const proactiveActions = executeProactiveActions(sessionId);
    
    if (proactiveActions.length > 0) {
      recordMetric({
        sessionId,
        timestamp: new Date(),
        type: "proactive_action",
        data: { actions: proactiveActions }
      });
    }
    
    // Preparar resposta
    const response = {
      success: true,
      result: {
        ...result,
        proactiveActions,
        sessionSummary: context.includeSummary ? getSessionSummary(sessionId) : undefined
      },
      metadata: {
        processingTime: Date.now() - new Date().getTime(),
        version: "2.0",
        personality: CLIQUE_PERSONALITY.traits
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error("❌ [Assistant V2] Erro ao processar mensagem:", error);
    
    recordMetric({
      sessionId: req.body.sessionId || "unknown",
      timestamp: new Date(),
      type: "error",
      data: { error: error.message }
    });
    
    res.status(500).json({ 
      success: false, 
      error: "Erro interno do servidor",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

/**
 * POST /api/assistant/v2/response
 * Processa resposta do assistente e atualiza contexto
 */
router.post("/v2/response", async (req, res) => {
  try {
    const { sessionId, response, context = {} } = req.body;
    
    if (!sessionId || !response) {
      return res.status(400).json({ 
        error: "sessionId e response são obrigatórios" 
      });
    }
    
    // Processar resposta do assistente
    const adaptedResponse = processAssistantResponse(sessionId, response, context);
    
    // Registrar métrica de resposta enviada
    recordMetric({
      sessionId,
      timestamp: new Date(),
      type: "message_sent",
      data: { 
        originalResponse: response,
        adaptedResponse,
        context
      }
    });
    
    res.json({
      success: true,
      adaptedResponse,
      metadata: {
        adaptations: adaptedResponse !== response ? ["emotional_adaptation"] : [],
        version: "2.0"
      }
    });
    
  } catch (error) {
    console.error("❌ [Assistant V2] Erro ao processar resposta:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro interno do servidor" 
    });
  }
});

/**
 * GET /api/assistant/v2/memory/:sessionId
 * Obtém memória conversacional da sessão
 */
router.get("/v2/memory/:sessionId", (req, res) => {
  try {
    const { sessionId } = req.params;
    const { includeMessages = "true", includeContext = "true", includeBehavior = "false" } = req.query;
    
    const memory = getConversationMemory(sessionId);
    
    const response: any = {
      sessionId: memory.sessionId,
      userProfile: memory.userProfile,
      preferences: memory.preferences,
      conversationFlow: memory.conversationFlow,
      lastInteraction: memory.lastInteraction
    };
    
    if (includeMessages === "true") {
      response.messages = memory.messages.slice(-20); // Últimas 20 mensagens
    }
    
    if (includeContext === "true") {
      response.contextStack = memory.contextStack;
    }
    
    if (includeBehavior === "true") {
      response.behaviorPatterns = memory.behaviorPatterns;
    }
    
    res.json({
      success: true,
      memory: response,
      metadata: {
        totalMessages: memory.messages.length,
        totalContextFrames: memory.contextStack.length,
        totalBehaviorPatterns: memory.behaviorPatterns.length
      }
    });
    
  } catch (error) {
    console.error("❌ [Assistant V2] Erro ao obter memória:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro interno do servidor" 
    });
  }
});

/**
 * PUT /api/assistant/v2/profile/:sessionId
 * Atualiza perfil do usuário
 */
router.put("/v2/profile/:sessionId", (req, res) => {
  try {
    const { sessionId } = req.params;
    const profileUpdates = req.body;
    
    updateUserProfile(sessionId, profileUpdates);
    
    recordMetric({
      sessionId,
      timestamp: new Date(),
      type: "profile_updated",
      data: profileUpdates
    });
    
    res.json({
      success: true,
      message: "Perfil atualizado com sucesso"
    });
    
  } catch (error) {
    console.error("❌ [Assistant V2] Erro ao atualizar perfil:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro interno do servidor" 
    });
  }
});

/**
 * GET /api/assistant/v2/insights/:sessionId
 * Obtém insights proativos para a sessão
 */
router.get("/v2/insights/:sessionId", (req, res) => {
  try {
    const { sessionId } = req.params;
    const insights = generateProactiveInsights(sessionId);
    
    res.json({
      success: true,
      insights,
      metadata: {
        count: insights.length,
        highPriority: insights.filter(i => i.priority === "high").length
      }
    });
    
  } catch (error) {
    console.error("❌ [Assistant V2] Erro ao obter insights:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro interno do servidor" 
    });
  }
});

/**
 * GET /api/assistant/v2/analytics/:sessionId
 * Obtém analytics detalhados da sessão
 */
router.get("/v2/analytics/:sessionId", (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const conversationQuality = analyzeConversationQuality(sessionId);
    const conversationAnalytics = generateConversationAnalytics(sessionId);
    const predictiveModel = generatePredictiveModel(sessionId);
    
    res.json({
      success: true,
      analytics: {
        quality: conversationQuality,
        conversation: conversationAnalytics,
        predictions: predictiveModel
      }
    });
    
  } catch (error) {
    console.error("❌ [Assistant V2] Erro ao obter analytics:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro interno do servidor" 
    });
  }
});

/**
 * GET /api/assistant/v2/metrics
 * Obtém métricas de performance geral
 */
router.get("/v2/metrics", (req, res) => {
  try {
    const { realTime = "false" } = req.query;
    
    if (realTime === "true") {
      const metrics = getRealTimeMetrics();
      res.json({
        success: true,
        metrics,
        type: "realtime"
      });
    } else {
      const metrics = calculatePerformanceMetrics();
      res.json({
        success: true,
        metrics,
        type: "aggregated"
      });
    }
    
  } catch (error) {
    console.error("❌ [Assistant V2] Erro ao obter métricas:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro interno do servidor" 
    });
  }
});

/**
 * GET /api/assistant/v2/followup/stats
 * Obtém estatísticas de follow-up
 */
router.get("/v2/followup/stats", (req, res) => {
  try {
    const stats = getFollowUpStats();
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error("❌ [Assistant V2] Erro ao obter stats de follow-up:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro interno do servidor" 
    });
  }
});

/**
 * POST /api/assistant/v2/followup/:sessionId
 * Agenda follow-up manual
 */
router.post("/v2/followup/:sessionId", (req, res) => {
  try {
    const { sessionId } = req.params;
    const { event, context = {} } = req.body;
    
    if (!event) {
      return res.status(400).json({ 
        error: "event é obrigatório" 
      });
    }
    
    scheduleFollowUp(sessionId, event, context);
    
    res.json({
      success: true,
      message: "Follow-up agendado com sucesso"
    });
    
  } catch (error) {
    console.error("❌ [Assistant V2] Erro ao agendar follow-up:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro interno do servidor" 
    });
  }
});

/**
 * GET /api/assistant/v2/config
 * Obtém configuração atual do sistema
 */
router.get("/v2/config", (req, res) => {
  try {
    const environment = process.env.NODE_ENV || "production";
    const config = getConfig(environment);
    
    res.json({
      success: true,
      config,
      personality: CLIQUE_PERSONALITY,
      environment
    });
    
  } catch (error) {
    console.error("❌ [Assistant V2] Erro ao obter configuração:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro interno do servidor" 
    });
  }
});

/**
 * POST /api/assistant/v2/feedback/:sessionId
 * Registra feedback do usuário
 */
router.post("/v2/feedback/:sessionId", (req, res) => {
  try {
    const { sessionId } = req.params;
    const { type, rating, comment, context = {} } = req.body;
    
    if (!type || rating === undefined) {
      return res.status(400).json({ 
        error: "type e rating são obrigatórios" 
      });
    }
    
    // Registrar feedback como métrica
    recordMetric({
      sessionId,
      timestamp: new Date(),
      type: "user_feedback",
      data: { type, rating, comment, context },
      value: rating
    });
    
    // Se for feedback de satisfação, atualizar score
    if (type === "satisfaction") {
      recordMetric({
        sessionId,
        timestamp: new Date(),
        type: "satisfaction_feedback",
        data: { comment, context },
        value: rating
      });
    }
    
    res.json({
      success: true,
      message: "Feedback registrado com sucesso"
    });
    
  } catch (error) {
    console.error("❌ [Assistant V2] Erro ao registrar feedback:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro interno do servidor" 
    });
  }
});

/**
 * GET /api/assistant/v2/export/metrics
 * Exporta métricas para análise externa
 */
router.get("/v2/export/metrics", (req, res) => {
  try {
    const { format = "json" } = req.query;
    const exportedData = exportMetrics();
    
    if (format === "csv") {
      // Implementar exportação CSV se necessário
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=metrics.csv');
      // res.send(convertToCSV(exportedData));
      res.json({ error: "Formato CSV não implementado ainda" });
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=metrics.json');
      res.json({
        success: true,
        data: exportedData,
        exportedAt: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error("❌ [Assistant V2] Erro ao exportar métricas:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro interno do servidor" 
    });
  }
});

/**
 * POST /api/assistant/v2/test/prompt
 * Testa seleção de prompts otimizados
 */
router.post("/v2/test/prompt", (req, res) => {
  try {
    const { category, context = {}, sessionId } = req.body;
    
    if (!category) {
      return res.status(400).json({ 
        error: "category é obrigatória" 
      });
    }
    
    let memory, emotionalContext;
    
    if (sessionId) {
      memory = getConversationMemory(sessionId);
      if (context.message) {
        emotionalContext = generateEmotionalContext(context.message);
      }
    }
    
    const selectedPrompt = selectOptimalPrompt(category, context, emotionalContext, memory);
    
    res.json({
      success: true,
      prompt: selectedPrompt,
      metadata: {
        category,
        context,
        hasEmotionalContext: !!emotionalContext,
        hasMemory: !!memory
      }
    });
    
  } catch (error) {
    console.error("❌ [Assistant V2] Erro ao testar prompt:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erro interno do servidor" 
    });
  }
});

/**
 * GET /api/assistant/v2/health
 * Health check do sistema V2
 */
router.get("/v2/health", (req, res) => {
  try {
    const realTimeMetrics = getRealTimeMetrics();
    const followUpStats = getFollowUpStats();
    
    const health = {
      status: "healthy",
      version: "2.0",
      timestamp: new Date().toISOString(),
      metrics: {
        activeSessions: realTimeMetrics.activeSessions,
        messagesPerMinute: realTimeMetrics.messagesPerMinute,
        averageSentiment: realTimeMetrics.averageSentiment
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
    
    res.json(health);
    
  } catch (error) {
    console.error("❌ [Assistant V2] Erro no health check:", error);
    res.status(500).json({ 
      status: "unhealthy", 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
