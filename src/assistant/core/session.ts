/**
 * Gerenciamento de sessão para IA Vendedor
 * Sistema em memória com fallback para Redis/DB em produção
 */

import type { SessionState } from "../types.js";

// In-memory storage (substituível por Redis em produção)
const SESSIONS = new Map<string, SessionState>();

/**
 * Obtém estado da sessão
 * @param sessionId - ID da sessão
 * @returns Estado atual da sessão
 */
export function getSession(sessionId: string): SessionState {
  if (!SESSIONS.has(sessionId)) {
    SESSIONS.set(sessionId, {
      rngSeed: Math.floor(Math.random() * 1e9),
      _v: {},
      prefs: {},
    });
  }
  return SESSIONS.get(sessionId)!;
}

/**
 * Atualiza estado da sessão
 * @param sessionId - ID da sessão
 * @param patch - Campos a atualizar
 */
export function updateSession(sessionId: string, patch: Partial<SessionState>): void {
  const current = getSession(sessionId);
  SESSIONS.set(sessionId, { ...current, ...patch });
}

/**
 * Obtém próxima variante para templates rotativos
 * @param sessionId - ID da sessão
 * @param key - Chave do template
 * @param length - Número total de variantes
 * @returns Índice da próxima variante
 */
export function nextVariant(sessionId: string, key: string, length: number): number {
  const session = getSession(sessionId);
  const current = session._v?.[key] ?? -1;
  const next = (current + 1) % Math.max(1, length);
  
  session._v = { ...(session._v ?? {}), [key]: next };
  return next;
}

/**
 * Limpa sessão específica
 * @param sessionId - ID da sessão a limpar
 */
export function clearSession(sessionId: string): void {
  SESSIONS.delete(sessionId);
}

/**
 * Limpa todas as sessões (útil para desenvolvimento)
 */
export function clearAllSessions(): void {
  SESSIONS.clear();
}

/**
 * Obtém estatísticas das sessões ativas
 * @returns Estatísticas básicas
 */
export function getSessionStats(): {
  activeSessions: number;
  sessionsWithFocus: number;
  totalQueries: number;
} {
  const sessions = Array.from(SESSIONS.values());
  
  return {
    activeSessions: sessions.length,
    sessionsWithFocus: sessions.filter(s => s.focoAtual).length,
    totalQueries: sessions.filter(s => s.lastQuery).length,
  };
}