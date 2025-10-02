// src/nlp/canon.store.ts
import fs from "fs";
import path from "path";

type CanonData = {
  productCanon: Record<string, string>;
  categoryCanon: Record<string, string>;
  subcategoryCanon: Record<string, string>; // NEW: map word -> subcategory slug
  productToCategory: Record<string, string>;
  productToSubcategory: Record<string, string>; // NEW: product -> subcategory slug
  brands: string[];
  categoryHierarchy: Record<string, string>; // NEW: subcategory slug -> parent category slug
};

// Fallback mínimo — hierarquia completa de categorias
const DEFAULT_CANON = {
  productCanon: {
    iphone: "iphone", iphones: "iphone", apple: "apple",
    galaxy: "galaxy", samsung: "samsung",
    drone: "drone", drones: "drone", dji: "dji", mavic: "drone",
    perfume: "perfume", perfumes: "perfume",
    tv: "tv", televisao: "tv", televisores: "tv", "smart tv": "tv",
    blusa: "blusa", blusas: "blusa",
    notebook: "notebook", notebooks: "notebook", laptop: "notebook",
    tablet: "tablet", tablets: "tablet", ipad: "tablet",
    fone: "fone", fones: "fone", headphone: "fone", airpods: "fone",
    console: "console", playstation: "console", xbox: "console",
    camisa: "camisa", camisas: "camisa",
    tenis: "tenis", sapato: "sapato",
    relogio: "relogio", relógios: "relogio",
    bolsa: "bolsa", bolsas: "bolsa"
  },
  categoryCanon: {
    eletronicos: "eletronicos", eletronico: "eletronicos",
    perfumaria: "perfumaria",
    roupas: "roupas", roupa: "roupas",
    calcados: "calcados",
    acessorios: "acessorios"
  },
  subcategoryCanon: {
    celular: "celular", celulares: "celular", smartphone: "celular", telefonos: "celular",
    notebook: "notebook", notebooks: "notebook", laptop: "notebook",
    tv: "tv", televisao: "tv", televisão: "tv",
    drone: "drone", drones: "drone",
    tablet: "tablet", tablets: "tablet",
    fone: "fone", fones: "fone", headphone: "fone",
    console: "console", consoles: "console",
    perfume: "perfume", perfumes: "perfume",
    blusa: "blusa", blusas: "blusa",
    camisa: "camisa", camisas: "camisa",
    calcas: "calcas", calças: "calcas",
    tenis: "tenis", tênis: "tenis",
    sapato: "sapato", sapatos: "sapato",
    relogio: "relogio", relógio: "relogio",
    bolsa: "bolsa", bolsas: "bolsa"
  },
  productToCategory: {
    iphone: "eletronicos", galaxy: "eletronicos", drone: "eletronicos",
    perfume: "perfumaria", tv: "eletronicos", blusa: "roupas",
    notebook: "eletronicos", tablet: "eletronicos", fone: "eletronicos",
    console: "eletronicos", camisa: "roupas", tenis: "calcados",
    relogio: "acessorios", bolsa: "acessorios"
  },
  productToSubcategory: {
    iphone: "celular", galaxy: "celular", drone: "drone",
    perfume: "perfume", tv: "tv", blusa: "blusa",
    notebook: "notebook", tablet: "tablet", fone: "fone",
    console: "console", camisa: "camisa", tenis: "tenis",
    sapato: "sapato", relogio: "relogio", bolsa: "bolsa"
  },
  brands: ["apple","samsung","dji","motorola","xiaomi","google","lg","sony","dell","hp","lenovo","asus"],
  categoryHierarchy: {
    celular: "eletronicos",
    notebook: "eletronicos",
    tv: "eletronicos",
    drone: "eletronicos",
    tablet: "eletronicos",
    fone: "eletronicos",
    console: "eletronicos",
    perfume: "perfumaria",
    blusa: "roupas",
    camisa: "roupas",
    calcas: "roupas",
    tenis: "calcados",
    sapato: "calcados",
    relogio: "acessorios",
    bolsa: "acessorios"
  }
};

let CACHE: CanonData | null = null;

export function loadCanon(): CanonData {
  if (CACHE) return CACHE;
  try {
    const p = process.env.CANON_PATH
      ? path.resolve(process.env.CANON_PATH)
      : path.resolve(process.cwd(), "data/canon.json");
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, "utf8")) as CanonData;
      const pc = Object.keys(raw.productCanon ?? {}).length;
      const cc = Object.keys(raw.categoryCanon ?? {}).length;
      if (pc > 0 && cc > 0) {
        CACHE = raw;
        console.log(`[canon] carregado de ${p} | produtos=${pc} categorias=${cc}`);
        return CACHE;
      }
      console.warn("[canon] arquivo encontrado mas vazio — usando fallback embutido");
    } else {
      console.warn("[canon] data/canon.json não encontrado — usando fallback embutido");
    }
  } catch (e) {
    console.error("[canon] falha ao ler canon.json — usando fallback embutido", e);
  }
  CACHE = DEFAULT_CANON as CanonData;
  return CACHE;
}

export function canonProduct(token: string): string | null {
  const { productCanon } = loadCanon();
  return productCanon[token] ?? null;
}

export function canonCategory(token: string): string | null {
  const { categoryCanon } = loadCanon();
  return categoryCanon[token] ?? null;
}

export function canonSubcategory(token: string): string | null {
  const { subcategoryCanon } = loadCanon();
  return subcategoryCanon[token] ?? null;
}

export function productDefaultCategory(prod: string): string | null {
  const { productToCategory } = loadCanon();
  return productToCategory[prod] ?? null;
}

export function productDefaultSubcategory(prod: string): string | null {
  const { productToSubcategory } = loadCanon();
  return productToSubcategory[prod] ?? null;
}

export function getParentCategory(subcategorySlug: string): string | null {
  const { categoryHierarchy } = loadCanon();
  return categoryHierarchy[subcategorySlug] ?? null;
}

export function allBrands(): Set<string> {
  return new Set(loadCanon().brands);
}

// Estatísticas para debug
export function getCanonStats() {
  const canon = loadCanon();
  return {
    products: Object.keys(canon.productCanon).length,
    categories: Object.keys(canon.categoryCanon).length,
    mappings: Object.keys(canon.productToCategory).length,
    brands: canon.brands.length
  };
}