/**
 * InlineAssistant
 * ----------------
 * - Barra de busca que expande levemente ao focar.
 * - Chat "embutido" logo abaixo da barra, no mesmo card (altura limitada + scroll).
 * - Coluna à direita: até 3 "Produtos Recomendados".
 * - Restante dos resultados vai para a área "Resultados" mais abaixo (fora do chat).
 *
 * Requisitos de backend:
 *  - POST /assistant/session (headers: x-user-id, x-user-name) -> { sessionId, greeting, suggest }
 *  - GET  /assistant/stream?sessionId=&message=&userId=&userName= (SSE)
 *  - GET  /suggest?q=...
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Store = { id:string; name:string; label?:string; mall?:string };
type Product = { id:string; title:string; category?:string; price?:{ USD?: number }, score?:number, storeId?:string };
type SuggestResponse = { ok:boolean; category?:string; topStores:Store[]; products:Product[]; scratchcard?:any };

export default function InlineAssistant(){
  // identidade (mock — seu login deve preencher isso)
  const uid = useMemo(()=> localStorage.getItem('uid') || (localStorage.setItem('uid','u-'+Math.random().toString(36).slice(2,8)), localStorage.getItem('uid')!), []);
  const userName = useMemo(()=> localStorage.getItem('userName') || 'Cliente', []);

  const [sessionId, setSessionId] = useState('');
  const [expanded, setExpanded] = useState(false);   // controla expansão suave da barra
  const [input, setInput] = useState('');
  const [greeting, setGreeting] = useState('');      // saudação inicial
  const [streamingText, setStreamingText] = useState(''); // texto do SSE
  const [recommended, setRecommended] = useState<Product[]>([]); // top 3
  const [feed, setFeed] = useState<Product[]>([]);   // restante (abaixo da barra)
  const [loadingSug, setLoadingSug] = useState(false);
  const esRef = useRef<EventSource|null>(null);

  // cria sessão e carrega greeting + sugestões iniciais
  useEffect(()=> {
    fetch('/assistant/session', {
      method: 'POST',
      headers: { 'x-user-id': uid, 'x-user-name': userName }
    })
      .then(r=>r.json())
      .then(d=>{
        setSessionId(d.sessionId);
        if (d.greeting) setGreeting(d.greeting);
        if (d.suggest?.products) {
          const top3 = d.suggest.products.slice(0,3);
          const rest = d.suggest.products.slice(3);
          setRecommended(top3);
          setFeed(rest);
        }
      });
  }, [uid, userName]);

  function startStream(message:string){
    if (!sessionId) return;
    if (esRef.current){ esRef.current.close(); esRef.current = null; }
    setStreamingText('');
    const qs = new URLSearchParams({ sessionId, message, userId: uid, userName });
    const es = new EventSource(`/assistant/stream?${qs.toString()}`);
    esRef.current = es;
    es.onmessage = (evt)=>{
      try{
        const p = JSON.parse(evt.data);
        if (p.type==='chunk' && p.text) setStreamingText(prev=> prev + p.text);
      }catch{
        setStreamingText(prev=> prev + evt.data);
      }
    };
    es.onerror = ()=>{ es.close(); esRef.current = null; };
  }
  useEffect(()=> ()=>{ esRef.current?.close(); }, []);

  async function handleFocus(){
    setExpanded(true);
    // opcional: iniciar "oi" tipando
    startStream('oi');
  }

  async function handleChange(q:string){
    setInput(q);
    const term = q.trim();
    if (!term) { setFeed([]); return; }
    try{
      setLoadingSug(true);
      const r = await fetch(`/suggest?q=${encodeURIComponent(term)}`, { headers:{ 'x-user-id': uid }});
      const data: SuggestResponse = await r.json();

      const top3 = (data.products||[]).slice(0,3);
      const rest = (data.products||[]).slice(3);
      setRecommended(top3);
      setFeed(rest);
    }finally{
      setLoadingSug(false);
    }
  }

  function handleSubmit(e:React.FormEvent){
    e.preventDefault();
    const q = input.trim(); if (!q) return;
    startStream(q);
  }

  return (
    <div className="w-full">
      {/* CARD SUPERIOR: barra + chat embutido + col. recomendados */}
      <div className="grid grid-cols-12 gap-4">
        {/* Esquerda: barra + chat embutido */}
        <div className="col-span-12 lg:col-span-9">
          <div className={`rounded-2xl border bg-white/80 backdrop-blur p-3 shadow-sm transition-all
            ${expanded ? 'shadow-[0_0_0_8px_rgba(99,102,241,0.12)]' : ''}`}>
            {/* Barra de busca integrada */}
            <form onSubmit={handleSubmit}
              className={`flex items-center gap-2 rounded-2xl px-4 transition-all bg-white shadow
              ${expanded ? 'py-3 scale-[1.01]' : 'py-2'}`}>
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs">C</div>
              <input
                value={input}
                onChange={(e)=> handleChange(e.target.value)}
                onFocus={handleFocus}
                placeholder="Fale com o Click (ex.: iPhone 15 em CDE)"
                className="flex-1 outline-none text-base"
              />
              <button className="px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90" type="submit">Buscar</button>
            </form>

            {/* Chat embutido (aparece no MESMO card, com altura limitada + scroll) */}
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-1">Click Assistant</div>
              <div className="rounded-xl bg-gray-50 border p-3 max-h-[220px] overflow-auto">
                {/* saudação + streaming */}
                <div className="whitespace-pre-wrap">
                  {greeting ? `${greeting}\n` : ''}
                  {streamingText}
                </div>
              </div>
              {loadingSug && <div className="text-xs text-gray-500 mt-2">Buscando ofertas…</div>}
            </div>
          </div>

          {/* FEED ABAIXO (fora do box do chat) */}
          <div className="mt-4">
            <ResultsFeed items={feed} />
          </div>
        </div>

        {/* Direita: até 3 recomendados */}
        <div className="col-span-12 lg:col-span-3">
          <div className="rounded-2xl border bg-white/80 backdrop-blur p-4 shadow-sm">
            <div className="text-sm font-semibold mb-2">Produtos Recomendados</div>
            {!recommended.length && <div className="text-xs text-gray-500">Converse comigo e vou sugerir ofertas para você!</div>}
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
    </div>
  );
}

/** Feed abaixo (importa aqui para ficar plug-and-play) */
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
            <div className="text-xs text-gray-500 mb-2">{p.category || '—'} {p.score!==undefined ? `• score ${p.score}` : ''}</div>
            <div className="text-sm">{p.price?.USD ? <>USD <b>{p.price.USD}</b></> : <span className="text-gray-400">sem preço</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}