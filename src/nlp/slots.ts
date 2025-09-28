/**
 * Extração de slots (atributos específicos) de produtos
 */

import { tokensPTES } from "./normalize.js";

export type ProductSlots = {
  modelo?: string;
  capacidade?: string;
  cor?: string;
  attrs: string[];
};

/**
 * Extrai modelo, capacidade (GB), cor e outros atributos da mensagem
 * @param msg - Mensagem do usuário
 * @returns Objeto com slots extraídos
 */
export function extractModeloGBCor(msg: string): ProductSlots {
  const toks = tokensPTES(msg);
  const msgLower = msg.toLowerCase();
  
  // Extrai modelo (números de 2 dígitos: 12, 13, 15, 55 para polegadas)
  const modelo = toks.find(t => /^\d{2}$/.test(t)) || undefined;
  
  // Extrai capacidade de armazenamento (64gb, 128gb, 256gb, etc)
  const capacidade = toks.find(t => /^\d{2,3}gb$/.test(t)) || undefined;
  
  // Lista de cores suportadas
  const cores = [
    "preto", "preta", "negro", "negra",
    "branco", "branca", "blanco", "blanca", 
    "azul", "azul marinho",
    "roxo", "verde", "rosa", "dourado", "prata"
  ];
  
  const cor = cores.find(c => msgLower.includes(c)) as string | undefined;
  
  // Monta array de atributos
  const attrs: string[] = [];
  
  if (capacidade) attrs.push(capacidade);
  if (modelo && Number(modelo) === 55) attrs.push("55"); // TV 55"
  if (/4k\b/i.test(msg)) attrs.push("4k");
  if (/masculin/i.test(msg)) attrs.push("masculino");
  if (/feminin/i.test(msg)) attrs.push("feminino");
  
  // Normaliza cor para atributo
  if (cor) {
    if (cor.includes("preto") || cor.includes("negro")) {
      attrs.push("preto");
    } else if (cor.includes("branc")) {
      attrs.push("branco");
    } else {
      attrs.push(cor);
    }
  }
  
  // Tamanhos de roupa
  const tamanhos = ["pp", "p", "m", "g", "gg", "xg", "xxg"];
  const tamanho = tamanhos.find(t => new RegExp(`\\b${t}\\b`, "i").test(msg));
  if (tamanho) attrs.push(tamanho.toLowerCase());
  
  return { modelo, capacidade, cor, attrs };
}