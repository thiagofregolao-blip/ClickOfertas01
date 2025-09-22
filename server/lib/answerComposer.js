/** Busca produtos para fundamentar a resposta (RAG leve) */
export async function buildGrounding(origin, q) {
  const tryFetch = async (url) => {
    try { 
      const r = await fetch(url); 
      if (r.ok) return await r.json(); 
    } catch {}
    return { products: [] };
  };
  const sug = (await tryFetch(`${origin}/api/suggest?q=${encodeURIComponent(q)}`)) ||
              (await tryFetch(`${origin}/suggest?q=${encodeURIComponent(q)}`));
  const products = (sug?.products || []).map(p => ({
    id: p.id, 
    title: p.title, 
    category: p.category || "",
    priceUSD: p.price?.USD ?? undefined, 
    premium: !!p.premium
  }));
  const top3 = products.slice(0, 3);
  return { top3, all: products };
}

/** Monta prompts curtos com tom leve e objetivo */
export function composePrompts({ q, name, top3 }) {
  const FACTS = JSON.stringify(top3, null, 0);
  const SYSTEM = [
    "Você é o Click Pro Assistant para Ciudad del Este, Salto del Guairá e Pedro Juan (Paraguai).",
    "Seja objetivo, leve e bem-humorado (sem exagero).",
    "Responda em até 5 linhas. Use no máx. 3 bullets (\"• item — detalhe curto\").",
    "Priorize sempre lojas Premium quando citar opções.",
    "Nunca invente preços/estoques: use só os FATOS enviados.",
    "Se a consulta for sobre algo sem dados na base, ofereça alternativas que existam na base."
  ].join("\n");

  const USER = [
    `Usuário: ${name}`,
    `Consulta: ${q}`,
    `FATOS (top recomendações): ${FACTS}`,
    "Faça uma abertura amigável usando o nome do usuário e encerre com 'Posso ajudar em algo mais?' se fizer sentido."
  ].join("\n");

  return { SYSTEM, USER };
}