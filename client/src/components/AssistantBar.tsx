/**
 * A BARRA É O ASSISTENTE:
 * - O input é o chat (stream por POST).
 * - Painel drop embutido sob a barra (scroll interno).
 * - 3 recomendados à direita, resto no feed logo abaixo (fora do painel).
 * - Usa sessão por usuário (uid) para evitar loop e garantir login.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

type Product = { id:string; title:string; category?:string; price?:{ USD?: number }, score?:number };
type SuggestResponse = { products?: Product[] };

export default function AssistantBar() {
  // pegue do seu auth (aqui fallback simples)
  const uid = useMemo(() => {
    const u = localStorage.getItem('uid');
    return u || (localStorage.setItem('uid', 'u-'+Math.random().toString(36).slice(2,8)), localStorage.getItem('uid')!);
  }, []);
  const userName = useMemo(() => localStorage.getItem('userName') || 'Cliente', []);

  const [sessionId, setSessionId] = useState('');
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);          // abre/fecha painel sob a barra
  const [greeting, setGreeting] = useState('');
  const [streaming, setStreaming] = useState('');
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [feed, setFeed] = useState<Product[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);

  // evita múltiplos boots/focos (StrictMode)
  const bootRef = useRef(false);
  const focusedOnceRef = useRef(false);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array>|null>(null);

  // cria/recupera sessão SEMPRE com headers do usuário
  useEffect(() => {
    if (bootRef.current) return; bootRef.current = true;
    (async () => {
      const r = await fetch('/api/assistant/sessions', {
        method: 'POST',
        headers: { 'x-user-id': uid, 'x-user-name': userName }
      });
      const d = await r.json();
      const sid = d?.session?.id || d?.sessionId || d?.id || '';
      setSessionId(sid);
      if (d.greeting) setGreeting(d.greeting);
      const prods: Product[] = d?.suggest?.products || [];
      setRecommended(prods.slice(0,3));
      setFeed(prods.slice(3));
    })();
  }, [uid, userName]);

  async function startStream(message: string) {
    if (!sessionId) return;
    // encerra stream anterior
    if (readerRef.current) { try { await readerRef.current.cancel(); } catch {} readerRef.current = null; }
    setStreaming('');
    const response = await fetch('/api/assistant/stream', {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'Accept':'text/event-stream',
        'x-user-id': uid, 'x-user-name': userName
      },
      body: JSON.stringify({ sessionId, message, context: null })
    });
    if (!response.ok || !response.body) return;
    const reader = response.body.getReader();
    readerRef.current = reader; const decoder = new TextDecoder(); let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream:true });
      const parts = buffer.split('\n\n'); buffer = parts.pop() || '';
      for (const chunk of parts) {
        const line = chunk.trim().replace(/^data:\s?/, '');
        try {
          const payload = JSON.parse(line);
          if (payload.type === 'chunk' && payload.text) setStreaming(prev => prev + payload.text);
        } catch { setStreaming(prev => prev + line); }
      }
    }
  }

  function onFocus() {
    setOpen(true);
    if (!focusedOnceRef.current) {
      focusedOnceRef.current = true;
      startStream('oi');
    }
  }

  async function onChange(q:string){
    setInput(q);
    const term = q.trim();
    if (!term) { setFeed([]); return; }
    try{
      setLoadingSug(true);
      let r = await fetch(`/suggest?q=${encodeURIComponent(term)}`);
      if (!r.ok) r = await fetch(`/api/suggest?q=${encodeURIComponent(term)}`);
      const d: SuggestResponse = await r.json();
      const prods = (d?.products || []).map(p => ({ ...p, price: { USD: Number(p?.price?.USD ?? 0) || undefined }}));
      setRecommended(prods.slice(0,3));
      setFeed(prods.slice(3));
    } finally { setLoadingSug(false); }
  }

  async function onSubmit(e:React.FormEvent){
    e.preventDefault();
    const q = input.trim(); if (!q) return;
    startStream(q);
  }

  return (
    <div className="w-full">
      {/* A BARRA EM SI */}
      <form onSubmit={onSubmit}
        className="flex items-center gap-2 rounded-2xl px-4 py-2 bg-white shadow border">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white grid place-content-center text-xs">C</div>
        <input
          value={input}
          onChange={(e)=> onChange(e.target.value)}
          onFocus={onFocus}
          placeholder="Converse com o Click (ex.: iPhone 15 em CDE)"
          className="flex-1 outline-none text-base"
        />
        <button className="px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90" type="submit">Enviar</button>
      </form>

      {/* PAINEL ABAIXO DA BARRA (é a box do assistente) */}
      {open && (
        <div className="mt-2 grid grid-cols-12 gap-4">
          {/* Chat embutido com scroll */}
          <div className="col-span-12 lg:col-span-9 min-h-0">
            <div className="rounded-2xl border bg-white/80 backdrop-blur p-3 shadow-sm min-h-0">
              <div className="text-xs text-gray-500 mb-1">Click Assistant</div>
              <div className="rounded-xl bg-gray-50 border p-3 max-h-[240px] overflow-auto whitespace-pre-wrap">
                {greeting ? `${greeting}\n` : ''}{streaming}
              </div>
              {loadingSug && <div className="text-xs text-gray-500 mt-2">Buscando ofertas…</div>}
            </div>

            {/* Feed com restante dos resultados */}
            <div className="mt-3">
              <ResultsFeed items={feed} />
            </div>
          </div>

          {/* Coluna direita com até 3 recomendados */}
          <div className="col-span-12 lg:col-span-3">
            <div className="rounded-2xl border bg-white/80 backdrop-blur p-4 shadow-sm">
              <div className="text-sm font-semibold mb-2">Produtos Recomendados</div>
              {!recommended.length && <div className="text-xs text-gray-500">Converse comigo e vou recomendar os melhores produtos!</div>}
              <div className="grid gap-3">
                {recommended.slice(0,3).map((p)=>(
                  <div key={p.id} className="p-3 rounded-xl border hover:shadow-sm transition">
                    <div className="font-medium truncate mb-1">{p.title}</div>
                    <div className="text-xs text-gray-500 mb-2">{p.category || '—'} {p.score!==undefined ? `• score ${p.score}` : ''}</div>
                    <div className="text-sm">{p.price?.USD ? <>USD <b>{p.price.USD}</b></> : <span className="text-gray-400">sem preço</span>}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsFeed({ items }: { items: Product[] }){
  if (!items?.length) return (
    <div className="rounded-2xl border bg-white/80 backdrop-blur p-4 shadow-sm">
      <div className="text-sm text-gray-500">Os resultados completos aparecem aqui conforme você digita.</div>
    </div>
  );
  return (
    <div className="rounded-2xl border bg-white/80 backdrop-blur p-4 shadow-sm">
      <div className="text-sm font-semibold mb-3">Resultados</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(p=>(
          <div key={p.id} className="p-3 rounded-xl border hover:shadow-sm transition">
            <div className="font-medium truncate mb-1">{p.title}</div>
            <div className="text-xs text-gray-500 mb-2">{p.category || '—'} {p.score!==undefined ? `• score ${p.score}` : ''}</div>
            <div className="text-sm">{p.price?.USD ? <>USD <b>{p.price.USD}</b></> : <span className="text-gray-400">sem preço</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}