// src/persona/salesPersona.ts
export type HumorLevel = "suave" | "medio" | "alto";

export interface PersonaConfig {
  nome: string;
  humor: HumorLevel;
  emojiPack: string[];
  tuteia: boolean; // falar "você" de forma mais próxima
}

export const SalesPersona: PersonaConfig = {
  nome: "Gemini Assistant",
  humor: "medio",
  emojiPack: ["😉", "😄", "🛍️", "✨", "📦", "🚀"],
  tuteia: true,
};

// util p/ escolher variações
export function pick<T>(arr: T[], seed?: number): T {
  return arr[(seed ?? Math.floor(Math.random() * arr.length)) % arr.length];
}