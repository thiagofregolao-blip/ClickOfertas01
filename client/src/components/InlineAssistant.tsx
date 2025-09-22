// web/InlineAssistant.tsx  — versão com *guardas* contra duplicação e chat embutido
import React, { useEffect, useMemo, useRef, useState } from 'react';

type Product = { id:string; title:string; category?:string; price?:{ USD?: number }, score?:number };
type SuggestResponse = { ok?:boolean; products?: Product[] };

export default function InlineAssistant() {
  // identidade (preenchida pelo login; aqui com fallback p/ testes)
  const uid = useMemo(()=> localStorage.getItem('uid') || (localStorage.setItem('uid','u-'+Math.random().toString(36).slice(2,8)), localStorage.getItem('uid')!), []);
  const userName = useMemo(()=> localStorage.getItem('userName') || 'Cliente', []);

  // estado UI
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [greeting, setGreeting] = useState('');           // saudação única
  const [streamingText, setStreamingText] = useState(''); // texto "digitando"
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [feed, setFeed] = useState<Product[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);

  // guardas contra repetição
  const bootRef = useRef(false);        // evita criar sessão 2x (StrictMode)
  const greetOnceRef = useRef(false);   // evita setar saudação 2x
  const focusedOnceRef = useRef(false); // evita startStream no foco 2x
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // cria sessão ao montar (apenas 1x), e puxa greeting + sugestões iniciais
  useEffect(() => {
    if (bootRef.current) return; // StrictMode chama 2x em dev
    bootRef.current = true;
    
    // Verifica se já existe uma sessão ativa no localStorage
    const existingSessionId = localStorage.getItem('assistant_session_id');
    const sessionTimestamp = localStorage.getItem('assistant_session_timestamp');
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hora em ms
    
    // Se existe uma sessão recente (menos de 1 hora), reutiliza
    if (existingSessionId && sessionTimestamp && (now - parseInt(sessionTimestamp)) < oneHour) {
      console.log('Reutilizando sessão existente:', existingSessionId);
      setSessionId(existingSessionId);
      
      // Define uma saudação simples para sessões reutilizadas
      if (!greetOnceRef.current) {
        greetOnceRef.current = true;
        setGreeting('Olá! Como posso ajudar você hoje? 😊');
      }
      return;
    }
    
    // Cria nova sessão apenas se não existir uma válida
    (async () => {
      try {
        console.log('Criando nova sessão assistant...');
        const r = await fetch('/api/assistant/sessions', { method:'POST' });
        const d = await r.json();
        const sid = d?.session?.id || d?.sessionId || d?.id || '';
        
        if (sid) {
          setSessionId(sid);
          // Salva a sessão no localStorage com timestamp
          localStorage.setItem('assistant_session_id', sid);
          localStorage.setItem('assistant_session_timestamp', now.toString());
          console.log('Nova sessão criada:', sid);
        }

        if (d.greeting && !greetOnceRef.current) {
          greetOnceRef.current = true;
          setGreeting(d.greeting);
        }

        const prods: Product[] = d?.suggest?.products || [];
        setRecommended(prods.slice(0,3));
        setFeed(prods.slice(3));
      } catch (error) {
        console.error('Erro ao criar sessão:', error);
        // Fallback com ID local se a API falhar
        const fallbackId = 'local-' + Math.random().toString(36).slice(2,10);
        setSessionId(fallbackId);
        localStorage.setItem('assistant_session_id', fallbackId);
        localStorage.setItem('assistant_session_timestamp', now.toString());
      }
    })();
  }, []);

  function onFocus() {
    setExpanded(true);
    if (!focusedOnceRef.current && sessionId) {
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
      // tenta /suggest; se seu back usar /api/suggest, o catch abaixo cobre
      let r = await fetch(`/suggest?q=${encodeURIComponent(term)}`);
      if (!r.ok) r = await fetch(`/api/suggest?q=${encodeURIComponent(term)}`);
      const d: SuggestResponse = await r.json();
      const prods = d?.products || [];
      setRecommended(prods.slice(0,3));
      setFeed(prods.slice(3));
    } catch (e) {
      console.error('suggest error', e);
    } finally {
      setLoadingSug(false);
    }
  }

  async function onSubmit(e:React.FormEvent){
    e.preventDefault();
    const q = input.trim(); if (!q || !sessionId) return;
    startStream(q);
  }

  async function startStream(message: string) {
    // encerra stream anterior
    if (readerRef.current) { try { await readerRef.current.cancel(); } catch {} readerRef.current = null; }
    setStreamingText('');

    const response = await fetch('/api/assistant/stream', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Accept':'text/event-stream' },
      body: JSON.stringify({ sessionId, message, context: null })
    });
    if (!response.ok || !response.body) return;

    const reader = response.body.getReader();
    readerRef.current = reader;
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const chunk of parts) {
        const line = chunk.trim().replace(/^data:\s?/, '');
        try {
          const payload = JSON.parse(line);
          if (payload.type === 'chunk' && payload.text) {
            setStreamingText(prev => prev + payload.text);
          }
        } catch {
          setStreamingText(prev => prev + line);
        }
      }
    }
  }

  return (
    <div className="w-full">
      {/* GRID: esquerda = barra + chat embutido; direita = 3 recomendados */}
      <div className="grid grid-cols-12 gap-4">
        {/* ESQUERDA */}
        <div className="col-span-12 lg:col-span-9 min-h-0">
          <div className={`rounded-2xl border bg-white/80 backdrop-blur p-3 shadow-sm transition-all min-h-0
            ${expanded ? 'shadow-[0_0_0_8px_rgba(99,102,241,0.12)]' : ''}`}>
            {/* BARRA de busca (chat embutido fica no MESMO card, logo abaixo) */}
            <form onSubmit={onSubmit}
              className={`flex items-center gap-2 rounded-2xl px-4 transition-all bg-white shadow
              ${expanded ? 'py-3 scale-[1.01]' : 'py-2'}`}>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white grid place-content-center text-xs">C</div>
              <input
                value={input}
                onChange={(e)=> onChange(e.target.value)}
                onFocus={onFocus}
                placeholder="Fale com o Click (ex.: iPhone 15 em CDE)"
                className="flex-1 outline-none text-base"
              />
              <button className="px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90" type="submit">Buscar</button>
            </form>

            {/* CHAT EMBUTIDO (altura fixa + scroll) */}
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-1">Click Assistant</div>
              <div className="rounded-xl bg-gray-50 border p-3 max-h-[220px] overflow-auto">
                <div className="whitespace-pre-wrap">
                  {greeting ? `${greeting}\n` : ''}
                  {streamingText}
                </div>
              </div>
              {loadingSug && <div className="text-xs text-gray-500 mt-2">Buscando ofertas…</div>}
            </div>
          </div>

          {/* FEED ABAIXO (restante dos resultados, fora do chat) */}
          <div className="mt-4">
            <ResultsFeed items={feed} />
          </div>
        </div>

        {/* DIREITA (TOP 3 recomendados) */}
        <div className="col-span-12 lg:col-span-3">
          <div className="rounded-2xl border bg-white/80 backdrop-blur p-4 shadow-sm">
            <div className="text-sm font-semibold mb-2">Produtos Recomendados</div>
            {!recommended.length && (
              <div className="text-xs text-gray-500">Procurando os melhores produtos para você…</div>
            )}
            <div className="grid gap-3">
              {recommended.slice(0,3).map((p)=>(
                <div key={p.id} className="p-3 rounded-xl border hover:shadow-sm transition">
                  <div className="font-medium truncate mb-1">{p.title}</div>
                  <div className="text-xs text-gray-500 mb-2">
                    {p.category || '—'} {p.score!==undefined ? `• score ${p.score}` : ''}
                  </div>
                  <div className="text-sm">
                    {p.price?.USD ? <>USD <b>{p.price.USD}</b></> : <span className="text-gray-400">sem preço</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ResultsFeed({ items }: { items: Product[] }){
  if (!items?.length) {
    return (
      <div className="rounded-2xl border bg-white/80 backdrop-blur p-4 shadow-sm">
        <div className="text-sm text-gray-500">Os resultados completos aparecerão aqui conforme você digitar.</div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border bg-white/80 backdrop-blur p-4 shadow-sm">
      <div className="text-sm font-semibold mb-3">Resultados</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(p=>(
          <div key={p.id} className="p-3 rounded-xl border hover:shadow-sm transition">
            <div className="font-medium truncate mb-1">{p.title}</div>
            <div className="text-xs text-gray-500 mb-2">
              {p.category || '—'} {p.score!==undefined ? `• score ${p.score}` : ''}
            </div>
            <div className="text-sm">
              {p.price?.USD ? <>USD <b>{p.price.USD}</b></> : <span className="text-gray-400">sem preço</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}