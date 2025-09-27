// src/logic/crossSell.ts
export const ACCESSORIES_BY_CATEGORY: Record<string, string[]> = {
  celular: ["capinha", "película", "carregador turbo", "fones bluetooth", "power bank", "cabo usb-c"],
  drone: ["bateria extra", "hélices", "case rígido", "cartão sd", "hub de carga", "protetor de hélices"],
  perfume: ["kit presente", "necessaire", "miniatura"],
  tv: ["soundbar", "suporte parede", "cabo hdmi", "controle universal"],
};

export function nextAccessorySuggestion(cat?: string, already: string[] = []): string[] {
  if (!cat) return [];
  const pool = ACCESSORIES_BY_CATEGORY[cat] ?? [];
  return pool.filter(x => !already.includes(x)).slice(0, 2);
}