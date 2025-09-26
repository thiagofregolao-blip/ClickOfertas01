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
    /\b(o que (você )?ach[a]?|vale a pena|é bom|recomend[a]?|opini[ãa]o|qual (é )?melhor|que tal|como (é|está)|me fal[a]?|diz aí|e aí|e esse|e esta|e isso|como vê|como considera)\b/gi
  ];
  
  // Padrões de perguntas pessoais que NÃO devem ativar memória de produtos
  const personalQuestionPatterns = [
    /\b(qual (é |seu |o )?nome|quem (é |você|és)|como te chama|se apresent|boa noite|boa tarde|bom dia|oi|olá|prazer|tchau|obrigad|valeu)\b/gi
  ];
  
  const hasDeictic = deicticPatterns.some(pattern => pattern.test(q));
  const hasProductQuestion = productQuestionPatterns.some(pattern => pattern.test(q));
  const isPersonalQuestion = personalQuestionPatterns.some(pattern => pattern.test(q));
  
  // Não ativar memória para perguntas pessoais
  const shouldUseMemory = (hasDeictic || hasProductQuestion) && !isPersonalQuestion;
  
  console.log(`🧠 [buildGrounding] Análise da query "${q}":`, {
    hasDeictic,
    hasProductQuestion,
    isPersonalQuestion,
    shouldUseMemory
  });
  
  if (sessionId && shouldUseMemory) {
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
        
        // 🔧 PATCH F: Se não há produto específico em foco mas há produtos mostrados anteriormente
        if (sessionMemory.lastShownProducts?.length > 0) {
          // Verificar similaridade para evitar "fantasmas" de buscas passadas
          const similarEnough = (a, b) => a && b && a.toLowerCase() === b.toLowerCase();
          const currentCategory = ''; // inferir categoria da nova query seria ideal
          const sameCategory = similarEnough(sessionMemory.lastCategory, currentCategory);
          
          if (sameCategory || !sessionMemory.lastCategory) {
            contextualProducts = sessionMemory.lastShownProducts.slice(0, 3);
            console.log(`📋 [buildGrounding] Usando produtos do contexto como base (${contextualProducts.length} produtos)`);
          } else {
            console.log(`🚫 [buildGrounding] Ignorando contexto anterior - categorias diferentes`);
          }
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
  
  // 🔧 PATCH C: Query original PRIMEIRO - melhor recall para categorias PT-BR (drone, perfume, etc.)
  console.log(`📝 [buildGrounding] Usando query original: "${q}"`);
  let primaryQuery = q;
  
  // 🔧 PATCH A: Buscar no primeiro endpoint que tiver dados de verdade (não apenas truthy vazio)
  const endpoints = [
    `${origin}/api/click/suggest?q=${encodeURIComponent(primaryQuery)}`,
    `${origin}/api/suggest?q=${encodeURIComponent(primaryQuery)}`,
    `${origin}/suggest?q=${encodeURIComponent(primaryQuery)}`,
    `${origin}/api/search/suggestions?q=${encodeURIComponent(primaryQuery)}`
  ];

  // Util: considera "tem dado" se achar produtos/sugestões/resultados com length>0
  const hasPayload = (d) => {
    if (!d) return false;
    const keys = ['products','results','items'];
    for (const k of keys) {
      if (Array.isArray(d[k]) && d[k].length > 0) return true;
    }
    if (Array.isArray(d?.data?.results) && d.data.results.length > 0) return true;
    if (Array.isArray(d?.suggestions) && d.suggestions.length > 0) return true;
    return false;
  };

  let sug = null;
  for (const url of endpoints) {
    const d = await tryFetch(url);
    if (hasPayload(d)) { sug = d; break; }
  }
  // se nada veio, `sug` fica null e você cai no fallback mais adiante
  
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
  
  // 🔧 PATCH B: Normalização com primeira lista não-vazia (não trava no products: [])
  const firstNonEmpty = (...arrs) => arrs.find(a => Array.isArray(a) && a.length > 0) || [];
  
  if (!sug?.products || sug.products.length === 0) {
    console.log(`🔧 [buildGrounding] Tentando normalizar dados de outros formatos...`);
    
    // Detectar fonte de dados alternativa - primeira lista não-vazia
    const rawItems = firstNonEmpty(
      sug?.products,
      sug?.results,
      sug?.items,
      sug?.data?.results
    );
    
    if (rawItems.length > 0) {
      console.log(`✅ [buildGrounding] Encontrados ${rawItems.length} items para normalizar`);
      console.log(`📝 [buildGrounding] Primeiro item exemplo:`, JSON.stringify(rawItems[0], null, 2).slice(0, 500));
      
      // 🔧 PATCH D: Mapear para formato padrão com preços multi-moeda
      sug.products = rawItems.map((p, index) => ({
        id: p.id || p.productId || p._id || `item-${index}`,
        title: p.title || p.name || '',
        category: p.category || '',
        price: { 
          USD: p.priceUSD ?? p.price?.USD ?? (typeof p.price === 'number' ? p.price : undefined),
          PYG: p.pricePYG ?? p.price?.PYG,
          BRL: p.priceBRL ?? p.price?.BRL
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
  
  // 🔄 PATCH C: Fallback com termos-chave se query original não retornou produtos
  if (!sug || !hasPayload(sug)) {
    console.log(`🔄 [buildGrounding] Query original não retornou produtos. Tentando termos-chave como fallback...`);
    
    // Extrair termos-chave para fallback
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
    
    if (keywords.length > 0) {
      const narrowed = keywords.slice(0, 4).join(' '); // Máximo 4 termos específicos
      console.log(`🎯 [buildGrounding] Tentando com termos-chave extraídos: "${narrowed}"`);
      
      const keywordEndpoints = [
        `${origin}/api/click/suggest?q=${encodeURIComponent(narrowed)}`,
        `${origin}/api/suggest?q=${encodeURIComponent(narrowed)}`,
        `${origin}/suggest?q=${encodeURIComponent(narrowed)}`,
        `${origin}/api/search/suggestions?q=${encodeURIComponent(narrowed)}`
      ];

      for (const url of keywordEndpoints) {
        const d = await tryFetch(url);
        if (hasPayload(d)) { 
          sug = d; 
          console.log(`✅ [buildGrounding] Fallback com termos-chave funcionou!`);
          break; 
        }
      }
    }
  }
  
  // 🔄 Fallback final: se nem query original nem termos-chave funcionaram
  if (!sug || !hasPayload(sug)) {
    console.log(`🔄 [buildGrounding] Nenhuma estratégia retornou produtos. Criando resposta vazia...`);
    sug = { products: [] };
  }
  
  // 🔧 PATCH D: Mapear produtos com dados completos incluindo conversão automática PYG→USD
  const products = (sug?.products || []).map(p => ({
    id: p.id, 
    title: p.title, 
    category: p.category || "",
    priceUSD: (
      p.price?.USD ??
      (p.price?.PYG ? Math.round(p.price.PYG / 7200) : undefined) // câmbio aproximado PYG→USD
    ), 
    premium: !!p.premium,
    storeName: p.storeName || "",
    storeSlug: p.storeSlug || "",
    imageUrl: p.imageUrl || null
  }));
  
  console.log(`🎯 [buildGrounding] Produtos mapeados:`, {
    count: products.length,
    titles: products.map(p => p.title).slice(0, 3)
  });

  // 🔧 PATCH E: Diversidade por loja inteligente - mais produtos se só há uma loja
  const diverseProducts = [];
  const storeCount = new Map();
  
  // Calcular número de lojas únicas
  const totalStores = new Set(products.map(p => p.storeSlug || p.storeName).filter(Boolean)).size;
  const perStoreCap = totalStores <= 1 ? 8 : 2; // se só 1 loja, permita até 8
  
  console.log(`🏪 [buildGrounding] Estratégia de diversidade: ${totalStores} loja(s), máximo ${perStoreCap} produtos por loja`);
  
  for (const product of products) {
    const storeId = product.storeSlug || product.storeName || 'unknown';
    const currentCount = storeCount.get(storeId) || 0;
    
    if (currentCount < perStoreCap) {
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
  console.log(`📋 [composePrompts] Produtos processados para IA:`, {
    count: products.length,
    storeCount: new Set(products.map(p => p.storeName).filter(Boolean)).size
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
      
      // Instrução SEM dados específicos para evitar JSON na resposta
      recommendationInstructions = `
MODO VENDAS CONSULTIVAS ATIVADO:
- Cliente demonstrou interesse em produto específico - use isso como gancho
- Há opções de upgrade e produtos complementares disponíveis
- Seja proativo em sugerir produtos relacionados da mesma categoria
- Use técnica consultiva: "Já que você está interessado em [categoria], que tal considerar também..."
- Foque em benefícios e comparações de valor
- Os produtos serão mostrados automaticamente na interface - você só precisa orientar a escolha`;
    }
  }
  
  // Analisar diversidade de lojas ANTES do console.log
  const uniqueStores = new Set(products.map(p => p.storeName).filter(Boolean));
  const storeCount = uniqueStores.size;
  
  // FACTS removido do prompt para evitar JSON na resposta da IA
  console.log(`📝 [composePrompts] Produtos processados:`, {
    totalProducts: allProductsContext.length,
    hasRecommendations: !!recommendations,
    storeCount
  });
  
  // Detectar contexto da conversa
  const hasMultipleProducts = products.length > 1;
  const isFirstInteraction = !name || name === 'Cliente';
  const customerProfile = detectCustomerProfile(q);
  
  // Lógica para uso do nome mais natural
  const realName = name && name !== 'Cliente' ? name : null;
  const queryHash = q.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0);
  const shouldUseName = isFirstInteraction ? !!realName : (realName && Math.abs(queryHash) % 3 === 0);
  const nameToUse = shouldUseName ? realName : null;
  
  // Detectar tipo de pergunta para ajustar personalidade
  const isPersonalQuestion = /\b(nome|quem é|quem você|como te chama|se apresent|boa noite|boa tarde|bom dia|oi|olá|prazer|tchau|obrigad|valeu)\b/i.test(q);
  const isProductQuestion = products.length > 0 || /\b(quero|preciso|busco|interesse|comprar|produto|preço|valor|oferta|desconto)\b/i.test(q);
  
  // Sistema de prompts CONTEXTUAL - varia entre conversacional e vendedor
  const systemVariations = isPersonalQuestion ? [
    "Sou seu assistente amigável do Click Ofertas! 😊 Respondo de forma natural e humana. Quando falamos sobre produtos, sou especialista em ajudar você a encontrar a melhor opção.",
    "Olá! Sou o assistente virtual do Click Ofertas 🤖 Tenho uma personalidade amigável e conversacional. Quando você precisa de produtos, me transformo em consultor especializado!",
    "Prazer! Sou seu assistente pessoal do Click Ofertas ✨ Converso naturalmente sobre qualquer assunto, e quando você quer comprar algo, uso todo meu conhecimento em produtos para ajudar!"
  ] : [
    "Você é o VENDEDOR SÊNIOR do Click Ofertas! 🛍️ Age como um consultor de vendas experiente: proativo, conhece produtos, sugere complementos e sempre busca a melhor solução pro cliente. Seu objetivo é AJUDAR O CLIENTE A COMPRAR CERTO, não apenas informar!",
    "Sou o ESPECIALISTA EM VENDAS do Click Ofertas! 🇵🇾 Como um vendedor top de loja física: conheço produtos, comparo vantagens, sugiro acessórios e sempre ofereço alternativas. Meu foco é FECHAR A VENDA com satisfação total do cliente!",
    "VENDEDOR PROFISSIONAL aqui! 🤖 Trabalho como os melhores consultores de loja: analiso necessidades, apresento produtos, sugiro upgrades quando vale a pena e sempre penso no conjunto completo que o cliente precisa. VENDA CONSULTIVA é minha especialidade!"
  ];
  
  const responseStyles = isPersonalQuestion ? [
    "Seja natural e conversacional. Responda à pergunta de forma amigável e humana. Mantenha tom leve e acessível.",
    "Converse de forma espontânea e calorosa. Seja você mesmo, sem pressão comercial. A naturalidade é sua marca registrada.",
    "Personalidade amigável e descontraída. Responda com entusiasmo genuíno. Seja o assistente que as pessoas gostam de conversar!"
  ] : [
    "Age como vendedor experiente: sempre sugira produtos complementares, compare vantagens e desvantagens, faça perguntas inteligentes. Pense no CONJUNTO que o cliente precisa.",
    "Comportamento de vendas consultiva: destaque diferenciais únicos, mencione acessórios importantes, sugira versões superiores quando vale a pena. Seja PROATIVO nas sugestões.",
    "Vendedor top de shopping: conhece bem os produtos, compara marcas, sugere o que realmente agrega valor. Sempre ofereça MAIS DE UMA OPÇÃO para o cliente escolher."
  ];
  
  const systemIndex = Math.abs(queryHash) % systemVariations.length;
  const styleIndex = Math.abs(queryHash) % responseStyles.length;
  
  // Regras específicas baseadas no tipo de pergunta
  const specificRules = isPersonalQuestion ? [
    "REGRAS DE CONVERSA NATURAL:",
    "- Responda de forma amigável e direta à pergunta feita",
    "- Use máximo 2-3 linhas para manter fluidez",
    "- Seja natural, sem forçar vendas desnecessárias",
    "- Mantenha o foco no que foi perguntado",
    "- Se apresente como 'assistente do Click Ofertas' quando perguntarem seu nome"
  ] : [
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
  ];

  const SYSTEM = [
    systemVariations[systemIndex],
    responseStyles[styleIndex],
    ...specificRules
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

  // Construir USER prompt mais inteligente (SEM JSON completo para evitar reprodução)
  const productSummary = products.length > 0 
    ? `Produtos encontrados: ${products.length} opções disponíveis (${[...uniqueStores].join(', ')}) - detalhes serão mostrados automaticamente na interface`
    : "Nenhum produto encontrado para esta busca.";
    
  const userPromptParts = [
    `Consulta do cliente: "${q}"`,
    productSummary,
    `Contexto do cliente: ${contextInstructions[customerProfile]}`,
    actionInstruction
  ];
  
  if (nameToUse) {
    userPromptParts.splice(1, 0, `Nome do cliente: ${nameToUse}`);
  }

  const USER = userPromptParts.join("\n\n");

  return { SYSTEM, USER };
}