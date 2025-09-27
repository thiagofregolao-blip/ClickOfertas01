// src/nlp/canon.store.ts
import fs from "fs";
import path from "path";

type CanonData = {
  productCanon: Record<string, string>;
  categoryCanon: Record<string, string>;
  productToCategory: Record<string, string>;
  brands: string[];
};

let CACHE: CanonData | null = null;

export function loadCanon(): CanonData {
  if (CACHE) return CACHE;
  const p = path.resolve("data/canon.json");
  const raw = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {
    productCanon: {}, categoryCanon: {}, productToCategory: {}, brands: []
  };
  CACHE = raw as CanonData;
  return CACHE!;
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