// Script para testar se há produtos no banco de dados
import { db } from './server/db.ts';
import { products, stores } from './shared/schema.ts';
import { eq, and, or, sql } from 'drizzle-orm';

async function testProductSearch() {
  try {
    console.log('🔍 Testando busca de produtos...');
    
    // Buscar todos os produtos ativos
    const allProducts = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        category: products.category,
        brand: products.brand,
        storeId: products.storeId,
        storeName: stores.name
      })
      .from(products)
      .innerJoin(stores, eq(products.storeId, stores.id))
      .where(and(
        eq(products.isActive, true),
        eq(stores.isActive, true)
      ))
      .limit(10);
    
    console.log(`📦 Total de produtos encontrados: ${allProducts.length}`);
    
    if (allProducts.length > 0) {
      console.log('🛍️ Primeiros produtos:');
      allProducts.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} - ${product.price} (${product.storeName})`);
      });
      
      // Testar busca por termo específico
      const searchTerm = 'iphone';
      const searchResults = await db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          category: products.category,
          brand: products.brand,
          storeName: stores.name
        })
        .from(products)
        .innerJoin(stores, eq(products.storeId, stores.id))
        .where(and(
          eq(products.isActive, true),
          eq(stores.isActive, true),
          or(
            sql`LOWER(${products.name}) LIKE ${'%' + searchTerm + '%'}`,
            sql`LOWER(${products.brand}) LIKE ${'%' + searchTerm + '%'}`,
            sql`LOWER(${products.category}) LIKE ${'%' + searchTerm + '%'}`
          )
        ))
        .limit(5);
      
      console.log(`\n🔍 Busca por "${searchTerm}": ${searchResults.length} resultados`);
      searchResults.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} - ${product.price} (${product.storeName})`);
      });
    } else {
      console.log('❌ Nenhum produto encontrado no banco de dados!');
      
      // Verificar se há lojas ativas
      const activeStores = await db
        .select({ id: stores.id, name: stores.name })
        .from(stores)
        .where(eq(stores.isActive, true))
        .limit(5);
      
      console.log(`🏪 Lojas ativas: ${activeStores.length}`);
      activeStores.forEach(store => {
        console.log(`- ${store.name} (ID: ${store.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar produtos:', error);
  }
}

testProductSearch();
