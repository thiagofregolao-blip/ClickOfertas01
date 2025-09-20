// Lógica regional (CDE/Foz): top lojas (premium-first), produtos em alta, hotéis/restaurantes e roteiro.
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureIndex, semanticProducts, loadIndex } from './vectorStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORES = path.join(__dirname, '..', 'data', 'stores.json');
const HOTELS = path.join(__dirname, '..', 'data', 'hotels.json');
const RESTS  = path.join(__dirname, '..', 'data', 'restaurants.json');

async function readJson(p){ const raw = await fs.readFile(p,'utf-8'); return JSON.parse(raw); }

export async function listStores(){ return await readJson(STORES); }
export async function listHotels(){ return await readJson(HOTELS); }
export async function listRestaurants(){ return await readJson(RESTS); }

/** Top lojas por categoria: slots Patrocinados + orgânico com boost de plano */
export async function topStores({ category, limit = 5 }) {
  const stores = await listStores();
  const now = new Date().toISOString();
  const sponsored = stores.filter(s =>
    s.sponsored && (!s.sponsored_until || s.sponsored_until >= now) &&
    (!category || (s.categories||[]).includes(category))
  );
  const organic = stores.filter(s => !s.sponsored && (!category || (s.categories||[]).includes(category)));

  function baseScore(s){ return (s.rating || 0) + Math.min((s.reviews||0)/1000, 1); }
  function withBoost(s){
    const boost = s.boost ?? (s.plan === 'premium' ? 0.3 : s.plan === 'enterprise' ? 0.6 : 0);
    return baseScore(s) * (1 + boost);
  }

  sponsored.sort((a,b)=> withBoost(b) - withBoost(a));
  organic.sort((a,b)=> withBoost(b) - withBoost(a));

  const topSponsored = sponsored.slice(0, Math.min(2, limit));
  const remaining = Math.max(0, limit - topSponsored.length);
  const topOrganic = organic.slice(0, remaining);

  return [
    ...topSponsored.map(s => ({ ...s, label: "Patrocinado" })),
    ...topOrganic.map(s => ({ ...s, label: s.plan === 'premium' ? "Premium" : undefined }))
  ];
}

/** Produtos em alta (MVP): rating + bônus se a loja é premium */
export async function trendingProducts({ category, limit = 6 }) {
  await ensureIndex();
  const idx = await loadIndex();
  let items = idx;
  if (category) items = items.filter(p => p.category === category);
  const storeMap = new Map((await listStores()).map(s => [s.id, s]));
  items.sort((a,b)=>{
    const sa = storeMap.get(a.storeId); const sb = storeMap.get(b.storeId);
    const ba = (a.rating||0) + ((sa?.plan==='premium') ? 0.2 : 0);
    const bb = (b.rating||0) + ((sb?.plan==='premium') ? 0.2 : 0);
    return bb - ba;
  });
  return items.slice(0, limit);
}

/** Categoria por heurística simples a partir do texto */
function guessCategory(q) {
  const t = (q||'').toLowerCase();
  if (/(iphone|iphone 1[0-9]|samsung|galaxy|xiaomi|celular|smartphone)/.test(t)) return 'eletronicos';
  if (/(fone|headphone|jbl|sony|audio|soundbar)/.test(t)) return 'audio';
  if (/(perfume|eau|parfum|cosm[eé]ticos)/.test(t)) return 'perfumes';
  return undefined;
}

/** Sugestões combinadas para a barra de busca */
export async function searchSuggestions(q) {
  const qClean = (q||'').trim();
  const categoryHint = guessCategory(qClean);
  const [tops, trends] = await Promise.all([
    topStores({ category: categoryHint, limit: 5 }),
    qClean ? semanticProducts(qClean, { topK: 6, category: categoryHint }) : trendingProducts({ category: categoryHint, limit: 6 })
  ]);
  return { category: categoryHint, topStores: tops, products: trends };
}

/** Roteiro resumido (sem reserva) */
export async function buildItinerary({ wishlist = [] }) {
  const categories = Array.from(new Set(wishlist.map(w => w.category).filter(Boolean)));
  const storeBlocks = [];
  for (const c of categories) storeBlocks.push({ category: c, stores: await topStores({ category: c, limit: 3 }) });

  const hotels = await listHotels();
  const hotelsSorted = [...hotels].sort((a,b)=> (b.boost||0) - (a.boost||0)); // premium primeiro

  const restaurants = await listRestaurants();
  const restSorted = [...restaurants].sort((a,b)=> (b.rating||0) - (a.rating||0));

  const timeline = [
    { period: "manhã",   focus: categories[0] || "compras", note: "Comece pelos itens mais disputados (eletrônicos/perfumes)." },
    { period: "almoço",  focus: "gastronomia", suggestion: restSorted.slice(0,1) },
    { period: "tarde",   focus: categories[1] || "compras", note: "Finalize lembranças e itens menores próximos à saída." }
  ];

  return {
    summary: "Roteiro regional em CDE/Foz baseado na sua lista.",
    timeline,
    storeBlocks,
    hotels: hotelsSorted.slice(0,3),
    tips: [
      "Prefira lojas formais (nota fiscal/garantia).",
      "Pague no PDV oficial; evite QR/links de terceiros.",
      "Verifique lacres/IMEI em eletrônicos. Compare câmbio efetivo."
    ]
  };
}