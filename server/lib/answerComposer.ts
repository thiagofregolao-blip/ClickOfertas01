export type SuggestProduct = {
  id: string;
  title: string;
  category?: string;
  price?: { USD?: number };
  storeId?: string;
  premium?: boolean;
  score?: number;
};

type SuggestResp = { ok?: boolean; products?: SuggestProduct[] };

function normalize(q: string) {
  return (q || "").toLowerCase().trim();
}

function isLikelyNotLaunched(q: string) {
  const s = normalize(q);
  // regra simples p/ "produto novo/rumor"
  return /iphone\s*16|17|18/.test(s) || /não\s*lançou|lançamento|rumor/.test(s);
}

export async function buildGrounding(origin: string, q: string) {
  // tenta /suggest e /api/suggest
  let r = await fetch(`${origin}/suggest?q=${encodeURIComponent(q)}`).catch(() => null);
  if (!r || !r.ok) r = await fetch(`${origin}/api/suggest?q=${encodeURIComponent(q)}`).catch(() => null);
  const sug: SuggestResp = r ? await r.json() : { products: [] };
  const prods = (sug.products || []).map(p => ({
    id: p.id,
    title: p.title,
    category: p.category || "",
    priceUSD: p.price?.USD ?? undefined,
    storeId: p.storeId || "",
    premium: !!p.premium,
    score: p.score ?? 0
  }));

  // top3 (prioriza premium)
  const top3 = [...prods]
    .sort((a, b) => Number(b.premium) - Number(a.premium) || (b.score || 0) - (a.score || 0))
    .slice(0, 3);

  // feed (resto)
  const feed = prods.slice(3, 120);

  // termo alternativo p/ "não lançado": empurrar linha iPhone 15
  let altQuery: string | null = null;
  if (isLikelyNotLaunched(q)) {
    const alt = "iphone 15 pro";
    let r2 = await fetch(`${origin}/suggest?q=${encodeURIComponent(alt)}`).catch(() => null);
    if (!r2 || !r2.ok) r2 = await fetch(`${origin}/api/suggest?q=${encodeURIComponent(alt)}`).catch(() => null);
    const sug2: SuggestResp = r2 ? await r2.json() : { products: [] };
    const altProds = (sug2.products || []).map(p => ({
      id: p.id, title: p.title, category: p.category || "",
      priceUSD: p.price?.USD ?? undefined, storeId: p.storeId || "", premium: !!p.premium, score: p.score ?? 0
    }));
    // injeta alguns na frente
    const altTop = altProds.slice(0, 3);
    return { top3: altTop.length ? altTop : top3, feed, raw: prods, altQuery: alt };
  }

  return { top3, feed, raw: prods, altQuery };
}

export function composeSystemAndUser({
  q, name, top3, altQuery
}: { q: string; name: string; top3: any; altQuery?: string | null }) {
  const FACTS = JSON.stringify(top3, null, 0);

  const STYLE = [
    "Estilo: leve, simpático e bem-humorado (sem exagero).",
    "Responda em até 5 linhas.",
    "Use no máx. 3 bullets: "• item — detalhe curto".",
    "Se fizer sentido, termine com: "Posso ajudar em algo mais?".",
    "Nunca invente preço/estoque. Use só os FATOS abaixo.",
  ].join("\n");

  const NON_LAUNCH = altQuery
    ? `Se a consulta for sobre algo ainda não lançado, explique em 1 linha e ofereça alternativas *disponíveis agora* (ex.: "${altQuery}"), baseadas nos FATOS.`
    : `Se algo não existir na base, diga isso em 1 linha e ofereça alternativas da base.`;

  const SYSTEM = [
    "Você é o Click Pro Assistant para Ciudad del Este, Salto del Guairá e Pedro Juan (Paraguai).",
    "Seja objetivo, vendedor consultivo e local.",
    STYLE,
    NON_LAUNCH,
    "Priorize sempre lojas Premium quando citar opções.",
    "Formato: 1 frase de abertura usando o nome do usuário; depois bullets; depois 1 pergunta curta."
  ].join("\n");

  // o modelo recebe os fatos dos top3 para se "ancorar"
  const USER = [
    `Consulta do usuário: ${q}`,
    `Nome: ${name}`,
    `FATOS (top recomendações): ${FACTS}`
  ].join("\n");

  return { SYSTEM, USER };
}