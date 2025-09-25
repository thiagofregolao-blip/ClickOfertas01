/** Busca produtos para fundamentar a resposta (RAG melhorado) */
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
  
  // Mapear produtos com dados completos
  const products = (sug?.products || []).map(p => ({
    id: p.id, 
    title: p.title, 
    category: p.category || "",
    priceUSD: p.price?.USD ?? undefined, 
    premium: !!p.premium,
    storeName: p.storeName || "",
    storeSlug: p.storeSlug || "",
    imageUrl: p.imageUrl || null
  }));

  // Garantir diversidade de lojas - máximo 2 produtos por loja
  const diverseProducts = [];
  const storeCount = new Map();
  
  for (const product of products) {
    const storeId = product.storeSlug || product.storeName;
    const currentCount = storeCount.get(storeId) || 0;
    
    if (currentCount < 2) {
      diverseProducts.push(product);
      storeCount.set(storeId, currentCount + 1);
      
      // Parar quando tivermos 8 produtos diversos
      if (diverseProducts.length >= 8) break;
    }
  }
  
  // Se ainda não temos 8, completar com produtos restantes
  if (diverseProducts.length < 8) {
    const remaining = products.filter(p => !diverseProducts.includes(p));
    diverseProducts.push(...remaining.slice(0, 8 - diverseProducts.length));
  }

  const top8 = diverseProducts.slice(0, 8);
  return { top3: top8.slice(0, 3), top8, all: products };
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

/** IA natural e inteligente do Click Ofertas */
export function composePrompts({ q, name, top3 = [], top8 = [] }) {
  // Usar top8 se disponível, senão top3
  const products = top8.length > 0 ? top8 : top3;
  const FACTS = JSON.stringify(products, null, 0);
  
  // Detectar contexto da conversa
  const hasMultipleProducts = products.length > 1;
  const isFirstInteraction = !name || name === 'Cliente';
  const customerProfile = detectCustomerProfile(q);
  
  // Lógica para uso do nome mais natural
  const realName = name && name !== 'Cliente' ? name : null;
  const queryHash = q.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0);
  const shouldUseName = isFirstInteraction ? !!realName : (realName && Math.abs(queryHash) % 3 === 0);
  const nameToUse = shouldUseName ? realName : null;
  
  // Analisar diversidade de lojas
  const uniqueStores = new Set(products.map(p => p.storeName).filter(Boolean));
  const storeCount = uniqueStores.size;
  
  // Sistema de prompts mais natural e variado
  const systemVariations = [
    "Você é o assistente oficial do Click Ofertas! 🛍️ Sua personalidade é animada, brasileira e consultiva. Ajude os clientes a encontrar os melhores produtos do Paraguai!",
    "Sou a IA do Click Ofertas, aqui pra te ajudar a garimpar as melhores ofertas do Paraguai! 🇵🇾 Sou descontraído, consultivo e sempre empolgado com as novidades tech!",
    "Olá! Sou seu assistente pessoal do Click Ofertas! 🤖 Especialista em tech paraguaio, sempre pronto pra te ajudar a encontrar o produto perfeito com o melhor preço!"
  ];
  
  const responseStyles = [
    "Seja natural e conversacional. Fale como se fosse um amigo especialista em tech dando dicas.",
    "Use um tom animado mas profissional. Seja consultivo sem ser exagerado.",
    "Mantenha-se descontraído e prestativo. Use gírias brasileiras ocasionalmente."
  ];
  
  const systemIndex = Math.abs(queryHash) % systemVariations.length;
  const styleIndex = Math.abs(queryHash) % responseStyles.length;
  
  const SYSTEM = [
    systemVariations[systemIndex],
    responseStyles[styleIndex],
    "REGRAS IMPORTANTES:",
    "- MÁXIMO 4 linhas na resposta",
    "- NUNCA invente preços ou dados",
    "- Quando encontrar produtos, diga que estão listados abaixo nos resultados",
    "- Seja natural, não robótico. Varie suas expressões!",
    "- Você FAZ PARTE do Click Ofertas, não é um bot externo",
    storeCount > 1 ? `- Destaque que encontrou produtos em ${storeCount} lojas diferentes` : "",
    "- Use emojis com moderação"
  ].filter(Boolean).join("\n");

  // Instruções contextuais mais inteligentes
  const contextInstructions = {
    'gamer': "Foque em performance, FPS e specs técnicos. Gamer sabe o que quer!",
    'profissional': "Destaque produtividade e confiabilidade. Profissional precisa de eficiência.",
    'estudante': "Enfatize custo-benefício e versatilidade. Estudante quer valor pelo dinheiro.",
    'doméstico': "Foque em facilidade de uso e entretenimento familiar.",
    'econômico': "Destaque promoções e produtos com melhor preço. Cliente quer economizar!",
    'premium': "Enfatize qualidade superior e diferenciação. Cliente quer o melhor!",
    'geral': "Mantenha equilíbrio entre preço, qualidade e funcionalidade."
  };

  // Ações mais naturais baseadas nos produtos encontrados
  let actionInstruction = "";
  if (products.length === 0) {
    actionInstruction = "Não encontrou produtos? Sugira termos alternativos ou categorias relacionadas de forma natural.";
  } else if (products.length === 1) {
    actionInstruction = "Encontrou um produto? Destaque seus pontos fortes e vantagens do Paraguai.";
  } else if (storeCount > 1) {
    actionInstruction = `Ótimo! Encontrou ${products.length} produtos em ${storeCount} lojas diferentes. Destaque essa variedade como vantagem.`;
  } else {
    actionInstruction = `Encontrou ${products.length} produtos. Compare as diferenças e destaque as vantagens.`;
  }

  // Construir USER prompt mais inteligente
  const userPromptParts = [
    `Consulta do cliente: "${q}"`,
    products.length > 0 ? `Produtos encontrados: ${FACTS}` : "Nenhum produto encontrado para esta busca.",
    `Contexto do cliente: ${contextInstructions[customerProfile]}`,
    actionInstruction
  ];
  
  if (nameToUse) {
    userPromptParts.splice(1, 0, `Nome do cliente: ${nameToUse}`);
  }

  const USER = userPromptParts.join("\n\n");

  return { SYSTEM, USER };
}