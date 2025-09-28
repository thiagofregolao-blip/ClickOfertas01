/**
 * Rotas admin para treinamento e configuração do IA Vendedor
 */

import type { Express, Router } from "express";
import fs from "fs";
import path from "path";
import { getUnknownTerms, suggestCanonicalMappings } from "./telemetry/unknown-terms.js";
import { exportDataset, getStats } from "./telemetry/conversations.js";
import { loadCanon, saveCanon } from "./nlp/canon.store.js";
import { getSessionStats, clearAllSessions } from "./core/session.js";
import { testLLMAvailability, getAvailableTones } from "./nlg/naturalizer.js";

/**
 * Registra rotas admin no app/router existente
 * @param appOrRouter - Instância do Express app ou router
 */
export function registerAdminRoutes(appOrRouter: Express | Router): void {
  const get = (appOrRouter as any).get.bind(appOrRouter);
  const post = (appOrRouter as any).post.bind(appOrRouter);

  // Middleware de autenticação admin com segurança melhorada
  const adminAuth = (req: any, res: any, next: any) => {
    const token = String(req.headers["x-admin-token"] ?? "");
    const validToken = process.env.ADMIN_TOKEN;
    
    // Fail fast se token não configurado em produção
    if (!validToken) {
      console.error("❌ ADMIN_TOKEN não configurado! Bloqueando acesso admin.");
      return res.status(503).json({ 
        ok: false, 
        error: "service_unavailable",
        message: "Serviço admin não configurado" 
      });
    }
    
    if (token !== validToken) {
      return res.status(401).json({ 
        ok: false, 
        error: "unauthorized",
        message: "Token admin inválido" 
      });
    }
    
    next();
  };

  // Status geral do sistema de treinamento
  get("/api/admin/train/status", adminAuth, async (_req: any, res: any) => {
    try {
      // Estatísticas do dicionário canônico
      const canon = loadCanon();
      const productCount = Object.keys(canon.productCanon ?? {}).length;
      const categoryCount = Object.keys(canon.categoryCanon ?? {}).length;

      // Estatísticas de conversas
      const conversationStats = getStats();
      
      // Estatísticas de sessões
      const sessionStats = getSessionStats();
      
      // Termos desconhecidos
      const unknownTerms = getUnknownTerms(10);
      
      // Status LLM
      const llmAvailable = await testLLMAvailability();
      
      res.json({
        ok: true,
        llm: {
          enabled: process.env.USE_LLM_PARAPHRASE === "1",
          available: llmAvailable,
          tone: process.env.REPLY_TONE ?? "vendedor_descontraido",
          availableTones: getAvailableTones()
        },
        canon: {
          products: productCount,
          categories: categoryCount,
          path: process.env.CANON_PATH ?? "data/canon.json"
        },
        conversations: conversationStats,
        sessions: sessionStats,
        unknown: {
          total: unknownTerms.length,
          recent: unknownTerms.slice(0, 5),
          suggestions: suggestCanonicalMappings().slice(0, 3)
        }
      });
    } catch (error) {
      console.error("Erro no status admin:", error);
      res.status(500).json({
        ok: false,
        error: "Erro interno",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Export de dataset para treinamento
  get("/api/admin/train/export-dataset", adminAuth, (_req: any, res: any) => {
    try {
      const dataset = exportDataset();
      res.json({
        ok: true,
        dataset,
        total: dataset.length,
        exportedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Erro no export dataset:", error);
      res.status(500).json({
        ok: false,
        error: "Erro exportando dataset",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Toggle LLM e configuração de tom
  post("/api/admin/train/toggle-llm", adminAuth, (req: any, res: any) => {
    try {
      const { on, tone } = (req.body ?? {}) as { 
        on?: boolean; 
        tone?: string; 
      };

      // Atualiza configuração LLM
      if (typeof on === "boolean") {
        process.env.USE_LLM_PARAPHRASE = on ? "1" : "0";
      }

      // Atualiza tom se fornecido
      if (tone && getAvailableTones().includes(tone)) {
        process.env.REPLY_TONE = tone;
      }

      res.json({
        ok: true,
        llm: process.env.USE_LLM_PARAPHRASE === "1",
        tone: process.env.REPLY_TONE ?? "vendedor_descontraido",
        availableTones: getAvailableTones()
      });
    } catch (error) {
      console.error("Erro no toggle LLM:", error);
      res.status(500).json({
        ok: false,
        error: "Erro configurando LLM",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Gerenciamento do dicionário canônico
  get("/api/admin/train/canon", adminAuth, (_req: any, res: any) => {
    try {
      const canon = loadCanon();
      res.json({
        ok: true,
        canon,
        stats: {
          products: Object.keys(canon.productCanon).length,
          categories: Object.keys(canon.categoryCanon).length,
          mappings: Object.keys(canon.productToCategory).length
        }
      });
    } catch (error) {
      console.error("Erro carregando canon:", error);
      res.status(500).json({
        ok: false,
        error: "Erro carregando dicionário canônico"
      });
    }
  });

  post("/api/admin/train/canon", adminAuth, (req: any, res: any) => {
    try {
      const { canon } = req.body;
      
      if (!canon || typeof canon !== "object") {
        return res.status(400).json({
          ok: false,
          error: "Dicionário canônico inválido"
        });
      }

      saveCanon(canon);
      
      res.json({
        ok: true,
        message: "Dicionário canônico salvo com sucesso",
        stats: {
          products: Object.keys(canon.productCanon || {}).length,
          categories: Object.keys(canon.categoryCanon || {}).length,
          mappings: Object.keys(canon.productToCategory || {}).length
        }
      });
    } catch (error) {
      console.error("Erro salvando canon:", error);
      res.status(500).json({
        ok: false,
        error: "Erro salvando dicionário canônico"
      });
    }
  });

  // Análise de termos desconhecidos
  get("/api/admin/train/unknown-terms", adminAuth, (_req: any, res: any) => {
    try {
      const terms = getUnknownTerms(50);
      const suggestions = suggestCanonicalMappings();
      
      res.json({
        ok: true,
        terms,
        suggestions,
        total: terms.length
      });
    } catch (error) {
      console.error("Erro obtendo termos desconhecidos:", error);
      res.status(500).json({
        ok: false,
        error: "Erro obtendo termos desconhecidos"
      });
    }
  });

  // Limpeza de dados de desenvolvimento
  post("/api/admin/train/clear-sessions", adminAuth, (_req: any, res: any) => {
    try {
      clearAllSessions();
      res.json({
        ok: true,
        message: "Todas as sessões foram limpas"
      });
    } catch (error) {
      console.error("Erro limpando sessões:", error);
      res.status(500).json({
        ok: false,
        error: "Erro limpando sessões"
      });
    }
  });

  // Teste de conectividade com catálogo
  get("/api/admin/train/test-catalog", adminAuth, async (_req: any, res: any) => {
    try {
      const { makeCatalogProvider, testProvider, getCatalogStats } = await import("../catalog/provider.js");
      
      const provider = makeCatalogProvider();
      const isWorking = await testProvider(provider);
      
      if (isWorking) {
        const stats = await getCatalogStats(provider);
        res.json({
          ok: true,
          status: "connected",
          stats
        });
      } else {
        res.json({
          ok: false,
          status: "disconnected",
          error: "Não foi possível carregar o catálogo"
        });
      }
    } catch (error) {
      console.error("Erro testando catálogo:", error);
      res.status(500).json({
        ok: false,
        status: "error",
        error: "Erro testando conectividade do catálogo"
      });
    }
  });

  // Configurações avançadas
  get("/api/admin/train/config", adminAuth, (_req: any, res: any) => {
    res.json({
      ok: true,
      config: {
        USE_LLM_PARAPHRASE: process.env.USE_LLM_PARAPHRASE ?? "0",
        REPLY_TONE: process.env.REPLY_TONE ?? "vendedor_descontraido",
        CATALOG_SOURCE: process.env.CATALOG_SOURCE ?? "postgresql",
        CATALOG_PATH: process.env.CATALOG_PATH ?? "data/catalogo.sample.json",
        CANON_PATH: process.env.CANON_PATH ?? "data/canon.json",
        ADMIN_TOKEN: process.env.ADMIN_TOKEN ? "***" : "não configurado"
      }
    });
  });
}