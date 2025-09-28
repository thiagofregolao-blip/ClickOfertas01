/**
 * Normalização de texto PT/ES para IA Vendedor
 */

/**
 * Normaliza texto removendo acentos e caracteres especiais
 * @param text - Texto a normalizar
 * @returns Texto normalizado
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Singulariza palavras em PT/ES
 * @param word - Palavra a singularizar
 * @returns Palavra no singular
 */
export function singularizePTES(word: string): string {
  const w = word.toLowerCase();
  
  // Regras específicas PT/ES
  if (w.endsWith("ões") || w.endsWith("aes")) return w.slice(0, -3) + "ao";
  if (w.endsWith("is")) return w.slice(0, -1) + "l";
  if (w.endsWith("ns")) return w.slice(0, -2) + "m";
  if (w.endsWith("es") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("s") && w.length > 3) return w.slice(0, -1);
  
  return w;
}

/**
 * Tokeniza texto em PT/ES aplicando normalização e singularização
 * @param text - Texto a tokenizar
 * @returns Array de tokens normalizados
 */
export function tokensPTES(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter(Boolean)
    .map(singularizePTES);
}

/**
 * Remove stop words comuns em PT/ES
 * @param tokens - Array de tokens
 * @returns Tokens sem stop words
 */
export function removeStopWords(tokens: string[]): string[] {
  const stopWords = new Set([
    // PT
    "o", "a", "os", "as", "um", "uma", "uns", "umas",
    "de", "da", "do", "das", "dos", "em", "na", "no", "nas", "nos",
    "por", "para", "com", "sem", "sobre", "entre", "ate", "desde",
    "e", "ou", "mas", "que", "se", "quando", "onde", "como",
    "eu", "tu", "ele", "ela", "nos", "vos", "eles", "elas",
    "meu", "minha", "seus", "suas", "nosso", "nossa",
    "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas",
    "aquele", "aquela", "aqueles", "aquelas",
    "muito", "mais", "menos", "bem", "mal", "melhor", "pior",
    
    // ES
    "el", "la", "los", "las", "un", "una", "unos", "unas",
    "del", "al", "en", "con", "sin", "sobre", "entre", "hasta", "desde",
    "y", "o", "pero", "que", "si", "cuando", "donde", "como",
    "yo", "tu", "el", "ella", "nosotros", "vosotros", "ellos", "ellas",
    "mi", "tu", "su", "nuestro", "vuestro",
    "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas",
    "aquel", "aquella", "aquellos", "aquellas",
    "muy", "mas", "menos", "bien", "mal", "mejor", "peor",
  ]);
  
  return tokens.filter(token => !stopWords.has(token));
}