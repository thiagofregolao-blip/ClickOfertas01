/**
 * Sistema de sessão em memória para contexto conversacional
 */

type SessionState = {
  focoAtual?: string | null;
  categoriaAtual?: string | null;
  lastQuery?: string | null;
  rngSeed?: number;
  _v?: Record<string, number>; // variação por chave para rotação de templates
};

// Armazenamento em memória
const mem = new Map<string, SessionState>();

/**
 * Obtém estado da sessão, criando nova se não existir
 * @param id - ID da sessão
 * @returns Estado da sessão
 */
export function getSession(id: string): SessionState {
  if (!mem.has(id)) {
    mem.set(id, { 
      rngSeed: Math.floor(Math.random() * 1e9), 
      _v: {} 
    });
  }
  return mem.get(id)!;
}

/**
 * Atualiza estado da sessão
 * @param id - ID da sessão
 * @param patch - Mudanças a serem aplicadas
 */
export function updateSession(id: string, patch: Partial<SessionState>): void {
  const cur = getSession(id);
  mem.set(id, { ...cur, ...patch });
}

/**
 * Obtém próxima variação para rotação de templates
 * @param id - ID da sessão
 * @param key - Chave do template
 * @param len - Número total de variações
 * @returns Índice da próxima variação
 */
export function nextVariant(id: string, key: string, len: number): number {
  const s = getSession(id);
  const cur = s._v?.[key] ?? -1;
  const nxt = (cur + 1) % Math.max(1, len);
  
  s._v = s._v ?? {};
  s._v[key] = nxt;
  
  return nxt;
}

/**
 * Limpa dados da sessão
 * @param id - ID da sessão
 */
export function clearSession(id: string): void {
  mem.delete(id);
}

/**
 * Lista todas as sessões ativas (para debug)
 * @returns Array com IDs das sessões
 */
export function getActiveSessions(): string[] {
  return Array.from(mem.keys());
}