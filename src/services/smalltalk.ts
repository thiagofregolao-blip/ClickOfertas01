// src/services/smalltalk.ts
export function replySmallTalk(rng: () => number = Math.random): string {
  const pool: string[] = [
    "Oi! 👋 Como posso te ajudar hoje?",
    "Opa! Se quiser, me diz o produto que você procura (ex.: iPhone, drone, perfume).",
    "Olá! Posso buscar ofertas de celulares, perfumes, eletrônicos e mais. O que você quer ver?",
  ];
  return pool[Math.floor(rng() * pool.length)];
}

export function replyHelp(): string {
  return "Me diga o produto ou categoria (ex.: iPhone 12, Galaxy 15, drone com câmera). Posso filtrar por preço, marca e modelo. 😉";
}

export function replyTime(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `Agora são ${hh}:${mm} ⏰`;
}

export function replyOutOfDomain(exemplo?: string): string {
  return `Ainda não consigo ajudar com isso. ${exemplo ?? "Me diz um produto (ex.: iPhone, drone, perfume) que eu busco pra você 😊"}`;
}

export function replyWhoAmI(): string {
  return `Eu sou o Gemini Assistant. Te ajudo a encontrar produtos por conversa: pode pedir "drones", "perfumes", "iPhone 12 128GB", etc.`;
}