/**
 * Telemetria e export de conversas para treinamento
 */

export type ConversationTurn = {
  ts: number;
  user: string;
  intent: string;
  slots: Record<string, any>;
  draft: string;
  final: string;
  itemsShown: string[];
};

// Storage em memória (substituível por DB em produção)
const CONVERSATIONS = new Map<string, ConversationTurn[]>();

/**
 * Registra um turno de conversa
 * @param sessionId - ID da sessão
 * @param turn - Dados do turno
 */
export function logTurn(sessionId: string, turn: ConversationTurn): void {
  if (!CONVERSATIONS.has(sessionId)) {
    CONVERSATIONS.set(sessionId, []);
  }
  
  CONVERSATIONS.get(sessionId)!.push(turn);
  
  // Limita a 100 turnos por sessão
  const turns = CONVERSATIONS.get(sessionId)!;
  if (turns.length > 100) {
    turns.splice(0, turns.length - 100);
  }
}

/**
 * Obtém conversas de uma sessão
 * @param sessionId - ID da sessão
 * @returns Array de turnos
 */
export function getConversation(sessionId: string): ConversationTurn[] {
  return CONVERSATIONS.get(sessionId) || [];
}

/**
 * Exporta dataset para treinamento
 * @returns Dataset formatado
 */
export function exportDataset(): any[] {
  const dataset: any[] = [];
  
  for (const [sessionId, turns] of CONVERSATIONS.entries()) {
    for (const turn of turns) {
      dataset.push({
        session: sessionId,
        timestamp: turn.ts,
        input: turn.user,
        intent: turn.intent,
        slots: turn.slots,
        output_draft: turn.draft,
        output_final: turn.final,
        products_shown: turn.itemsShown,
        has_results: turn.itemsShown.length > 0,
      });
    }
  }
  
  return dataset.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Obtém estatísticas das conversas
 * @returns Estatísticas básicas
 */
export function getStats(): {
  totalSessions: number;
  totalTurns: number;
  intentDistribution: Record<string, number>;
  avgTurnsPerSession: number;
} {
  const totalSessions = CONVERSATIONS.size;
  let totalTurns = 0;
  const intentCounts: Record<string, number> = {};
  
  for (const turns of CONVERSATIONS.values()) {
    totalTurns += turns.length;
    
    for (const turn of turns) {
      intentCounts[turn.intent] = (intentCounts[turn.intent] || 0) + 1;
    }
  }
  
  return {
    totalSessions,
    totalTurns,
    intentDistribution: intentCounts,
    avgTurnsPerSession: totalSessions > 0 ? totalTurns / totalSessions : 0,
  };
}

/**
 * Limpa dados antigos
 * @param olderThanMs - Remove dados mais antigos que X ms
 */
export function cleanOldData(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): void {
  const cutoff = Date.now() - olderThanMs;
  
  for (const [sessionId, turns] of CONVERSATIONS.entries()) {
    const filtered = turns.filter(turn => turn.ts > cutoff);
    
    if (filtered.length === 0) {
      CONVERSATIONS.delete(sessionId);
    } else {
      CONVERSATIONS.set(sessionId, filtered);
    }
  }
}

/**
 * Encontra sessões com problemas
 * @returns Sessões problemáticas
 */
export function findProblematicSessions(): {
  sessionId: string;
  issues: string[];
}[] {
  const problematic: { sessionId: string; issues: string[] }[] = [];
  
  for (const [sessionId, turns] of CONVERSATIONS.entries()) {
    const issues: string[] = [];
    
    // Muitos turnos sem resultados
    const noResultTurns = turns.filter(t => t.itemsShown.length === 0);
    if (noResultTurns.length > turns.length * 0.7) {
      issues.push("Muitos turnos sem resultados");
    }
    
    // Muitas mensagens seguidas do mesmo intent
    let sameIntentStreak = 0;
    let lastIntent = "";
    for (const turn of turns) {
      if (turn.intent === lastIntent) {
        sameIntentStreak++;
      } else {
        sameIntentStreak = 1;
        lastIntent = turn.intent;
      }
      
      if (sameIntentStreak > 3) {
        issues.push(`Muitos ${turn.intent} seguidos`);
        break;
      }
    }
    
    // Sessão muito longa
    if (turns.length > 20) {
      issues.push("Sessão muito longa");
    }
    
    if (issues.length > 0) {
      problematic.push({ sessionId, issues });
    }
  }
  
  return problematic;
}

/**
 * Exporta conversas em formato específico
 * @param format - Formato desejado
 * @returns Dados formatados
 */
export function exportConversations(format: "csv" | "json" | "jsonl" = "json"): string {
  const dataset = exportDataset();
  
  switch (format) {
    case "json":
      return JSON.stringify(dataset, null, 2);
      
    case "jsonl":
      return dataset.map(item => JSON.stringify(item)).join("\n");
      
    case "csv":
      if (dataset.length === 0) return "";
      
      const headers = Object.keys(dataset[0]);
      const csvRows = [headers.join(",")];
      
      for (const item of dataset) {
        const row = headers.map(header => {
          const value = item[header];
          if (typeof value === "object") {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(row.join(","));
      }
      
      return csvRows.join("\n");
      
    default:
      return JSON.stringify(dataset, null, 2);
  }
}