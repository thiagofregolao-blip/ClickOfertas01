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
  scratchCampaigns,
  virtualScratchClones,
  promotions,
  promotionScratches,
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
  type ScratchCampaign,
  type InsertScratchCampaign,
  type VirtualScratchClone,
  type InsertVirtualScratchClone,
  type ScratchCampaignWithDetails,
  type VirtualScratchCloneWithDetails,
  type Promotion,
  type InsertPromotion,
  type UpdatePromotion,
  type PromotionScratch,
  type InsertPromotionScratch,
  type PromotionWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;

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
  
  // Scratch Campaign operations (NEW - Virtual Clones System)
  createScratchCampaign(campaign: InsertScratchCampaign): Promise<ScratchCampaign>;
  getScratchCampaignByProduct(productId: string): Promise<ScratchCampaignWithDetails | undefined>;
  updateScratchCampaign(campaignId: string, updates: Partial<ScratchCampaign>): Promise<ScratchCampaign>;
  deactivateScratchCampaign(campaignId: string): Promise<void>;
  getCampaignStats(campaignId: string): Promise<{usedClones: number, totalClones: number, expiredClones: number}>;
  
  // Virtual Clone operations (NEW)
  createVirtualClones(campaignId: string, assignedUserIds: string[], productSnapshot: any): Promise<VirtualScratchClone[]>;
  getVirtualCloneById(cloneId: string): Promise<VirtualScratchCloneWithDetails | undefined>;
  getUserAvailableClone(userId: string, productId: string): Promise<VirtualScratchCloneWithDetails | undefined>;
  markCloneAsUsed(cloneId: string): Promise<VirtualScratchClone>;
  markExpiredClones(): Promise<void>;
  deleteUnusedClones(campaignId: string): Promise<void>;
  
  // User lottery/selection operations (NEW)
  getAllRegisteredUsers(): Promise<User[]>;
  selectRandomUsers(userPool: User[], maxSelections: number): Promise<User[]>;
  
  // Delete cupom
  deleteCoupon(couponId: string): Promise<void>;

  // NEW: Promotion operations (Simplified System)
  getStorePromotions(storeId: string): Promise<PromotionWithDetails[]>;
  getPromotion(promotionId: string): Promise<PromotionWithDetails | undefined>;
  createPromotion(storeId: string, promotion: InsertPromotion): Promise<Promotion>;
  updatePromotion(promotionId: string, updates: UpdatePromotion): Promise<Promotion>;
  deletePromotion(promotionId: string): Promise<void>;
  canUserScratchPromotion(promotionId: string, userId?: string, userAgent?: string, ipAddress?: string): Promise<{allowed: boolean, reason: string, promotion?: Promotion}>;
  createPromotionScratch(scratch: InsertPromotionScratch): Promise<PromotionScratch>;
  incrementPromotionUsage(promotionId: string): Promise<void>;
  getActivePromotions(): Promise<PromotionWithDetails[]>;
  getPromotionStats(promotionId: string): Promise<any>;
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

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    return allUsers;
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
      .set({ 
        ...productData,
        updatedAt: new Date(),
        scratchExpiresAt: productData.scratchExpiresAt ? new Date(productData.scratchExpiresAt) : null
      })
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
        imageUrl2: result.productImageUrl2 || null,
        imageUrl3: result.productImageUrl3 || null,
        category: result.productCategory,
        isFeatured: result.productIsFeatured,
        showInStories: result.productShowInStories,
        isActive: result.productIsActive,
        sortOrder: result.productSortOrder,
        isScratchCard: result.productIsScratchCard || false,
        scratchPrice: result.productScratchPrice || null,
        scratchExpiresAt: result.productScratchExpiresAt || null,
        scratchTimeLimitMinutes: result.productScratchTimeLimitMinutes || null,
        maxScratchRedemptions: result.productMaxScratchRedemptions || null,
        currentScratchRedemptions: result.productCurrentScratchRedemptions || null,
        scratchMessage: result.productScratchMessage || null,
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

  // Excluir cupom
  async deleteCoupon(couponId: string): Promise<void> {
    await db.delete(coupons).where(eq(coupons.id, couponId));
  }

  // ================================
  // SCRATCH CAMPAIGN OPERATIONS (NEW)
  // ================================

  async createScratchCampaign(campaign: InsertScratchCampaign): Promise<ScratchCampaign> {
    const [createdCampaign] = await db
      .insert(scratchCampaigns)
      .values(campaign)
      .returning();
    return createdCampaign;
  }

  async getScratchCampaignByProduct(productId: string): Promise<ScratchCampaignWithDetails | undefined> {
    const [campaign] = await db
      .select({
        id: scratchCampaigns.id,
        productId: scratchCampaigns.productId,
        storeId: scratchCampaigns.storeId,
        title: scratchCampaigns.title,
        description: scratchCampaigns.description,
        discountPrice: scratchCampaigns.discountPrice,
        discountPercentage: scratchCampaigns.discountPercentage,
        isActive: scratchCampaigns.isActive,
        maxClones: scratchCampaigns.maxClones,
        clonesCreated: scratchCampaigns.clonesCreated,
        clonesUsed: scratchCampaigns.clonesUsed,
        distributeToAll: scratchCampaigns.distributeToAll,
        selectedUserIds: scratchCampaigns.selectedUserIds,
        expiresAt: scratchCampaigns.expiresAt,
        cloneExpirationHours: scratchCampaigns.cloneExpirationHours,
        createdAt: scratchCampaigns.createdAt,
        updatedAt: scratchCampaigns.updatedAt,
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
      .from(scratchCampaigns)
      .leftJoin(products, eq(scratchCampaigns.productId, products.id))
      .leftJoin(stores, eq(scratchCampaigns.storeId, stores.id))
      .where(and(
        eq(scratchCampaigns.productId, productId),
        eq(scratchCampaigns.isActive, true)
      ));

    return campaign as ScratchCampaignWithDetails | undefined;
  }

  async updateScratchCampaign(campaignId: string, updates: Partial<ScratchCampaign>): Promise<ScratchCampaign> {
    const [updatedCampaign] = await db
      .update(scratchCampaigns)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(scratchCampaigns.id, campaignId))
      .returning();
    return updatedCampaign;
  }

  async deactivateScratchCampaign(campaignId: string): Promise<void> {
    await db
      .update(scratchCampaigns)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(scratchCampaigns.id, campaignId));
  }

  async getCampaignStats(campaignId: string): Promise<{usedClones: number, totalClones: number, expiredClones: number}> {
    const totalResult = await db
      .select({ count: count() })
      .from(virtualScratchClones)
      .where(eq(virtualScratchClones.campaignId, campaignId));

    const usedResult = await db
      .select({ count: count() })
      .from(virtualScratchClones)
      .where(and(
        eq(virtualScratchClones.campaignId, campaignId),
        eq(virtualScratchClones.isUsed, true)
      ));

    const expiredResult = await db
      .select({ count: count() })
      .from(virtualScratchClones)
      .where(and(
        eq(virtualScratchClones.campaignId, campaignId),
        eq(virtualScratchClones.isExpired, true)
      ));

    return {
      totalClones: Number(totalResult[0]?.count || 0),
      usedClones: Number(usedResult[0]?.count || 0),
      expiredClones: Number(expiredResult[0]?.count || 0),
    };
  }

  // ================================
  // VIRTUAL CLONE OPERATIONS (NEW)
  // ================================

  async createVirtualClones(campaignId: string, assignedUserIds: string[], productSnapshot: any): Promise<VirtualScratchClone[]> {
    const clonesToCreate = assignedUserIds.map((userId) => ({
      campaignId,
      productId: productSnapshot.id,
      storeId: productSnapshot.storeId,
      assignedUserId: userId,
      productName: productSnapshot.name,
      productDescription: productSnapshot.description,
      originalPrice: productSnapshot.price,
      discountPrice: productSnapshot.discountPrice,
      productImageUrl: productSnapshot.imageUrl,
      productCategory: productSnapshot.category,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas por padrão
    }));

    const createdClones = await db
      .insert(virtualScratchClones)
      .values(clonesToCreate)
      .returning();

    return createdClones;
  }

  // NOVO: Buscar todos os clones virtuais disponíveis de um usuário
  async getUserAvailableClones(userId: string): Promise<VirtualScratchCloneWithDetails[]> {
    const clones = await db
      .select({
        id: virtualScratchClones.id,
        campaignId: virtualScratchClones.campaignId,
        productId: virtualScratchClones.productId,
        storeId: virtualScratchClones.storeId,
        assignedUserId: virtualScratchClones.assignedUserId,
        productName: virtualScratchClones.productName,
        productDescription: virtualScratchClones.productDescription,
        originalPrice: virtualScratchClones.originalPrice,
        discountPrice: virtualScratchClones.discountPrice,
        productImageUrl: virtualScratchClones.productImageUrl,
        productCategory: virtualScratchClones.productCategory,
        isUsed: virtualScratchClones.isUsed,
        isExpired: virtualScratchClones.isExpired,
        notificationSent: virtualScratchClones.notificationSent,
        usedAt: virtualScratchClones.usedAt,
        expiresAt: virtualScratchClones.expiresAt,
        createdAt: virtualScratchClones.createdAt,
        campaign: {
          id: scratchCampaigns.id,
          title: scratchCampaigns.title,
          description: scratchCampaigns.description,
          discountPercentage: scratchCampaigns.discountPercentage,
        },
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
      .from(virtualScratchClones)
      .leftJoin(scratchCampaigns, eq(virtualScratchClones.campaignId, scratchCampaigns.id))
      .leftJoin(products, eq(virtualScratchClones.productId, products.id))
      .leftJoin(stores, eq(virtualScratchClones.storeId, stores.id))
      .where(and(
        eq(virtualScratchClones.assignedUserId, userId),
        eq(virtualScratchClones.isUsed, false),
        eq(virtualScratchClones.isExpired, false),
        gte(virtualScratchClones.expiresAt, new Date())
      ))
      .orderBy(virtualScratchClones.createdAt);

    return clones as VirtualScratchCloneWithDetails[];
  }

  // Buscar clone virtual por ID
  async getVirtualCloneById(cloneId: string): Promise<VirtualScratchCloneWithDetails | undefined> {
    const [clone] = await db
      .select({
        id: virtualScratchClones.id,
        campaignId: virtualScratchClones.campaignId,
        productId: virtualScratchClones.productId,
        storeId: virtualScratchClones.storeId,
        assignedUserId: virtualScratchClones.assignedUserId,
        productName: virtualScratchClones.productName,
        productDescription: virtualScratchClones.productDescription,
        originalPrice: virtualScratchClones.originalPrice,
        discountPrice: virtualScratchClones.discountPrice,
        productImageUrl: virtualScratchClones.productImageUrl,
        productCategory: virtualScratchClones.productCategory,
        isUsed: virtualScratchClones.isUsed,
        isExpired: virtualScratchClones.isExpired,
        notificationSent: virtualScratchClones.notificationSent,
        usedAt: virtualScratchClones.usedAt,
        expiresAt: virtualScratchClones.expiresAt,
        createdAt: virtualScratchClones.createdAt,
        campaign: {
          id: scratchCampaigns.id,
          title: scratchCampaigns.title,
          description: scratchCampaigns.description,
          discountPercentage: scratchCampaigns.discountPercentage,
        },
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
      .from(virtualScratchClones)
      .leftJoin(scratchCampaigns, eq(virtualScratchClones.campaignId, scratchCampaigns.id))
      .leftJoin(products, eq(virtualScratchClones.productId, products.id))
      .leftJoin(stores, eq(virtualScratchClones.storeId, stores.id))
      .where(eq(virtualScratchClones.id, cloneId));

    return clone as VirtualScratchCloneWithDetails | undefined;
  }

  async getUserAvailableClone(userId: string, productId: string): Promise<VirtualScratchCloneWithDetails | undefined> {
    const [clone] = await db
      .select({
        id: virtualScratchClones.id,
        campaignId: virtualScratchClones.campaignId,
        productId: virtualScratchClones.productId,
        storeId: virtualScratchClones.storeId,
        assignedUserId: virtualScratchClones.assignedUserId,
        productName: virtualScratchClones.productName,
        productDescription: virtualScratchClones.productDescription,
        originalPrice: virtualScratchClones.originalPrice,
        discountPrice: virtualScratchClones.discountPrice,
        productImageUrl: virtualScratchClones.productImageUrl,
        productCategory: virtualScratchClones.productCategory,
        isUsed: virtualScratchClones.isUsed,
        isExpired: virtualScratchClones.isExpired,
        notificationSent: virtualScratchClones.notificationSent,
        usedAt: virtualScratchClones.usedAt,
        expiresAt: virtualScratchClones.expiresAt,
        createdAt: virtualScratchClones.createdAt,
        campaign: {
          id: scratchCampaigns.id,
          title: scratchCampaigns.title,
          description: scratchCampaigns.description,
          discountPercentage: scratchCampaigns.discountPercentage,
        },
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
      .from(virtualScratchClones)
      .leftJoin(scratchCampaigns, eq(virtualScratchClones.campaignId, scratchCampaigns.id))
      .leftJoin(products, eq(virtualScratchClones.productId, products.id))
      .leftJoin(stores, eq(virtualScratchClones.storeId, stores.id))
      .where(and(
        eq(virtualScratchClones.assignedUserId, userId),
        eq(virtualScratchClones.productId, productId),
        eq(virtualScratchClones.isUsed, false),
        eq(virtualScratchClones.isExpired, false),
        gte(virtualScratchClones.expiresAt, new Date())
      ));

    return clone as VirtualScratchCloneWithDetails | undefined;
  }

  async markCloneAsUsed(cloneId: string): Promise<VirtualScratchClone> {
    const [updatedClone] = await db
      .update(virtualScratchClones)
      .set({
        isUsed: true,
        usedAt: new Date(),
      })
      .where(eq(virtualScratchClones.id, cloneId))
      .returning();
    return updatedClone;
  }

  async markExpiredClones(): Promise<void> {
    await db
      .update(virtualScratchClones)
      .set({
        isExpired: true,
      })
      .where(and(
        eq(virtualScratchClones.isUsed, false),
        eq(virtualScratchClones.isExpired, false),
        lte(virtualScratchClones.expiresAt, new Date())
      ));
  }

  async deleteUnusedClones(campaignId: string): Promise<void> {
    await db
      .delete(virtualScratchClones)
      .where(and(
        eq(virtualScratchClones.campaignId, campaignId),
        eq(virtualScratchClones.isUsed, false)
      ));
  }

  // ================================
  // USER LOTTERY/SELECTION OPERATIONS (NEW)
  // ================================

  async getAllRegisteredUsers(): Promise<User[]> {
    const allUsers = await db
      .select()
      .from(users)
      .where(eq(users.isEmailVerified, true)); // Só usuários verificados

    return allUsers;
  }

  async selectRandomUsers(userPool: User[], maxSelections: number): Promise<User[]> {
    // Implementação de sorteio aleatório simples
    const shuffled = [...userPool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, maxSelections);
  }

  // ================================
  // PROMOTION OPERATIONS (NEW - SIMPLIFIED SYSTEM)
  // ================================

  async getStorePromotions(storeId: string): Promise<PromotionWithDetails[]> {
    const storePromotions = await db
      .select({
        id: promotions.id,
        storeId: promotions.storeId,
        baseProductId: promotions.baseProductId,
        name: promotions.name,
        description: promotions.description,
        imageUrl: promotions.imageUrl,
        category: promotions.category,
        originalPrice: promotions.originalPrice,
        promotionalPrice: promotions.promotionalPrice,
        discountPercentage: promotions.discountPercentage,
        isActive: promotions.isActive,
        maxClients: promotions.maxClients,
        usedCount: promotions.usedCount,
        validFrom: promotions.validFrom,
        validUntil: promotions.validUntil,
        scratchMessage: promotions.scratchMessage,
        createdAt: promotions.createdAt,
        updatedAt: promotions.updatedAt,
        // Dados da loja
        storeName: stores.name,
        storeLogoUrl: stores.logoUrl,
        storeThemeColor: stores.themeColor,
      })
      .from(promotions)
      .leftJoin(stores, eq(promotions.storeId, stores.id))
      .where(eq(promotions.storeId, storeId))
      .orderBy(desc(promotions.createdAt));

    return storePromotions.map(promo => ({
      ...promo,
      store: {
        id: promo.storeId,
        name: promo.storeName,
        logoUrl: promo.storeLogoUrl,
        themeColor: promo.storeThemeColor
      }
    })) as PromotionWithDetails[];
  }

  async getPromotion(promotionId: string): Promise<PromotionWithDetails | undefined> {
    const [promotion] = await db
      .select({
        id: promotions.id,
        storeId: promotions.storeId,
        baseProductId: promotions.baseProductId,
        name: promotions.name,
        description: promotions.description,
        imageUrl: promotions.imageUrl,
        category: promotions.category,
        originalPrice: promotions.originalPrice,
        promotionalPrice: promotions.promotionalPrice,
        discountPercentage: promotions.discountPercentage,
        isActive: promotions.isActive,
        maxClients: promotions.maxClients,
        usedCount: promotions.usedCount,
        validFrom: promotions.validFrom,
        validUntil: promotions.validUntil,
        scratchMessage: promotions.scratchMessage,
        createdAt: promotions.createdAt,
        updatedAt: promotions.updatedAt,
        // Dados da loja
        storeName: stores.name,
        storeLogoUrl: stores.logoUrl,
        storeThemeColor: stores.themeColor,
      })
      .from(promotions)
      .leftJoin(stores, eq(promotions.storeId, stores.id))
      .where(eq(promotions.id, promotionId));

    if (!promotion) return undefined;

    return {
      ...promotion,
      store: {
        id: promotion.storeId,
        name: promotion.storeName,
        logoUrl: promotion.storeLogoUrl,
        themeColor: promotion.storeThemeColor
      }
    } as PromotionWithDetails;
  }

  async createPromotion(storeId: string, promotionData: InsertPromotion): Promise<Promotion> {
    // Converter strings de data para objetos Date
    const processedData = {
      ...promotionData,
      storeId: storeId,
      validFrom: promotionData.validFrom ? new Date(promotionData.validFrom) : new Date(),
      validUntil: promotionData.validUntil ? new Date(promotionData.validUntil) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias padrão
    };

    const [promotion] = await db
      .insert(promotions)
      .values(processedData)
      .returning();
    return promotion;
  }

  async updatePromotion(promotionId: string, updates: UpdatePromotion): Promise<Promotion> {
    // Converter strings de data para objetos Date se necessário
    const processedUpdates = {
      ...updates,
      updatedAt: new Date(),
    };

    // Converter datas se fornecidas
    if (updates.validFrom) {
      processedUpdates.validFrom = new Date(updates.validFrom);
    }
    if (updates.validUntil) {
      processedUpdates.validUntil = new Date(updates.validUntil);
    }

    const [promotion] = await db
      .update(promotions)
      .set(processedUpdates)
      .where(eq(promotions.id, promotionId))
      .returning();
    return promotion;
  }

  async deletePromotion(promotionId: string): Promise<void> {
    await db
      .delete(promotions)
      .where(eq(promotions.id, promotionId));
  }

  async canUserScratchPromotion(
    promotionId: string, 
    userId?: string, 
    userAgent?: string, 
    ipAddress?: string
  ): Promise<{allowed: boolean, reason: string, promotion?: Promotion}> {
    const promotion = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, promotionId))
      .then(result => result[0]);

    if (!promotion) {
      return { allowed: false, reason: "Promoção não encontrada" };
    }

    if (!promotion.isActive) {
      return { allowed: false, reason: "Promoção não está ativa" };
    }

    const now = new Date();
    if (promotion.validUntil && now > promotion.validUntil) {
      return { allowed: false, reason: "Promoção expirou" };
    }

    if (promotion.validFrom && now < promotion.validFrom) {
      return { allowed: false, reason: "Promoção ainda não iniciou" };
    }

    const maxClients = parseInt(promotion.maxClients || "0");
    const usedCount = parseInt(promotion.usedCount || "0");
    
    if (usedCount >= maxClients) {
      return { allowed: false, reason: "Limite de participantes atingido" };
    }

    // Verificar se usuário já raspou esta promoção
    if (userId || userAgent || ipAddress) {
      const conditions = [eq(promotionScratches.promotionId, promotionId)];
      
      if (userId) {
        conditions.push(eq(promotionScratches.userId, userId));
      } else {
        if (userAgent) conditions.push(eq(promotionScratches.userAgent, userAgent));
        if (ipAddress) conditions.push(eq(promotionScratches.ipAddress, ipAddress));
      }

      const existingScratch = await db
        .select()
        .from(promotionScratches)
        .where(and(...conditions))
        .then(result => result[0]);

      if (existingScratch) {
        return { allowed: false, reason: "Você já participou desta promoção" };
      }
    }

    return { allowed: true, reason: "Pode raspar", promotion };
  }

  async createPromotionScratch(scratchData: InsertPromotionScratch): Promise<PromotionScratch> {
    const [scratch] = await db
      .insert(promotionScratches)
      .values(scratchData)
      .returning();
    return scratch;
  }

  async incrementPromotionUsage(promotionId: string): Promise<void> {
    await db
      .update(promotions)
      .set({
        usedCount: (parseInt((await db.select({ usedCount: promotions.usedCount }).from(promotions).where(eq(promotions.id, promotionId)))[0]?.usedCount || "0") + 1).toString()
      })
      .where(eq(promotions.id, promotionId));
  }

  async getActivePromotions(): Promise<PromotionWithDetails[]> {
    const now = new Date();
    const activePromotions = await db
      .select({
        id: promotions.id,
        storeId: promotions.storeId,
        baseProductId: promotions.baseProductId,
        name: promotions.name,
        description: promotions.description,
        imageUrl: promotions.imageUrl,
        category: promotions.category,
        originalPrice: promotions.originalPrice,
        promotionalPrice: promotions.promotionalPrice,
        discountPercentage: promotions.discountPercentage,
        isActive: promotions.isActive,
        maxClients: promotions.maxClients,
        usedCount: promotions.usedCount,
        validFrom: promotions.validFrom,
        validUntil: promotions.validUntil,
        scratchMessage: promotions.scratchMessage,
        createdAt: promotions.createdAt,
        updatedAt: promotions.updatedAt,
        // Dados da loja
        storeName: stores.name,
        storeLogoUrl: stores.logoUrl,
        storeThemeColor: stores.themeColor,
      })
      .from(promotions)
      .leftJoin(stores, eq(promotions.storeId, stores.id))
      .where(and(
        eq(promotions.isActive, true),
        gte(promotions.validUntil, now),
        lte(promotions.validFrom, now)
      ))
      .orderBy(desc(promotions.createdAt));

    return activePromotions.map(promo => ({
      ...promo,
      store: {
        id: promo.storeId,
        name: promo.storeName,
        logoUrl: promo.storeLogoUrl,
        themeColor: promo.storeThemeColor
      }
    })) as PromotionWithDetails[];
  }

  async getPromotionScratchStatus(promotionId: string, userId?: string, userAgent?: string, ipAddress?: string): Promise<{ isUsed: boolean; scratch?: any }> {
    // Verificar se promoção existe e está ativa
    const [promotion] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, promotionId));

    if (!promotion || !promotion.isActive) {
      return { isUsed: true }; // Inativa ou inexistente = considera usada
    }

    // Verificar se ainda está no período válido
    const now = new Date();
    if (promotion.validFrom && now < new Date(promotion.validFrom)) {
      return { isUsed: true }; // Antes do início = considera usada
    }
    if (promotion.validUntil && now > new Date(promotion.validUntil)) {
      return { isUsed: true }; // Depois do fim = considera usada
    }

    // Buscar scratch existente do usuário para esta promoção
    const conditions = [eq(promotionScratches.promotionId, promotionId)];
    
    if (userId) {
      conditions.push(eq(promotionScratches.userId, userId));
    } else {
      // Para usuários não autenticados, usar userAgent + IP
      if (userAgent) conditions.push(eq(promotionScratches.userAgent, userAgent));
      if (ipAddress) conditions.push(eq(promotionScratches.ipAddress, ipAddress));
    }

    const [existingScratch] = await db
      .select()
      .from(promotionScratches)
      .where(and(...conditions));

    return {
      isUsed: !!existingScratch?.isUsed,
      scratch: existingScratch
    };
  }

  async scratchPromotion(promotionId: string, userId?: string, userAgent?: string, ipAddress?: string): Promise<{ success: boolean; message: string; coupon?: any }> {
    try {
      // Verificar se pode raspar
      const status = await this.getPromotionScratchStatus(promotionId, userId, userAgent, ipAddress);
      if (status.isUsed) {
        return { success: false, message: "Promoção já foi utilizada ou não está disponível" };
      }

      // Buscar dados da promoção
      const [promotion] = await db
        .select()
        .from(promotions)
        .where(eq(promotions.id, promotionId));

      if (!promotion) {
        return { success: false, message: "Promoção não encontrada" };
      }

      // Verificar se ainda há vagas disponíveis
      const totalScratches = await db
        .select({ count: count() })
        .from(promotionScratches)
        .where(and(
          eq(promotionScratches.promotionId, promotionId),
          eq(promotionScratches.isUsed, true)
        ));

      const currentUsage = totalScratches[0]?.count || 0;
      const maxClients = parseInt(promotion.maxClients || "0");

      if (currentUsage >= maxClients) {
        return { success: false, message: "Limite de participantes atingido" };
      }

      // Criar scratch record
      const scratchData = {
        promotionId,
        userId: userId || null,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
        isUsed: true,
        usedAt: new Date(),
        expiresAt: promotion.validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias se não especificado
        couponCode: `PROMO-${promotionId.slice(0, 8)}-${Date.now().toString(36)}`
      };

      const [scratch] = await db
        .insert(promotionScratches)
        .values(scratchData)
        .returning();

      // Atualizar contador da promoção
      await db
        .update(promotions)
        .set({ 
          usedCount: (currentUsage + 1).toString(),
          updatedAt: new Date()
        })
        .where(eq(promotions.id, promotionId));

      return {
        success: true,
        message: "Promoção raspada com sucesso!",
        coupon: {
          couponCode: scratch.couponCode,
          promotionName: promotion.name,
          discountPrice: promotion.promotionalPrice,
          originalPrice: promotion.originalPrice,
          discountPercentage: promotion.discountPercentage,
          expiresAt: promotion.validUntil,
          scratchMessage: promotion.scratchMessage
        }
      };
    } catch (error) {
      console.error("Erro ao raspar promoção:", error);
      return { success: false, message: "Erro interno do servidor" };
    }
  }

  async getPromotionStats(promotionId: string): Promise<any> {
    const promotion = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, promotionId))
      .then(result => result[0]);

    if (!promotion) {
      throw new Error("Promoção não encontrada");
    }

    const scratchCount = await db
      .select({ count: count() })
      .from(promotionScratches)
      .where(eq(promotionScratches.promotionId, promotionId))
      .then(result => result[0]?.count || 0);

    const usedCoupons = await db
      .select({ count: count() })
      .from(promotionScratches)
      .where(and(
        eq(promotionScratches.promotionId, promotionId),
        eq(promotionScratches.isUsed, true)
      ))
      .then(result => result[0]?.count || 0);

    return {
      promotion: {
        id: promotion.id,
        name: promotion.name,
        maxClients: parseInt(promotion.maxClients),
        usedCount: parseInt(promotion.usedCount || "0")
      },
      stats: {
        totalScratches: scratchCount,
        usedCoupons: usedCoupons,
        availableSlots: parseInt(promotion.maxClients || "0") - parseInt(promotion.usedCount || "0"),
        conversionRate: scratchCount > 0 ? ((usedCoupons / scratchCount) * 100).toFixed(2) : 0
      }
    };
  }
}

export const storage = new DatabaseStorage();
