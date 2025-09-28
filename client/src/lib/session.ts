// client/src/lib/session.ts
export async function getPersistedSessionId(): Promise<string> {
  const KEY = "gemini.sessionId";
  let sid = localStorage.getItem(KEY);
  if (sid && sid.trim()) return sid;

  try {
    const r = await fetch("/api/assistant/sessions");
    const j = await r.json();
    sid = j?.sessionId || `web_${Math.random().toString(36).slice(2)}`;
  } catch {
    sid = `web_${Math.random().toString(36).slice(2)}`;
  }
  localStorage.setItem(KEY, sid!);
  return sid!;
}