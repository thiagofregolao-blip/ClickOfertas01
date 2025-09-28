/**
 * Rotas do assistente IA Vendedor - plugáveis no app existente
 */

import type { Express, Router } from "express";
import { classify } from "./nlp/intent.js";
import { extractModeloGBCor } from "./nlp/slots.js";
import { buildQuery, runQueryLocal } from "./query/builder.js";
import { policyAnswer } from "./policy/decide.js";
import { sayFound, sayGreeting, sayNoResults, formatProduct } from "./nlg/templates.js";
import { getSession, updateSession } from "./core/session.js";
import { naturalize } from "./nlg/naturalizer.js";
import { logTurn } from "./telemetry/conversations.js";
import type { Intent, CatalogItem } from "./types.js";
import type { CatalogProvider } from "../catalog/provider.js";

/**
 * Registra rotas do assistente no app/router existente
 * @param appOrRouter - Instância do Express app ou router
 * @param catalog - Provider do catálogo
 */
export function registerAssistantRoutes(appOrRouter: Express | Router, catalog: CatalogProvider): void {
  const post = (appOrRouter as any).post.bind(appOrRouter);
  const get = (appOrRouter as any).get.bind(appOrRouter);

  // (Fase 2) Endpoints de feedback e analytics básicos
  post("/assistant/feedback", async (_req: any, res: any) => {
    // Placeholder para feedback do usuário sobre respostas
    // Integrar com sistema de analytics quando necessário
    res.json({ ok: true });
  });

  post("/analytics/click", async (_req: any, res: any) => {
    // Placeholder para tracking de cliques em produtos
    // Integrar com sistema de analytics quando necessário  
    res.json({ ok: true });
  });

  // (Fases 1/4/5) Rota principal do assistente
  post("/assistant/query", async (req: any, res: any) => {
    try {
      const { 
        sessionId = "anon", 
        message, 
        lang = "pt" 
      } = (req.body ?? {}) as { 
        sessionId?: string; 
        message?: string; 
        lang?: "pt" | "es" 
      };

      if (!message || !message.trim()) {
        return res.status(400).json({ 
          ok: false, 
          error: "Mensagem vazia" 
        });
      }

      const session = getSession(sessionId);
      const { intent, base } = classify(message);

      // Fluxos não-produto (small talk, utilitários, ajuda, whoami)
      if (intent !== "PRODUCT_SEARCH") {
        let draft = "";
        
        if (intent === "SMALL_TALK") {
          draft = sayGreeting(sessionId, lang);
        } else if (intent === "TIME_QUERY") {
          const now = new Date();
          const hh = String(now.getHours()).padStart(2, "0");
          const mm = String(now.getMinutes()).padStart(2, "0");
          draft = lang === "es" 
            ? `Ahora son las ${hh}:${mm}.` 
            : `Agora são ${hh}:${mm}.`;
          
          if (session.focoAtual) {
            draft += lang === "es" 
              ? ` ¿Seguimos con ${session.focoAtual}?` 
              : ` Quer continuar no ${session.focoAtual}?`;
          }
        } else if (intent === "HELP") {
          draft = lang === "es" 
            ? "Dime el producto (ej.: iPhone, drone, perfume) y te muestro ofertas."
            : "Diga o produto (ex.: iPhone, drone, perfume) que eu mostro as ofertas.";
        } else if (intent === "WHOAMI") {
          draft = lang === "es" 
            ? "Soy tu asistente de compras especializado en encontrar las mejores ofertas."
            : "Sou seu assistente de compras especializado em encontrar as melhores ofertas.";
        } else {
          draft = sayGreeting(sessionId, lang);
        }

        const text = await naturalize(
          { intent: "SMALL_TALK", draft }, 
          (process.env.REPLY_TONE as any) || "vendedor_descontraido"
        );

        return res.json({
          ok: true,
          text,
          items: [],
          blocks: [{ type: "text", text }],
          debug: { intent }
        });
      }

      // Atualiza foco/categoria na sessão ao detectar produto novo
      const produtoNovo = base.produto && base.produto !== session.focoAtual;
      updateSession(sessionId, {
        focoAtual: base.produto ?? session.focoAtual ?? null,
        categoriaAtual: produtoNovo 
          ? base.categoria ?? null 
          : session.categoriaAtual ?? base.categoria ?? null,
        lastQuery: base.produto ?? session.lastQuery ?? null,
      });

      // Extrai slots adicionais (modelo/GB/cor/atributos)
      const slots = extractModeloGBCor(message);

      // Monta query com sinais de preço/ordem ("mais barato" → in_stock=true)
      const query = buildQuery({
        base: { ...base },
        text: message,
        preferInStockCheapest: true,
        slots: { attrs: slots.attrs, modelo: slots.modelo }
      });

      // Carrega catálogo via provider (PostgreSQL/JSON/HTTP adaptável)
      const catalogItems: CatalogItem[] = await catalog.load();
      const items = runQueryLocal(catalogItems, query);

      // Política de diálogo (1 pergunta por vez + cross-sell por categoria)
      const policyResult = policyAnswer(items.length, query, lang);

      // Draft determinístico (seguro). Naturalização LLM opcional depois.
      let draft = "";
      if (!session.lastQuery && !query.produto && !query.categoria) {
        draft = sayGreeting(sessionId, lang);
      } else if (items.length > 0) {
        draft = sayFound(
          sessionId, 
          lang, 
          items.length, 
          policyResult.catOrProd, 
          policyResult.ask, 
          policyResult.cross
        );
        
        // Adiciona lista de produtos formatada
        if (items.length > 0) {
          draft += "\n\n" + items.slice(0, 5).map(formatProduct).join("\n");
        }
      } else {
        draft = sayNoResults(
          sessionId, 
          lang, 
          lang === "es" ? "con otra marca o modelo" : "com outra marca ou modelo"
        );
      }

      // Naturalização opcional via LLM (OpenAI/Gemini)
      const text = await naturalize({
        intent: "PRODUCT",
        draft,
        product: query.produto,
        category: query.categoria,
        model: query.modelo,
        count: items.length,
        cross: policyResult.cross,
        ask: policyResult.ask ?? null,
      }, (process.env.REPLY_TONE as any) || "vendedor_descontraido");

      // Telemetria para treinamento (em memória; trocar por persistência)
      logTurn(sessionId, {
        ts: Date.now(),
        user: message,
        intent: "PRODUCT_SEARCH",
        slots: { ...query },
        draft,
        final: text,
        itemsShown: items.map(i => i.id),
      });

      return res.json({
        ok: true,
        text,
        items: items.slice(0, 10), // Limita a 10 para performance
        blocks: [
          { type: "text", text },
          { type: "products", items: items.slice(0, 10).map(i => i.id) }
        ],
        debug: {
          intent: "PRODUCT_SEARCH" as Intent,
          query,
          slots,
          session: { ...session },
          catalogSize: catalogItems.length
        }
      });

    } catch (error) {
      console.error("Erro na rota /assistant/query:", error);
      return res.status(500).json({
        ok: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Endpoint de status/health do assistente
  get("/assistant/status", async (_req: any, res: any) => {
    try {
      const catalog = await getCatalogProvider();
      const catalogStats = await getCatalogStats(catalog);
      
      res.json({
        ok: true,
        status: "running",
        llm_enabled: process.env.USE_LLM_PARAPHRASE === "1",
        tone: process.env.REPLY_TONE || "vendedor_descontraido",
        catalog: catalogStats
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: "Erro obtendo status",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
}

// Helpers internos
async function getCatalogProvider(): Promise<CatalogProvider> {
  // Importação dinâmica para evitar ciclo
  const { makeCatalogProvider } = await import("../catalog/provider.js");
  return makeCatalogProvider();
}

async function getCatalogStats(provider: CatalogProvider) {
  const { getCatalogStats } = await import("../catalog/provider.js");
  return getCatalogStats(provider);
}