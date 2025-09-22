/**
 * A BARRA É O ASSISTENTE:
 * - Input = chat; submit envia para stream (POST).
 * - Box do assistente é um dropdown ancorado à barra (absolute), com scroll.
 * - 3 Premium na box; resto no feed abaixo; seção "Combina com" (acessórios).
 * - Cards clicáveis para detalhe.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getOrCreateSession, greeted, markGreeted } from '@/lib/sessionManager';

type Product = { id:string; title:string; category?:string; price?:{ USD?: number }, score?:number, storeId?:string };

const ACCESSORIES: Record<string, string[]> = {
  celulares: ['capinha', 'película', 'carregador'],
  'telefone': ['capinha', 'película', 'carregador'],
  'smartphone': ['capinha', 'película', 'carregador'],
  notebook: ['mochila', 'mouse', 'cooler'],
  gamer: ['mouse gamer', 'teclado gamer', 'headset'],
  camera: ['cartão sd', 'tripé', 'case'],
};

export default function AssistantBar(){
  // identidade (preenchida pelo login)
  const uid = useMemo(()=> localStorage.getItem('uid') || (localStorage.setItem('uid','u-'+Math.random().toString(36).slice(2,8)), localStorage.getItem('uid')!), []);
  const userName = useMemo(()=> localStorage.getItem('userName') || 'Cliente', []);

  const [sessionId, setSessionId] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);               // controla o dropdown
  const [greeting, setGreeting] = useState('');
  const [streaming, setStreaming] = useState('');
  const [topBox, setTopBox] = useState<Product[]>([]);   // 3 Premium/Top
  const [feed, setFeed] = useState<Product[]>([]);       // resto da busca
  const [combina, setCombina] = useState<Product[]>([]); // acessórios
  const [loadingSug, setLoadingSug] = useState(false);

  // refs contra duplicações
  const bootRef = useRef(false);
  const focusedRef = useRef(false);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array>|null>(null);

  // cria/recupera sessão (com usuário nos headers)
  useEffect(() => {
    if (bootRef.current) return; bootRef.current = true;
    (async () => {
      const sess = await getOrCreateSession({ 'x-user-id': uid, 'x-user-name': userName });
      setSessionId(sess.id);
      if (sess.fresh && sess.greeting && !greeted()) { setGreeting(sess.greeting); markGreeted(); }
      const prods: Product[] = sess?.suggest?.products || [];
      setTopBox(prods.slice(0,3));
      setFeed(prods.slice(3));
    })();
  }, [uid, userName]);

  // abre dropdown e dispara "oi" só 1x
  function onFocus(){
    setOpen(true);
    if (!focusedRef.current && sessionId) { focusedRef.current = true; startStream('oi'); }
  }

  // busca produtos
  async function fetchSuggest(term: string){
    setLoadingSug(true);
    try{
      let r = await fetch(`/suggest?q=${encodeURIComponent(term)}`);
      if (!r.ok) r = await fetch(`/api/suggest?q=${encodeURIComponent(term)}`);
      const d = await r.json();
      const prods: Product[] = (d?.products || []).map((p:any)=> ({ ...p, price: { USD: Number(p?.price?.USD ?? p?.priceUSD ?? 0) || undefined } }));
      setTopBox(prods.slice(0,3));
      setFeed(prods.slice(3));
      // acessórios baseados na categoria do 1º resultado
      const cat = (prods[0]?.category || '').toLowerCase();
      const accTerms = ACCESSORIES[cat] || [];
      if (accTerms.length){
        const accQ = accTerms.join(' OR ');
        let r2 = await fetch(`/suggest?q=${encodeURIComponent(accQ)}`);
        if (!r2.ok) r2 = await fetch(`/api/suggest?q=${encodeURIComponent(accQ)}`);
        const d2 = await r2.json();
        setCombina((d2?.products || []).slice(0,12));
      } else {
        setCombina([]);
      }
    } finally { setLoadingSug(false); }
  }

  function onChange(v:string){
    setQuery(v);
    const t = v.trim();
    if (!t){ setFeed([]); setTopBox([]); setCombina([]); return; }
    fetchSuggest(t);
  }

  function onSubmit(e:React.FormEvent){
    e.preventDefault();
    const t = query.trim(); if (!t || !sessionId) return;
    startStream(t);
  }

  async function startStream(message:string){
    // encerra stream anterior
    if (readerRef.current){ try{ await readerRef.current.cancel(); }catch{} readerRef.current=null; }
    setStreaming('');
    const res = await fetch('/api/assistant/stream', {
      method:'POST',
      headers: { 'Content-Type':'application/json', 'Accept':'text/event-stream', 'x-user-id': uid, 'x-user-name': userName },
      body: JSON.stringify({ sessionId, message, context: null })
    });
    if (!res.ok || !res.body) return;
    const reader = res.body.getReader(); readerRef.current = reader;
    const decoder = new TextDecoder(); let buffer='';
    while(true){
      const { value, done } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream:true });
      const parts = buffer.split('\n\n'); buffer = parts.pop() || '';
      for (const chunk of parts){
        const line = chunk.trim().replace(/^data:\s?/, '');
        try{ const p = JSON.parse(line); if (p.type==='chunk' && p.text) setStreaming(prev=> prev+p.text); }
        catch{ setStreaming(prev=> prev+line); }
      }
    }
  }

  // navegação do card
  function goProduct(p: Product){
    if (p?.id) window.location.href = `/produto/${encodeURIComponent(p.id)}`;
  }

  return (
    <>
      {/* WRAPPER RELATIVE para ancorar */} 
      <div className="w-full relative">
        {/* Barra = chat */}
        <form onSubmit={onSubmit} className="flex items-center gap-2 rounded-2xl px-4 py-2 bg-white shadow border">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white grid place-content-center text-xs">C</div>
          <input
            value={query}
            onChange={e=> onChange(e.target.value)}
            onFocus={onFocus}
            placeholder="Converse com o Click (ex.: iPhone 15 em CDE)"
            className="flex-1 outline-none text-base"
          />
          <button className="px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90" type="submit">Enviar</button>
        </form>

        {/* DROPDOWN ancorado (apenas Chat + 3 recomendados) */}
        {open && (
          <div className="absolute left-0 right-0 top-full mt-2 z-40">
            <div className="mx-auto max-w-5xl grid grid-cols-12 gap-4">
              {/* Chat com scroll */}
              <div className="col-span-12 lg:col-span-9">
                <div className="rounded-2xl border bg-white/90 backdrop-blur p-3 shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Click Assistant</div>
                  <div className="rounded-xl bg-gray-50 border p-3 max-h-[220px] overflow-auto whitespace-pre-wrap">
                    {query ? '' : (greeting ? `${greeting}\n` : '')}
                    {streaming}
                  </div>
                  {loadingSug && <div className="text-xs text-gray-500 mt-2">Buscando ofertas…</div>}
                </div>
              </div>

              {/* 3 recomendados */}
              <div className="col-span-12 lg:col-span-3">
                <Section title="Produtos Recomendados">
                  {topBox.length===0 ? (
                    <div className="text-xs text-gray-500">Converse comigo e eu trago as melhores opções!</div>
                  ) : (
                    <CardsList items={topBox} onClick={goProduct} />
                  )}
                </Section>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AQUI FORA DO DROPDOWN: resto dos resultados e acessórios */}
      <div className="mt-3 mx-auto max-w-5xl">
        <Section title="Resultados">
          <CardsGrid items={feed} onClick={goProduct} />
        </Section>

        {combina.length>0 && (
          <div className="mt-3">
            <Section title="Combina com">
              <CardsGrid items={combina} onClick={goProduct} />
            </Section>
          </div>
        )}
      </div>
    </>
  );
}

function Section({ title, children }: React.PropsWithChildren<{ title:string }>) {
  return (
    <div className="rounded-2xl border bg-white/90 backdrop-blur p-4 shadow-sm">
      <div className="text-sm font-semibold mb-3">{title}</div>
      {children}
    </div>
  );
}
function CardsList({ items, onClick }:{ items:Product[], onClick:(p:Product)=>void }){
  return (
    <div className="grid gap-3">
      {items.slice(0,3).map(p=>(
        <button key={p.id} onClick={()=>onClick(p)} className="text-left p-3 rounded-xl border hover:shadow-sm transition">
          <div className="font-medium truncate mb-1">{p.title}</div>
          <div className="text-xs text-gray-500 mb-2">{p.category || '—'} {p.score!==undefined ? `• score ${p.score}` : ''}</div>
          <div className="text-sm">{p.price?.USD ? <>USD <b>{p.price.USD}</b></> : <span className="text-gray-400">sem preço</span>}</div>
        </button>
      ))}
    </div>
  );
}
function CardsGrid({ items, onClick }:{ items:Product[], onClick:(p:Product)=>void }){
  if (!items?.length) return <div className="text-sm text-gray-500">Nada encontrado…</div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map(p=>(
        <button key={p.id} onClick={()=>onClick(p)} className="text-left p-3 rounded-xl border hover:shadow-sm transition">
          <div className="font-medium truncate mb-1">{p.title}</div>
          <div className="text-xs text-gray-500 mb-2">{p.category || '—'} {p.score!==undefined ? `• score ${p.score}` : ''}</div>
          <div className="text-sm">{p.price?.USD ? <>USD <b>{p.price.USD}</b></> : <span className="text-gray-400">sem preço</span>}</div>
        </button>
      ))}
    </div>
  );
}