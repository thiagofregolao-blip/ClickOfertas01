/**
 * Tipos centralizados do IA Vendedor
 * Importa e re-exporta tipos do schema principal
 */

import type { SortKey, QuerySignal, CatalogItem, Intent } from "../../shared/schema.js";

// Re-exporta tipos principais
export type { SortKey, QuerySignal, CatalogItem, Intent };

// Tipos específicos do assistente
export type Prefs = { 
  idioma?: "pt" | "es"; 
  marcaFavorita?: string; 
};

export type SessionState = {
  focoAtual?: string | null;
  categoriaAtual?: string | null;
  lastQuery?: string | null;
  prefs?: Prefs;
  rngSeed?: number;
  _v?: Record<string, number>;
};

export type ClassificationResult = {
  intent: Intent;
  base: QuerySignal;
};

export type BuildOpts = {
  base: QuerySignal;
  text: string;
  preferInStockCheapest?: boolean;
  slots?: {
    attrs?: string[];
    modelo?: string;
  };
};

export type DecisionContext = {
  sessionId: string;
  userMessage: string;
  query: QuerySignal;
  results: CatalogItem[];
  hasResults: boolean;
};

export type ConversationDecision = {
  shouldAskForClarification: boolean;
  shouldOfferCrossSell: boolean;
  shouldContinueSearch: boolean;
  crossSellSuggestions: string[];
  responseType: "results" | "clarification" | "greeting" | "not_found";
};

export type ResponseContext = {
  sessionId: string;
  results: CatalogItem[];
  decision: ConversationDecision;
  userMessage: string;
};

export type NaturalizationInput = {
  intent: string;
  draft: string;
  product?: string;
  category?: string;
  model?: string;
  count?: number;
  cross?: string[];
  ask?: string | null;
};

export type PriceSignals = {
  mais_barato?: boolean;
  price_min?: number;
  price_max?: number;
  sort?: SortKey;
};