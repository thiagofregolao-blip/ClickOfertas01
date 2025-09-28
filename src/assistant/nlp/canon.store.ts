/**
 * Armazenamento do dicionário canônico
 */

import fs from "fs";
import path from "path";

export type CanonData = {
  productCanon: Record<string, string>;
  categoryCanon: Record<string, string>;
  productToCategory: Record<string, string>;
};

let CACHE: CanonData | null = null;

const DEFAULT_CANON: CanonData = {
  productCanon: {
    // Celulares
    "iphone": "iphone",
    "iphones": "iphone", 
    "apple": "iphone",
    "galaxy": "galaxy",
    "samsung": "galaxy",
    "xiaomi": "xiaomi",
    "redmi": "xiaomi",
    "celular": "celular",
    "smartphone": "celular",
    "telefone": "celular",
    
    // Eletrônicos
    "drone": "drone",
    "drones": "drone",
    "dji": "drone",
    "mavic": "drone",
    "tv": "tv",
    "televisor": "tv",
    "televisao": "tv",
    "smart": "smart-tv",
    "notebook": "notebook",
    "laptop": "notebook",
    "computador": "notebook",
    
    // Cosméticos
    "perfume": "perfume",
    "perfumes": "perfume",
    "fragancia": "perfume",
    "colonia": "perfume",
    "maquiagem": "maquiagem",
    "batom": "batom",
    "base": "base",
    
    // Roupas
    "blusa": "blusa",
    "camiseta": "camiseta",
    "camisetas": "camiseta",
    "camisa": "camisa",
    "calcas": "calca",
    "jeans": "jeans",
    "vestido": "vestido",
    
    // Calçados
    "tenis": "tenis",
    "sapato": "sapato",
    "sandalia": "sandalia",
    "bota": "bota",
    
    // Casa
    "geladeira": "geladeira",
    "fogao": "fogao",
    "microondas": "microondas",
    "ar-condicionado": "ar-condicionado",
  },
  
  categoryCanon: {
    "celular": "celular",
    "smartphone": "celular",
    "telefone": "celular",
    "drone": "drone",
    "tv": "tv",
    "televisor": "tv",
    "perfumaria": "perfumaria",
    "cosmetico": "perfumaria",
    "roupa": "roupa",
    "vestuario": "roupa",
    "calcado": "calcado",
    "sapato": "calcado",
    "notebook": "informatica",
    "computador": "informatica",
    "eletrodomestico": "eletrodomestico",
    "casa": "eletrodomestico",
  },
  
  productToCategory: {
    "iphone": "celular",
    "galaxy": "celular",
    "xiaomi": "celular",
    "celular": "celular",
    "drone": "drone",
    "tv": "tv",
    "smart-tv": "tv",
    "perfume": "perfumaria",
    "maquiagem": "perfumaria",
    "batom": "perfumaria",
    "base": "perfumaria",
    "blusa": "roupa",
    "camiseta": "roupa",
    "camisa": "roupa",
    "calca": "roupa",
    "jeans": "roupa",
    "vestido": "roupa",
    "tenis": "calcado",
    "sapato": "calcado",
    "sandalia": "calcado",
    "bota": "calcado",
    "notebook": "informatica",
    "geladeira": "eletrodomestico",
    "fogao": "eletrodomestico",
    "microondas": "eletrodomestico",
    "ar-condicionado": "eletrodomestico",
  }
};

/**
 * Carrega dicionário canônico do arquivo ou retorna padrão
 * @returns Dados canônicos
 */
export function loadCanon(): CanonData {
  if (CACHE) return CACHE;
  
  const canonPath = process.env.CANON_PATH ?? "data/canon.json";
  
  try {
    if (fs.existsSync(path.resolve(canonPath))) {
      const content = fs.readFileSync(path.resolve(canonPath), "utf8");
      CACHE = JSON.parse(content);
      return CACHE!;
    }
  } catch (error) {
    console.warn("Erro carregando canon.json, usando default:", error);
  }
  
  CACHE = DEFAULT_CANON;
  return CACHE;
}

/**
 * Salva dicionário canônico no arquivo
 * @param data - Dados a salvar
 */
export function saveCanon(data: CanonData): void {
  const canonPath = process.env.CANON_PATH ?? "data/canon.json";
  
  try {
    // Garante que o diretório existe
    const dir = path.dirname(path.resolve(canonPath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(path.resolve(canonPath), JSON.stringify(data, null, 2));
    CACHE = data;
  } catch (error) {
    console.error("Erro salvando canon.json:", error);
  }
}

/**
 * Limpa cache forçando recarregamento
 */
export function clearCanonCache(): void {
  CACHE = null;
}