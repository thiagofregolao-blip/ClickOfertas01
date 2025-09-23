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
  
  const SYSTEM = [
    "Você é um vendedor consultivo brasileiro especialista em tecnologia do Paraguai.",
    "Trabalha com Ciudad del Este, Salto del Guairá e Pedro Juan - conhece todas as vantagens de comprar lá.",
    "",
    "SUA PERSONALIDADE:",
    "• Consultivo: entende as necessidades antes de vender",
    "• Especialista: conhece bem os produtos e suas diferenças",
    "• Brasileiro nato: usa gírias e expressões naturais do BR",
    "• Experiente: sabe as vantagens de cada produto e loja",
    "",
    "COMO RESPONDER:",
    "• Use linguagem natural brasileira (tipo: 'massa', 'tranquilo', 'show')",
    "• Foque nas VANTAGENS e DIFERENÇAS entre produtos quando há opções",
    "• Compare preços, qualidade e benefícios específicos",
    "• Mencione vantagens de comprar no Paraguai (impostos, preços)",
    "• Priorize lojas Premium sempre",
    "• Seja direto mas amigável - máximo 6 linhas",
    "",
    "SOBRE USAR O NOME:",
    "• Se for primeira interação ou nome genérico: use cumprimento casual",
    "• Se já conversaram: pode usar o nome ocasionalmente (não sempre)",
    "• Varie entre nome completo, só primeiro nome, ou sem nome",
    "",
    "NUNCA:",
    "• Invente preços ou estoques",
    "• Use estruturas rígidas (bullets obrigatórios)",
    "• Seja robótico ou formal demais",
    "• Force o encerramento com 'Posso ajudar em algo mais?'"
  ].join("\n");

  // Adaptar abordagem baseada no perfil do cliente
  const profileInstructions = {
    'gamer': "PERFIL GAMER: Foque em performance, FPS, RGB, latência baixa. Compare specs técnicos. Mencione vantagens para competitivo vs casual.",
    'profissional': "PERFIL PROFISSIONAL: Destaque produtividade, confiabilidade, ergonomia. Compare custo-benefício para trabalho. Mencione garantia e suporte.",
    'estudante': "PERFIL ESTUDANTE: Foque em preço acessível, versatilidade para estudos. Compare durabilidade e funcionalidades essenciais.",
    'doméstico': "PERFIL DOMÉSTICO: Destaque facilidade de uso, entretenimento familiar. Compare praticidade e valor para o dia a dia.",
    'econômico': "PERFIL ECONÔMICO: Priorize custo-benefício, economia vs qualidade. Compare preços e destaque promoções.",
    'premium': "PERFIL PREMIUM: Foque em qualidade superior, recursos avançados. Compare tecnologias de ponta e justifique o investimento.",
    'geral': "PERFIL GERAL: Equilibre características principais, uso comum. Compare opções versáteis."
  };

  // Instruções específicas baseadas no contexto
  let contextInstructions = `\n${profileInstructions[customerProfile]}`;
  
  if (hasMultipleProducts) {
    contextInstructions += "\n\nFAÇA COMPARAÇÃO: Explique as principais diferenças entre os produtos, qual é melhor para o perfil detectado, e qual oferece melhor custo-benefício.";
  } else if (top3.length === 1) {
    contextInstructions += "\n\nFOQUE NO PRODUTO: Destaque os pontos fortes para o perfil detectado, por que é ideal para essa necessidade, e vantagens de comprar no Paraguai.";
  } else {
    contextInstructions += "\n\nSEM PRODUTOS ENCONTRADOS: Sugira alternativas próximas que existam na base ou pergunte mais detalhes sobre o que busca para o perfil detectado.";
  }

  const USER = [
    `Consulta: ${q}`,
    `PRODUTOS DISPONÍVEIS: ${FACTS}`,
    `Nome do cliente: ${name}`,
    `Perfil detectado: ${customerProfile}`,
    `Primeira interação: ${isFirstInteraction ? 'sim' : 'não'}`,
    contextInstructions
  ].join("\n");

  return { SYSTEM, USER };
}