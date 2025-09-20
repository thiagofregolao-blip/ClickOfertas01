// Índice vetorial simples (arquivo) — use DB vetorial depois se quiser escalar.
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { embedText, cosineSim } from './embed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PRODUCTS = path.join(__dirname, '..', 'data', 'products.json');
const EMBED_PATH    = path.join(__dirname, '..', 'data', 'product_embeddings.json');

async function readJson(p){ const raw = await fs.readFile(p,'utf-8'); return JSON.parse(raw); }
async function writeJson(p,d){ await fs.writeFile(p, JSON.stringify(d,null,2),'utf-8'); }

export async function buildIndex() {
  const products = await readJson(DATA_PRODUCTS);
  const out = [];
  for (const p of products) {
    const text = `${p.title}\n${p.description||''}\n${(p.tags||[]).join(', ')}`;
    const vec = await embedText(text);
    out.push({ ...p, vector: vec });
  }
  await writeJson(EMBED_PATH, out);
  return out.length;
}

export async function loadIndex() {
  try { return await readJson(EMBED_PATH); } catch { return []; }
}

export async function ensureIndex() {
  const idx = await loadIndex();
  if (!idx.length) await buildIndex();
  return true;
}

export async function semanticProducts(query, { topK = 6, category, storeId } = {}) {
  const idx = await loadIndex();
  if (!idx.length) throw new Error('Índice vazio. Rode POST /index-products');
  const qvec = await embedText(query);
  const filtered = idx.filter(p =>
    (!category || p.category === category) &&
    (!storeId || p.storeId === storeId)
  );
  const scored = filtered.map(p => ({ p, score: cosineSim(qvec, p.vector) }));
  scored.sort((a,b)=> b.score - a.score);
  return scored.slice(0, topK).map(s => ({ ...s.p, score: Number(s.score.toFixed(4)) }));
}