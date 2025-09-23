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

/** Detecta perfil do cliente baseado na consulta */
function detectCustomerProfile(query) {
  // Normalizar para remover acentos e facilitar detecção
  const q = query.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Perfis específicos baseados em palavras-chave (com e sem acentos)
  if (q.includes('gam') || q.includes('jog') || q.includes('fps') || q.includes('rgb') || 
      q.includes('mecanico') || q.includes('mecânico') || q.includes('teclado mecanico')) {
    return 'gamer';
  }
  if (q.includes('trabalho') || q.includes('escritorio') || q.includes('reuniao') || 
      q.includes('home office') || q.includes('produtividade') || q.includes('corporativo')) {
    return 'profissional';
  }
  if (q.includes('estudar') || q.includes('faculdade') || q.includes('aula') || 
      q.includes('estudo') || q.includes('universidade') || q.includes('escola')) {
    return 'estudante';
  }
  if (q.includes('casa') || q.includes('familia') || q.includes('entretenimento') || 
      q.includes('filme') || q.includes('serie') || q.includes('netflix')) {
    return 'doméstico';
  }
  if (q.includes('barato') || q.includes('economico') || q.includes('custo') || 
      q.includes('preco baixo') || q.includes('mais barato') || q.includes('promocao')) {
    return 'econômico';
  }
  if ((q.includes('premium') || q.includes('top') || q.includes('melhor')) && 
      (q.includes('produto') || q.includes('opcao') || q.includes('modelo'))) {
    return 'premium';
  }
  
  return 'geral';
}

/** Vendedor consultivo brasileiro especialista em tech do Paraguai */
export function composePrompts({ q, name, top3 = [] }) {
  const FACTS = JSON.stringify(top3, null, 0);
  
  // Detectar contexto da conversa
  const hasMultipleProducts = top3.length > 1;
  const isFirstInteraction = !name || name === 'Cliente';
  const customerProfile = detectCustomerProfile(q);
  
  // Lógica para uso do nome - SEMPRE na primeira interação
  const realName = name && name !== 'Cliente' ? name : null;
  // Primeira interação: sempre usar nome se disponível
  // Outras interações: usar ocasionalmente para não saturar
  const queryHash = q.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0);
  const shouldUseName = isFirstInteraction ? !!realName : (realName && Math.abs(queryHash) % 4 === 0);
  const nameToUse = shouldUseName ? realName : null;
  
  const SYSTEM = [
    "Você é um robozinho IA divertido e carismático, especialista em tech do Paraguai! 🤖",
    "Tom: Animado, brasileiro raiz, bem-humorado. Use gírias como 'patrão', 'irmão', 'amigo'. Seja consultivo MAS divertido!",
    "SEMPRE cumprimente pelo nome do usuário na primeira interação. Fale dos produtos com empolgação e humor!",
    "MÁXIMO 4 LINHAS. Nunca invente preços. Seja carismático, não robótico. Use emojis ocasionalmente. Varie expressões!"
  ].join("\n");

  // Instruções simplificadas baseadas no contexto
  const profileMap = {
    'gamer': "Foco: performance, FPS, specs técnicos",
    'profissional': "Foco: produtividade, confiabilidade", 
    'estudante': "Foco: preço acessível, versatilidade",
    'doméstico': "Foco: facilidade, entretenimento",
    'econômico': "Foco: custo-benefício, promoções",
    'premium': "Foco: qualidade superior",
    'geral': "Foco: equilíbrio geral"
  };

  let action = "Compare produtos";
  if (hasMultipleProducts) {
    action = "Compare as diferenças e melhor custo-benefício";
  } else if (top3.length === 1) {
    action = "Destaque pontos fortes e vantagens do Paraguai";
  } else {
    action = "Sugira alternativas ou peça mais detalhes";
  }

  // Construir USER prompt - só incluir nome se existir nome real
  const userPromptParts = [
    `Pergunta: ${q}`,
    `Produtos: ${FACTS}`,
    `${profileMap[customerProfile]}. ${action}.`
  ];
  
  if (nameToUse) {
    userPromptParts.splice(2, 0, `Cliente: ${nameToUse}`);
  }

  const USER = userPromptParts.join("\n");

  return { SYSTEM, USER };
}