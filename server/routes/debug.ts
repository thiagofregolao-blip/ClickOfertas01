// server/routes/debug.ts
import { Request, Response } from "express";
import { snapshotUnknown, getUnknownStats, clearUnknownTokens } from "../../src/observability/unknown-terms.js";
import { getCanonStats } from "../../src/nlp/canon.store.js";

// Endpoint para debug de termos desconhecidos
export function debugUnknownTerms(req: Request, res: Response) {
  try {
    const unknown = snapshotUnknown();
    const stats = getUnknownStats();
    const canonStats = getCanonStats();
    
    res.json({
      success: true,
      stats: {
        unknown: stats,
        canon: canonStats
      },
      unknownTerms: unknown
    });
  } catch (error) {
    console.error("Erro ao buscar termos desconhecidos:", error);
    res.status(500).json({ success: false, error: "Erro interno" });
  }
}

// Endpoint para limpar estatísticas de termos desconhecidos
export function clearUnknownStats(req: Request, res: Response) {
  try {
    clearUnknownTokens();
    res.json({ success: true, message: "Estatísticas de termos desconhecidos limpas" });
  } catch (error) {
    console.error("Erro ao limpar termos desconhecidos:", error);
    res.status(500).json({ success: false, error: "Erro interno" });
  }
}