// src/nlg/say.ts
import { SalesPersona } from "../persona/salesPersona";
import { tGreet, tFound, tNoResults, tClarify, tCrossSell, greet, found, noResults } from "./templates";
import { nextAccessorySuggestion } from "../logic/crossSell";
import type { ConversationMemory } from "../types/memory";
import { nextVariant } from "../../server/lib/gemini/context-storage.js";

type Block = { type: "text"; text: string } | { type: "products"; items: any[] };

export interface ComposeArgs {
  query: { produto?: string; categoria?: string; modelo?: string; marca?: string; queryFinal?: string; armazenamento?: string; faltando?: Array<"modelo"|"marca"|"armazenamento">; };
  items: any[];
  memory: ConversationMemory;
  sessionId?: string;
}

export async function composeAnswer(args: ComposeArgs & { sessionId: string }): Promise<Block[]> {
  const persona = SalesPersona;
  const { query, items, memory, sessionId } = args;
  const blocks: Block[] = [];
  
  if (!memory.lastQuery && !query.produto && !query.categoria) {
    // Rotação determinística por sessão para cumprimentos
    const idx = await nextVariant(sessionId, "greet", greet.length);
    const text = greet[idx].replace("{emoji}", "✨");
    blocks.push({ type: "text", text });
  }

  if (items.length > 0) {
    // Rotação determinística por sessão para resultados encontrados
    const idx = await nextVariant(sessionId, "found", found.length);
    const base = found[idx]
      .replace("{count}", String(query ? (query as any).count ?? items.length : items.length))
      .replace("{cat}", (query.categoria ?? query.produto ?? "itens") as string)
      .replace("{query}", query.queryFinal ?? query.produto ?? query.categoria ?? "")
      .replace("{emoji}", "😄");
    blocks.push({ type: "text", text: base });
    blocks.push({ type: "products", items });

    // Pergunta de esclarecimento se faltar slot (usando templates originais ainda)
    const falta: Array<"modelo" | "marca" | "armazenamento"> = [];
    if (!query.modelo && (query.produto === "iphone" || query.categoria === "celular")) falta.push("modelo");
    if (!query.marca && ["celular","tv","notebook"].includes(query.categoria ?? "")) falta.push("marca");
    if (!query.armazenamento && query.produto === "iphone") falta.push("armazenamento");
    
    // Usar array de templates simples para clarificação
    if (falta.length > 0) {
      const clarifyTemplates = [
        `Qual {hint} você prefere?`,
        `Você tem preferência de {hint}?`,
        `Precisa de algum {hint} específico?`
      ];
      const clarIdx = await nextVariant(sessionId, "clarify", clarifyTemplates.length);
      const need = falta[0] ?? "mais detalhes";
      const hint = need === "modelo" ? "o **modelo** (ex.: 12, 13 Pro)" : 
                   need === "marca" ? "a **marca** (ex.: Apple, Samsung)" : 
                   "a **capacidade** (ex.: 128GB)";
      const clarText = clarifyTemplates[clarIdx].replace("{hint}", hint);
      blocks.push({ type: "text", text: clarText });
    }

    // Cross-sell (sem repetir)
    const cat = query.categoria ?? query.produto;
    const novos = nextAccessorySuggestion(cat, memory.acessoriosSugeridos ?? []);
    if (novos.length) {
      const crossSellTemplates = [
        `Ah, e que tal uns {acessorios} para complementar? 😉`,
        `Já pensou em {acessorios} também?`,
        `Super combo: {acessorios} para aproveitar melhor! 🔥`
      ];
      const crossIdx = await nextVariant(sessionId, "crosssell", crossSellTemplates.length);
      const crossText = crossSellTemplates[crossIdx].replace("{acessorios}", novos.join(", "));
      blocks.push({ type: "text", text: crossText });
      
      // Adicionar novos acessórios sugeridos na memória para evitar repetição
      if (!memory.acessoriosSugeridos) memory.acessoriosSugeridos = [];
      memory.acessoriosSugeridos.push(...novos);
    }
  } else {
    // Rotação determinística por sessão para sem resultados
    const idx = await nextVariant(sessionId, "nores", noResults.length);
    const need = (query.faltando?.[0] ?? "mais detalhes") as string;
    const hint = need === "modelo" ? "o **modelo** (ex.: 12, 13 Pro)" : 
                 need === "marca" ? "a **marca** (ex.: Apple, Samsung)" : 
                 "a **capacidade** (ex.: 128GB)";
    const text = noResults[idx]
      .replace("{query}", query.queryFinal ?? query.produto ?? "")
      .replace("{hint}", hint)
      .replace("{emoji}", "😉");
    blocks.push({ type: "text", text });
  }

  console.log(`💬 [composeAnswer] Sessão ${sessionId}: ${blocks.length} blocos gerados`);
  return blocks;
}