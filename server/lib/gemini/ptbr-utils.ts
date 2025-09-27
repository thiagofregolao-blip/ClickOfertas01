// server/lib/gemini/ptbr-utils.ts
// Utilitários de linguagem para PT-BR

/**
 * Normaliza texto em português brasileiro:
 * - Converte para minúscula
 * - Remove acentos
 * - Normaliza espaços
 */
export function normPTBR(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Números por extenso mais comuns em consultas de produtos
 * Inclui variações com "pro", "plus", "ultra"
 */
export const NUM_EXTENSO: Record<string, string> = {
  "doze": "12",
  "doze pro": "12 pro",
  "doze plus": "12 plus",
  "treze": "13", 
  "treze pro": "13 pro",
  "treze plus": "13 plus",
  "quatorze": "14",
  "quatorze pro": "14 pro",
  "quatorze plus": "14 plus",
  "quinze": "15",
  "quinze pro": "15 pro", 
  "quinze plus": "15 plus",
  "dezesseis": "16",
  "dezesseis pro": "16 pro",
  "dezesseis plus": "16 plus",
};

/**
 * Detecta padrões comuns de modelos em português
 * Ex: "linha 12", "modelo 13", "versão 15", "série pro"
 */
export const PADROES_MODELO = [
  /\b(?:linha|modelo|versao|versão|serie|série)\s*(?:do|da|de)?\s*(\d{1,4})(?:\s*(pro|plus|ultra|max|mini))?\b/i,
  /\b(?:da|do)\s*linha\s*(\d{1,4})(?:\s*(pro|plus|ultra|max|mini))?\b/i,
  /\b(?:quero|prefiro|gosto)\s*(?:o|a)?\s*(\d{1,4})(?:\s*(pro|plus|ultra|max|mini))?\b/i,
];

/**
 * Padrões para detectar produtos/marcas
 */
export const PRODUTOS_REGEX = /\b(iphone|apple|galaxy|samsung|xiaomi|motorola|pixel|redmi|poco|oneplus|huawei|lg)\b/i;

/**
 * Detecta intenções de escolha/seleção
 */
export const PADROES_ESCOLHA = [
  /\b(?:quero|escolho|prefiro|gosto|gostei|me interessa|vou levar|esse|essa|este|esta)\b/i,
  /\b(?:da linha|modelo|versao|versão|serie|série)\b/i,
  /\b(?:primeiro|segundo|terceiro|ultimo)\b/i,
  /\b(?:1º|2º|3º|4º|5º)\b/i,
];