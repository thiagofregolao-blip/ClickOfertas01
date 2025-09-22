/** Ranqueia produtos: premium > similaridade (title/category) > preço asc */
export function rankProducts(products, q = "") {
  const term = (q || "").toLowerCase().trim();
  const scored = products.map(p => {
    const title = (p.title || "").toLowerCase();
    const cat = (p.category || "").toLowerCase();
    const hit = title.includes(term) || cat.includes(term) ? 1 : 0;
    const starts = title.startsWith(term) ? 0.3 : 0;
    const premium = p.premium ? 1.0 : 0;
    const score = premium + hit + starts;
    return { ...p, score };
  });
  scored.sort((a, b) => {
    if (Number(b.premium) !== Number(a.premium)) return Number(b.premium) - Number(a.premium);
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    const pa = a.price?.USD ?? Number.POSITIVE_INFINITY;
    const pb = b.price?.USD ?? Number.POSITIVE_INFINITY;
    return pa - pb;
  });
  return scored;
}