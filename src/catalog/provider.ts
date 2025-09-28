/**
 * Provider abstrato para catálogo de produtos
 * Suporta JSON local, HTTP API e PostgreSQL
 */

import fs from "fs";
import path from "path";
import type { CatalogItem } from "../assistant/types.js";
import { storage } from "../../server/storage.js";

export interface CatalogProvider {
  load(): Promise<CatalogItem[]>;
}

/**
 * Provider para catálogo JSON local
 */
export class JsonCatalogProvider implements CatalogProvider {
  constructor(private jsonPath: string) {}
  
  async load(): Promise<CatalogItem[]> {
    try {
      const fullPath = path.resolve(this.jsonPath);
      const content = fs.readFileSync(fullPath, "utf8");
      return JSON.parse(content) as CatalogItem[];
    } catch (error) {
      console.error("Erro carregando catálogo JSON:", error);
      return [];
    }
  }
}

/**
 * Provider para catálogo via HTTP API
 */
export class HttpCatalogProvider implements CatalogProvider {
  constructor(private url: string) {}
  
  async load(): Promise<CatalogItem[]> {
    try {
      const response = await fetch(this.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json() as CatalogItem[];
    } catch (error) {
      console.error("Erro carregando catálogo HTTP:", error);
      return [];
    }
  }
}

/**
 * Provider para catálogo PostgreSQL (produtos reais do app)
 */
export class PostgreSQLCatalogProvider implements CatalogProvider {
  async load(): Promise<CatalogItem[]> {
    try {
      // Carrega produtos ativos do banco
      const products = await storage.getAllProducts();
      
      // Converte para formato CatalogItem
      return products
        .filter(p => p.isActive)
        .map(product => ({
          id: product.id,
          title: product.name,
          category: product.category || "geral",
          brand: product.brand || undefined,
          price: product.price ? parseFloat(product.price) : undefined,
          currency: "Gs.", // Moeda padrão Paraguay
          in_stock: product.isActive || undefined, // Assume que ativo = em estoque
          attrs: this.extractAttributes(product)
        }));
        
    } catch (error) {
      console.error("Erro carregando catálogo PostgreSQL:", error);
      return [];
    }
  }
  
  /**
   * Extrai atributos do produto para busca
   * @param product - Produto do banco
   * @returns Array de atributos
   */
  private extractAttributes(product: any): string[] {
    const attrs: string[] = [];
    
    // Adiciona informações básicas
    if (product.brand) attrs.push(product.brand.toLowerCase());
    if (product.category) attrs.push(product.category.toLowerCase());
    
    // Extrai atributos da descrição se disponível
    if (product.description) {
      const desc = product.description.toLowerCase();
      
      // Capacidade de armazenamento
      const storageMatch = desc.match(/\b(\d+)\s*(gb|mb|tb)\b/gi);
      if (storageMatch) {
        attrs.push(...storageMatch.map((m: string) => m.toLowerCase()));
      }
      
      // Cores
      const colorMatch = desc.match(/\b(preto|branco|azul|vermelho|verde|amarelo|rosa|roxo|dourado|prata|cinza)\b/gi);
      if (colorMatch) {
        attrs.push(...colorMatch.map((m: string) => m.toLowerCase()));
      }
      
      // Tamanhos
      const sizeMatch = desc.match(/\b(pp|p|m|g|gg|xgg|xs|s|l|xl|xxl)\b/gi);
      if (sizeMatch) {
        attrs.push(...sizeMatch.map((m: string) => m.toLowerCase()));
      }
    }
    
    // Remove duplicatas
    return Array.from(new Set(attrs));
  }
}

/**
 * Provider híbrido que combina múltiplas fontes
 */
export class HybridCatalogProvider implements CatalogProvider {
  constructor(private providers: CatalogProvider[]) {}
  
  async load(): Promise<CatalogItem[]> {
    const results: CatalogItem[] = [];
    
    for (const provider of this.providers) {
      try {
        const items = await provider.load();
        results.push(...items);
      } catch (error) {
        console.error("Erro em provider híbrido:", error);
        // Continua com outros providers
      }
    }
    
    // Remove duplicatas por ID
    const unique = new Map<string, CatalogItem>();
    for (const item of results) {
      unique.set(item.id, item);
    }
    
    return Array.from(unique.values());
  }
}

/**
 * Provider com cache para melhor performance
 */
export class CachedCatalogProvider implements CatalogProvider {
  private cache: CatalogItem[] | null = null;
  private cacheTimestamp = 0;
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutos
  
  constructor(private baseProvider: CatalogProvider) {}
  
  async load(): Promise<CatalogItem[]> {
    const now = Date.now();
    
    // Retorna cache se ainda válido
    if (this.cache && (now - this.cacheTimestamp) < this.cacheTTL) {
      return this.cache;
    }
    
    // Carrega dados frescos
    try {
      this.cache = await this.baseProvider.load();
      this.cacheTimestamp = now;
      return this.cache;
    } catch (error) {
      console.error("Erro carregando catálogo, usando cache antigo:", error);
      return this.cache || [];
    }
  }
  
  /**
   * Limpa cache forçando reload
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}

/**
 * Factory para criar provider baseado na configuração
 * @returns Provider configurado
 */
export function makeCatalogProvider(): CatalogProvider {
  const source = process.env.CATALOG_SOURCE ?? "postgresql";
  
  let baseProvider: CatalogProvider;
  
  switch (source) {
    case "json":
      const jsonPath = process.env.CATALOG_PATH ?? "data/catalogo.sample.json";
      baseProvider = new JsonCatalogProvider(jsonPath);
      break;
      
    case "http":
      const url = process.env.CATALOG_URL;
      if (!url) {
        throw new Error("CATALOG_URL é obrigatório para source=http");
      }
      baseProvider = new HttpCatalogProvider(url);
      break;
      
    case "postgresql":
      baseProvider = new PostgreSQLCatalogProvider();
      break;
      
    case "hybrid":
      // Combina PostgreSQL + JSON fallback
      const fallbackPath = process.env.CATALOG_FALLBACK_PATH ?? "data/catalogo.sample.json";
      baseProvider = new HybridCatalogProvider([
        new PostgreSQLCatalogProvider(),
        new JsonCatalogProvider(fallbackPath)
      ]);
      break;
      
    default:
      console.warn(`CATALOG_SOURCE '${source}' desconhecido, usando postgresql`);
      baseProvider = new PostgreSQLCatalogProvider();
  }
  
  // Sempre adiciona cache por performance
  return new CachedCatalogProvider(baseProvider);
}

/**
 * Testa conectividade do provider
 * @param provider - Provider a testar
 * @returns Promise<boolean>
 */
export async function testProvider(provider: CatalogProvider): Promise<boolean> {
  try {
    const items = await provider.load();
    return Array.isArray(items);
  } catch {
    return false;
  }
}

/**
 * Obtém estatísticas do catálogo
 * @param provider - Provider a analisar
 * @returns Estatísticas
 */
export async function getCatalogStats(provider: CatalogProvider): Promise<{
  totalItems: number;
  inStockItems: number;
  categories: string[];
  brands: string[];
  priceRange: { min: number; max: number } | null;
}> {
  try {
    const items = await provider.load();
    
    const categories = Array.from(new Set(items.map(i => i.category))).sort();
    const brands = Array.from(new Set(items.map(i => i.brand).filter(Boolean) as string[])).sort();
    const inStockItems = items.filter(i => i.in_stock).length;
    
    const pricesWithValues = items.map(i => i.price).filter(p => typeof p === "number") as number[];
    const priceRange = pricesWithValues.length > 0 ? {
      min: Math.min(...pricesWithValues),
      max: Math.max(...pricesWithValues)
    } : null;
    
    return {
      totalItems: items.length,
      inStockItems,
      categories,
      brands,
      priceRange
    };
  } catch (error) {
    console.error("Erro obtendo estatísticas do catálogo:", error);
    return {
      totalItems: 0,
      inStockItems: 0,
      categories: [],
      brands: [],
      priceRange: null
    };
  }
}