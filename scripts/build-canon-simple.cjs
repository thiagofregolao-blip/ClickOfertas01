// scripts/build-canon-simple.cjs
const fs = require("fs");
const path = require("path");

// Dados CSV exportados truncados para exemplo
const csvMini = `id,name,category,brand
cell-001,iPhone 15 128GB,Celulares,
776775aa-ce8c-41d5-b14d-d6203661ca1c,Apple IPHONE 12 PRO MAX A2411 256GB GOLD CPO,Celulares,Apple
96461aa0-9cfb-4d9d-b921-972b47437274,Perfume Lattafa Yara EDP 100ml,Perfumaria,
19ca7dca-4f7f-49f8-88a9-fa32a22f18bb,Whisky Johnnie Walker Red Label 750ml,Bebidas,
elet-001,Notebook Dell I3530-5623BLK-PUS,Eletrônicos,
0fc05ece-da90-4961-ab36-4c62ca5790c8,Calça Jeans Masculina,Geral,
elet-003,Drone Syma W3 Câmera 2K WiFi GPS,Eletrônicos,
68d71999-0671-47c0-bed6-d2967c3d1d17,Jaqueta Jeans Feminina,Geral,
ff07b1b0-3574-40df-8ff9-c66a8b6cc5b0,Bolsa Transversal,Geral,
d2efa245-2e59-4e3b-9b56-4ac80b6fbbac,Vestido Festa Longo Bordado,Geral,
c099c30d-07ca-4196-a0e2-ffb58af52e9a,Blusa Social Feminina,Geral,
b1ea2867-a81b-4f2a-91fe-b0fd9b0b7237,Blush Tarte Amazonian Clay Paaarty,Cosméticos`;

const OUT = path.resolve("data/canon.json");

const stop = new Set([
  "de","da","do","para","com","sem","e","ou","the","a","an",
  "para","por","con","sin","y","o","la","el","los","las",
  "pro","max","ultra","plus","mini","air","studio","series"
]);

// normaliza PT/ES
function norm(s) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ").trim();
}

// singular simples PT/ES
function singular(w) {
  const x = norm(w);
  if (x.endsWith("oes") || x.endsWith("aes")) return x.slice(0, -3) + "ao";
  if (x.endsWith("is")) return x.slice(0, -1) + "l";
  if (x.endsWith("ns")) return x.slice(0, -2) + "m";
  if (x.endsWith("es") && x.length > 4) return x.slice(0, -2);
  if (x.endsWith("s") && x.length > 3) return x.slice(0, -1);
  return x;
}

// tokeniza e remove stopwords
function toks(s) { 
  return norm(s).split(" ").filter(t => t && !stop.has(t)); 
}

function headNoun(name) {
  // heurística: primeiro token não-marcas/stop + segundo se for número/série
  const ts = toks(name);
  if (!ts.length) return null;
  return singular(ts[0]);
}

function parseCsv(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    data.push(obj);
  }
  
  return data;
}

function build() {
  const raw = parseCsv(csvMini);

  const productCanon = {};
  const categoryCanon = {};
  const productToCategory = {};
  const brands = new Set();
  const votes = {}; // product -> {cat:count}

  console.log(`🔍 Processando ${raw.length} produtos...`);

  for (const it of raw) {
    const nome = it.name || "";
    const cat = singular(it.category || "");
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
    votes[h] = votes[h] || {};
    votes[h][cat] = (votes[h][cat] || 0) + 1;

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

build();