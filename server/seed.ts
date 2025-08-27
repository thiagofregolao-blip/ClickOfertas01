import { db } from "./db";
import { users, stores, products } from "@shared/schema";

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...");

  try {
    // Criar usuário CellShop
    const cellshopUser = await db
      .insert(users)
      .values({
        id: "979b6659-72d6-4e26-a71e-6a1003c5e263",
        email: "admin@cellshop.com",
        fullName: "Admin CellShop",
        provider: "email",
        isEmailVerified: true,
      })
      .onConflictDoNothing()
      .returning();

    console.log(`✅ Usuário CellShop criado`);

    // Criar loja CellShop
    const cellshopStore = await db
      .insert(stores)
      .values({
        id: "44e54a5c-f8a9-4993-ae43-2bd0fc3efbd2",
        userId: "979b6659-72d6-4e26-a71e-6a1003c5e263",
        name: "CellShop Importados Paraguay",
        logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFGVUDPJwW_iORK5g5HII-d38lovHepyr6pQ&s",
        themeColor: "#1E40AF",
        currency: "US$",
        whatsapp: "+595 994 193150",
        instagram: "@cellshop.py",
        address: "Av. Carlos Antonio López esquina Monseñor Rodríguez, Shopping IBIZA Mall, Ciudad del Este, Paraguay",
        slug: "cellshop-importados-paraguay",
        latitude: "-25.50950000",
        longitude: "-54.60670000",
        displayCurrency: "usd",
        dollarRate: "7500.00",
        isActive: true,
      })
      .onConflictDoNothing()
      .returning();

    console.log(`✅ Loja CellShop criada`);

    // Criar produtos para CellShop
    await db
      .insert(products)
      .values({
        storeId: "44e54a5c-f8a9-4993-ae43-2bd0fc3efbd2",
        name: "iPhone 15 Pro Max",
        description: "Último modelo Apple iPhone 15 Pro Max 256GB",
        price: "1299.99",
        imageUrl: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-max-naturaltitanium-select?wid=470&hei=556&fmt=png-alpha&.v=1692845702781",
        category: "smartphones",
        isActive: true,
        isFeatured: true,
      })
      .onConflictDoNothing();

    await db
      .insert(products)
      .values({
        storeId: "44e54a5c-f8a9-4993-ae43-2bd0fc3efbd2", 
        name: "Samsung Galaxy S24 Ultra",
        description: "Samsung Galaxy S24 Ultra 512GB com S Pen",
        price: "1199.99",
        imageUrl: "https://images.samsung.com/is/image/samsung/p6pim/br/2401/gallery/br-galaxy-s24-s928-sm-s928bzklbra-thumb-539573233",
        category: "smartphones",
        isActive: true,
        isFeatured: true,
      })
      .onConflictDoNothing();

    await db
      .insert(products)
      .values({
        storeId: "44e54a5c-f8a9-4993-ae43-2bd0fc3efbd2",
        name: "MacBook Pro M3",
        description: "MacBook Pro 14\" com chip M3 e 16GB RAM",
        price: "1999.99",
        imageUrl: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp14-m3-pro-max-spgray-select-202310?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1697311054290",
        category: "laptops",
        isActive: true,
        isFeatured: false,
      })
      .onConflictDoNothing();

    console.log(`✅ Produtos CellShop criados`);

    console.log("🎉 Seed completado com sucesso!");
    console.log("\n📋 Dados criados:");
    console.log("👤 Usuário: Admin CellShop");
    console.log("🏪 Loja: CellShop Importados Paraguay");
    console.log("📱 Produtos: iPhone 15 Pro Max, Galaxy S24 Ultra, MacBook Pro M3");
    console.log("\n🔑 Login CellShop: admin@cellshop.com");

  } catch (error) {
    console.error("❌ Erro durante o seed:", error);
    throw error;
  }
}

// Executar seed se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seed().then(() => {
    console.log("✅ Seed executado com sucesso!");
    process.exit(0);
  }).catch((error) => {
    console.error("❌ Erro no seed:", error);
    process.exit(1);
  });
}

export default seed;