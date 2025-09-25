/** Busca produtos para fundamentar a resposta (RAG melhorado) - Agora com memória conversacional */
export async function buildGrounding(origin, q, sessionId = null) {
  console.log(`🔍 [buildGrounding] Iniciando busca para: "${q}" (sessão: ${sessionId || 'sem sessão'})`);
  
  // 🧠 SISTEMA DE MEMÓRIA CONVERSACIONAL
  let sessionMemory = null;
  let focusedProduct = null;
  let contextualProducts = [];
  
  // Detectar dêiticos (referências como "esse", "este", "aquele") E perguntas sobre produtos
  const deicticPatterns = [
    /\b(esse|esta?|aquele|aquela|o perfume|a fragrância|o celular|o produto|ele|ela)\b/gi
  ];
  
  const productQuestionPatterns = [
    /\b(o que (você )?ach[a]?|vale a pena|é bom|recomend[a]?|opini[ãa]o|qual (é )?melhor|que tal|como (é|está)|quero saber|me fal[a]?|diz aí|e aí|e esse|e esta|e isso|como vê|como considera)\b/gi
  ];
  
  const hasDeictic = deicticPatterns.some(pattern => pattern.test(q));
  const hasProductQuestion = productQuestionPatterns.some(pattern => pattern.test(q));
  
  console.log(`🧠 [buildGrounding] Análise da query "${q}":`, {
    hasDeictic,
    hasProductQuestion,
    shouldUseMemory: hasDeictic || hasProductQuestion
  });
  
  if (sessionId && (hasDeictic || hasProductQuestion)) {
    console.log(`🧠 [buildGrounding] Dêitico detectado! Buscando memória da sessão...`);
    
    // Buscar memória da sessão
    try {
      const memoryResponse = await fetch(`${origin}/api/assistant/memory/${sessionId}`);
      if (memoryResponse.ok) {
        const memoryData = await memoryResponse.json();
        sessionMemory = memoryData.memory;
        
        console.log(`🧠 [buildGrounding] Memória encontrada:`, {
          hasMemory: !!sessionMemory,
          focusProductId: sessionMemory?.currentFocusProductId || 'nenhum',
          lastShownCount: sessionMemory?.lastShownProducts?.length || 0,
          lastQuery: sessionMemory?.lastQuery || 'nenhuma'
        });
        
        // Se há produto em foco, usá-lo diretamente
        if (sessionMemory.currentFocusProductId && sessionMemory.lastShownProducts) {
          focusedProduct = sessionMemory.lastShownProducts.find(
            p => p.id === sessionMemory.currentFocusProductId
          );
          
          if (focusedProduct) {
            console.log(`🎯 [buildGrounding] Produto em foco encontrado: "${focusedProduct.title}"`);
            
            // Retornar diretamente o produto em foco + produtos relacionados do contexto
            const relatedProducts = sessionMemory.lastShownProducts
              .filter(p => p.id !== focusedProduct.id)
              .slice(0, 2); // Máximo 2 produtos relacionados do contexto
            
            return {
              products: [focusedProduct, ...relatedProducts],
              category: focusedProduct.category || sessionMemory.lastCategory || '',
              topStores: [focusedProduct.storeName].filter(Boolean),
              contextType: 'focused_product',
              sessionMemory
            };
          }
        }
        
        // Se não há produto específico em foco mas há produtos mostrados anteriormente
        if (sessionMemory.lastShownProducts?.length > 0) {
          contextualProducts = sessionMemory.lastShownProducts.slice(0, 3);
          console.log(`📋 [buildGrounding] Usando produtos do contexto como base (${contextualProducts.length} produtos)`);
        }
      }
    } catch (error) {
      console.log(`❌ [buildGrounding] Erro ao buscar memória da sessão: ${error.message}`);
    }
  }
  
  const tryFetch = async (url) => {
    try { 
      console.log(`📡 [buildGrounding] Fazendo requisição: ${url}`);
      const r = await fetch(url); 
      if (r.ok) {
        const data = await r.json();
        console.log(`✅ [buildGrounding] Resposta recebida:`, {
          productsCount: data?.products?.length || 0,
          firstProduct: data?.products?.[0] ? {
            id: data.products[0].id,
            title: data.products[0].title,
            storeName: data.products[0].storeName
          } : null
        });
        return data;
      }
    } catch (error) {
      console.log(`❌ [buildGrounding] Erro na requisição ${url}:`, error.message);
    }
    return { products: [] };
  };
  
  // 🧠 Estratégia inteligente: extrair termos-chave PRIMEIRO para busca mais precisa
  const keywords = [];
  const patterns = [
    /([A-Z]\d+[A-Z]*)/g,           // Códigos como A3081, A2411, etc
    /iPhone\s*\d+/gi,             // iPhone 16, iPhone 15, etc  
    /\d+GB/gi,                    // 128GB, 256GB, etc
    /Samsung Galaxy \w+/gi,       // Samsung Galaxy S24, etc
    /MacBook \w+/gi,              // MacBook Pro, etc
    /\b(?:BLACK|WHITE|BLUE|RED|GOLD|SILVER|TEAL|PINK|PURPLE|GREEN)\b/gi, // Cores
    /\b(?:PRO|MAX|PLUS|MINI|AIR|ULTRA)\b/gi // Variantes
  ];
  
  patterns.forEach(pattern => {
    const matches = q.match(pattern);
    if (matches) keywords.push(...matches);
  });
  
  // Priorizar busca com termos específicos se encontrados
  let primaryQuery = q;
  if (keywords.length > 0) {
    primaryQuery = keywords.slice(0, 4).join(' '); // Máximo 4 termos mais específicos
    console.log(`🎯 [buildGrounding] Usando termos-chave extraídos: "${primaryQuery}"`);
  } else {
    console.log(`📝 [buildGrounding] Usando query original: "${primaryQuery}"`);
  }
  
  let sug = (await tryFetch(`${origin}/api/click/suggest?q=${encodeURIComponent(primaryQuery)}`)) ||
            (await tryFetch(`${origin}/api/suggest?q=${encodeURIComponent(primaryQuery)}`)) ||
            (await tryFetch(`${origin}/suggest?q=${encodeURIComponent(primaryQuery)}`)) ||
            (await tryFetch(`${origin}/api/search/suggestions?q=${encodeURIComponent(primaryQuery)}`));
  
  console.log(`📦 [buildGrounding] Dados brutos recebidos:`, {
    hasProducts: !!sug?.products,
    productsLength: sug?.products?.length || 0,
    hasSuggestions: !!sug?.suggestions,
    suggestionsLength: sug?.suggestions?.length || 0,
    hasResults: !!sug?.results,
    resultsLength: sug?.results?.length || 0,
    hasItems: !!sug?.items,
    itemsLength: sug?.items?.length || 0,
    topLevelKeys: sug ? Object.keys(sug) : []
  });
  
  // 🔧 Normalização robusta: detectar formato de resposta e converter para formato padrão
  if (!sug?.products || sug.products.length === 0) {
    console.log(`🔧 [buildGrounding] Tentando normalizar dados de outros formatos...`);
    
    // Detectar fonte de dados alternativa
    const rawItems = sug?.products || sug?.results || sug?.items || sug?.data?.results || [];
    
    if (rawItems.length > 0) {
      console.log(`✅ [buildGrounding] Encontrados ${rawItems.length} items para normalizar`);
      console.log(`📝 [buildGrounding] Primeiro item exemplo:`, JSON.stringify(rawItems[0], null, 2).slice(0, 500));
      
      // Mapear para formato padrão esperado pela IA
      sug.products = rawItems.map((p, index) => ({
        id: p.id || p.productId || p._id || `item-${index}`,
        title: p.title || p.name || '',
        category: p.category || '',
        price: { 
          USD: p.priceUSD ?? p.price?.USD ?? (typeof p.price === 'number' ? p.price : undefined)
        },
        premium: !!p.premium,
        storeName: p.storeName || p.store?.name || '',
        storeSlug: p.storeSlug || p.store?.slug || '',
        imageUrl: p.imageUrl || p.image || (p.images && p.images[0]) || null
      }));
      
      console.log(`🎯 [buildGrounding] Normalizados ${sug.products.length} produtos`);
    } else if (sug?.suggestions) {
      console.log(`🔄 [buildGrounding] Convertendo suggestions para formato products`);
      sug.products = sug.suggestions.map((title, index) => ({
        id: `suggestion-${index}`,
        title: title,
        category: "",
        price: { USD: null },
        premium: false,
        storeName: "",
        storeSlug: "",
        imageUrl: null
      }));
    }
  }
  
  // 🔄 Fallback final: se termos específicos não retornaram produtos, tentar query original
  if (!sug?.products || sug.products.length === 0) {
    console.log(`🔄 [buildGrounding] Termos específicos não retornaram produtos. Tentando query original como fallback...`);
    
    const fallbackSug = (await tryFetch(`${origin}/api/click/suggest?q=${encodeURIComponent(q)}`)) ||
                       (await tryFetch(`${origin}/api/suggest?q=${encodeURIComponent(q)}`)) ||
                       (await tryFetch(`${origin}/suggest?q=${encodeURIComponent(q)}`)) ||
                       (await tryFetch(`${origin}/api/search/suggestions?q=${encodeURIComponent(q)}`));
    
    // Normalização robusta do fallback também
    if (!fallbackSug?.products || fallbackSug.products.length === 0) {
      const fallbackItems = fallbackSug?.products || fallbackSug?.results || fallbackSug?.items || fallbackSug?.data?.results || [];
      
      if (fallbackItems.length > 0) {
        console.log(`🔧 [buildGrounding] Normalizando ${fallbackItems.length} items do fallback`);
        fallbackSug.products = fallbackItems.map((p, index) => ({
          id: p.id || p.productId || p._id || `fallback-${index}`,
          title: p.title || p.name || '',
          category: p.category || '',
          price: { 
            USD: p.priceUSD ?? p.price?.USD ?? (typeof p.price === 'number' ? p.price : undefined)
          },
          premium: !!p.premium,
          storeName: p.storeName || p.store?.name || '',
          storeSlug: p.storeSlug || p.store?.slug || '',
          imageUrl: p.imageUrl || p.image || (p.images && p.images[0]) || null
        }));
      } else if (fallbackSug?.suggestions) {
        fallbackSug.products = fallbackSug.suggestions.map((title, index) => ({
          id: `fallback-${index}`,
          title: title,
          category: "",
          price: { USD: null },
          premium: false,
          storeName: "",
          storeSlug: "",
          imageUrl: null
        }));
      }
    }
    
    if (fallbackSug?.products && fallbackSug.products.length > 0) {
      console.log(`✅ [buildGrounding] Fallback com query original funcionou! Encontrados ${fallbackSug.products.length} produtos`);
      sug = fallbackSug;
    }
  }
  
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
  
  console.log(`🎯 [buildGrounding] Produtos mapeados:`, {
    count: products.length,
    titles: products.map(p => p.title).slice(0, 3)
  });

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
  
  console.log(`🚀 [buildGrounding] Resultado final:`, {
    all: products.length,
    top3: top8.slice(0, 3).length,
    top8: top8.length,
    diverseStores: [...storeCount.entries()]
  });
  
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
export function composePrompts({ q, name, top3 = [], top8 = [], focusedProduct = null, recommendations = null }) {
  console.log(`🤖 [composePrompts] Recebendo dados:`, {
    query: q,
    name: name,
    top3Count: top3.length,
    top8Count: top8.length,
    hasFocus: !!focusedProduct,
    hasRecommendations: !!recommendations
  });
  
  // Usar top8 se disponível, senão top3
  const products = top8.length > 0 ? top8 : top3;
  console.log(`📋 [composePrompts] Produtos para IA:`, {
    count: products.length,
    products: products.map(p => ({ id: p.id, title: p.title, storeName: p.storeName }))
  });
  
  // Incluir recomendações no contexto de produtos se disponível
  let allProductsContext = products;
  let recommendationInstructions = '';
  
  if (focusedProduct && recommendations) {
    console.log(`🎯 [composePrompts] Produto em foco detectado:`, focusedProduct.title);
    console.log(`💡 [composePrompts] Recomendações disponíveis:`, {
      upsells: recommendations.upsells?.length || 0,
      crossSells: recommendations.crossSells?.length || 0,
      total: recommendations.all?.length || 0
    });
    
    // Adicionar recomendações ao contexto
    if (recommendations.all && recommendations.all.length > 0) {
      allProductsContext = [...products, ...recommendations.all];
      
      // Instrução específica para IA incluir recomendações
      recommendationInstructions = `
RECOMENDAÇÕES AUTOMÁTICAS PARA INCLUIR NA RESPOSTA:
- PRODUTO EM FOCO: ${focusedProduct.title} (o cliente está interessado neste)
- UPGRADES DISPONÍVEIS: ${recommendations.upsells?.map(p => `${p.title} (${p.reason})`).join(', ') || 'nenhum'}
- PRODUTOS COMPLEMENTARES: ${recommendations.crossSells?.map(p => `${p.title} (${p.reason})`).join(', ') || 'nenhum'}

INSTRUÇÕES DE VENDA INTELIGENTE:
- SEMPRE mencione o produto em foco que o cliente demonstrou interesse
- Sugira automaticamente 1-2 produtos complementares relevantes
- Se há upgrade disponível, mencione brevemente os benefícios extras
- Use técnica consultiva: "Já que você está interessado no [produto], que tal considerar também..."
- NUNCA invente recomendações - use apenas as fornecidas acima`;
    }
  }
  
  const FACTS = JSON.stringify(allProductsContext, null, 0);
  console.log(`📝 [composePrompts] FACTS gerados (incluindo recomendações):`, FACTS);
  
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
  
  // Sistema de prompts com personalidade de VENDEDOR EXPERIENTE
  const systemVariations = [
    "Você é o VENDEDOR SÊNIOR do Click Ofertas! 🛍️ Age como um consultor de vendas experiente: proativo, conhece produtos, sugere complementos e sempre busca a melhor solução pro cliente. Seu objetivo é AJUDAR O CLIENTE A COMPRAR CERTO, não apenas informar!",
    "Sou o ESPECIALISTA EM VENDAS do Click Ofertas! 🇵🇾 Como um vendedor top de loja física: conheço produtos, comparo vantagens, sugiro acessórios e sempre ofereço alternativas. Meu foco é FECHAR A VENDA com satisfação total do cliente!",
    "VENDEDOR PROFISSIONAL aqui! 🤖 Trabalho como os melhores consultores de loja: analiso necessidades, apresento produtos, sugiro upgrades quando vale a pena e sempre penso no conjunto completo que o cliente precisa. VENDA CONSULTIVA é minha especialidade!"
  ];
  
  const responseStyles = [
    "Age como vendedor experiente: sempre sugira produtos complementares, compare vantagens e desvantagens, faça perguntas inteligentes. Pense no CONJUNTO que o cliente precisa.",
    "Comportamento de vendas consultiva: destaque diferenciais únicos, mencione acessórios importantes, sugira versões superiores quando vale a pena. Seja PROATIVO nas sugestões.",
    "Vendedor top de shopping: conhece bem os produtos, compara marcas, sugere o que realmente agrega valor. Sempre ofereça MAIS DE UMA OPÇÃO para o cliente escolher."
  ];
  
  const systemIndex = Math.abs(queryHash) % systemVariations.length;
  const styleIndex = Math.abs(queryHash) % responseStyles.length;
  
  const SYSTEM = [
    systemVariations[systemIndex],
    responseStyles[styleIndex],
    "REGRAS DE VENDAS PROFISSIONAIS:",
    "- MÁXIMO 4 linhas, mas sempre SUGIRA produtos relacionados",
    "- NUNCA invente preços ou dados, use apenas informações reais",
    "- Quando encontrar produtos, destaque os PRINCIPAIS BENEFÍCIOS de cada um",
    "- SEMPRE ofereça 2-3 opções para o cliente escolher (diferentes faixas de preço)",
    "- Se cliente perguntar sobre UM produto específico, sugira COMPLEMENTOS automaticamente",
    "- Use técnicas de vendas: âncoragem de preços, comparações, criação de valor",
    "- FECHE sempre com uma pergunta ou ação ('Qual te chama mais atenção?', 'Quer ver mais detalhes?')",
    "- Você VENDE pelo Click Ofertas, não apenas informa. Seu sucesso = vendas realizadas",
    storeCount > 1 ? `- VANTAGEM: encontrou produtos em ${storeCount} lojas - destaque opções variadas` : "",
    "- Seja consultivo mas DIRETO: cliente quer decidir, não apenas informações infinitas",
    recommendationInstructions // Incluir instruções de recomendação quando disponível
  ].filter(Boolean).join("\n");

  // Instruções de VENDAS específicas por perfil de cliente
  const contextInstructions = {
    'gamer': "VENDA TÉCNICA: Foque em FPS, specs, performance real. Sugira acessórios essenciais (mouse gamer, headset). Gamer compra conjunto completo!",
    'profissional': "VENDA CORPORATIVA: Destaque ROI, produtividade, confiabilidade. Sempre ofereça pacote completo (notebook + acessórios profissionais). Justifique investimento maior pela durabilidade.",
    'estudante': "VENDA INTELIGENTE: Mostre custo-benefício, versões anteriores com desconto, parcelamento. Sugira produtos que 'crescem' com o estudante (upgrades futuros).",
    'doméstico': "VENDA FAMILIAR: Facilidade de uso, entretenimento para toda família. Bundle familiar é chave (TV + soundbar + streaming). Pense no conjunto residencial.",
    'econômico': "VENDA DE OPORTUNIDADE: Destaque promoções limitadas, compare preços Brasil vs Paraguai. Crie urgência. Mostre economia real em números.",
    'premium': "VENDA DE VALOR: Enfatize exclusividade, diferenciais únicos, status. Cliente premium quer o melhor, não o mais barato. Sugira upgrades que valem a pena.",
    'geral': "VENDA CONSULTIVA: Equilibre preço/qualidade, ofereça 3 opções (bom/ótimo/premium). Descubra necessidade real e venda solução completa."
  };

  // Instruções de AÇÃO COMERCIAL baseadas nos produtos encontrados
  let actionInstruction = "";
  if (products.length === 0) {
    actionInstruction = "SEM PRODUTOS: Pergunte sobre necessidades específicas, sugira categorias relacionadas, descubra orçamento. Seja proativo para entender o que realmente procura.";
  } else if (products.length === 1) {
    actionInstruction = "UM PRODUTO: Destaque benefícios únicos, compare com Brasil, sugira acessórios/complementos essenciais. Crie PACOTE de valor para o cliente.";
  } else if (storeCount > 1) {
    actionInstruction = `MÚLTIPLAS LOJAS: VANTAGEM! ${products.length} produtos em ${storeCount} lojas = mais opções. Compare preços, destaque diferenças, sugira melhor custo-benefício para o perfil do cliente.`;
  } else {
    actionInstruction = `MÚLTIPLOS PRODUTOS: Compare modelos, crie escala de valor (básico/intermediário/premium), sugira o ideal para cada necessidade. Feche perguntando preferência.`;
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