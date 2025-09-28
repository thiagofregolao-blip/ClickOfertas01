/**
 * Normalização de texto em português/espanhol e utilitários de singularização
 */

/**
 * Normaliza texto removendo acentos, caracteres especiais e padronizando espaços
 * @param s - Texto a ser normalizado
 * @returns Texto normalizado em minúsculas
 */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Singulariza palavras em português/espanhol
 * @param w - Palavra para singularizar
 * @returns Palavra no singular
 */
export function singularPTES(w: string): string {
  const x = w;
  
  // Plurais complexos português
  if (x.endsWith("oes") || x.endsWith("aes")) return x.slice(0, -3) + "ao";
  if (x.endsWith("is")) return x.slice(0, -1) + "l";
  if (x.endsWith("ns")) return x.slice(0, -2) + "m";
  
  // Plurais simples
  if (x.endsWith("es") && x.length > 4) return x.slice(0, -2);
  if (x.endsWith("s") && x.length > 3) return x.slice(0, -1);
  
  return x;
}

/**
 * Tokeniza texto em português/espanhol aplicando normalização e singularização
 * @param s - Texto a ser tokenizado
 * @returns Array de tokens normalizados e singularizados
 */
export function tokensPTES(s: string): string[] {
  return norm(s).split(" ").filter(Boolean).map(singularPTES);
}