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
import { extractPriceSignals } from "./nlp/priceSignals.js";

function hash32(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return (h >>> 0).toString(36);
}

function getStableSessionId(req: any, provided?: string) {
  if (provided && String(provided).trim()) return String(provided);
  const ua = String(req.headers["user-agent"] ?? "");
  const ip = String(
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.ip ?? req.connection?.remoteAddress ?? "0.0.0.0"
  );
  const key = `${ip}|${ua}`;
  return `auto_${hash32(key)}`;
}

/**
 * Registra rotas do assistente no app/router existente
 * @param appOrRouter - Instância do Express app ou router
 * @param catalog - Provider do catálogo
 */
export function registerAssistantRoutes(appOrRouter: Express | Router, catalog: CatalogProvider): void {
  const post = (appOrRouter as any).post.bind(appOrRouter);
  const get = (appOrRouter as any).get.bind(appOrRouter);

  // (Fase 2) Endpoints de feedback e analytics básicos
  post("/api/assistant/feedback", async (_req: any, res: any) => {
    // Placeholder para feedback do usuário sobre respostas
    // Integrar com sistema de analytics quando necessário
    res.json({ ok: true });
  });

  post("/api/analytics/click", async (_req: any, res: any) => {
    // Placeholder para tracking de cliques em produtos
    // Integrar com sistema de analytics quando necessário  
    res.json({ ok: true });
  });

  // (Fases 1/4/5) Rota principal do assistente
  post("/api/assistant/query", async (req: any, res: any) => {
    try {
      const body = (req.body ?? {}) as { 
        sessionId?: string; 
        message?: string; 
        lang?: "pt" | "es" 
      };
      const sessionId = getStableSessionId(req, body.sessionId);
      const message = body.message;
      const lang = (body.lang ?? "pt") as "pt" | "es";

      if (!message || !message.trim()) {
        return res.status(400).json({ 
          ok: false, 
          error: "Mensagem vazia" 
        });
      }

      const sess = getSession(sessionId);
      const { intent, base } = classify(message);

      // NEW: follow-up de preço → herda foco/categoria da sessão
      const priceSig = extractPriceSignals(message);
      const priceOnlyFollowUp =
        priceSig.hasPriceIntent &&
        !base.produto &&
        !base.categoria &&
        (sess.focoAtual || sess.categoriaAtual);

      const effectiveIntent = (priceOnlyFollowUp ? "PRODUCT_SEARCH" : intent) as Intent;
      const effectiveBase = priceOnlyFollowUp
        ? {
            ...base,
            produto: sess.focoAtual ?? undefined,
            categoria: sess.categoriaAtual ?? undefined,
          }
        : base;

      // Fluxos não-produto (small talk, utilitários, ajuda, whoami)
      if (effectiveIntent !== "PRODUCT_SEARCH") {
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
          
          if (sess.focoAtual) {
            draft += lang === "es" 
              ? ` ¿Seguimos con ${sess.focoAtual}?` 
              : ` Quer continuar no ${sess.focoAtual}?`;
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
      const produtoNovo = effectiveBase.produto && effectiveBase.produto !== sess.focoAtual;
      updateSession(sessionId, {
        focoAtual: effectiveBase.produto ?? sess.focoAtual ?? null,
        categoriaAtual: produtoNovo 
          ? effectiveBase.categoria ?? null 
          : sess.categoriaAtual ?? effectiveBase.categoria ?? null,
        lastQuery: effectiveBase.produto ?? sess.lastQuery ?? null,
      });

      // Extrai slots adicionais (modelo/GB/cor/atributos)
      const slots = extractModeloGBCor(message);

      // Monta query com sinais de preço/ordem ("mais barato" → in_stock=true)
      const query = buildQuery({
        base: { ...effectiveBase },
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
      if (!sess.lastQuery && !query.produto && !query.categoria) {
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
          session: { ...sess },
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
  get("/api/assistant/status", async (_req: any, res: any) => {
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