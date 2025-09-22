// Guarda/recupera uma sessão por aba e evita repetir saudação.
export type ClickSession = { id: string; greeted?: boolean; createdAt?: number };
const KEY = '__click_session_v1';

export function getCached(): ClickSession | null {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function save(sess: ClickSession) { try { localStorage.setItem(KEY, JSON.stringify(sess)); } catch {} }
export function greeted(): boolean { return !!getCached()?.greeted; }
export function markGreeted() { const s = getCached(); if (!s) return; s.greeted = true; save(s); }

export async function getOrCreateSession(headers?: Record<string,string>):
Promise<{ id: string; greeting?: string; suggest?: any; fresh: boolean }> {
  const now = Date.now(); const cached = getCached();
  if (cached?.id && cached.createdAt && (now - cached.createdAt) < 60*60*1000) return { id: cached.id, fresh:false };
  const r = await fetch('/api/assistant/sessions', { method:'POST', headers });
  const d = await r.json();
  const id = d?.session?.id || d?.sessionId || d?.id;
  save({ id, greeted: !!d.greeting, createdAt: now });
  return { id, greeting: d.greeting, suggest: d.suggest, fresh:true };
}