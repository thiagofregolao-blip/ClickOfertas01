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
  promotionAssignments,
  instagramStories,
  instagramStoryViews,
  instagramStoryLikes,
  brazilianPrices,
  priceComparisons,
  productSuggestions,
  priceHistory,
  priceAlerts,
  banners,
  bannerViews,
  bannerClicks,
  // Sistema de raspadinha diária
  dailyPrizes,
  userDailyAttempts,
  scratchSystemConfig,
  algorithmSuggestions,
  dailyScratchResults,
  dailyScratchCards,
  campaignCounters,
  campaignPrizeTier,
  userDailyCards,
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
  type PromotionAssignment,
  type InsertPromotionAssignment,
  type UpdatePromotionAssignment,
  type PromotionWithDetails,
  type InstagramStory,
  type InsertInstagramStory,
  type UpdateInstagramStory,
  type InstagramStoryView,
  type InsertInstagramStoryView,
  type InstagramStoryLike,
  type InsertInstagramStoryLike,
  type InstagramStoryWithDetails,
  type BrazilianPrice,
  type InsertBrazilianPrice,
  type PriceComparison,
  type InsertPriceComparison,
  type ProductSuggestion,
  type InsertProductSuggestion,
  type PriceComparisonWithDetails,
  type PriceHistory,
  type InsertPriceHistory,
  type PriceAlert,
  type InsertPriceAlert,
  type Banner,
  type InsertBanner,
  // Tipos do sistema de raspadinha diária
  type DailyPrize,
  type InsertDailyPrize,
  type UserDailyAttempt,
  type InsertUserDailyAttempt,
  type ScratchSystemConfig,
  type InsertScratchSystemConfig,
  type AlgorithmSuggestion,
  type InsertAlgorithmSuggestion,
  type DailyScratchResult,
  type InsertDailyScratchResult,
  type DailyScratchCard,
  type InsertDailyScratchCard,
  type CampaignCounters,
  type InsertCampaignCounters,
  type CampaignPrizeTier,
  type InsertCampaignPrizeTier,
  type UserDailyCards,
  type InsertUserDailyCards,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, count, gte, lte, sql, inArray, or, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;

  // Store operations
  getUserStore(userId: string): Promise<Store | undefined>;
  createStore(userId: string, store: InsertStore): Promise<Store>;
  updateStore(storeId: string, store: UpdateStore): Promise<Store>;
  getStoreBySlug(slug: string): Promise<StoreWithProducts | undefined>;
  getAllActiveStores(): Promise<StoreWithProducts[]>;
  getAllStores(): Promise<StoreWithProducts[]>;
  deleteStore(storeId: string, userId: string, isSuperAdmin?: boolean): Promise<void>;

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
  
  // 🧹 MÉTODO TEMPORÁRIO: Excluir todos os cupons do usuário (para testes)
  deleteAllUserCoupons(userId: string): Promise<void>;

  // NEW: Promotion operations (Simplified System)
  getStorePromotions(storeId: string): Promise<PromotionWithDetails[]>;
  getPromotion(promotionId: string): Promise<PromotionWithDetails | undefined>;
  createPromotion(storeId: string, promotion: InsertPromotion): Promise<Promotion>;
  updatePromotion(promotionId: string, updates: UpdatePromotion): Promise<Promotion>;
  deletePromotion(promotionId: string): Promise<void>;
  canUserScratchPromotion(promotionId: string, userId?: string, userAgent?: string, ipAddress?: string): Promise<{allowed: boolean, reason: string, promotion?: Promotion}>;
  createPromotionScratch(scratch: InsertPromotionScratch): Promise<PromotionScratch>;
  incrementPromotionUsage(promotionId: string): Promise<boolean>;
  getActivePromotions(): Promise<PromotionWithDetails[]>;
  getPromotionStats(promotionId: string): Promise<any>;

  // NEW: Promotion Assignment operations (User-specific promotions)
  createPromotionAssignment(assignment: InsertPromotionAssignment): Promise<PromotionAssignment>;
  createPromotionAssignments(assignments: InsertPromotionAssignment[]): Promise<PromotionAssignment[]>;
  getUserPromotionAssignments(userId: string, storeId: string): Promise<PromotionAssignment[]>;
  updatePromotionAssignmentStatus(promotionId: string, userId: string, status: 'assigned' | 'generated' | 'redeemed'): Promise<PromotionAssignment>;
  getMyAvailablePromotions(userId: string, storeId: string): Promise<PromotionWithDetails[]>;
  hasUserGeneratedCoupon(promotionId: string, userId: string): Promise<boolean>;

  // NEW: Instagram Stories operations 
  createInstagramStory(story: InsertInstagramStory): Promise<InstagramStory>;
  getStoreInstagramStories(storeId: string): Promise<InstagramStoryWithDetails[]>;
  getAllActiveInstagramStories(): Promise<InstagramStoryWithDetails[]>;
  getInstagramStory(storyId: string): Promise<InstagramStoryWithDetails | undefined>;
  updateInstagramStory(storyId: string, updates: UpdateInstagramStory): Promise<InstagramStory>;
  deleteInstagramStory(storyId: string): Promise<void>;
  createInstagramStoryView(view: InsertInstagramStoryView): Promise<InstagramStoryView>;
  createInstagramStoryLike(like: InsertInstagramStoryLike): Promise<InstagramStoryLike>;
  removeInstagramStoryLike(storyId: string, userId: string): Promise<void>;
  incrementStoryViewsCount(storyId: string): Promise<void>;
  incrementStoryLikesCount(storyId: string): Promise<void>;
  decrementStoryLikesCount(storyId: string): Promise<void>;
  getUserInstagramStories(userId: string): Promise<InstagramStoryWithDetails[]>;
  expireOldStories(): Promise<void>;

  // NEW: Store user management (for dual authentication)
  createStoreUser(storeId: string, storeData: any): Promise<User>;
  getStoreUser(storeId: string): Promise<User | undefined>;

  // Price comparison operations
  getProductsForComparison(): Promise<Product[]>;
  getProductWithStore(productId: string): Promise<(Product & { store?: Store }) | undefined>;
  getAllProducts(): Promise<Product[]>;
  saveBrazilianPrice(priceData: InsertBrazilianPrice): Promise<BrazilianPrice>;
  getBrazilianPricesByProduct(productName: string): Promise<BrazilianPrice[]>;
  savePriceComparison(comparison: InsertPriceComparison): Promise<PriceComparison>;
  getUserPriceComparisons(userId: string): Promise<PriceComparisonWithDetails[]>;
  saveProductSuggestion(suggestion: InsertProductSuggestion): Promise<ProductSuggestion>;

  // Price alerts operations
  createPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert>;
  getUserPriceAlerts(userId: string): Promise<PriceAlert[]>;
  getPriceAlert(alertId: string): Promise<PriceAlert | undefined>;
  deletePriceAlert(alertId: string): Promise<void>;

  // Daily Scratch System operations
  getDailyPrizes(): Promise<DailyPrize[]>;
  getActiveDailyPrizes(): Promise<DailyPrize[]>;
  getDailyPrize(prizeId: string): Promise<DailyPrize | undefined>;
  createDailyPrize(prize: InsertDailyPrize): Promise<DailyPrize>;
  updateDailyPrize(prizeId: string, updates: Partial<DailyPrize>): Promise<DailyPrize>;
  incrementPrizeWins(prizeId: string): Promise<void>;

  getUserDailyAttempt(userId: string, date: string): Promise<UserDailyAttempt[]>;
  createUserDailyAttempt(attempt: InsertUserDailyAttempt): Promise<UserDailyAttempt>;

  getScratchSystemConfig(): Promise<ScratchSystemConfig | undefined>;
  updateScratchSystemConfig(updates: Partial<ScratchSystemConfig>): Promise<ScratchSystemConfig>;

  // ✅ NOVOS MÉTODOS PARA O SISTEMA "1 EM N" ATÔMICO
  getCampaignCountersForUpdate(date: string): Promise<CampaignCounters | undefined>;
  getOrCreateCampaignCounters(date: string): Promise<CampaignCounters>;
  updateCampaignCounters(id: string, data: Partial<CampaignCounters>): Promise<CampaignCounters>;
  getOrCreateUserDailyCards(userId: string, date: string): Promise<UserDailyCards>;
  updateUserDailyCards(id: string, data: Partial<UserDailyCards>): Promise<UserDailyCards>;
  getCampaignPrizeTiers(): Promise<CampaignPrizeTier[]>;
  getAvailableTiersByQuota(date: string): Promise<CampaignPrizeTier[]>;
  pickWeightedTier(availableTiers: CampaignPrizeTier[]): CampaignPrizeTier | null;
  countUserWinsToday(userId: string, date: string): Promise<number>;

  getAlgorithmSuggestions(): Promise<AlgorithmSuggestion[]>;
  updateAlgorithmSuggestion(suggestionId: string, updates: Partial<AlgorithmSuggestion>): Promise<AlgorithmSuggestion>;

  createDailyScratchResult(result: InsertDailyScratchResult): Promise<DailyScratchResult>;
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

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Store operations
  async getUserStore(userId: string): Promise<Store | undefined> {
    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.userId, userId));
    return store;
  }

  async getStore(storeId: string): Promise<Store | undefined> {
    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId));
    return store;
  }

  async createStore(userId: string, storeData: InsertStore): Promise<Store> {
    const slug = this.generateSlug(storeData.name);
    
    // Ensure customUsdBrlRate is converted to string if it's a number
    const processedData = {
      ...storeData,
      customUsdBrlRate: storeData.customUsdBrlRate !== undefined ? 
        String(storeData.customUsdBrlRate) : undefined,
    };
    
    const [store] = await db
      .insert(stores)
      .values({
        ...processedData,
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

  async getAllStores(): Promise<StoreWithProducts[]> {
    const allStores = await db
      .select()
      .from(stores)
      .orderBy(desc(stores.createdAt));
    
    const storesWithProducts = await Promise.all(
      allStores.map(async (store) => {
        const storeProducts = await db
          .select()
          .from(products)
          .where(eq(products.storeId, store.id))
          .orderBy(desc(products.isFeatured), products.sortOrder, products.createdAt);

        return {
          ...store,
          products: storeProducts,
        };
      })
    );

    return storesWithProducts;
  }

  async deleteStore(storeId: string, userId: string, isSuperAdmin = false): Promise<void> {
    // Usar transação para garantir consistência dos dados
    await db.transaction(async (tx) => {
      // Primeiro deletar todos os produtos da loja (e dados relacionados)
      const storeProducts = await tx
        .select({ id: products.id })
        .from(products)
        .where(eq(products.storeId, storeId));
      
      const productIds = storeProducts.map(p => p.id);
      
      if (productIds.length > 0) {
        // Deletar likes dos produtos
        await tx
          .delete(productLikes)
          .where(inArray(productLikes.productId, productIds));
        
        // Deletar produtos salvos
        await tx
          .delete(savedProducts)
          .where(inArray(savedProducts.productId, productIds));
        
        // Deletar visualizações de story dos produtos
        await tx
          .delete(storyViews)
          .where(inArray(storyViews.productId, productIds));
        
        // Deletar produtos riscados
        await tx
          .delete(scratchedProducts)
          .where(inArray(scratchedProducts.productId, productIds));
        
        // Deletar produtos finalmente
        await tx
          .delete(products)
          .where(eq(products.storeId, storeId));
      }
      
      // Deletar dados relacionados diretamente à loja
      
      // Deletar cupons da loja
      await tx
        .delete(coupons)
        .where(eq(coupons.storeId, storeId));
      
      // Deletar clones virtuais de raspadinha
      await tx
        .delete(virtualScratchClones)
        .where(eq(virtualScratchClones.storeId, storeId));
      
      // Deletar campanhas de raspadinha
      await tx
        .delete(scratchCampaigns)
        .where(eq(scratchCampaigns.storeId, storeId));
      
      // Deletar promoções da loja
      await tx
        .delete(promotions)
        .where(eq(promotions.storeId, storeId));
      
      // Deletar stories do Instagram da loja
      await tx
        .delete(instagramStories)
        .where(eq(instagramStories.storeId, storeId));
      
      // Deletar visualizações de story da loja
      await tx
        .delete(storyViews)
        .where(eq(storyViews.storeId, storeId));
      
      // Deletar visualizações de flyer da loja
      await tx
        .delete(flyerViews)
        .where(eq(flyerViews.storeId, storeId));
      
      // Finalmente deletar a loja
      if (isSuperAdmin) {
        // Super admin pode deletar qualquer loja
        await tx
          .delete(stores)
          .where(eq(stores.id, storeId));
      } else {
        // Usuário normal só pode deletar suas próprias lojas
        await tx
          .delete(stores)
          .where(and(eq(stores.id, storeId), eq(stores.userId, userId)));
      }
    });
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
        imageUrl2: result.productImageUrl || null,
        imageUrl3: result.productImageUrl || null,
        category: result.productCategory,
        isFeatured: result.productIsFeatured,
        showInStories: result.productShowInStories,
        isActive: result.productIsActive,
        sortOrder: result.productSortOrder,
        isScratchCard: false,
        scratchPrice: null,
        scratchExpiresAt: null,
        scratchTimeLimitMinutes: null,
        maxScratchRedemptions: null,
        currentScratchRedemptions: null,
        scratchMessage: null,
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
        
        // 🎯 DADOS DA PROMOÇÃO (novos campos)
        promotionName: coupons.promotionName,
        promotionImageUrl: coupons.promotionImageUrl, 
        promotionDescription: coupons.promotionDescription,
        
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

  // 🧹 MÉTODO TEMPORÁRIO: Excluir todos os cupons do usuário (para testes)
  async deleteAllUserCoupons(userId: string): Promise<void> {
    await db.delete(coupons).where(eq(coupons.userId, userId));
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
        name: promo.storeName || 'Loja',
        logoUrl: promo.storeLogoUrl,
        themeColor: promo.storeThemeColor,
        isActive: true,
        address: null,
        createdAt: null,
        updatedAt: null,
        userId: '',
        currency: 'Gs.',
        displayCurrency: 'local',
        dollarRate: '7500',
        customUsdBrlRate: null,
        whatsapp: null,
        instagram: null,
        latitude: null,
        longitude: null,
        slug: null
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
        name: promotion.storeName || 'Loja',
        logoUrl: promotion.storeLogoUrl,
        themeColor: promotion.storeThemeColor,
        isActive: true,
        address: null,
        createdAt: null,
        updatedAt: null,
        userId: '',
        currency: 'Gs.',
        displayCurrency: 'local',
        dollarRate: '7500',
        customUsdBrlRate: null,
        whatsapp: null,
        instagram: null,
        latitude: null,
        longitude: null,
        slug: null
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

  async incrementPromotionUsage(promotionId: string): Promise<boolean> {
    console.log('📊 incrementPromotionUsage - iniciando para promotionId:', promotionId);
    
    // Incremento atômico com verificação de limite para prevenir condição de corrida
    const result = await db
      .update(promotions)
      .set({
        usedCount: sql`CAST(${promotions.usedCount} AS INTEGER) + 1`,
        updatedAt: new Date()
      })
      .where(and(
        eq(promotions.id, promotionId),
        sql`CAST(${promotions.usedCount} AS INTEGER) < CAST(${promotions.maxClients} AS INTEGER)` // Só incrementa se ainda tem vaga
      ))
      .returning({ usedCount: promotions.usedCount });
    
    if (result.length === 0) {
      console.log('❌ Não foi possível incrementar - limite atingido ou promoção não encontrada');
      return false;
    }
    
    console.log('✅ Contador usedCount incrementado atomicamente para:', result[0].usedCount);
    return true;
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
        name: promo.storeName || 'Loja',
        logoUrl: promo.storeLogoUrl,
        themeColor: promo.storeThemeColor,
        isActive: true,
        address: null,
        createdAt: null,
        updatedAt: null,
        userId: '',
        currency: 'Gs.',
        displayCurrency: 'local',
        dollarRate: '7500',
        customUsdBrlRate: null,
        whatsapp: null,
        instagram: null,
        latitude: null,
        longitude: null,
        slug: null
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
      isUsed: !!existingScratch, // Se existe qualquer registro = já foi usado
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
        maxClients: parseInt(promotion.maxClients || "0"),
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

  // NEW: Promotion Assignment operations (User-specific promotions)
  async createPromotionAssignment(assignment: InsertPromotionAssignment): Promise<PromotionAssignment> {
    const [result] = await db
      .insert(promotionAssignments)
      .values(assignment)
      .returning();
    return result;
  }

  async createPromotionAssignments(assignments: InsertPromotionAssignment[]): Promise<PromotionAssignment[]> {
    if (assignments.length === 0) return [];
    
    const results = await db
      .insert(promotionAssignments)
      .values(assignments)
      .returning();
    return results;
  }

  async getUserPromotionAssignments(userId: string, storeId: string): Promise<PromotionAssignment[]> {
    const results = await db
      .select()
      .from(promotionAssignments)
      .innerJoin(promotions, eq(promotionAssignments.promotionId, promotions.id))
      .where(and(
        eq(promotionAssignments.userId, userId),
        eq(promotions.storeId, storeId)
      ));
    
    return results.map(r => r.promotion_assignments);
  }

  async updatePromotionAssignmentStatus(promotionId: string, userId: string, status: 'assigned' | 'generated' | 'redeemed'): Promise<PromotionAssignment> {
    const [result] = await db
      .update(promotionAssignments)
      .set({ status })
      .where(and(
        eq(promotionAssignments.promotionId, promotionId),
        eq(promotionAssignments.userId, userId)
      ))
      .returning();
    return result;
  }

  async getMyAvailablePromotions(userId: string, storeId: string): Promise<PromotionWithDetails[]> {
    // FASE 1: Buscar promoções já atribuídas ao usuário (comportamento original)
    const existingResults = await db
      .select({
        promotion: promotions,
        store: stores,
      })
      .from(promotions)
      .innerJoin(stores, eq(promotions.storeId, stores.id))
      .innerJoin(promotionAssignments, eq(promotions.id, promotionAssignments.promotionId))
      .where(and(
        eq(promotions.storeId, storeId),
        eq(promotions.isActive, true),
        eq(promotionAssignments.userId, userId),
        eq(promotionAssignments.status, 'assigned') // Apenas promoções ainda não raspadas
      ));

    console.log(`🎯 Promoções já atribuídas ao usuário ${userId}:`, existingResults.length);

    // FASE 2: Se não há promoções atribuídas, tentar distribuir automaticamente
    if (existingResults.length === 0) {
      console.log('🎲 Não há promoções atribuídas, iniciando distribuição automática...');
      
      // Buscar promoções ativas da loja que ainda têm vagas disponíveis (com ordem aleatória)
      const availablePromotions = await db
        .select({
          promotion: promotions,
          store: stores,
        })
        .from(promotions)
        .innerJoin(stores, eq(promotions.storeId, stores.id))
        .where(and(
          eq(promotions.storeId, storeId),
          eq(promotions.isActive, true),
          sql`CAST(${promotions.usedCount} AS INTEGER) < CAST(${promotions.maxClients} AS INTEGER)` // Ainda tem vagas
        ))
        .orderBy(sql`RANDOM()`) // ✅ Correção: Ordenação aleatória para variar os produtos

      console.log(`🏪 Promoções disponíveis na loja:`, availablePromotions.length);

      // ✅ Correção: Filtrar promoções que o usuário ainda não tem assignments (incluindo generated/redeemed)
      const userAssignments = await db
        .select({
          promotionId: promotionAssignments.promotionId,
          status: promotionAssignments.status
        })
        .from(promotionAssignments)
        .where(and(
          eq(promotionAssignments.userId, userId),
          inArray(promotionAssignments.promotionId, availablePromotions.map(p => p.promotion.id))
        ));

      console.log(`🔍 User assignments encontrados:`, userAssignments.map(a => ({ id: a.promotionId, status: a.status })));

      // Excluir promoções que já têm assignment (qualquer status)
      const assignedPromotionIds = new Set(userAssignments.map(a => a.promotionId));
      const newPromotions = availablePromotions.filter(p => !assignedPromotionIds.has(p.promotion.id));

      console.log(`✨ Novas promoções para atribuir:`, newPromotions.length);

      // ✅ Correção: Criar assignment para apenas UMA promoção por vez
      if (newPromotions.length > 0) {
        const selectedPromotion = newPromotions[0]; // Pega apenas a primeira (já está em ordem aleatória)
        
        const newAssignment = {
          promotionId: selectedPromotion.promotion.id,
          userId: userId,
          status: 'assigned' as const,
        };

        await db.insert(promotionAssignments).values([newAssignment]);
        console.log(`🎉 Criado 1 assignment automático para usuário ${userId}: ${selectedPromotion.promotion.name}`);

        return [{
          ...selectedPromotion.promotion,
          store: selectedPromotion.store
        }];
      }
    }

    // Retornar promoções existentes, mas filtrar as que já esgotaram
    const validPromotions = existingResults.filter(r => {
      const usedCount = parseInt(r.promotion.usedCount || "0");
      const maxClients = parseInt(r.promotion.maxClients || "0");
      return usedCount < maxClients; // Apenas promoções que ainda têm vagas
    });

    // ✅ Correção: Dupla verificação para garantir que produtos já raspados não apareçam
    const finalPromotions = [];
    for (const r of validPromotions) {
      // Verificação 1: Status no promotionAssignments
      const [statusCheck] = await db
        .select({ status: promotionAssignments.status })
        .from(promotionAssignments)
        .where(and(
          eq(promotionAssignments.promotionId, r.promotion.id),
          eq(promotionAssignments.userId, userId)
        ))
        .limit(1);

      if (statusCheck?.status === 'generated' || statusCheck?.status === 'redeemed') {
        console.log(`🚫 Promoção ${r.promotion.name} excluída - status: ${statusCheck.status}`);
        continue;
      }

      // Verificação 2: Cupom já existe
      const alreadyGenerated = await this.hasUserGeneratedCoupon(r.promotion.id, userId);
      if (!alreadyGenerated) {
        finalPromotions.push(r);
        console.log(`✅ Promoção ${r.promotion.name} aprovada para usuário ${userId}`);
      } else {
        console.log(`🚫 Promoção ${r.promotion.name} excluída - usuário ${userId} já possui cupom`);
      }
    }

    console.log(`🎯 Promoções finais retornadas: ${finalPromotions.length}`);
    return finalPromotions.map(r => ({
      ...r.promotion,
      store: r.store
    }));
  }

  async hasUserGeneratedCoupon(promotionId: string, userId: string): Promise<boolean> {
    console.log('🔍 hasUserGeneratedCoupon - Verificando:', { promotionId, userId });
    
    // PRIORIDADE 1: Verificar na tabela promotionAssignments (mais confiável)
    const [assignmentResult] = await db
      .select({ count: count() })
      .from(promotionAssignments)
      .where(and(
        eq(promotionAssignments.promotionId, promotionId),
        eq(promotionAssignments.userId, userId),
        sql`${promotionAssignments.status} IN ('generated', 'redeemed')`
      ));
    
    console.log('📊 Assignment count:', assignmentResult?.count || 0);
    if ((assignmentResult?.count || 0) > 0) {
      console.log('✅ Usuário já gerou cupom (via assignments)');
      return true;
    }

    // FALLBACK: Verificar na tabela coupons (backup)
    const promotion = await db.select({ name: promotions.name }).from(promotions).where(eq(promotions.id, promotionId)).limit(1);
    if (promotion.length > 0) {
      console.log('🔍 Verificando coupons por nome da promoção:', promotion[0].name);
      const [couponResult] = await db
        .select({ count: count() })
        .from(coupons)
        .where(and(
          eq(coupons.userId, userId),
          eq(coupons.promotionName, promotion[0].name)
        ));
      
      console.log('📊 Coupon count:', couponResult?.count || 0);
      if ((couponResult?.count || 0) > 0) {
        console.log('✅ Usuário já gerou cupom (via coupons)');
        return true;
      }
    }
    
    console.log('❌ Usuário não gerou cupom ainda');
    return false;
  }

  // NEW: Instagram Stories operations implementation
  async createInstagramStory(storyData: InsertInstagramStory): Promise<InstagramStory> {
    const [story] = await db
      .insert(instagramStories)
      .values({
        ...storyData,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      })
      .returning();
    return story;
  }

  async getStoreInstagramStories(storeId: string): Promise<InstagramStoryWithDetails[]> {
    // Expire old stories first
    await this.expireOldStories();

    const results = await db
      .select({
        story: instagramStories,
        store: stores,
        user: users,
      })
      .from(instagramStories)
      .innerJoin(stores, eq(instagramStories.storeId, stores.id))
      .innerJoin(users, eq(instagramStories.userId, users.id))
      .where(and(
        eq(instagramStories.storeId, storeId),
        eq(instagramStories.isActive, true),
        gte(instagramStories.expiresAt, new Date())
      ))
      .orderBy(desc(instagramStories.createdAt));

    return results.map(r => ({
      ...r.story,
      store: r.store,
      user: r.user,
    }));
  }

  async getAllActiveInstagramStories(): Promise<InstagramStoryWithDetails[]> {
    // Expire old stories first
    await this.expireOldStories();

    const results = await db
      .select({
        story: instagramStories,
        store: stores,
        user: users,
      })
      .from(instagramStories)
      .innerJoin(stores, eq(instagramStories.storeId, stores.id))
      .innerJoin(users, eq(instagramStories.userId, users.id))
      .where(and(
        eq(instagramStories.isActive, true),
        gte(instagramStories.expiresAt, new Date())
      ))
      .orderBy(desc(instagramStories.createdAt));

    return results.map(r => ({
      ...r.story,
      store: r.store,
      user: r.user,
    }));
  }

  async getInstagramStory(storyId: string): Promise<InstagramStoryWithDetails | undefined> {
    const [result] = await db
      .select({
        story: instagramStories,
        store: stores,
        user: users,
      })
      .from(instagramStories)
      .innerJoin(stores, eq(instagramStories.storeId, stores.id))
      .innerJoin(users, eq(instagramStories.userId, users.id))
      .where(eq(instagramStories.id, storyId));

    if (!result) return undefined;

    return {
      ...result.story,
      store: result.store,
      user: result.user,
    };
  }

  async updateInstagramStory(storyId: string, updates: UpdateInstagramStory): Promise<InstagramStory> {
    const [story] = await db
      .update(instagramStories)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(instagramStories.id, storyId))
      .returning();
    return story;
  }

  async deleteInstagramStory(storyId: string): Promise<void> {
    await db
      .delete(instagramStories)
      .where(eq(instagramStories.id, storyId));
  }

  async createInstagramStoryView(view: InsertInstagramStoryView): Promise<InstagramStoryView> {
    const [storyView] = await db
      .insert(instagramStoryViews)
      .values(view)
      .returning();
    return storyView;
  }

  async createInstagramStoryLike(like: InsertInstagramStoryLike): Promise<InstagramStoryLike> {
    const [storyLike] = await db
      .insert(instagramStoryLikes)
      .values(like)
      .returning();
    return storyLike;
  }

  async removeInstagramStoryLike(storyId: string, userId: string): Promise<void> {
    await db
      .delete(instagramStoryLikes)
      .where(and(
        eq(instagramStoryLikes.storyId, storyId),
        eq(instagramStoryLikes.userId, userId)
      ));
  }

  async incrementStoryViewsCount(storyId: string): Promise<void> {
    await db
      .update(instagramStories)
      .set({
        viewsCount: sql`CAST(${instagramStories.viewsCount} AS INTEGER) + 1`,
        updatedAt: new Date(),
      })
      .where(eq(instagramStories.id, storyId));
  }

  async incrementStoryLikesCount(storyId: string): Promise<void> {
    await db
      .update(instagramStories)
      .set({
        likesCount: sql`CAST(${instagramStories.likesCount} AS INTEGER) + 1`,
        updatedAt: new Date(),
      })
      .where(eq(instagramStories.id, storyId));
  }

  async decrementStoryLikesCount(storyId: string): Promise<void> {
    await db
      .update(instagramStories)
      .set({
        likesCount: sql`CAST(${instagramStories.likesCount} AS INTEGER) - 1`,
        updatedAt: new Date(),
      })
      .where(eq(instagramStories.id, storyId));
  }

  async getUserInstagramStories(userId: string): Promise<InstagramStoryWithDetails[]> {
    const results = await db
      .select({
        story: instagramStories,
        store: stores,
        user: users,
      })
      .from(instagramStories)
      .innerJoin(stores, eq(instagramStories.storeId, stores.id))
      .innerJoin(users, eq(instagramStories.userId, users.id))
      .where(eq(instagramStories.userId, userId))
      .orderBy(desc(instagramStories.createdAt));

    return results.map(r => ({
      ...r.story,
      store: r.store,
      user: r.user,
    }));
  }

  async expireOldStories(): Promise<void> {
    await db
      .update(instagramStories)
      .set({ 
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(
        eq(instagramStories.isActive, true),
        lte(instagramStories.expiresAt, new Date())
      ));
  }

  // NEW: Store user management (for dual authentication)
  async createStoreUser(storeId: string, storeData: any): Promise<User> {
    const store = await db.select().from(stores).where(eq(stores.id, storeId));
    if (!store.length) throw new Error('Store not found');

    const storeInfo = store[0];
    
    // Create a user account for the store with store's email pattern
    const storeEmail = `${storeInfo.slug}@click-ofertas.local`;
    
    const [user] = await db
      .insert(users)
      .values({
        email: storeEmail,
        firstName: storeInfo.name,
        lastName: "Store",
        provider: 'store',
        isEmailVerified: true, // Store users are pre-verified
        profileImageUrl: storeInfo.logoUrl,
        // Store-specific metadata could go here
      })
      .returning();
    
    return user;
  }

  async getStoreUser(storeId: string): Promise<User | undefined> {
    const store = await db.select().from(stores).where(eq(stores.id, storeId));
    if (!store.length) return undefined;

    const storeInfo = store[0];
    const storeEmail = `${storeInfo.slug}@click-ofertas.local`;
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, storeEmail));
    
    return user;
  }

  // Price comparison operations
  async getProductsForComparison(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.isActive, true))
      .orderBy(desc(products.createdAt))
      .limit(100);
  }

  async getProductWithStore(productId: string): Promise<(Product & { store?: Store }) | undefined> {
    const result = await db
      .select({
        product: products,
        store: stores,
      })
      .from(products)
      .leftJoin(stores, eq(products.storeId, stores.id))
      .where(eq(products.id, productId))
      .limit(1);

    if (!result.length) return undefined;

    return {
      ...result[0].product,
      store: result[0].store || undefined,
    };
  }

  async getAllProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.isActive, true));
  }

  async saveBrazilianPrice(priceData: InsertBrazilianPrice): Promise<BrazilianPrice> {
    const [price] = await db
      .insert(brazilianPrices)
      .values(priceData)
      .onConflictDoUpdate({
        target: [brazilianPrices.productUrl],
        set: {
          price: priceData.price,
          availability: priceData.availability,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    return price;
  }

  async getBrazilianPricesByProduct(productName: string): Promise<BrazilianPrice[]> {
    return await db
      .select()
      .from(brazilianPrices)
      .where(
        and(
          eq(brazilianPrices.isActive, true),
          sql`LOWER(${brazilianPrices.productName}) LIKE LOWER(${`%${productName}%`})`
        )
      )
      .orderBy(desc(brazilianPrices.updatedAt));
  }

  async savePriceComparison(comparison: InsertPriceComparison): Promise<PriceComparison> {
    const [result] = await db
      .insert(priceComparisons)
      .values(comparison)
      .returning();
    
    return result;
  }

  async getUserPriceComparisons(userId: string): Promise<PriceComparisonWithDetails[]> {
    const results = await db
      .select({
        comparison: priceComparisons,
        product: products,
        store: stores,
      })
      .from(priceComparisons)
      .leftJoin(products, eq(priceComparisons.productId, products.id))
      .leftJoin(stores, eq(products.storeId, stores.id))
      .where(eq(priceComparisons.userId, userId))
      .orderBy(desc(priceComparisons.createdAt))
      .limit(50);

    return results.map(r => ({
      ...r.comparison,
      product: r.product || undefined,
      store: r.store || undefined,
    }));
  }

  async saveProductSuggestion(suggestion: InsertProductSuggestion): Promise<ProductSuggestion> {
    const [result] = await db
      .insert(productSuggestions)
      .values(suggestion)
      .returning();
    
    return result;
  }

  // Price alerts operations
  async createPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert> {
    const [result] = await db
      .insert(priceAlerts)
      .values(alert)
      .returning();
    
    return result;
  }

  async getUserPriceAlerts(userId: string): Promise<PriceAlert[]> {
    return await db
      .select()
      .from(priceAlerts)
      .where(
        and(
          eq(priceAlerts.userId, userId),
          eq(priceAlerts.isActive, true)
        )
      )
      .orderBy(desc(priceAlerts.createdAt));
  }

  async getPriceAlert(alertId: string): Promise<PriceAlert | undefined> {
    const [alert] = await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.id, alertId));
    
    return alert;
  }

  async deletePriceAlert(alertId: string): Promise<void> {
    await db
      .update(priceAlerts)
      .set({ isActive: false })
      .where(eq(priceAlerts.id, alertId));
  }

  // Banner operations
  async getAllActiveBanners(): Promise<Banner[]> {
    return await db
      .select()
      .from(banners)
      .where(
        and(
          eq(banners.isActive, true),
          sql`(${banners.endsAt} IS NULL OR ${banners.endsAt} > NOW())`
        )
      )
      .orderBy(banners.priority, desc(banners.createdAt));
  }

  async getAllBanners(): Promise<Banner[]> {
    return await db
      .select()
      .from(banners)
      .orderBy(banners.priority, desc(banners.createdAt));
  }

  async getBanner(bannerId: string): Promise<Banner | undefined> {
    const [banner] = await db
      .select()
      .from(banners)
      .where(eq(banners.id, bannerId));
    
    return banner;
  }

  async createBanner(bannerData: InsertBanner): Promise<Banner> {
    const [banner] = await db
      .insert(banners)
      .values(bannerData)
      .returning();
    
    return banner;
  }

  async updateBanner(bannerId: string, updates: Partial<InsertBanner>): Promise<Banner | undefined> {
    const [banner] = await db
      .update(banners)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(banners.id, bannerId))
      .returning();
    
    return banner;
  }

  async deleteBanner(bannerId: string): Promise<void> {
    await db
      .delete(banners)
      .where(eq(banners.id, bannerId));
  }

  async recordBannerView(bannerId: string, userId?: string, userAgent?: string, ipAddress?: string): Promise<void> {
    // Inserir view
    await db
      .insert(bannerViews)
      .values({
        bannerId,
        userId,
        userAgent,
        ipAddress,
      });

    // Incrementar contador
    await db
      .update(banners)
      .set({
        viewsCount: sql`CAST(${banners.viewsCount} AS INTEGER) + 1`,
        updatedAt: new Date(),
      })
      .where(eq(banners.id, bannerId));
  }

  async recordBannerClick(bannerId: string, userId?: string, userAgent?: string, ipAddress?: string): Promise<void> {
    // Inserir click
    await db
      .insert(bannerClicks)
      .values({
        bannerId,
        userId,
        userAgent,
        ipAddress,
      });

    // Incrementar contador - sem usar CAST por problemas de compatibilidade
    const currentBanner = await db.select({ clicksCount: banners.clicksCount }).from(banners).where(eq(banners.id, bannerId)).limit(1);
    const currentClicks = parseInt(currentBanner[0]?.clicksCount || '0');
    
    await db
      .update(banners)
      .set({
        clicksCount: (currentClicks + 1).toString(),
        updatedAt: new Date(),
      })
      .where(eq(banners.id, bannerId));
  }

  // ==========================================
  // SISTEMA DE RASPADINHA DIÁRIA INTELIGENTE
  // ==========================================

  async getDailyPrizes(): Promise<DailyPrize[]> {
    return await db.select().from(dailyPrizes).orderBy(desc(dailyPrizes.createdAt));
  }

  async getActiveDailyPrizes(): Promise<DailyPrize[]> {
    // Consulta com filtros de vigência para prêmios ativos e válidos
    const now = sql`now()`;
    return await db.select()
      .from(dailyPrizes)
      .where(and(
        eq(dailyPrizes.isActive, true),
        or(isNull(dailyPrizes.validFrom), lte(dailyPrizes.validFrom, now)),
        or(isNull(dailyPrizes.validUntil), gte(dailyPrizes.validUntil, now)),
      ))
      .orderBy(desc(dailyPrizes.createdAt));
  }

  async getDailyPrize(prizeId: string): Promise<DailyPrize | undefined> {
    const [prize] = await db.select()
      .from(dailyPrizes)
      .where(eq(dailyPrizes.id, prizeId));
    return prize;
  }

  async createDailyPrize(prize: InsertDailyPrize): Promise<DailyPrize> {
    const [newPrize] = await db.insert(dailyPrizes)
      .values(prize)
      .returning();
    return newPrize;
  }

  async updateDailyPrize(prizeId: string, updates: Partial<DailyPrize>): Promise<DailyPrize> {
    const [updatedPrize] = await db.update(dailyPrizes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dailyPrizes.id, prizeId))
      .returning();
    return updatedPrize;
  }

  async incrementPrizeWins(prizeId: string): Promise<void> {
    // Buscar prêmio atual
    const prize = await this.getDailyPrize(prizeId);
    if (prize) {
      const currentWins = parseInt(prize.current_wins || '0');
      const newWins = currentWins + 1;
      
      await db.update(dailyPrizes)
        .set({
          current_wins: newWins.toString(),
          updatedAt: new Date(),
        })
        .where(eq(dailyPrizes.id, prizeId));
    }
  }

  async getUserDailyAttempt(userId: string, date: string): Promise<UserDailyAttempt[]> {
    return await db.select()
      .from(userDailyAttempts)
      .where(and(
        eq(userDailyAttempts.userId, userId),
        eq(userDailyAttempts.attemptDate, date)
      ))
      .orderBy(desc(userDailyAttempts.attemptedAt));
  }

  async createUserDailyAttempt(attempt: InsertUserDailyAttempt): Promise<UserDailyAttempt> {
    const [newAttempt] = await db.insert(userDailyAttempts)
      .values(attempt)
      .returning();
    return newAttempt;
  }

  async getScratchSystemConfig(): Promise<ScratchSystemConfig | undefined> {
    const [config] = await db.select()
      .from(scratchSystemConfig)
      .orderBy(desc(scratchSystemConfig.updatedAt))
      .limit(1);
    return config;
  }

  async updateScratchSystemConfig(updates: Partial<ScratchSystemConfig>): Promise<ScratchSystemConfig> {
    console.log('🔧 updateScratchSystemConfig - Updates recebidos:', JSON.stringify(updates, null, 2));
    
    // Verificar se existe alguma configuração
    const existingConfig = await this.getScratchSystemConfig();
    console.log('🔍 Configuração existente:', existingConfig ? { id: existingConfig.id, updatedAt: existingConfig.updatedAt } : 'Nenhuma encontrada');
    
    if (existingConfig) {
      // Atualizar configuração existente
      console.log('🔄 Atualizando configuração existente...');
      try {
        const [updatedConfig] = await db.update(scratchSystemConfig)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(scratchSystemConfig.id, existingConfig.id))
          .returning();
        console.log('✅ Configuração atualizada com sucesso:', updatedConfig.id);
        return updatedConfig;
      } catch (updateError) {
        console.error('❌ Erro ao atualizar configuração:', updateError);
        throw updateError;
      }
    } else {
      // Criar nova configuração
      console.log('🆕 Criando nova configuração...');
      try {
        const configToInsert = {
          ...updates,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        console.log('🔧 Config a ser inserida:', JSON.stringify(configToInsert, null, 2));
        
        const [newConfig] = await db.insert(scratchSystemConfig)
          .values(configToInsert)
          .returning();
        console.log('✅ Nova configuração criada com sucesso:', newConfig.id);
        return newConfig;
      } catch (insertError) {
        console.error('❌ Erro ao criar nova configuração:', insertError);
        throw insertError;
      }
    }
  }

  async getAlgorithmSuggestions(): Promise<AlgorithmSuggestion[]> {
    return await db.select()
      .from(algorithmSuggestions)
      .orderBy(desc(algorithmSuggestions.generatedAt));
  }

  async updateAlgorithmSuggestion(suggestionId: string, updates: Partial<AlgorithmSuggestion>): Promise<AlgorithmSuggestion> {
    const [updatedSuggestion] = await db.update(algorithmSuggestions)
      .set(updates)
      .where(eq(algorithmSuggestions.id, suggestionId))
      .returning();
    return updatedSuggestion;
  }

  async createDailyScratchResult(result: InsertDailyScratchResult): Promise<DailyScratchResult> {
    const [newResult] = await db.insert(dailyScratchResults)
      .values(result)
      .returning();
    return newResult;
  }

  // ==========================================
  // SISTEMA DE 6 CARTAS DIÁRIAS
  // ==========================================

  // Buscar as 6 cartas do usuário para o dia
  async getUserDailyScratchCards(userId: string, date: string): Promise<DailyScratchCard[]> {
    return await db.select()
      .from(dailyScratchCards)
      .where(and(
        eq(dailyScratchCards.userId, userId),
        eq(dailyScratchCards.cardDate, date)
      ))
      .orderBy(asc(dailyScratchCards.cardNumber));
  }

  // Criar as 6 cartas diárias para um usuário
  async createUserDailyScratchCards(userId: string, date: string): Promise<DailyScratchCard[]> {
    const cards: InsertDailyScratchCard[] = [];
    const availablePrizes = await this.getActiveDailyPrizes();
    
    // Gerar 6 cartas com algoritmo inteligente de distribuição de prêmios
    for (let cardNumber = 1; cardNumber <= 6; cardNumber++) {
      let won = false;
      let prizeId = null;
      let prizeType = null;
      let prizeValue = null;
      let prizeDescription = null;

      // Algoritmo simples: 20% de chance de ganhar em cada carta
      // Pelo menos 1 das 6 cartas deve ter prêmio
      const winChance = Math.random();
      const shouldWin = winChance < 0.20 || (cardNumber === 6 && !cards.some(c => c.won));
      
      if (shouldWin && availablePrizes.length > 0) {
        won = true;
        const randomPrize = availablePrizes[Math.floor(Math.random() * availablePrizes.length)];
        prizeId = randomPrize.id;
        prizeType = randomPrize.prizeType;
        prizeValue = randomPrize.discountValue || randomPrize.discountPercentage?.toString() || "0";
        prizeDescription = randomPrize.description;
      }

      cards.push({
        userId,
        cardDate: date,
        cardNumber: cardNumber.toString(),
        won,
        prizeId,
        prizeType,
        prizeValue,
        prizeDescription,
        isScratched: false
      });
    }

    // Inserir todas as 6 cartas no banco
    const createdCards = await db.insert(dailyScratchCards)
      .values(cards)
      .returning();

    return createdCards;
  }

  // Raspar uma carta específica
  async scratchCard(cardId: string, userAgent?: string, ipAddress?: string): Promise<DailyScratchCard> {
    const [scratchedCard] = await db.update(dailyScratchCards)
      .set({
        isScratched: true,
        scratchedAt: new Date(),
        userAgent,
        ipAddress,
        updatedAt: new Date(),
      })
      .where(eq(dailyScratchCards.id, cardId))
      .returning();

    return scratchedCard;
  }

  // Buscar uma carta específica por ID
  async getDailyScratchCard(cardId: string): Promise<DailyScratchCard | undefined> {
    const [card] = await db.select()
      .from(dailyScratchCards)
      .where(eq(dailyScratchCards.id, cardId));
    return card;
  }

  // Verificar se o usuário já tem cartas para hoje, senão criar
  async ensureUserDailyScratchCards(userId: string): Promise<DailyScratchCard[]> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Verificar se já existem cartas para hoje
    const existingCards = await this.getUserDailyScratchCards(userId, today);
    
    if (existingCards.length === 6) {
      return existingCards;
    }
    
    // Se não existem ou estão incompletas, criar novas (limpar existentes primeiro)
    if (existingCards.length > 0) {
      await db.delete(dailyScratchCards)
        .where(and(
          eq(dailyScratchCards.userId, userId),
          eq(dailyScratchCards.cardDate, today)
        ));
    }
    
    return await this.createUserDailyScratchCards(userId, today);
  }

  // Estatísticas das cartas do usuário
  async getUserScratchCardsStats(userId: string): Promise<{
    totalCards: number;
    scratchedCards: number;
    wonCards: number;
    successRate: number;
  }> {
    const [stats] = await db.select({
      totalCards: sql<number>`COUNT(*)`,
      scratchedCards: sql<number>`COUNT(CASE WHEN ${dailyScratchCards.isScratched} THEN 1 END)`,
      wonCards: sql<number>`COUNT(CASE WHEN ${dailyScratchCards.won} THEN 1 END)`,
    })
    .from(dailyScratchCards)
    .where(eq(dailyScratchCards.userId, userId));

    const successRate = stats.totalCards > 0 ? (stats.wonCards / stats.totalCards) * 100 : 0;

    return {
      totalCards: stats.totalCards,
      scratchedCards: stats.scratchedCards,
      wonCards: stats.wonCards,
      successRate: Math.round(successRate),
    };
  }

  // Estatísticas gerais para admin (hoje apenas)
  async getScratchStatsForAdmin(): Promise<{
    totalCardsToday: number;
    cardsScratched: number;
    prizesWon: number;
    successRate: number;
  }> {
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
    
    const [stats] = await db.select({
      totalCardsToday: sql<number>`COUNT(*)`,
      cardsScratched: sql<number>`COUNT(CASE WHEN ${dailyScratchCards.isScratched} THEN 1 END)`,
      prizesWon: sql<number>`COUNT(CASE WHEN ${dailyScratchCards.won} THEN 1 END)`,
    })
    .from(dailyScratchCards)
    .where(eq(dailyScratchCards.cardDate, today));

    const successRate = stats.cardsScratched > 0 ? (stats.prizesWon / stats.cardsScratched) * 100 : 0;

    return {
      totalCardsToday: stats.totalCardsToday,
      cardsScratched: stats.cardsScratched,
      prizesWon: stats.prizesWon,
      successRate: Math.round(successRate * 10) / 10, // Arredondar para 1 casa decimal
    };
  }

  // ==========================================
  // ✅ NOVO SISTEMA "1 EM N" ATÔMICO
  // ==========================================

  // Buscar contadores com lock para transação atômica
  async getCampaignCountersForUpdate(date: string): Promise<CampaignCounters | undefined> {
    const [counters] = await db
      .select()
      .from(campaignCounters)
      .where(eq(campaignCounters.date, date))
      .for('update'); // SELECT ... FOR UPDATE para lock atômico
      
    return counters;
  }

  // Buscar ou criar contadores do dia
  async getOrCreateCampaignCounters(date: string): Promise<CampaignCounters> {
    let [counters] = await db
      .select()
      .from(campaignCounters)
      .where(eq(campaignCounters.date, date));

    if (!counters) {
      [counters] = await db
        .insert(campaignCounters)
        .values({ date })
        .returning();
    }

    return counters;
  }

  // Atualizar contadores (usado em transação)
  async updateCampaignCounters(id: string, data: Partial<CampaignCounters>): Promise<CampaignCounters> {
    const [updated] = await db
      .update(campaignCounters)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(campaignCounters.id, id))
      .returning();
      
    return updated;
  }

  // Buscar ou criar controle de cartas do usuário
  async getOrCreateUserDailyCards(userId: string, date: string): Promise<UserDailyCards> {
    let [userCards] = await db
      .select()
      .from(userDailyCards)
      .where(and(
        eq(userDailyCards.userId, userId),
        eq(userDailyCards.date, date)
      ));

    if (!userCards) {
      [userCards] = await db
        .insert(userDailyCards)
        .values({ userId, date })
        .returning();
    }

    return userCards;
  }

  // Atualizar controle de cartas do usuário
  async updateUserDailyCards(id: string, data: Partial<UserDailyCards>): Promise<UserDailyCards> {
    const [updated] = await db
      .update(userDailyCards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userDailyCards.id, id))
      .returning();
      
    return updated;
  }

  // Buscar todas as faixas de prêmio ativas
  async getCampaignPrizeTiers(): Promise<CampaignPrizeTier[]> {
    return await db
      .select()
      .from(campaignPrizeTier)
      .where(eq(campaignPrizeTier.isActive, true))
      .orderBy(desc(campaignPrizeTier.discountPercent));
  }

  // Buscar faixas disponíveis considerando quota diária
  async getAvailableTiersByQuota(date: string): Promise<CampaignPrizeTier[]> {
    const allTiers = await this.getCampaignPrizeTiers();
    const counters = await this.getOrCreateCampaignCounters(date);
    
    return allTiers.filter(tier => {
      if (!tier.dailyQuota) return true; // Quota ilimitada
      
      // Verificar quota específica por faixa
      const used = this.getUsedByTier(counters, tier.discountPercent);
      return used < tier.dailyQuota;
    });
  }

  // Helper para contar vitórias por faixa
  private getUsedByTier(counters: CampaignCounters, discountPercent: number): number {
    switch (discountPercent) {
      case 20: return counters.wins20;
      case 30: return counters.wins30;
      case 50: return counters.wins50;
      case 70: return counters.wins70;
      default: return 0;
    }
  }

  // Weighted random selection para faixas
  pickWeightedTier(availableTiers: CampaignPrizeTier[]): CampaignPrizeTier | null {
    if (availableTiers.length === 0) return null;

    const totalWeight = availableTiers.reduce((sum, tier) => sum + tier.weight, 0);
    if (totalWeight === 0) return availableTiers[0]; // Fallback

    const random = Math.random() * totalWeight;
    let weightSum = 0;

    for (const tier of availableTiers) {
      weightSum += tier.weight;
      if (random <= weightSum) {
        return tier;
      }
    }

    return availableTiers[availableTiers.length - 1]; // Fallback
  }

  // Contar vitórias do usuário no dia
  async countUserWinsToday(userId: string, date: string): Promise<number> {
    const userCards = await this.getOrCreateUserDailyCards(userId, date);
    return userCards.winsToday;
  }

  // ✅ INICIALIZAR SISTEMA AO STARTAR
  async initializeAtomicSystem(): Promise<void> {
    await this.initializeDefaultTiers();
  }

  // ✅ INICIALIZAR FAIXAS DE DESCONTO PADRÃO
  async initializeDefaultTiers(): Promise<void> {
    const existingTiers = await this.getCampaignPrizeTiers();
    if (existingTiers.length > 0) return; // Já inicializado

    const defaultTiers: InsertCampaignPrizeTier[] = [
      {
        discountPercent: 20,
        weight: 50, // Mais comum
        dailyQuota: null, // Ilimitado
        name: "Desconto 20%",
        description: "20% de desconto em qualquer produto"
      },
      {
        discountPercent: 30,
        weight: 30,
        dailyQuota: 20, // Limitado
        name: "Desconto 30%", 
        description: "30% de desconto em qualquer produto"
      },
      {
        discountPercent: 50,
        weight: 15,
        dailyQuota: 10, // Mais limitado
        name: "Desconto 50%",
        description: "50% de desconto em qualquer produto"
      },
      {
        discountPercent: 70,
        weight: 5, // Mais raro
        dailyQuota: 3, // Muito limitado
        name: "Desconto 70%",
        description: "70% de desconto em qualquer produto"
      }
    ];

    await db.insert(campaignPrizeTier).values(defaultTiers);
    console.log('✅ Faixas de desconto padrão criadas');
  }

  // ✅ NOVA FUNÇÃO DE RASPAGEM ATÔMICA
  async scratchCardAtomic(userId: string, cardId: string): Promise<{
    allowed: boolean;
    won: boolean;
    reason?: string;
    prize?: {
      discountPercent: number;
      couponCode?: string;
      product?: Product;
    };
  }> {
    return await db.transaction(async (tx) => {
      console.log('🎯 Iniciando raspagem atômica para usuário:', userId, 'carta:', cardId);
      
      // 1. Buscar configuração do sistema
      const [config] = await tx
        .select()
        .from(scratchSystemConfig)
        .where(eq(scratchSystemConfig.isActive, true))
        .limit(1);

      if (!config) {
        return { allowed: false, won: false, reason: 'SYSTEM_NOT_CONFIGURED' };
      }

      console.log('⚙️ Configuração:', { oneInN: config.oneInN, cardsPerUserPerDay: config.cardsPerUserPerDay });

      const today = new Date().toISOString().split('T')[0];

      // 2. Verificar se carta existe e não foi raspada
      const [card] = await tx
        .select()
        .from(dailyScratchCards)
        .where(and(
          eq(dailyScratchCards.id, cardId),
          eq(dailyScratchCards.userId, userId),
          eq(dailyScratchCards.isScratched, false)
        ));

      if (!card) {
        return { allowed: false, won: false, reason: 'CARD_NOT_FOUND_OR_ALREADY_SCRATCHED' };
      }

      // 3. Verificar limite de cartas do usuário
      const userCards = await tx
        .select()
        .from(userDailyCards)
        .where(and(
          eq(userDailyCards.userId, userId),
          eq(userDailyCards.date, today)
        ))
        .for('update'); // Lock para transação

      const [userDaily] = userCards;
      if (userDaily && userDaily.cardsUsed >= config.cardsPerUserPerDay) {
        return { allowed: false, won: false, reason: 'NO_CARDS_LEFT' };
      }

      // 4. Incrementar contador global ATÔMICO
      const [counters] = await tx
        .select()
        .from(campaignCounters)
        .where(eq(campaignCounters.date, today))
        .for('update'); // SELECT FOR UPDATE crítico

      let currentCounters = counters;
      if (!currentCounters) {
        [currentCounters] = await tx
          .insert(campaignCounters)
          .values({ date: today, globalScratches: 0, winsToday: 0 })
          .returning();
      }

      const nextScratchCount = currentCounters.globalScratches + 1;
      console.log('🎲 Raspada número:', nextScratchCount, 'de', config.oneInN);

      // Atualizar contador
      await tx
        .update(campaignCounters)
        .set({ globalScratches: nextScratchCount })
        .where(eq(campaignCounters.id, currentCounters.id));

      // 5. ✅ ALGORITMO "1 EM N" 
      const isWinner = (nextScratchCount % config.oneInN) === 0;
      console.log('🏆 É vencedor?', isWinner, `(${nextScratchCount} % ${config.oneInN} === 0)`);

      // Marcar carta como raspada
      await tx
        .update(dailyScratchCards)
        .set({ 
          isScratched: true, 
          scratchedAt: new Date(),
          won: isWinner
        })
        .where(eq(dailyScratchCards.id, cardId));

      // Atualizar contador de cartas do usuário
      const userCardsUpdate = userDaily ? 
        { cardsUsed: userDaily.cardsUsed + 1 } :
        { userId, date: today, cardsUsed: 1 };

      if (userDaily) {
        await tx
          .update(userDailyCards)
          .set(userCardsUpdate)
          .where(eq(userDailyCards.id, userDaily.id));
      } else {
        await tx
          .insert(userDailyCards)
          .values(userCardsUpdate);
      }

      if (!isWinner) {
        return { allowed: true, won: false };
      }

      // 6. Verificar limites operacionais
      if (config.maxWinsPerDay && currentCounters.winsToday >= config.maxWinsPerDay) {
        console.log('⚠️ Limite de vitórias diárias atingido');
        return { allowed: true, won: false };
      }

      const userWinsToday = userDaily?.winsToday || 0;
      if (config.maxWinsPerUserPerDay && userWinsToday >= config.maxWinsPerUserPerDay) {
        console.log('⚠️ Limite de vitórias por usuário atingido');
        return { allowed: true, won: false };
      }

      // 7. Selecionar faixa de desconto por peso
      const availableTiers = await this.getAvailableTiersByQuota(today);
      const selectedTier = this.pickWeightedTier(availableTiers);

      if (!selectedTier) {
        console.log('⚠️ Nenhuma faixa disponível');
        return { allowed: true, won: false };
      }

      console.log('🎁 Faixa selecionada:', selectedTier.discountPercent + '%');

      // 8. Atualizar contadores de vitória
      await tx
        .update(campaignCounters)
        .set({ winsToday: currentCounters.winsToday + 1 })
        .where(eq(campaignCounters.id, currentCounters.id));

      // Atualizar contador específico da faixa
      const tierUpdate = this.getTierUpdateObject(selectedTier.discountPercent, currentCounters);
      await tx
        .update(campaignCounters)
        .set(tierUpdate)
        .where(eq(campaignCounters.id, currentCounters.id));

      // Atualizar vitórias do usuário
      if (userDaily) {
        await tx
          .update(userDailyCards)
          .set({ winsToday: userWinsToday + 1 })
          .where(eq(userDailyCards.id, userDaily.id));
      }

      // 9. Gerar cupom (simplificado)
      const couponCode = `SCRATCH${Date.now()}${Math.random().toString(36).substr(2, 4)}`.toUpperCase();

      // Atualizar carta com prêmio
      await tx
        .update(dailyScratchCards)
        .set({
          prizeType: `discount_${selectedTier.discountPercent}`,
          prizeValue: selectedTier.discountPercent.toString(),
          prizeDescription: `${selectedTier.discountPercent}% de desconto`,
          couponCode,
          couponExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
        })
        .where(eq(dailyScratchCards.id, cardId));

      console.log('✅ Vitória registrada:', { discountPercent: selectedTier.discountPercent, couponCode });

      return {
        allowed: true,
        won: true,
        prize: {
          discountPercent: selectedTier.discountPercent,
          couponCode
        }
      };
    });
  }

  // Helper para atualizar contador específico da faixa
  private getTierUpdateObject(discountPercent: number, currentCounters: CampaignCounters) {
    switch (discountPercent) {
      case 20: return { wins20: currentCounters.wins20 + 1 };
      case 30: return { wins30: currentCounters.wins30 + 1 };
      case 50: return { wins50: currentCounters.wins50 + 1 };
      case 70: return { wins70: currentCounters.wins70 + 1 };
      default: return {};
    }
  }

  // ==========================================
  // FIM DO SISTEMA DE RASPADINHA DIÁRIA
  // ==========================================
}

export const storage = new DatabaseStorage();
