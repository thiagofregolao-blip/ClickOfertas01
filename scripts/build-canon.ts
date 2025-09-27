// scripts/build-canon.ts
import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq } from "drizzle-orm";
import { products } from "../shared/schema.js";

// Espera produtos do banco: { id, name, category, brand }
type Item = { id: string; name: string; category: string; brand?: string | null };

const OUT = path.resolve("data/canon.json");

const stop = new Set([
  "de","da","do","para","com","sem","e","ou","the","a","an",
  "para","por","con","sin","y","o","la","el","los","las",
  "pro","max","ultra","plus","mini","air","studio","series"
]);

// normaliza PT/ES
function norm(s: string) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ").trim();
}

// singular simples PT/ES
function singular(w: string) {
  const x = norm(w);
  if (x.endsWith("oes") || x.endsWith("aes")) return x.slice(0, -3) + "ao";
  if (x.endsWith("is")) return x.slice(0, -1) + "l";
  if (x.endsWith("ns")) return x.slice(0, -2) + "m";
  if (x.endsWith("es") && x.length > 4) return x.slice(0, -2);
  if (x.endsWith("s") && x.length > 3) return x.slice(0, -1);
  return x;
}

// tokeniza e remove stopwords
function toks(s: string) { 
  return norm(s).split(" ").filter(t => t && !stop.has(t)); 
}

function headNoun(name: string) {
  // heurística: primeiro token não-marcas/stop + segundo se for número/série
  const ts = toks(name);
  if (!ts.length) return null;
  return singular(ts[0]);
}

async function build() {
  const db = drizzle(process.env.DATABASE_URL!);
  const raw = await db.select({
    id: products.id,
    name: products.name,
    category: products.category,
    brand: products.brand
  }).from(products).where(eq(products.isActive, true));

  const productCanon: Record<string, string> = {};
  const categoryCanon: Record<string, string> = {};
  const productToCategory: Record<string, string> = {};
  const brands = new Set<string>();
  const votes: Record<string, Record<string, number>> = {}; // product -> {cat:count}

  console.log(`🔍 Processando ${raw.length} produtos...`);

  for (const it of raw) {
    const nome = it.name ?? "";
    const cat = singular(it.category ?? "");
    if (!cat) continue;

    categoryCanon[cat] = cat; // canônico
    const h = headNoun(nome);
    if (!h) continue;

    // sinônimos: plural e variações simples do nome
    const tks = toks(nome).map(singular);
    for (const t of tks) {
      if (t.length < 2) continue;
      productCanon[t] = h;
    }

    // votação de categoria por produto canônico
    votes[h] ??= {};
    votes[h][cat] = (votes[h][cat] ?? 0) + 1;

    if (it.brand) brands.add(norm(it.brand));
  }

  // majority vote
  for (const p of Object.keys(votes)) {
    const entry = votes[p];
    const top = Object.entries(entry).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (top) productToCategory[p] = top;
  }

  const out = {
    productCanon,
    categoryCanon,
    productToCategory,
    brands: Array.from(brands)
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  
  console.log(`✅ canon.json gerado com:`);
  console.log(`   📦 ${Object.keys(productCanon).length} termos de produtos`);
  console.log(`   📂 ${Object.keys(categoryCanon).length} categorias`);
  console.log(`   🏷️ ${Object.keys(productToCategory).length} mapeamentos produto→categoria`);
  console.log(`   🏢 ${brands.size} marcas`);
}

build().catch(console.error);