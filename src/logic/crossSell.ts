// src/logic/crossSell.ts
import { productDefaultCategory } from "../nlp/canon.store";

// Cross-sell genérico por categoria (escala automaticamente)
export const ACCESSORIES_BY_CATEGORY: Record<string, string[]> = {
  celular: ["capinha", "película", "carregador turbo", "fones bluetooth", "power bank", "cabo usb-c"],
  celulares: ["capinha", "película", "carregador turbo", "fones bluetooth", "power bank", "cabo usb-c"],
  drone: ["bateria extra", "hélices", "case rígido", "cartão sd", "hub de carga", "protetor de hélices"],
  drones: ["bateria extra", "hélices", "case rígido", "cartão sd", "hub de carga", "protetor de hélices"],
  perfume: ["kit presente", "necessaire", "miniatura"],
  perfumes: ["kit presente", "necessaire", "miniatura"],
  perfumaria: ["kit presente", "necessaire", "miniatura"],
  tv: ["soundbar", "suporte parede", "cabo hdmi", "controle universal"],
  tvs: ["soundbar", "suporte parede", "cabo hdmi", "controle universal"],
  televisao: ["soundbar", "suporte parede", "cabo hdmi", "controle universal"],
  roupa: ["cinto", "bolsa", "meia-calça", "lenço", "organizador de armário"],
  roupas: ["cinto", "bolsa", "meia-calça", "lenço", "organizador de armário"],
  moda: ["cinto", "bolsa", "meia-calça", "lenço", "organizador de armário"],
  // outras categorias genéricas
  eletronica: ["cabo", "adaptador", "extensão", "protetor"],
  eletronicos: ["cabo", "adaptador", "extensão", "protetor"],
  informatica: ["mouse", "teclado", "cabo usb", "hub usb"],
  cosmetico: ["pincel", "espelho", "necessaire", "removedor"],
  cosmeticos: ["pincel", "espelho", "necessaire", "removedor"],
  bebida: ["abridor", "dosador", "ice bucket", "copos"],
  bebidas: ["abridor", "dosador", "ice bucket", "copos"]
};

export function accessoriesForCategory(cat?: string): string[] {
  return ACCESSORIES_BY_CATEGORY[cat ?? ""] ?? [];
}

// Resolver de categoria para acessórios usando sistema dinâmico
export function resolveAccessoryCategory(query: { produto?: string; categoria?: string }): string | null {
  // 1. Se categoria existe e é válida, usar ela
  if (query.categoria && ACCESSORIES_BY_CATEGORY[query.categoria]) {
    return query.categoria;
  }
  
  // 2. Se produto existe, mapear para categoria via sistema dinâmico
  if (query.produto) {
    const mappedCat = productDefaultCategory(query.produto);
    if (mappedCat && ACCESSORIES_BY_CATEGORY[mappedCat]) {
      return mappedCat;
    }
  }
  
  // 3. Fallback: categoria mesmo que não tenha acessórios
  return query.categoria ?? null;
}

export function nextAccessorySuggestion(cat?: string, already: string[] = []): string[] {
  if (!cat) return [];
  const pool = ACCESSORIES_BY_CATEGORY[cat] ?? [];
  return pool.filter(x => !already.includes(x)).slice(0, 2);
}