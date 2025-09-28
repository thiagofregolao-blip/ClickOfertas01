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

// --- Cookie helpers (sem dependências) ---
function readCookie(req: any, key: string): string | undefined {
  const raw = String(req.headers?.cookie ?? "");
  if (!raw) return undefined;
  const parts = raw.split(";").map((s: string) => s.trim());
  for (const p of parts) {
    const i = p.indexOf("=");
    if (i > 0) {
      const k = p.slice(0, i);
      const v = p.slice(i + 1);
      if (k === key) return decodeURIComponent(v);
    }
  }
  return undefined;
}
function setCookie(res: any, key: string, val: string) {
  const v = encodeURIComponent(val);
  const isProduction = process.env.NODE_ENV === "production";
  const flags = [
    `${key}=${v}`,
    "Path=/",
    "SameSite=Lax",
    "HttpOnly",
    isProduction ? "Secure" : "",
    "Max-Age=31536000" // 1 ano
  ].filter(Boolean).join("; ");
  res.setHeader("Set-Cookie", flags);
}

function hash32(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return (h >>> 0).toString(36);
}

function getStableSessionId(req: any, provided?: string) {
  // 1) se já existir cookie, usa (prefere sobre body para evitar session drift)
  const fromCookie = readCookie(req, "sid");
  if (fromCookie) return fromCookie;
  // 2) se vier do body, usa
  if (provided && String(provided).trim()) return String(provided);
  // 3) deriva de IP/UA
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
  post("/feedback", async (_req: any, res: any) => {
    // Placeholder para feedback do usuário sobre respostas
    // Integrar com sistema de analytics quando necessário
    res.json({ ok: true });
  });

  post("/analytics/click", async (_req: any, res: any) => {
    // Placeholder para tracking de cliques em produtos
    // Integrar com sistema de analytics quando necessário  
    res.json({ ok: true });
  });

  // (Compat) gerenciamento simples de sessão/memória para o front
  get("/sessions", (req:any, res:any) => {
    // gera um id estável igual ao usado internamente
    const sid = getStableSessionId(req, req.query.sessionId as string | undefined);
    res.json({ ok:true, sessionId: sid });
  });
  
  post("/sessions", (req:any, res:any) => {
    // gera um id estável igual ao usado internamente (compat POST)
    const sid = getStableSessionId(req, req.body.sessionId as string | undefined);
    res.json({ ok:true, sessionId: sid });
  });
  
  get("/memory/:sessionId", (req:any, res:any) => {
    const sid = String(req.params.sessionId ?? "");
    const s = getSession(sid);
    res.json({ ok:true, memory: s });
  });

  // (Fases 1/4/5) Rota principal do assistente
  post("/query", async (req: any, res: any) => {
    try {
      const body = (req.body ?? {}) as { 
        sessionId?: string; 
        message?: string; 
        lang?: "pt" | "es";
        context?: {
          lastProduct?: string;
          lastCategory?: string;
        }
      };
      const sessionId = getStableSessionId(req, body.sessionId);
      const message = body.message;
      const lang = (body.lang ?? "pt") as "pt" | "es";
      const context = body.context;

      if (!message || !message.trim()) {
        return res.status(400).json({ 
          ok: false, 
          error: "Mensagem vazia" 
        });
      }
      
      // sempre seta o cookie com o sessionId resolvido para manter sincronia
      setCookie(res, "sid", sessionId);

      const sess = getSession(sessionId);
      const cls = classify(message);
      let base = { ...cls.base };

      // 👉 se for follow-up de preço e não veio produto/categoria, herda
      if (cls.flags?.priceOnlyFollowUp) {
        if (!base.produto && sess.focoAtual) base.produto = sess.focoAtual;
        if (!base.categoria && sess.categoriaAtual) base.categoria = sess.categoriaAtual;

        // fallback extra: usa contexto trazido pelo frontend
        if (!base.produto && context?.lastProduct) base.produto = String(context.lastProduct).toLowerCase();
        if (!base.categoria && context?.lastCategory) base.categoria = String(context.lastCategory).toLowerCase();
      }

      const effectiveIntent = cls.intent as Intent;
      const effectiveBase = base;
      const priceOnlyFollowUp = !!cls.flags?.priceOnlyFollowUp;

      // Fluxos não-produto (small talk, utilitários, ajuda, whoami)
      if (effectiveIntent !== "PRODUCT_SEARCH") {
        let draft = "";
        
        if (effectiveIntent === "SMALL_TALK") {
          draft = sayGreeting(sessionId, lang);
        } else if (effectiveIntent === "TIME_QUERY") {
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
        } else if (effectiveIntent === "HELP") {
          draft = lang === "es" 
            ? "Dime el producto (ej.: iPhone, drone, perfume) y te muestro ofertas."
            : "Diga o produto (ex.: iPhone, drone, perfume) que eu mostro as ofertas.";
        } else if (effectiveIntent === "WHOAMI") {
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
          debug: { intent: effectiveIntent }
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
      let query = buildQuery({
        base: { ...effectiveBase },
        text: message,
        preferInStockCheapest: true,
        slots: { attrs: slots.attrs, modelo: slots.modelo }
      });

      // 🔧 Se foi follow-up de preço e sort não veio, força ASC
      if (priceOnlyFollowUp && !query.sort) {
        query.sort = "price.asc";
      }

      // Carrega catálogo (JSON/HTTP/DB)
      const catalogItems: CatalogItem[] = await catalog.load();
      let items = runQueryLocal(catalogItems, query);

      // NEW: shortcircuit/hotfix — se for follow-up de preço e temos foco salvo, entregamos o mais barato direto
      if (items.length === 0 && priceOnlyFollowUp) {
        const foco = (sess.focoAtual ?? sess.lastQuery ?? effectiveBase.produto)?.toLowerCase();
        const cat = (sess.categoriaAtual ?? effectiveBase.categoria)?.toLowerCase();
        
        if (foco || cat) {
          // Helper para normalização de categoria
          const normCategory = (c: string) => {
            const lower = c.toLowerCase();
            if (lower.includes('celular') || lower.includes('smartphone') || lower.includes('telefon')) return 'celular';
            if (lower.includes('perfum') || lower.includes('fragranc')) return 'perfume';
            if (lower.includes('elet') || lower.includes('gadget')) return 'eletronicos';
            return lower;
          };
          
          // Primeira tentativa: foco + categoria
          let pool = catalogItems.filter(it => {
            const t = it.title?.toLowerCase() ?? "";
            const itCat = normCategory(it.category || "");
            const sessCat = cat ? normCategory(cat) : undefined;
            
            const okProd = foco ? (t.includes(foco) || (sessCat === "celular" && (t.includes("iphone") || t.includes("galaxy")))) : true;
            const okCat = sessCat ? itCat === sessCat : true;
            const hasPrice = it.price != null && (typeof it.price === 'number') && it.price > 0;
            
            return okProd && okCat && hasPrice;
          });
          
          // Fallback: se vazio e temos foco, tenta só foco (ignora categoria)
          if (pool.length === 0 && foco) {
            pool = catalogItems.filter(it => {
              const t = it.title?.toLowerCase() ?? "";
              const hasPrice = it.price != null && (typeof it.price === 'number') && it.price > 0;
              return t.includes(foco) && hasPrice;
            });
          }
          
          if (pool.length > 0) {
            // Filtrar apenas em estoque e ordenar por preço
            const inStockPool = pool.filter(it => it.in_stock === true);
            const finalPool = inStockPool.length > 0 ? inStockPool : pool; // fallback para todos se não houver em estoque
            
            finalPool.sort((a,b) => (a.price ?? Infinity) - (b.price ?? Infinity));
            items = finalPool.slice(0, 10);
            
            // Ajusta a query de debug para refletir o atalho
            query = { 
              ...query, 
              produto: foco ?? query.produto, 
              categoria: cat ?? query.categoria, 
              sort: "price.asc",
              in_stock: inStockPool.length > 0 // só marca como true se realmente filtrou
            };
          }
        }
      }

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
        // mensagem neutra (evita "não rolou com barato" de handlers antigos)
        if (priceOnlyFollowUp) {
          draft = lang === "es" 
            ? "No encontré productos más baratos para esa búsqueda. ¿Intentamos con otra marca o categoría?" 
            : "Não encontrei produtos mais baratos para essa busca. Vamos tentar com outra marca ou categoria?";
        } else {
          draft = sayNoResults(
            sessionId, 
            lang, 
            lang === "es" ? "con otra marca o modelo" : "com outra marca ou modelo"
          );
        }
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
          priceOnlyFollowUp,
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