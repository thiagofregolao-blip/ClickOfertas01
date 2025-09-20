// Embeddings (OpenAI) + similaridade (cosseno)
import OpenAI from 'openai';
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMBED_MODEL = process.env.EMBED_MODEL || 'text-embedding-3-small';

export async function embedText(text: string): Promise<number[]> {
  const input = (text || '').replace(/\s+/g, ' ').trim();
  if (!input) return [];
  const r = await client.embeddings.create({ model: EMBED_MODEL, input });
  return r.data[0].embedding;
}

export function cosineSim(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}