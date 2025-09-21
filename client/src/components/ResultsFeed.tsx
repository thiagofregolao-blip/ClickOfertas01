import React from 'react';
type Product = { id:string; title:string; category?:string; price?:{ USD?: number }, score?:number };

export default function ResultsFeed({ items }: { items: Product[] }){
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