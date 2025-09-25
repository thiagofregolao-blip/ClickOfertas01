import { db } from "../db";
import { products, stores } from "@shared/schema";
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

  // Buscar produtos que correspondem ao termo
  const matchingProducts = await db
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
      eq(stores.isActive, true),
      or(
        ilike(products.name, `%${searchTerm}%`),
        ilike(products.description, `%${searchTerm}%`),
        ilike(products.brand, `%${searchTerm}%`),
        ilike(products.category, `%${searchTerm}%`),
        ilike(stores.name, `%${searchTerm}%`)
      )
    ))
    .orderBy(
      // Priorizar produtos em destaque
      desc(products.isFeatured),
      // Depois por relevância (nome exato primeiro)
      sql`CASE WHEN LOWER(${products.name}) LIKE ${`%${searchTerm}%`} THEN 1 ELSE 2 END`,
      // Por último, por preço
      asc(products.price)
    )
    .limit(20);

  console.log(`✅ [searchSuggestions] Encontrados ${matchingProducts.length} produtos para "${searchTerm}"`);
  
  // Log dos primeiros produtos para debug
  if (matchingProducts.length > 0) {
    console.log(`📝 [searchSuggestions] Primeiros produtos:`, 
      matchingProducts.slice(0, 3).map(p => ({ title: p.title, storeName: p.storeName }))
    );
  }

  // Detectar categoria predominante
  const categories = matchingProducts.map(p => p.category).filter(Boolean);
  const categoryCount = categories.reduce((acc, cat) => {
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topCategory = Object.keys(categoryCount).length > 0 
    ? Object.keys(categoryCount).reduce((a, b) => categoryCount[a] > categoryCount[b] ? a : b)
    : null;

  // Top stores baseado nos produtos encontrados
  const storeNames = [...new Set(matchingProducts.map(p => p.storeName).filter(Boolean))];
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