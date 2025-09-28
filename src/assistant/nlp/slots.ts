/**
 * Extração de slots (modelo, GB, cor, atributos)
 */

import { normalize } from "./normalize.js";

export type SlotExtraction = {
  modelo?: string;
  attrs: string[];
  gb?: string;
  cor?: string;
};

// Padrões para extração de slots
const PATTERNS = {
  // Modelos de celular
  modelo: /\b(iphone\s*(?:1[0-5]|[4-9])|galaxy\s*[a-z0-9]+|redmi\s*[a-z0-9]+|mi\s*[a-z0-9]+)\b/gi,
  
  // Capacidade de armazenamento
  storage: /\b(\d+)\s*(gb|mb|tb)\b/gi,
  
  // Cores
  cor: /\b(preto|branco|azul|vermelho|verde|amarelo|rosa|roxo|dourado|prata|cinza|black|white|blue|red|green|yellow|pink|purple|gold|silver|gray|grey)\b/gi,
  
  // Tamanhos de roupa
  tamanho: /\b(pp|p|m|g|gg|xgg|xs|s|l|xl|xxl|xxxl|\d{2,3})\b/gi,
  
  // Voltagem
  voltagem: /\b(110v|220v|bivolt)\b/gi,
  
  // Especificações técnicas
  resolucao: /\b(4k|full\s*hd|hd|1080p|720p|2k)\b/gi,
  
  // Marcas comuns
  marca: /\b(samsung|apple|xiaomi|lg|sony|philips|dell|hp|lenovo|asus|acer|motorola|huawei|realme|poco)\b/gi,
};

/**
 * Extrai modelo, GB, cor e outros atributos de uma mensagem
 * @param message - Mensagem do usuário
 * @returns Slots extraídos
 */
export function extractModeloGBCor(message: string): SlotExtraction {
  const normalized = normalize(message);
  const result: SlotExtraction = { attrs: [] };
  
  // Extrai modelo
  const modeloMatch = message.match(PATTERNS.modelo);
  if (modeloMatch) {
    result.modelo = modeloMatch[0].toLowerCase().replace(/\s+/g, " ").trim();
    result.attrs.push(result.modelo);
  }
  
  // Extrai capacidade de armazenamento
  const storageMatch = message.match(PATTERNS.storage);
  if (storageMatch) {
    result.gb = storageMatch[0].toLowerCase();
    result.attrs.push(result.gb);
  }
  
  // Extrai cor
  const corMatch = message.match(PATTERNS.cor);
  if (corMatch) {
    result.cor = corMatch[0].toLowerCase();
    result.attrs.push(result.cor);
  }
  
  // Extrai tamanho
  const tamanhoMatch = message.match(PATTERNS.tamanho);
  if (tamanhoMatch) {
    result.attrs.push(tamanhoMatch[0].toLowerCase());
  }
  
  // Extrai voltagem
  const voltagemMatch = message.match(PATTERNS.voltagem);
  if (voltagemMatch) {
    result.attrs.push(voltagemMatch[0].toLowerCase());
  }
  
  // Extrai resolução
  const resolucaoMatch = message.match(PATTERNS.resolucao);
  if (resolucaoMatch) {
    result.attrs.push(resolucaoMatch[0].toLowerCase().replace(/\s+/g, ""));
  }
  
  // Extrai marca
  const marcaMatch = message.match(PATTERNS.marca);
  if (marcaMatch) {
    result.attrs.push(marcaMatch[0].toLowerCase());
  }
  
  // Remove duplicatas
  result.attrs = Array.from(new Set(result.attrs));
  
  return result;
}

/**
 * Extrai apenas capacidade de armazenamento
 * @param message - Mensagem do usuário
 * @returns Capacidade em GB ou null
 */
export function extractStorageOnly(message: string): string | null {
  const match = message.match(PATTERNS.storage);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Extrai apenas cor
 * @param message - Mensagem do usuário
 * @returns Cor ou null
 */
export function extractColorOnly(message: string): string | null {
  const match = message.match(PATTERNS.cor);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Extrai apenas modelo
 * @param message - Mensagem do usuário
 * @returns Modelo ou null
 */
export function extractModelOnly(message: string): string | null {
  const match = message.match(PATTERNS.modelo);
  return match ? match[0].toLowerCase().replace(/\s+/g, " ").trim() : null;
}

/**
 * Valida se um atributo é válido para determinado produto
 * @param produto - Nome do produto
 * @param atributo - Atributo a validar
 * @returns Se é válido ou não
 */
export function isValidAttribute(produto: string, atributo: string): boolean {
  const produtoNorm = produto.toLowerCase();
  const atributoNorm = atributo.toLowerCase();
  
  // Regras específicas por produto
  if (produtoNorm.includes("iphone") || produtoNorm.includes("celular")) {
    // Para celulares: modelo, GB, cor são válidos
    return PATTERNS.modelo.test(atributo) || 
           PATTERNS.storage.test(atributo) || 
           PATTERNS.cor.test(atributo);
  }
  
  if (produtoNorm.includes("tv")) {
    // Para TVs: resolução, voltagem, marca são válidos
    return PATTERNS.resolucao.test(atributo) || 
           PATTERNS.voltagem.test(atributo) || 
           PATTERNS.marca.test(atributo);
  }
  
  if (produtoNorm.includes("roupa") || produtoNorm.includes("blusa") || produtoNorm.includes("camisa")) {
    // Para roupas: tamanho, cor são válidos
    return PATTERNS.tamanho.test(atributo) || 
           PATTERNS.cor.test(atributo);
  }
  
  // Default: cor é sempre válida
  return PATTERNS.cor.test(atributo);
}

/**
 * Obtém sugestões de atributos para um produto
 * @param produto - Nome do produto
 * @returns Array de sugestões
 */
export function getSuggestedAttributes(produto: string): string[] {
  const produtoNorm = produto.toLowerCase();
  
  if (produtoNorm.includes("iphone")) {
    return ["64gb", "128gb", "256gb", "preto", "branco", "azul"];
  }
  
  if (produtoNorm.includes("tv")) {
    return ["4k", "full hd", "55 polegadas", "65 polegadas", "smart"];
  }
  
  if (produtoNorm.includes("notebook")) {
    return ["8gb ram", "16gb ram", "ssd", "i5", "i7"];
  }
  
  if (produtoNorm.includes("roupa")) {
    return ["p", "m", "g", "preto", "branco", "azul"];
  }
  
  return ["preto", "branco"];
}