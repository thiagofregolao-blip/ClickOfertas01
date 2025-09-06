// Lista única para o projeto (pode ampliar à vontade)
export const APPROVED_STORES_WHITELIST = [
  'mercado livre', 'mercadolivre',
  'amazon.com.br', 'amazon brasil', 'amazon',
  'magazine luiza', 'magazine', 'magazineluiza',
  'americanas',
  'casas bahia', 'casasbahia',
  'extra',
  'carrefour',
  'submarino',
  'kabum',
  'shopee', 'shopee brasil',
  'ponto frio', 'pontofrio',
  'fast shop', 'fastshop',
  'claro', 'vivo', 'tim',
  'walmart',
  'iplace',
  'smiles',
  'apple store', 'apple',
  'samsung',
  'pichau',
  'dell brasil', 'dell',
  'terabyteshop',
  'multilaser'
];

// (opcional) domínios conhecidos — útil quando o "seller" vem estranho
export const APPROVED_DOMAINS = [
  'amazon.com.br', 'amazon.com',
  'magazineluiza.com.br', 'americanas.com.br', 'casasbahia.com.br', 'extra.com.br',
  'carrefour.com.br', 'submarino.com.br', 'kabum.com.br', 'shopee.com.br',
  'pontofrio.com.br', 'fastshop.com.br', 'iplace.com.br', 'smiles.com.br',
  'apple.com', 'apple.com/br', 'samsung.com', 'samsung.com/br',
  'pichau.com.br', 'dell.com', 'dell.com.br',
  'terabyteshop.com.br', 'multilaser.com.br',
  'claro.com.br', 'vivo.com.br', 'tim.com.br'
];

export function normalize(text?: string) {
  return (text || '').toLowerCase().trim();
}

export function isApprovedStore(storeName?: string) {
  const s = normalize(storeName);
  if (!s) return false;
  return APPROVED_STORES_WHITELIST.some(ap => {
    const a = normalize(ap);
    return s.includes(a) || a.includes(s);
  });
}

export function hostnameFromUrl(url?: string) {
  try { return new URL(url || '').hostname.toLowerCase(); } catch { return ''; }
}

export function isApprovedDomain(url?: string) {
  const host = hostnameFromUrl(url);
  if (!host) return false;
  return APPROVED_DOMAINS.some(d => host === d || host.endsWith(`.${d}`));
}

// Regra única: passa se nome OU domínio forem aprovados
export function passesWhitelist(opts: { seller?: string; source?: string; url?: string }) {
  const byName = isApprovedStore(opts.seller) || isApprovedStore(opts.source);
  const byDomain = isApprovedDomain(opts.url);
  return byName || byDomain;
}

// Versão com overrides para casos especiais
export function passesWhitelistWithOverrides(
  opts: { seller?: string; source?: string; url?: string },
  overrides?: { stores?: string[]; domains?: string[] }
) {
  const byName = isApprovedStore(opts.seller) || isApprovedStore(opts.source)
    || (overrides?.stores ?? []).some(ap => 
        normalize(opts.seller).includes(normalize(ap)) || 
        normalize(ap).includes(normalize(opts.seller)) ||
        normalize(opts.source).includes(normalize(ap)) || 
        normalize(ap).includes(normalize(opts.source))
      );
  const byDomain = isApprovedDomain(opts.url)
    || (overrides?.domains ?? []).some(d => 
        hostnameFromUrl(opts.url) === d || 
        hostnameFromUrl(opts.url).endsWith(`.${d}`)
      );
  return byName || byDomain;
}