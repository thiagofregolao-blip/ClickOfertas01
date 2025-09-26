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

/** 🔧 HARD GROUNDING - IA que só fala sobre produtos específicos com IDs válidos */
export function composePrompts({ q, name, top3 = [], top8 = [], focusedProduct = null, recommendations = null }) {
  console.log(`🤖 [composePrompts] Recebendo dados:`, {
    query: q,
    name: name,
    top3Count: top3.length,
    top8Count: top8.length,
    hasFocus: !!focusedProduct,
    hasRecommendations: !!recommendations
  });
  
  // 🔧 GATE DE VALIDAÇÃO: Só produtos com ID, título e loja válidos
  const rawProducts = top8.length > 0 ? top8 : top3;
  const productSet = rawProducts
    .filter(p => p && p.id && p.title && (p.storeName || p.storeSlug))
    .slice(0, 8)
    .map(p => ({
      id: p.id,
      title: p.title,
      store: p.storeName || p.storeSlug || 'Loja não informada',
      priceUSD: p.priceUSD || null,
      imageUrl: p.imageUrl || null,
      url: p.url || null
    }));

  console.log(`🔧 [composePrompts] ProductSet processado:`, {
    original: rawProducts.length,
    valid: productSet.length,
    filtered: rawProducts.length - productSet.length
  });

  // 🔧 SISTEMA HARD GROUNDING - Zero tolerância para alucinação
  const SYSTEM = `Você é o assistente do Click Ofertas.

REGRAS CRÍTICAS:
1) NUNCA invente produtos. Você SÓ pode mencionar itens que estejam em "product_set".
2) Se "product_set" estiver vazio, diga que não encontrou e peça ao usuário para refinar (categoria, cidade, orçamento).
3) Não descreva marcas genéricas ou modelos que não estejam no "product_set".
4) OBRIGATÓRIO: Use saída JSON estruturada conforme schema.

Responda SEMPRE em formato JSON seguindo este schema:
{
  "items": [
    {
      "id": "string",  // DEVE existir em product_set
      "why": "string"  // motivo da seleção (máx 50 caracteres)
    }
  ],
  "message": "string"  // texto para o usuário (máx 200 caracteres, PT-BR)
}

Se product_set vazio: retorne items=[] e message pedindo refinamento.
Se product_set com produtos: retorne 1-3 IDs mais relevantes + message explicativo.`;

  // 🔧 USER com product_set em JSON para validação
  const USER = JSON.stringify({
    query: q,
    customer_name: name && name !== 'Cliente' ? name : null,
    product_set: productSet
  });

  console.log(`💭 [composePrompts] Hard Grounding ativado:`, {
    systemLength: SYSTEM.length,
    userLength: USER.length,
    hasProducts: productSet.length > 0,
    productIds: productSet.map(p => p.id)
  });

  return { 
    SYSTEM, 
    USER, 
    productSet,  // Para validação no servidor
    requiresJsonOutput: true  // Indica que precisa validar JSON
  };
}