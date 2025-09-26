// 🔧 GATE DE CATÁLOGO - Só produtos reais passam por aqui
function isValidProduct(p) {
  return !!(p && p.id && p.title && (p.storeName || p.storeSlug));
}

async function searchCatalogFirst(q, origin) {
  console.log(`🔍 [searchCatalogFirst] Buscando no catálogo: "${q}"`);
  
  const endpoints = [
    `${origin}/api/products/search?q=${encodeURIComponent(q)}`, // direto no banco
    `${origin}/api/click/suggest?q=${encodeURIComponent(q)}`,
    `${origin}/api/suggest?q=${encodeURIComponent(q)}`,
    `${origin}/suggest?q=${encodeURIComponent(q)}`,
    `${origin}/api/search/suggestions?q=${encodeURIComponent(q)}`
  ];

  for (const url of endpoints) {
    try {
      console.log(`📡 [searchCatalogFirst] Tentando: ${url}`);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        
        // Extrair produtos de qualquer formato de resposta
        const rawProducts = data?.products || data?.results || data?.items || data?.data?.results || [];
        
        // Filtrar só produtos válidos
        const validProducts = rawProducts.filter(isValidProduct);
        
        if (validProducts.length > 0) {
          console.log(`✅ [searchCatalogFirst] Encontrados ${validProducts.length} produtos válidos em ${url}`);
          return validProducts;
        }
      }
    } catch (error) {
      console.log(`❌ [searchCatalogFirst] Erro em ${url}:`, error.message);
    }
  }
  
  console.log(`⚠️ [searchCatalogFirst] Nenhum produto válido encontrado para "${q}"`);
  return [];
}

async function robustSearch(q, origin) {
  console.log(`🚀 [robustSearch] Iniciando busca robusta para: "${q}"`);
  
  // 1) Catálogo com a query original
  let products = await searchCatalogFirst(q, origin);
  if (products.length > 0) {
    console.log(`✅ [robustSearch] Sucesso com query original: ${products.length} produtos`);
    return products;
  }

  // 2) Reformular a partir de suggestions (se houver), e tentar de novo no catálogo
  try {
    console.log(`🔄 [robustSearch] Tentando buscar suggestions para reformular...`);
    const sugResponse = await fetch(`${origin}/api/suggest?q=${encodeURIComponent(q)}`);
    if (sugResponse.ok) {
      const sugData = await sugResponse.json();
      const suggestions = Array.isArray(sugData?.suggestions) ? sugData.suggestions.slice(0, 3) : [];
      
      if (suggestions.length > 0) {
        const reformulated = suggestions.join(' ');
        console.log(`🔄 [robustSearch] Tentando query reformulada: "${reformulated}"`);
        products = await searchCatalogFirst(reformulated, origin);
        if (products.length > 0) {
          console.log(`✅ [robustSearch] Sucesso com query reformulada: ${products.length} produtos`);
          return products;
        }
      }
    }
  } catch (error) {
    console.log(`❌ [robustSearch] Erro ao buscar suggestions:`, error.message);
  }

  // 3) Correção de digitação simples
  const autocorrected = autocorrect(q);
  if (autocorrected !== q) {
    console.log(`🔧 [robustSearch] Autocorreção: "${q}" → "${autocorrected}"`);
    products = await searchCatalogFirst(autocorrected, origin);
    if (products.length > 0) {
      console.log(`✅ [robustSearch] Sucesso com autocorreção: ${products.length} produtos`);
      return products;
    }
  }
  
  console.log(`❌ [robustSearch] Nenhum produto encontrado para "${q}"`);
  return [];
}

// 🔧 AUTOCORRETOR para corrigir erros de digitação comuns
const DICT = ["drone","perfume","iphone","motorola","xiaomi","soja","milho","lattafa","yara","asad","perfumes","celular","smartphone","tablet","notebook","laptop","fone","headset","mouse","teclado","monitor","tv","camera","relogio","watch"];

function jaccard(a, b) {
  const S = new Set(a);
  const T = new Set(b);
  const inter = [...S].filter(x => T.has(x)).length;
  return inter / (S.size + T.size - inter);
}

function closest(token, dict) {
  let best = null, bestScore = 0;
  for (const w of dict) {
    const s = jaccard(token, w);
    if (s > bestScore) { 
      bestScore = s; 
      best = w; 
    }
  }
  return bestScore >= 0.72 ? best : null;
}

function autocorrect(q) {
  const terms = q.toLowerCase().split(/\s+/);
  const corrected = terms.map(t => closest(t, DICT) ?? t);
  const result = corrected.join(' ');
  
  if (result !== q.toLowerCase()) {
    console.log(`🔧 [autocorrect] "${q}" → "${result}"`);
  }
  
  return result;
}

/** Busca produtos para fundamentar a resposta (RAG melhorado) - Agora com Gate de Catálogo */
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
  
  // 🔧 GATE DE CATÁLOGO: Usar robustSearch para buscar apenas produtos reais
  const rawProducts = await robustSearch(q, origin);
  
  // Normalizar produtos para formato padrão com conversão PYG→USD
  const products = rawProducts.map(p => ({
    id: p.id, 
    title: p.title, 
    category: p.category || "",
    priceUSD: (
      p.price?.USD ??
      p.priceUSD ??
      (p.price?.PYG ? Math.round(p.price.PYG / 7200) : undefined) // câmbio aproximado PYG→USD
    ), 
    premium: !!p.premium,
    storeName: p.storeName || "",
    storeSlug: p.storeSlug || "",
    imageUrl: p.imageUrl || p.image || (p.images && p.images[0]) || null
  }));
  
  console.log(`🎯 [buildGrounding] Produtos processados pelo Gate de Catálogo:`, {
    count: products.length,
    titles: products.map(p => p.title).slice(0, 3)
  });

  // Diversidade por loja inteligente
  const diverseProducts = [];
  const storeCount = new Map();
  
  const totalStores = new Set(products.map(p => p.storeSlug || p.storeName).filter(Boolean)).size;
  const perStoreCap = totalStores <= 1 ? 8 : 2;
  
  console.log(`🏪 [buildGrounding] Estratégia de diversidade: ${totalStores} loja(s), máximo ${perStoreCap} produtos por loja`);
  
  for (const product of products) {
    const storeId = product.storeSlug || product.storeName || 'unknown';
    const currentCount = storeCount.get(storeId) || 0;
    
    if (currentCount < perStoreCap) {
      diverseProducts.push(product);
      storeCount.set(storeId, currentCount + 1);
      
      if (diverseProducts.length >= 8) break;
    }
  }
  
  // Completar com produtos restantes se necessário
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

  // 🔧 CORREÇÃO: Incluir produtos REAIS no prompt da IA (sem JSON para evitar reprodução)
  let productSummary = "";
  if (products.length === 0) {
    productSummary = "NENHUM produto encontrado no catálogo para esta busca. NUNCA invente produtos. Pergunte por categoria específica, marca ou preço para refinar a busca.";
  } else {
    const top3Products = products.slice(0, 3);
    productSummary = `PRODUTOS DISPONÍVEIS NO CATÁLOGO:
${top3Products.map((p, i) => {
  const price = p.priceUSD ? `US$ ${p.priceUSD}` : 'Consultar preço';
  return `${i + 1}. "${p.title}" - ${p.storeName} - ${price}`;
}).join('\n')}${products.length > 3 ? `\n(+ ${products.length - 3} outros produtos similares disponíveis)` : ''}

IMPORTANTE: Você SÓ pode falar sobre estes produtos ESPECÍFICOS do catálogo. NUNCA invente nomes, preços ou modelos que não estão nesta lista.`;
  }
    
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