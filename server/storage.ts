import {
  users,
  stores,
  products,
  savedProducts,
  storyViews,
  flyerViews,
  productLikes,
  scratchedProducts,
  coupons,
  type User,
  type UpsertUser,
  type InsertUser,
  type Store,
  type InsertStore,
  type UpdateStore,
  type Product,
  type InsertProduct,
  type UpdateProduct,
  type StoreWithProducts,
  type SavedProduct,
  type InsertSavedProduct,
  type StoryView,
  type InsertStoryView,
  type FlyerView,
  type InsertFlyerView,
  type ProductLike,
  type InsertProductLike,
  type ScratchedProduct,
  type InsertScratchedProduct,
  type SavedProductWithDetails,
  type Coupon,
  type InsertCoupon,
  type CouponWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, gte } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;

  // Store operations
  getUserStore(userId: string): Promise<Store | undefined>;
  createStore(userId: string, store: InsertStore): Promise<Store>;
  updateStore(storeId: string, store: UpdateStore): Promise<Store>;
  getStoreBySlug(slug: string): Promise<StoreWithProducts | undefined>;
  getAllActiveStores(): Promise<StoreWithProducts[]>;
  deleteStore(storeId: string, userId: string): Promise<void>;

  // Product operations
  getStoreProducts(storeId: string): Promise<Product[]>;
  createProduct(storeId: string, product: InsertProduct): Promise<Product>;
  updateProduct(productId: string, storeId: string, product: UpdateProduct): Promise<Product>;
  deleteProduct(productId: string, storeId: string): Promise<void>;
  getProduct(productId: string, storeId: string): Promise<Product | undefined>;
  getProductById(productId: string): Promise<Product | undefined>;

  // Engagement operations
  createProductLike(like: InsertProductLike): Promise<ProductLike>;
  saveProduct(savedProduct: InsertSavedProduct): Promise<SavedProduct>;
  getSavedProducts(userId: string): Promise<SavedProductWithDetails[]>;
  removeSavedProduct(savedProductId: string, userId: string): Promise<void>;
  createStoryView(view: InsertStoryView): Promise<StoryView>;
  createFlyerView(view: InsertFlyerView): Promise<FlyerView>;
  getStoreAnalytics(storeId: string, days?: number): Promise<any>;
  getStoresByUserId(userId: string): Promise<Store[]>;
  getTopProductsByEngagement(storeId: string, days?: number): Promise<any[]>;

  // Scratch card operations
  createScratchedProduct(scratch: InsertScratchedProduct): Promise<ScratchedProduct>;
  getScratchedProduct(productId: string, userId?: string): Promise<ScratchedProduct | undefined>;
  updateScratchRedemptionCount(productId: string): Promise<void>;

  // Coupon operations
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  getUserCoupons(userId?: string): Promise<CouponWithDetails[]>;
  getCouponByCode(couponCode: string): Promise<CouponWithDetails | undefined>;
  redeemCoupon(couponCode: string): Promise<Coupon>;
  getCoupon(couponId: string): Promise<CouponWithDetails | undefined>;
  
  // Verificação para galeria
  shouldShowProductInGallery(productId: string): Promise<boolean>;
  getCouponsCountForProduct(productId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        provider: userData.provider || 'email'
      })
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Store operations
  async getUserStore(userId: string): Promise<Store | undefined> {
    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.userId, userId));
    return store;
  }

  async createStore(userId: string, storeData: InsertStore): Promise<Store> {
    const slug = this.generateSlug(storeData.name);
    const [store] = await db
      .insert(stores)
      .values({
        ...storeData,
        userId,
        slug,
      })
      .returning();
    return store;
  }

  async updateStore(storeId: string, storeData: UpdateStore): Promise<Store> {
    const updateData: any = { ...storeData, updatedAt: new Date() };
    if (storeData.name) {
      updateData.slug = this.generateSlug(storeData.name);
    }
    
    // Convert customUsdBrlRate to string if provided
    if (storeData.customUsdBrlRate !== undefined) {
      updateData.customUsdBrlRate = storeData.customUsdBrlRate?.toString();
    }
    
    const [store] = await db
      .update(stores)
      .set(updateData)
      .where(eq(stores.id, storeId))
      .returning();
    return store;
  }

  async getStoreBySlug(slug: string): Promise<StoreWithProducts | undefined> {
    const [store] = await db
      .select()
      .from(stores)
      .where(and(eq(stores.slug, slug), eq(stores.isActive, true)));
    
    if (!store) return undefined;

    const storeProducts = await db
      .select()
      .from(products)
      .where(eq(products.storeId, store.id))
      .orderBy(desc(products.isFeatured), products.sortOrder, products.createdAt);

    return {
      ...store,
      products: storeProducts,
    };
  }

  async getStoresByUserId(userId: string): Promise<Store[]> {
    return await db
      .select()
      .from(stores)
      .where(eq(stores.userId, userId));
  }

  async getAllActiveStores(): Promise<StoreWithProducts[]> {
    const activeStores = await db
      .select()
      .from(stores)
      .where(eq(stores.isActive, true))
      .orderBy(desc(stores.createdAt));
    
    const storesWithProducts = await Promise.all(
      activeStores.map(async (store) => {
        const allProducts = await db
          .select()
          .from(products)
          .where(and(eq(products.storeId, store.id), eq(products.isActive, true)))
          .orderBy(desc(products.isFeatured), products.sortOrder, products.createdAt);

        // Filtrar produtos que devem aparecer na galeria
        const filteredProducts = [];
        for (const product of allProducts) {
          const shouldShow = await this.shouldShowProductInGallery(product.id);
          if (shouldShow) {
            filteredProducts.push(product);
          }
        }

        return {
          ...store,
          products: filteredProducts,
        };
      })
    );

    return storesWithProducts;
  }

  async deleteStore(storeId: string, userId: string): Promise<void> {
    await db
      .delete(stores)
      .where(and(eq(stores.id, storeId), eq(stores.userId, userId)));
  }

  // Product operations
  async getStoreProducts(storeId: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.storeId, storeId))
      .orderBy(desc(products.isFeatured), products.sortOrder, products.createdAt);
  }

  async createProduct(storeId: string, productData: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values({
        ...productData,
        storeId,
      })
      .returning();
    return product;
  }

  async updateProduct(productId: string, storeId: string, productData: UpdateProduct): Promise<Product> {
    const [product] = await db
      .update(products)
      .set({ ...productData, updatedAt: new Date() })
      .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
      .returning();
    return product;
  }

  async deleteProduct(productId: string, storeId: string): Promise<void> {
    await db
      .delete(products)
      .where(and(eq(products.id, productId), eq(products.storeId, storeId)));
  }

  async getProduct(productId: string, storeId: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.storeId, storeId)));
    return product;
  }

  async getProductById(productId: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId));
    return product;
  }

  // Engagement operations
  async createProductLike(likeData: InsertProductLike): Promise<ProductLike> {
    const [like] = await db
      .insert(productLikes)
      .values(likeData)
      .returning();
    return like;
  }

  async saveProduct(savedProductData: InsertSavedProduct): Promise<SavedProduct> {
    const [savedProduct] = await db
      .insert(savedProducts)
      .values(savedProductData)
      .onConflictDoNothing() // Evita duplicatas
      .returning();
    return savedProduct;
  }

  async getSavedProducts(userId: string): Promise<SavedProductWithDetails[]> {
    const results = await db
      .select({
        id: savedProducts.id,
        userId: savedProducts.userId,
        productId: savedProducts.productId,
        createdAt: savedProducts.createdAt,
        // Product details
        productName: products.name,
        productDescription: products.description,
        productPrice: products.price,
        productImageUrl: products.imageUrl,
        productCategory: products.category,
        productIsFeatured: products.isFeatured,
        productShowInStories: products.showInStories,
        productIsActive: products.isActive,
        productSortOrder: products.sortOrder,
        productStoreId: products.storeId,
        productCreatedAt: products.createdAt,
        productUpdatedAt: products.updatedAt,
        // Store details
        storeId: stores.id,
        storeName: stores.name,
        storeLogoUrl: stores.logoUrl,
        storeThemeColor: stores.themeColor,
        storeCurrency: stores.currency,
        storeDisplayCurrency: stores.displayCurrency,
        storeDollarRate: stores.dollarRate,
        storeCustomUsdBrlRate: stores.customUsdBrlRate,
        storeWhatsapp: stores.whatsapp,
        storeInstagram: stores.instagram,
        storeAddress: stores.address,
        storeLatitude: stores.latitude,
        storeLongitude: stores.longitude,
        storeSlug: stores.slug,
        storeIsActive: stores.isActive,
        storeUserId: stores.userId,
        storeCreatedAt: stores.createdAt,
        storeUpdatedAt: stores.updatedAt,
      })
      .from(savedProducts)
      .innerJoin(products, eq(savedProducts.productId, products.id))
      .innerJoin(stores, eq(products.storeId, stores.id))
      .where(eq(savedProducts.userId, userId))
      .orderBy(desc(savedProducts.createdAt));

    // Transform results to match expected structure
    return results.map(result => ({
      id: result.id,
      userId: result.userId,
      productId: result.productId,
      createdAt: result.createdAt,
      product: {
        id: result.productId,
        name: result.productName,
        description: result.productDescription,
        price: result.productPrice,
        imageUrl: result.productImageUrl,
        category: result.productCategory,
        isFeatured: result.productIsFeatured,
        showInStories: result.productShowInStories,
        isActive: result.productIsActive,
        sortOrder: result.productSortOrder,
        storeId: result.productStoreId,
        createdAt: result.productCreatedAt,
        updatedAt: result.productUpdatedAt,
        store: {
          id: result.storeId,
          name: result.storeName,
          logoUrl: result.storeLogoUrl,
          themeColor: result.storeThemeColor,
          currency: result.storeCurrency,
          displayCurrency: result.storeDisplayCurrency,
          dollarRate: result.storeDollarRate,
          customUsdBrlRate: result.storeCustomUsdBrlRate,
          whatsapp: result.storeWhatsapp,
          instagram: result.storeInstagram,
          address: result.storeAddress,
          latitude: result.storeLatitude,
          longitude: result.storeLongitude,
          slug: result.storeSlug,
          isActive: result.storeIsActive,
          userId: result.storeUserId,
          createdAt: result.storeCreatedAt,
          updatedAt: result.storeUpdatedAt,
        }
      }
    }));
  }

  async removeSavedProduct(savedProductId: string, userId: string): Promise<void> {
    await db
      .delete(savedProducts)
      .where(and(eq(savedProducts.id, savedProductId), eq(savedProducts.userId, userId)));
  }

  async createStoryView(viewData: InsertStoryView): Promise<StoryView> {
    const [view] = await db
      .insert(storyViews)
      .values(viewData)
      .returning();
    return view;
  }

  async createFlyerView(viewData: InsertFlyerView): Promise<FlyerView> {
    const [view] = await db
      .insert(flyerViews)
      .values(viewData)
      .returning();
    return view;
  }

  async getStoreAnalytics(storeId: string, days: number = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Contar visualizações de stories
    const [storyViewsResult] = await db
      .select({ total: count() })
      .from(storyViews)
      .where(
        and(
          eq(storyViews.storeId, storeId),
          gte(storyViews.viewedAt, startDate)
        )
      );

    // Contar visualizações de panfletos
    const [flyerViewsResult] = await db
      .select({ total: count() })
      .from(flyerViews)
      .where(
        and(
          eq(flyerViews.storeId, storeId),
          gte(flyerViews.viewedAt, startDate)
        )
      );

    // Contar curtidas de produtos da loja
    const [likesResult] = await db
      .select({ total: count() })
      .from(productLikes)
      .innerJoin(products, eq(productLikes.productId, products.id))
      .where(
        and(
          eq(products.storeId, storeId),
          gte(productLikes.likedAt, startDate)
        )
      );

    // Contar produtos salvos da loja
    const [savedResult] = await db
      .select({ total: count() })
      .from(savedProducts)
      .innerJoin(products, eq(savedProducts.productId, products.id))
      .where(
        and(
          eq(products.storeId, storeId),
          gte(savedProducts.createdAt, startDate)
        )
      );

    return {
      storyViews: storyViewsResult?.total || 0,
      flyerViews: flyerViewsResult?.total || 0,
      productLikes: likesResult?.total || 0,
      productsSaved: savedResult?.total || 0,
    };
  }

  async getTopProductsByEngagement(storeId: string, days: number = 7): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Buscar produtos com suas métricas de engajamento
    const topProducts = await db
      .select({
        id: products.id,
        name: products.name,
        category: products.category,
        imageUrl: products.imageUrl,
        likes: count(productLikes.id),
        saves: count(savedProducts.id),
        views: count(storyViews.id),
      })
      .from(products)
      .leftJoin(
        productLikes, 
        and(
          eq(productLikes.productId, products.id),
          gte(productLikes.likedAt, startDate)
        )
      )
      .leftJoin(
        savedProducts, 
        and(
          eq(savedProducts.productId, products.id),
          gte(savedProducts.createdAt, startDate)
        )
      )
      .leftJoin(
        storyViews, 
        and(
          eq(storyViews.productId, products.id),
          gte(storyViews.viewedAt, startDate)
        )
      )
      .where(eq(products.storeId, storeId))
      .groupBy(products.id, products.name, products.category, products.imageUrl)
      .orderBy(desc(count(productLikes.id)), desc(count(savedProducts.id)))
      .limit(10);

    return topProducts.map(product => ({
      ...product,
      likes: Number(product.likes),
      saves: Number(product.saves),
      views: Number(product.views),
    }));
  }


  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  // Scratch card operations
  async createScratchedProduct(scratchData: InsertScratchedProduct): Promise<ScratchedProduct> {
    const [scratch] = await db
      .insert(scratchedProducts)
      .values(scratchData)
      .returning();
    return scratch;
  }

  async getScratchedProduct(productId: string, userId?: string): Promise<ScratchedProduct | undefined> {
    const conditions = [eq(scratchedProducts.productId, productId)];
    if (userId) {
      conditions.push(eq(scratchedProducts.userId, userId));
    }

    const [scratch] = await db
      .select()
      .from(scratchedProducts)
      .where(and(...conditions))
      .orderBy(desc(scratchedProducts.scratchedAt));
    
    return scratch;
  }

  async updateScratchRedemptionCount(productId: string): Promise<void> {
    await db
      .update(products)
      .set({
        currentScratchRedemptions: (parseInt(await this.getCurrentScratchCount(productId)) + 1).toString()
      })
      .where(eq(products.id, productId));
  }

  private async getCurrentScratchCount(productId: string): Promise<string> {
    const [product] = await db
      .select({ currentScratchRedemptions: products.currentScratchRedemptions })
      .from(products)
      .where(eq(products.id, productId));
    
    return product?.currentScratchRedemptions || "0";
  }

  // Coupon operations
  async createCoupon(couponData: InsertCoupon): Promise<Coupon> {
    const [coupon] = await db
      .insert(coupons)
      .values(couponData)
      .returning();
    return coupon;
  }

  async getUserCoupons(userId?: string): Promise<CouponWithDetails[]> {
    const conditions = [];
    if (userId) {
      conditions.push(eq(coupons.userId, userId));
    }

    const userCoupons = await db
      .select({
        id: coupons.id,
        productId: coupons.productId,
        storeId: coupons.storeId,
        userId: coupons.userId,
        userAgent: coupons.userAgent,
        ipAddress: coupons.ipAddress,
        couponCode: coupons.couponCode,
        originalPrice: coupons.originalPrice,
        discountPrice: coupons.discountPrice,
        discountPercentage: coupons.discountPercentage,
        qrCode: coupons.qrCode,
        expiresAt: coupons.expiresAt,
        isRedeemed: coupons.isRedeemed,
        redeemedAt: coupons.redeemedAt,
        createdAt: coupons.createdAt,
        product: {
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          imageUrl: products.imageUrl,
          category: products.category,
        },
        store: {
          id: stores.id,
          name: stores.name,
          logoUrl: stores.logoUrl,
          themeColor: stores.themeColor,
          currency: stores.currency,
          whatsapp: stores.whatsapp,
          slug: stores.slug,
        },
      })
      .from(coupons)
      .leftJoin(products, eq(coupons.productId, products.id))
      .leftJoin(stores, eq(coupons.storeId, stores.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(coupons.createdAt));

    return userCoupons as CouponWithDetails[];
  }

  async getCouponByCode(couponCode: string): Promise<CouponWithDetails | undefined> {
    const [coupon] = await db
      .select({
        id: coupons.id,
        productId: coupons.productId,
        storeId: coupons.storeId,
        userId: coupons.userId,
        userAgent: coupons.userAgent,
        ipAddress: coupons.ipAddress,
        couponCode: coupons.couponCode,
        originalPrice: coupons.originalPrice,
        discountPrice: coupons.discountPrice,
        discountPercentage: coupons.discountPercentage,
        qrCode: coupons.qrCode,
        expiresAt: coupons.expiresAt,
        isRedeemed: coupons.isRedeemed,
        redeemedAt: coupons.redeemedAt,
        createdAt: coupons.createdAt,
        product: {
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          imageUrl: products.imageUrl,
          category: products.category,
        },
        store: {
          id: stores.id,
          name: stores.name,
          logoUrl: stores.logoUrl,
          themeColor: stores.themeColor,
          currency: stores.currency,
          whatsapp: stores.whatsapp,
          slug: stores.slug,
        },
      })
      .from(coupons)
      .leftJoin(products, eq(coupons.productId, products.id))
      .leftJoin(stores, eq(coupons.storeId, stores.id))
      .where(eq(coupons.couponCode, couponCode));

    return coupon as CouponWithDetails | undefined;
  }

  async redeemCoupon(couponCode: string): Promise<Coupon> {
    const [coupon] = await db
      .update(coupons)
      .set({
        isRedeemed: true,
        redeemedAt: new Date(),
      })
      .where(eq(coupons.couponCode, couponCode))
      .returning();
    return coupon;
  }

  // Função para verificar se produto deve aparecer na galeria
  async shouldShowProductInGallery(productId: string): Promise<boolean> {
    // Buscar produto
    const product = await this.getProductById(productId);
    if (!product) return false;
    
    // Se não é raspadinha, sempre mostrar
    if (!product.isScratchCard) return true;
    
    // Se raspadinha expirou, sempre mostrar
    if (!product.scratchExpiresAt || new Date(product.scratchExpiresAt) <= new Date()) {
      return true;
    }
    
    // Se é raspadinha ativa, verificar se atingiu o limite
    const maxRedemptions = parseInt(product.maxScratchRedemptions || "0");
    const couponsGenerated = await this.getCouponsCountForProduct(productId);
    
    // Se gerou todos os cupons disponíveis, mostrar na galeria
    return couponsGenerated >= maxRedemptions;
  }

  // Contar cupons gerados para um produto
  async getCouponsCountForProduct(productId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(coupons)
      .where(eq(coupons.productId, productId));
    
    return Number(result[0]?.count || 0);
  }

  async getCoupon(couponId: string): Promise<CouponWithDetails | undefined> {
    const [coupon] = await db
      .select({
        id: coupons.id,
        productId: coupons.productId,
        storeId: coupons.storeId,
        userId: coupons.userId,
        userAgent: coupons.userAgent,
        ipAddress: coupons.ipAddress,
        couponCode: coupons.couponCode,
        originalPrice: coupons.originalPrice,
        discountPrice: coupons.discountPrice,
        discountPercentage: coupons.discountPercentage,
        qrCode: coupons.qrCode,
        expiresAt: coupons.expiresAt,
        isRedeemed: coupons.isRedeemed,
        redeemedAt: coupons.redeemedAt,
        createdAt: coupons.createdAt,
        product: {
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          imageUrl: products.imageUrl,
          category: products.category,
        },
        store: {
          id: stores.id,
          name: stores.name,
          logoUrl: stores.logoUrl,
          themeColor: stores.themeColor,
          currency: stores.currency,
          whatsapp: stores.whatsapp,
          slug: stores.slug,
        },
      })
      .from(coupons)
      .leftJoin(products, eq(coupons.productId, products.id))
      .leftJoin(stores, eq(coupons.storeId, stores.id))
      .where(eq(coupons.id, couponId));

    return coupon as CouponWithDetails | undefined;
  }
}

export const storage = new DatabaseStorage();
