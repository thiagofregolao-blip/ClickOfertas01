import { db } from "../db";
import { products, stores, productBankItems } from "@shared/schema";
import { eq, and, or, sql, asc, desc, like, ilike } from "drizzle-orm";

// Função que busca produtos para sugestões no Click Environment
export async function searchSuggestions(query: string) {
  console.log(`🔍 [searchSuggestions] Buscando produtos para: "${query}"`);
  
  if (!query || query.trim().length === 0) {
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

  const searchTerm = query.toLowerCase().trim();
  console.log(`🎯 [searchSuggestions] Termo de busca processado: "${searchTerm}"`);

  // 1. Buscar na tabela products (produtos de lojas)
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