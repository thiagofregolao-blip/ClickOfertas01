import { db } from "../db";
import { products, stores, productBankItems } from "@shared/schema";
import { eq, and, or, sql, asc, desc, like, ilike } from "drizzle-orm";

// Função que busca produtos para sugestões no Click Environment
export async function searchSuggestions(query: string) {
  console.log(`🔍 [searchSuggestions] Buscando produtos para: "${query}"`);
  
  // 🔄 CORREÇÃO CRÍTICA: Canonicalizar query ANTES da busca
  const { singularizePhrase } = await import("../../src/utils/singularize.js");
  const canonicalQuery = singularizePhrase(query);
  
  if (canonicalQuery !== query.toLowerCase().trim()) {
    console.log(`🔄 [searchSuggestions] Canonicalização: "${query}" → "${canonicalQuery}"`);
  }
  
  const searchTerm = canonicalQuery.toLowerCase().trim();
  
  if (!searchTerm || searchTerm.length === 0) {
    // Retornar produtos populares se não há query
    const popularProducts = await db
      .select({
        id: products.id,
        title: products.name,
        category: products.category,
        priceUSD: sql<number>`CAST(${products.price} AS NUMERIC)`.as('priceUSD'),
        premium: sql<boolean>`${products.isFeatured}`.as('premium'),
        storeName: stores.name,
        storeSlug: stores.slug,
        imageUrl: products.imageUrl
      })
      .from(products)
      .leftJoin(stores, eq(products.storeId, stores.id))
      .where(and(
        eq(products.isActive, true),
        eq(stores.isActive, true)
      ))
      .orderBy(desc(products.isFeatured), asc(products.price))
      .limit(10);

    console.log(`📦 [searchSuggestions] Retornando ${popularProducts.length} produtos populares`);
    
    return {
      products: popularProducts,
      category: null,
      topStores: []
    };
  }

  // Usar termo canonicalizado já processado
  console.log(`🎯 [searchSuggestions] Termo de busca processado: "${searchTerm}"`);

  // 1. Buscar na tabela products (produtos de lojas) - PRIMEIRA TENTATIVA
  const storeProducts = await db
    .select({
      id: products.id,
      title: products.name,
      category: products.category,
      price: sql<{ USD: number }>`JSON_BUILD_OBJECT('USD', CAST(${products.price} AS NUMERIC))`.as('price'),
      premium: sql<boolean>`${products.isFeatured}`.as('premium'),
      storeName: stores.name,
      storeSlug: stores.slug,
      imageUrl: products.imageUrl
    })
    .from(products)
    .leftJoin(stores, eq(products.storeId, stores.id))
    .where(and(
      eq(products.isActive, true),
      eq(stores.isActive, true),
      or(
        ilike(products.name, `%${searchTerm}%`),
        ilike(products.description, `%${searchTerm}%`),
        ilike(products.brand, `%${searchTerm}%`),
        ilike(products.category, `%${searchTerm}%`),
        ilike(stores.name, `%${searchTerm}%`)
      )
    ))
    .limit(10);

  // 2. Buscar na tabela productBankItems (Product Bank) COM LOGS DETALHADOS
  console.log(`🔍 [searchSuggestions] Buscando Product Bank para: "${searchTerm}"`);
  const bankProducts = await db
    .select({
      id: productBankItems.id,
      title: productBankItems.name,
      category: productBankItems.category,
      price: sql<{ USD: number }>`JSON_BUILD_OBJECT('USD', 450)`.as('price'), // Preço padrão por enquanto
      premium: sql<boolean>`false`.as('premium'),
      storeName: sql<string>`'Atacado Store'`.as('storeName'), // Store padrão por enquanto
      storeSlug: sql<string>`'atacado-store'`.as('storeSlug'),
      imageUrl: productBankItems.primaryImageUrl
    })
    .from(productBankItems)
    .where(
      or(
        ilike(productBankItems.name, `%${searchTerm}%`),
        ilike(productBankItems.description, `%${searchTerm}%`),
        ilike(productBankItems.brand, `%${searchTerm}%`),
        ilike(productBankItems.model, `%${searchTerm}%`),
        ilike(productBankItems.category, `%${searchTerm}%`),
        ilike(productBankItems.color, `%${searchTerm}%`),
        ilike(productBankItems.storage, `%${searchTerm}%`)
      )
    )
    .limit(10);
  
  console.log(`📦 [searchSuggestions] Product Bank encontrou ${bankProducts.length} items:`, 
    bankProducts.slice(0, 3).map(p => ({ title: p.title, id: p.id }))
  );

  // 3. Combinar resultados priorizando Product Bank para códigos específicos
  const hasCodePattern = /[A-Z]\d+[A-Z]*/.test(searchTerm.toUpperCase());
  const matchingProducts = hasCodePattern 
    ? [...bankProducts, ...storeProducts] // Priorizar Product Bank para códigos
    : [...storeProducts, ...bankProducts]; // Priorizar store products normalmente

  console.log(`✅ [searchSuggestions] Encontrados ${matchingProducts.length} produtos para "${searchTerm}"`);
  
  // 🔄 FALLBACK: Se nada encontrado E query original era diferente, tentar com query original
  if (matchingProducts.length === 0 && query.trim().toLowerCase() !== canonicalQuery) {
    console.log(`🔄 [searchSuggestions] RETRY com query original: "${query}"`);
    
    const originalTerm = query.toLowerCase().trim();
    const retryStoreProducts = await db
      .select({
        id: products.id,
        title: products.name,
        category: products.category,
        price: sql<{ USD: number }>`JSON_BUILD_OBJECT('USD', CAST(${products.price} AS NUMERIC))`.as('price'),
        premium: sql<boolean>`${products.isFeatured}`.as('premium'),
        storeName: stores.name,
        storeSlug: stores.slug,
        imageUrl: products.imageUrl
      })
      .from(products)
      .leftJoin(stores, eq(products.storeId, stores.id))
      .where(and(
        eq(products.isActive, true),
        eq(stores.isActive, true),
        or(
          ilike(products.name, `%${originalTerm}%`),
          ilike(products.description, `%${originalTerm}%`),
          ilike(products.brand, `%${originalTerm}%`),
          ilike(products.category, `%${originalTerm}%`),
          ilike(stores.name, `%${originalTerm}%`)
        )
      ))
      .limit(10);
      
    const retryBankProducts = await db
      .select({
        id: productBankItems.id,
        title: productBankItems.name,
        category: productBankItems.category,
        price: sql<{ USD: number }>`JSON_BUILD_OBJECT('USD', 450)`.as('price'),
        premium: sql<boolean>`false`.as('premium'),
        storeName: sql<string>`'Atacado Store'`.as('storeName'),
        storeSlug: sql<string>`'atacado-store'`.as('storeSlug'),
        imageUrl: productBankItems.primaryImageUrl
      })
      .from(productBankItems)
      .where(
        or(
          ilike(productBankItems.name, `%${originalTerm}%`),
          ilike(productBankItems.description, `%${originalTerm}%`),
          ilike(productBankItems.brand, `%${originalTerm}%`),
          ilike(productBankItems.model, `%${originalTerm}%`),
          ilike(productBankItems.category, `%${originalTerm}%`),
          ilike(productBankItems.color, `%${originalTerm}%`),
          ilike(productBankItems.storage, `%${originalTerm}%`)
        )
      )
      .limit(10);
      
    const retryProducts = [...retryStoreProducts, ...retryBankProducts];
    console.log(`🔄 [searchSuggestions] RETRY encontrou ${retryProducts.length} produtos`);
    
    if (retryProducts.length > 0) {
      matchingProducts.push(...retryProducts);
    }
  }
  
  // Log dos primeiros produtos para debug
  if (matchingProducts.length > 0) {
    console.log(`📝 [searchSuggestions] Primeiros produtos:`, 
      matchingProducts.slice(0, 3).map(p => ({ title: p.title, storeName: p.storeName }))
    );
  }

  // Detectar categoria predominante
  const categories = matchingProducts.map(p => p.category).filter(Boolean) as string[];
  const categoryCount = categories.reduce((acc, cat) => {
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topCategory = Object.keys(categoryCount).length > 0 
    ? Object.keys(categoryCount).reduce((a, b) => categoryCount[a] > categoryCount[b] ? a : b)
    : null;

  // Top stores baseado nos produtos encontrados
  const storeNames = Array.from(new Set(matchingProducts.map(p => p.storeName).filter(Boolean)));
  const topStores = storeNames.slice(0, 5);

  return {
    products: matchingProducts,
    category: topCategory,
    topStores
  };
}

// Função placeholder para buildItinerary (até implementar o Click Pro completo)
export async function buildItinerary(data: { wishlist: any[] }) {
  console.log(`🗺️ [buildItinerary] Construindo itinerário para ${data.wishlist.length} items`);
  
  return {
    stores: [],
    timeline: [],
    total_estimate: 0
  };
}

// ============================================================================
// SISTEMA DE RECOMENDAÇÕES AUTOMÁTICAS - Vendedor Experiente
// ============================================================================

// Mapa de produtos complementares por categoria
const CROSS_SELL_MAP = {
  'Perfumes': ['Desodorantes', 'Produtos de Beleza', 'Cosméticos'],
  'Celulares': ['Capas e Películas', 'Carregadores', 'Fones de Ouvido', 'Acessórios para Celular'],
  'Notebooks': ['Mouse', 'Teclados', 'Fones de Ouvido', 'Mochilas', 'Acessórios para Computador'],
  'Gaming': ['Mouse Gamer', 'Teclados Gamer', 'Headsets', 'Webcams', 'Cadeiras Gamer'],
  'TVs': ['Soundbars', 'Suportes', 'Cabos HDMI', 'Streaming Devices'],
  'Cosméticos': ['Perfumes', 'Produtos de Beleza', 'Maquiagem'],
  'Relógios': ['Pulseiras', 'Acessórios', 'Joias'],
  'Roupas': ['Calçados', 'Acessórios', 'Bolsas'],
  'Casa': ['Decoração', 'Utensílios', 'Eletroportáteis']
};

/**
 * Busca produtos complementares (cross-sell) baseado no produto principal
 */
export async function getCrossSellProducts(baseProduct: any, limit: number = 3) {
  console.log(`🛒 [getCrossSellProducts] Buscando complementos para: "${baseProduct.title}" (categoria: ${baseProduct.category})`);
  
  const complementCategories = CROSS_SELL_MAP[baseProduct.category as keyof typeof CROSS_SELL_MAP] || [];
  
  if (complementCategories.length === 0) {
    console.log(`🛒 [getCrossSellProducts] Nenhuma categoria complementar definida para: ${baseProduct.category}`);
    return [];
  }
  
  console.log(`🛒 [getCrossSellProducts] Categorias complementares: [${complementCategories.join(', ')}]`);
  
  const crossSellProducts: any[] = [];
  
  // Buscar produtos em cada categoria complementar
  for (const category of complementCategories.slice(0, 2)) { // Máximo 2 categorias
    try {
      const categoryProducts = await searchSuggestions(category);
      if (categoryProducts.products && categoryProducts.products.length > 0) {
        // Adicionar 1-2 produtos melhores de cada categoria
        crossSellProducts.push(...categoryProducts.products.slice(0, 2));
        console.log(`🛒 [getCrossSellProducts] Adicionados ${categoryProducts.products.slice(0, 2).length} produtos da categoria: ${category}`);
      }
    } catch (error) {
      console.log(`❌ [getCrossSellProducts] Erro ao buscar categoria ${category}:`, error);
    }
  }
  
  // Limitar resultado final e remover produtos duplicados
  const uniqueProducts = crossSellProducts
    .filter((product, index, self) => self.findIndex(p => p.id === product.id) === index)
    .slice(0, limit);
  
  console.log(`🛒 [getCrossSellProducts] Retornando ${uniqueProducts.length} produtos complementares`);
  
  return uniqueProducts.map(product => ({
    ...product,
    recommendationType: 'cross-sell',
    reason: `Complementa perfeitamente seu ${baseProduct.category.toLowerCase()}`
  }));
}

/**
 * Busca produtos superiores (upsell) baseado no produto principal
 */
export async function getUpsellProducts(baseProduct: any, limit: number = 2) {
  console.log(`📈 [getUpsellProducts] Buscando upgrades para: "${baseProduct.title}" (preço base: $${baseProduct.price?.USD || 0})`);
  
  const basePrice = baseProduct.price?.USD || 0;
  const minUpsellPrice = basePrice * 1.2; // Pelo menos 20% mais caro
  const maxUpsellPrice = basePrice * 2.0; // Máximo 2x mais caro
  
  console.log(`📈 [getUpsellProducts] Buscando produtos de $${minUpsellPrice} até $${maxUpsellPrice}`);
  
  try {
    // Buscar produtos similares na mesma categoria ou marca
    const brand = baseProduct.title.split(' ')[0]; // Primeira palavra como marca
    const searchQueries = [
      `${brand} ${baseProduct.category}`, // Mesma marca, mesma categoria
      `premium ${baseProduct.category}`, // Versões premium da categoria
      baseProduct.category // Categoria geral
    ];
    
    const upsellCandidates: any[] = [];
    
    for (const query of searchQueries) {
      try {
        const results = await searchSuggestions(query);
        if (results.products) {
          // Filtrar por faixa de preço de upsell
          const validUpsells = results.products.filter(product => {
            const productPrice = product.price?.USD || 0;
            return productPrice >= minUpsellPrice && 
                   productPrice <= maxUpsellPrice &&
                   product.id !== baseProduct.id; // Não incluir o mesmo produto
          });
          
          upsellCandidates.push(...validUpsells);
          
          if (validUpsells.length > 0) {
            console.log(`📈 [getUpsellProducts] Encontrados ${validUpsells.length} candidatos com query: "${query}"`);
          }
        }
      } catch (error) {
        console.log(`❌ [getUpsellProducts] Erro na query "${query}":`, error);
      }
    }
    
    // Ordenar por preço e remover duplicatos
    const uniqueUpsells = upsellCandidates
      .filter((product, index, self) => self.findIndex(p => p.id === product.id) === index)
      .sort((a, b) => (a.price?.USD || 0) - (b.price?.USD || 0))
      .slice(0, limit);
    
    console.log(`📈 [getUpsellProducts] Retornando ${uniqueUpsells.length} opções de upgrade`);
    
    return uniqueUpsells.map(product => {
      const priceIncrease = ((product.price?.USD || 0) - basePrice) / basePrice * 100;
      return {
        ...product,
        recommendationType: 'upsell',
        reason: `Versão superior com ${priceIncrease.toFixed(0)}% a mais - mais recursos e qualidade`,
        priceIncrease: `+$${((product.price?.USD || 0) - basePrice).toFixed(0)}`
      };
    });
    
  } catch (error) {
    console.log(`❌ [getUpsellProducts] Erro geral:`, error);
    return [];
  }
}

/**
 * Gera todas as recomendações para um produto (cross-sell + upsell)
 */
export async function getProductRecommendations(baseProduct: any) {
  console.log(`🎯 [getProductRecommendations] Gerando recomendações completas para: "${baseProduct.title}"`);
  
  try {
    const [crossSells, upsells] = await Promise.all([
      getCrossSellProducts(baseProduct, 2), // Máximo 2 cross-sells
      getUpsellProducts(baseProduct, 1)     // Máximo 1 upsell
    ]);
    
    const allRecommendations = [...upsells, ...crossSells]; // Priorizar upsells
    
    console.log(`🎯 [getProductRecommendations] Total de recomendações: ${allRecommendations.length} (${upsells.length} upsells + ${crossSells.length} cross-sells)`);
    
    return {
      upsells,
      crossSells,
      all: allRecommendations
    };
    
  } catch (error) {
    console.log(`❌ [getProductRecommendations] Erro ao gerar recomendações:`, error);
    return {
      upsells: [],
      crossSells: [],
      all: []
    };
  }
}