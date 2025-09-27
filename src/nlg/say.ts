// src/nlg/say.ts
import { SalesPersona } from "../persona/salesPersona";
import { tGreet, tFound, tNoResults, tClarify, tCrossSell } from "./templates";
import { nextAccessorySuggestion } from "../logic/crossSell";
import type { ConversationMemory } from "../types/memory";
import { mulberry32 } from "../utils/rng";
import { obterContextoSessao } from "../../server/lib/gemini/context-storage.js";

type Block = { type: "text"; text: string } | { type: "products"; items: any[] };

export interface ComposeArgs {
  query: { produto?: string; categoria?: string; modelo?: string; marca?: string; queryFinal?: string; armazenamento?: string; faltando?: Array<"modelo"|"marca"|"armazenamento">; };
  items: any[];
  memory: ConversationMemory;
  sessionId?: string;
}

export async function composeAnswer(args: ComposeArgs, rngSeed?: number): Promise<Block[]> {
  const persona = SalesPersona;
  const { query, items, memory, sessionId } = args;
  const blocks: Block[] = [];
  
  // Buscar seed da sessão diretamente (patch aplicado)
  let seed = rngSeed;
  if (!seed && sessionId) {
    const sess = (await obterContextoSessao(sessionId)) ?? {};
    seed = (sess as any).rngSeed ?? 123456789;
  }
  const rng = mulberry32(seed ?? 123456789);
  
  // Debug temporário para verificar variação
  console.debug("[nlg] rng first picks", {
    g: Math.floor(rng() * 3),
    f: Math.floor(rng() * 3), 
    n: Math.floor(rng() * 3)
  });

  if (!memory.lastQuery && !query.produto && !query.categoria) {
    blocks.push({ type: "text", text: tGreet({ persona, rng }) });
  }

  if (items.length > 0) {
    blocks.push({
      type: "text",
      text: tFound({
        persona,
        rng,
        produto: query.produto,
        categoria: query.categoria,
        modelo: query.modelo,
        count: items.length,
        query: query.queryFinal ?? query.produto ?? query.categoria ?? ""
      })
    });
    blocks.push({ type: "products", items });

    // Pergunta de esclarecimento se faltar slot
    const falta: Array<"modelo" | "marca" | "armazenamento"> = [];
    if (!query.modelo && (query.produto === "iphone" || query.categoria === "celular")) falta.push("modelo");
    if (!query.marca && ["celular","tv","notebook"].includes(query.categoria ?? "")) falta.push("marca");
    if (!query.armazenamento && query.produto === "iphone") falta.push("armazenamento");
    const clar = tClarify({ persona, rng, produto: query.produto, faltando: falta });
    if (clar) blocks.push({ type: "text", text: clar });

    // Cross-sell (sem repetir)
    const cat = query.categoria ?? query.produto;
    const novos = nextAccessorySuggestion(cat, memory.acessoriosSugeridos ?? []);
    if (novos.length) {
      blocks.push({ type: "text", text: tCrossSell({ persona, rng, categoria: cat, acessorios: novos })! });
      
      // Adicionar novos acessórios sugeridos na memória para evitar repetição
      if (!memory.acessoriosSugeridos) memory.acessoriosSugeridos = [];
      memory.acessoriosSugeridos.push(...novos);
    }
  } else {
    blocks.push({
      type: "text",
      text: tNoResults({
        persona,
        rng,
        produto: query.produto,
        categoria: query.categoria,
        modelo: query.modelo,
        faltando: query.faltando ?? ["modelo"],
        query: query.queryFinal ?? query.produto ?? ""
      })
    });
  }

  return blocks;
}