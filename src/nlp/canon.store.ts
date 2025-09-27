// src/nlp/canon.store.ts
import fs from "fs";
import path from "path";

type CanonData = {
  productCanon: Record<string, string>;
  categoryCanon: Record<string, string>;
  productToCategory: Record<string, string>;
  brands: string[];
};

// Fallback mínimo — não deixe o sistema cego se o canon.json não carregar
const DEFAULT_CANON = {
  productCanon: {
    iphone: "iphone", iphones: "iphone", apple: "iphone",
    galaxy: "galaxy", samsung: "galaxy",
    drone: "drone", drones: "drone", dji: "drone", mavic: "drone",
    perfume: "perfume", perfumes: "perfume",
    tv: "tv", televisao: "tv", televisores: "tv",
    blusa: "blusa", blusas: "blusa"
  },
  categoryCanon: {
    celular: "celular", smartphone: "celular", telefonos: "celular",
    drone: "drone", tv: "tv", perfumaria: "perfumaria",
    roupa: "roupa"
  },
  productToCategory: {
    iphone: "celular", galaxy: "celular", drone: "drone",
    perfume: "perfumaria", tv: "tv", blusa: "roupa"
  },
  brands: ["apple","samsung","dji","motorola","xiaomi","google"]
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

export function productDefaultCategory(prod: string): string | null {
  const { productToCategory } = loadCanon();
  return productToCategory[prod] ?? null;
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