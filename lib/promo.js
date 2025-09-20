// Integração OPCIONAL com sua raspadinha já existente.
// - Se PROMO_ENABLED=false, nada é feito.
// - Se PROMO_ENABLED=true, tenta consultar PROMO_ENDPOINT (timeout curto).
// - Se o endpoint falhar, aplica fallback leve: probabilidade local + cooldown por user/ip.
// Obs.: NÃO implementa geração/redenção (você já tem). Só agrega o "bloco" scratchcard no payload.

const PROMO_ENABLED = String(process.env.PROMO_ENABLED || 'false').toLowerCase() === 'true';
const PROMO_ENDPOINT = process.env.PROMO_ENDPOINT || '';
const PROMO_AUTH_BEARER = process.env.PROMO_AUTH_BEARER || '';
const PROMO_SHOW_RATE = Number(process.env.PROMO_SHOW_RATE || 8); // %
const PROMO_COOLDOWN_HOURS = Number(process.env.PROMO_COOLDOWN_HOURS || 24);

// memória simples p/ cooldown; em produção use Redis
const lastShowMap = new Map(); // key=userId|ip -> timestamp

function eligibleByCooldown(key){
  if (!key) return true;
  const last = lastShowMap.get(key) || 0;
  const now = Date.now();
  const ms = PROMO_COOLDOWN_HOURS * 3600 * 1000;
  if (now - last > ms) { lastShowMap.set(key, now); return true; }
  return false;
}

async function callPromoEndpoint({ userId, ip, context }) {
  if (!PROMO_ENDPOINT) return null;
  const controller = new AbortController();
  const t = setTimeout(()=> controller.abort(), 1500); // timeout curto
  const headers = { 'Content-Type': 'application/json' };
  if (PROMO_AUTH_BEARER) headers['Authorization'] = `Bearer ${PROMO_AUTH_BEARER}`;

  // envia contexto mínimo — ajuste se seu endpoint espera GET com querystring
  const resp = await fetch(PROMO_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId, ip, context }),
    signal: controller.signal
  }).catch(()=> null);
  clearTimeout(t);
  if (!resp || !resp.ok) return null;
  const data = await resp.json().catch(()=> null);
  // Esperado: { show: boolean, scratchcard?: {...} }
  return data;
}

export async function maybeAttachPromo({ payload, userId, ip, context }) {
  try {
    if (!PROMO_ENABLED) return payload;

    // 1) tenta sua engine primeiro
    const api = await callPromoEndpoint({ userId, ip, context });
    if (api?.show && api?.scratchcard) {
      payload.scratchcard = api.scratchcard;
      return payload;
    }

    // 2) fallback local bem simples
    const key = userId || ip || '';
    const roll = Math.random() * 100;
    if (roll <= PROMO_SHOW_RATE && eligibleByCooldown(key)) {
      // placeholder minimalista; sua UI usará o block real do seu backend quando disponível
      payload.scratchcard = {
        id: 'fallback-local',
        titulo: 'Raspadinha Click',
        parceiro: 'Parceiro Premium',
        beneficio: 'Surpresa exclusiva',
        expira_em: null,
        selo: 'Patrocinado',
        token: null,
        resgatar_em: []
      };
    }
    return payload;
  } catch {
    return payload; // nunca derruba a busca
  }
}