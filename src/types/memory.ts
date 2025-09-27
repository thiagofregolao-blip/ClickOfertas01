// src/types/memory.ts
export interface ConversationMemory {
  focoAtual: string | null;       // ex.: "iphone" ou "drone"
  lastQuery?: string | null;
  nomeCliente?: string | null;
  acessoriosSugeridos?: string[]; // para não repetir cross-sell (sem acento para consistência)
}