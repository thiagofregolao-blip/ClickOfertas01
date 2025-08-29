import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password"), // Hash da senha
  storeName: varchar("store_name"), // Nome da loja
  phone: varchar("phone"),
  address: text("address"), // Endereço completo
  city: varchar("city"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  fullName: varchar("full_name"),
  state: varchar("state"),
  country: varchar("country"),
  profileImageUrl: varchar("profile_image_url"),
  provider: varchar("provider").default("email"), // 'email', 'google', 'apple', 'replit'
  providerId: varchar("provider_id"),
  isEmailVerified: boolean("is_email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Store configuration table
export const stores = pgTable("stores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  themeColor: varchar("theme_color", { length: 7 }).default("#E11D48"),
  currency: varchar("currency", { length: 10 }).default("Gs."),
  displayCurrency: varchar("display_currency", { length: 10 }).default("local"), // "usd", "local", "both"
  dollarRate: decimal("dollar_rate", { precision: 10, scale: 2 }).default("7500.00"),
  customUsdBrlRate: decimal("custom_usd_brl_rate", { precision: 10, scale: 4 }), // Taxa personalizada da loja
  whatsapp: varchar("whatsapp"),
  instagram: varchar("instagram"),
  address: text("address"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  slug: varchar("slug").unique(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  imageUrl2: text("image_url2"),
  imageUrl3: text("image_url3"),
  category: varchar("category").default("Perfumaria"),
  isFeatured: boolean("is_featured").default(false),
  showInStories: boolean("show_in_stories").default(false),
  isActive: boolean("is_active").default(true),
  sortOrder: varchar("sort_order").default("0"),
  // Campos para funcionalidade de Raspadinha
  isScratchCard: boolean("is_scratch_card").default(false),
  scratchPrice: decimal("scratch_price", { precision: 12, scale: 2 }), // Preço especial após raspar
  scratchExpiresAt: timestamp("scratch_expires_at"), // Quando expira a oferta global
  scratchTimeLimitMinutes: varchar("scratch_time_limit_minutes").default("60"), // Tempo limite após raspar (em minutos)
  maxScratchRedemptions: varchar("max_scratch_redemptions").default("10"), // Quantas pessoas podem raspar
  currentScratchRedemptions: varchar("current_scratch_redemptions").default("0"), // Quantas já rasparam
  scratchMessage: text("scratch_message").default("Raspe aqui e ganhe um super desconto!"), // Mensagem na raspadinha
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Produtos favoritos/salvos pelo usuário
export const savedProducts = pgTable("saved_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Visualizações de stories
export const storyViews = pgTable("story_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  productId: varchar("product_id").references(() => products.id, { onDelete: "cascade" }),
  userId: varchar("user_id"), // pode ser anônimo
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// Visualizações de panfletos/flyers
export const flyerViews = pgTable("flyer_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  userId: varchar("user_id"), // pode ser anônimo
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// Curtidas/likes nos produtos dos stories
export const productLikes = pgTable("product_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: varchar("user_id"), // pode ser anônimo
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  likedAt: timestamp("liked_at").defaultNow(),
});

// Campanhas de Raspagem - quando lojista ativa raspadinha
export const scratchCampaigns = pgTable("scratch_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  storeId: varchar("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  
  // Configurações da Campanha
  title: text("title").notNull().default("Raspe e ganhe desconto!"),
  description: text("description").default("Raspe aqui e ganhe um super desconto!"),
  discountPrice: decimal("discount_price", { precision: 12, scale: 2 }).notNull(),
  discountPercentage: varchar("discount_percentage").notNull(),
  
  // Controles da Campanha
  isActive: boolean("is_active").default(true),
  maxClones: varchar("max_clones").default("10"), // Quantidade de clones a criar
  clonesCreated: varchar("clones_created").default("0"), // Quantos clones foram criados
  clonesUsed: varchar("clones_used").default("0"), // Quantos foram raspados
  
  // Opções de Distribuição
  distributeToAll: boolean("distribute_to_all").default(false), // Se true, sorteia entre todos os usuários
  selectedUserIds: text("selected_user_ids"), // JSON array de IDs específicos (se não for para todos)
  
  // Validade
  expiresAt: timestamp("expires_at"), // Quando a campanha expira
  cloneExpirationHours: varchar("clone_expiration_hours").default("24"), // Horas para clone expirar se não usado
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clones Virtuais - produtos temporários para raspagem
export const virtualScratchClones = pgTable("virtual_scratch_clones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => scratchCampaigns.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  storeId: varchar("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  
  // Usuário sorteado para este clone
  assignedUserId: varchar("assigned_user_id").references(() => users.id, { onDelete: "cascade" }),
  
  // Dados do produto clonado (snapshot para manter consistência)
  productName: text("product_name").notNull(),
  productDescription: text("product_description"),
  originalPrice: decimal("original_price", { precision: 12, scale: 2 }).notNull(),
  discountPrice: decimal("discount_price", { precision: 12, scale: 2 }).notNull(),
  productImageUrl: text("product_image_url"),
  productCategory: varchar("product_category"),
  
  // Estado do clone
  isUsed: boolean("is_used").default(false), // Se já foi raspado
  isExpired: boolean("is_expired").default(false), // Se expirou sem ser usado
  notificationSent: boolean("notification_sent").default(false), // Se notificação foi enviada
  
  // Timestamps
  usedAt: timestamp("used_at"), // Quando foi raspado
  expiresAt: timestamp("expires_at").notNull(), // Quando expira se não for usado
  createdAt: timestamp("created_at").defaultNow(),
});

// Raspadinhas que foram "raspadas" pelos usuários (atualizado para referenciar clones)
export const scratchedProducts = pgTable("scratched_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cloneId: varchar("clone_id").references(() => virtualScratchClones.id, { onDelete: "cascade" }), // Nova referência
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }), // Mantém para compatibilidade
  userId: varchar("user_id"), // pode ser anônimo
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  scratchedAt: timestamp("scratched_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // Quando expira para este usuário específico
  hasRedeemed: boolean("has_redeemed").default(false), // Se já foi até a loja comprar
});

// Cupons gerados pelas raspadinhas (agora referencia clone)
export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cloneId: varchar("clone_id").references(() => virtualScratchClones.id, { onDelete: "cascade" }), // Nova referência
  // REMOVIDO: promotionId - campo não existe na base real
  productId: varchar("product_id").references(() => products.id, { onDelete: "cascade" }), // Permite NULL para promoções
  storeId: varchar("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  userId: varchar("user_id"), // pode ser anônimo
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  couponCode: varchar("coupon_code").unique().notNull(), // Código único do cupom
  originalPrice: decimal("original_price", { precision: 12, scale: 2 }).notNull(),
  discountPrice: decimal("discount_price", { precision: 12, scale: 2 }).notNull(),
  discountPercentage: varchar("discount_percentage").notNull(), // Porcentagem de desconto
  qrCode: text("qr_code").notNull(), // Base64 do QR Code
  expiresAt: timestamp("expires_at").notNull(), // Quando expira o cupom
  isRedeemed: boolean("is_redeemed").default(false), // Se já foi utilizado
  redeemedAt: timestamp("redeemed_at"), // Quando foi utilizado
  createdAt: timestamp("created_at").defaultNow(),
});

// NOVO SISTEMA: Promoções diretas e simplificadas
export const promotions = pgTable("promotions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  
  // Dados do produto da promoção (pode referenciar produto existente ou ser novo)
  baseProductId: varchar("base_product_id").references(() => products.id), // Referência opcional para copiar dados
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  category: varchar("category").default("Promoção"),
  
  // Preços e desconto
  originalPrice: decimal("original_price", { precision: 12, scale: 2 }).notNull(),
  promotionalPrice: decimal("promotional_price", { precision: 12, scale: 2 }).notNull(),
  discountPercentage: varchar("discount_percentage").notNull(),
  
  // Controle da campanha
  isActive: boolean("is_active").default(true),
  maxClients: varchar("max_clients").notNull(), // Quantos clientes podem raspar
  usedCount: varchar("used_count").default("0"), // Quantos já rasparam
  
  // Validade
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until").notNull(),
  
  // Mensagem da raspadinha
  scratchMessage: text("scratch_message").default("Raspe aqui e ganhe desconto especial!"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Controle de quem já raspou qual promoção
export const promotionScratches = pgTable("promotion_scratches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promotionId: varchar("promotion_id").notNull().references(() => promotions.id, { onDelete: "cascade" }),
  userId: varchar("user_id"), // pode ser anônimo
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  couponCode: varchar("coupon_code").unique().notNull(), // Código do cupom gerado
  scratchedAt: timestamp("scratched_at").defaultNow(),
  // REMOVIDO: expiresAt - coluna não existe no banco atual
  isUsed: boolean("is_used").default(false), // Se cupom foi utilizado
  usedAt: timestamp("used_at"), // Quando foi utilizado
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  stores: many(stores),
  savedProducts: many(savedProducts),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  user: one(users, {
    fields: [stores.userId],
    references: [users.id],
  }),
  products: many(products),
  storyViews: many(storyViews),
  flyerViews: many(flyerViews),
  scratchCampaigns: many(scratchCampaigns),
  virtualScratchClones: many(virtualScratchClones),
  promotions: many(promotions),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  store: one(stores, {
    fields: [products.storeId],
    references: [stores.id],
  }),
  savedProducts: many(savedProducts),
  productLikes: many(productLikes),
  storyViews: many(storyViews),
  scratchedProducts: many(scratchedProducts),
  scratchCampaigns: many(scratchCampaigns),
  virtualScratchClones: many(virtualScratchClones),
}));

export const savedProductsRelations = relations(savedProducts, ({ one }) => ({
  user: one(users, {
    fields: [savedProducts.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [savedProducts.productId],
    references: [products.id],
  }),
}));

export const storyViewsRelations = relations(storyViews, ({ one }) => ({
  store: one(stores, {
    fields: [storyViews.storeId],
    references: [stores.id],
  }),
  product: one(products, {
    fields: [storyViews.productId],
    references: [products.id],
  }),
}));

export const flyerViewsRelations = relations(flyerViews, ({ one }) => ({
  store: one(stores, {
    fields: [flyerViews.storeId],
    references: [stores.id],
  }),
}));

export const productLikesRelations = relations(productLikes, ({ one }) => ({
  product: one(products, {
    fields: [productLikes.productId],
    references: [products.id],
  }),
}));

export const scratchedProductsRelations = relations(scratchedProducts, ({ one }) => ({
  product: one(products, {
    fields: [scratchedProducts.productId],
    references: [products.id],
  }),
  clone: one(virtualScratchClones, {
    fields: [scratchedProducts.cloneId],
    references: [virtualScratchClones.id],
  }),
}));

export const scratchCampaignsRelations = relations(scratchCampaigns, ({ one, many }) => ({
  product: one(products, {
    fields: [scratchCampaigns.productId],
    references: [products.id],
  }),
  store: one(stores, {
    fields: [scratchCampaigns.storeId],
    references: [stores.id],
  }),
  virtualClones: many(virtualScratchClones),
}));

export const virtualScratchClonesRelations = relations(virtualScratchClones, ({ one, many }) => ({
  campaign: one(scratchCampaigns, {
    fields: [virtualScratchClones.campaignId],
    references: [scratchCampaigns.id],
  }),
  product: one(products, {
    fields: [virtualScratchClones.productId],
    references: [products.id],
  }),
  store: one(stores, {
    fields: [virtualScratchClones.storeId],
    references: [stores.id],
  }),
  assignedUser: one(users, {
    fields: [virtualScratchClones.assignedUserId],
    references: [users.id],
  }),
  scratchedProducts: many(scratchedProducts),
  coupons: many(coupons),
}));

export const couponsRelations = relations(coupons, ({ one }) => ({
  product: one(products, {
    fields: [coupons.productId],
    references: [products.id],
  }),
  store: one(stores, {
    fields: [coupons.storeId],
    references: [stores.id],
  }),
  clone: one(virtualScratchClones, {
    fields: [coupons.cloneId],
    references: [virtualScratchClones.id],
  }),
  // REMOVIDO: promotion relation - campo promotionId não existe
}));

// Novas relations para sistema de promoções
export const promotionsRelations = relations(promotions, ({ one, many }) => ({
  store: one(stores, {
    fields: [promotions.storeId],
    references: [stores.id],
  }),
  baseProduct: one(products, {
    fields: [promotions.baseProductId],
    references: [products.id],
  }),
  scratches: many(promotionScratches),
  // REMOVIDO: coupons relation - sem campo promotionId
}));

export const promotionScratchesRelations = relations(promotionScratches, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionScratches.promotionId],
    references: [promotions.id],
  }),
}));

// Insert schemas
export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  storeId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scratchExpiresAt: z.union([z.string(), z.date()]).optional().nullable(),
});

export const updateStoreSchema = insertStoreSchema.extend({
  customUsdBrlRate: z.number().optional()
}).partial();
export const updateProductSchema = insertProductSchema.partial();

export const insertSavedProductSchema = createInsertSchema(savedProducts).omit({
  id: true,
  createdAt: true,
});

export const insertStoryViewSchema = createInsertSchema(storyViews).omit({
  id: true,
  viewedAt: true,
});

export const insertFlyerViewSchema = createInsertSchema(flyerViews).omit({
  id: true,
  viewedAt: true,
});

export const insertProductLikeSchema = createInsertSchema(productLikes).omit({
  id: true,
  likedAt: true,
});

export const insertScratchedProductSchema = createInsertSchema(scratchedProducts).omit({
  id: true,
  scratchedAt: true,
});

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  createdAt: true,
});

export const insertScratchCampaignSchema = createInsertSchema(scratchCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  expiresAt: z.union([z.string(), z.date()]).optional().nullable(),
});

export const insertVirtualScratchCloneSchema = createInsertSchema(virtualScratchClones).omit({
  id: true,
  createdAt: true,
}).extend({
  expiresAt: z.union([z.string(), z.date()]).optional(),
  usedAt: z.union([z.string(), z.date()]).optional().nullable(),
});

// Schemas para novo sistema de promoções
export const insertPromotionSchema = createInsertSchema(promotions).omit({
  id: true,
  storeId: true,
  usedCount: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  validFrom: z.union([z.string(), z.date()]).optional(),
  validUntil: z.union([z.string(), z.date()]).optional(),
});

export const updatePromotionSchema = insertPromotionSchema.partial();

export const insertPromotionScratchSchema = createInsertSchema(promotionScratches).omit({
  id: true,
  scratchedAt: true,
  usedAt: true,
}).extend({
  expiresAt: z.union([z.string(), z.date()]).optional(),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Schema para cadastro de usuários normais (sem loja)
export const registerUserNormalSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

// Schema para cadastro de lojistas (com loja)
export const registerStoreOwnerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  storeName: z.string().min(2, "Nome da loja deve ter pelo menos 2 caracteres"),
  phone: z.string().optional(),
  address: z.string().optional(), 
  city: z.string().optional(),
});

// Esquemas de validação para cadastro (compatibilidade)
export const registerUserSchema = createInsertSchema(users, {
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  storeName: z.string().min(2, "Nome da loja deve ter pelo menos 2 caracteres"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
}).omit({ 
  id: true,
  createdAt: true, 
  updatedAt: true,
  provider: true,
  providerId: true,
  isEmailVerified: true,
  firstName: true,
  lastName: true,
  fullName: true,
  state: true,
  country: true,
  profileImageUrl: true
});

// Schema para login
export const loginUserSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type RegisterUserNormalType = z.infer<typeof registerUserNormalSchema>;
export type RegisterStoreOwnerType = z.infer<typeof registerStoreOwnerSchema>;
export type RegisterUserType = z.infer<typeof registerUserSchema>;
export type LoginUserType = z.infer<typeof loginUserSchema>;

// Manter compatibilidade
export const insertUserSchema = registerUserSchema;
export type InsertUserType = RegisterUserType;
export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type UpdateStore = z.infer<typeof updateStoreSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;

export type SavedProduct = typeof savedProducts.$inferSelect;
export type InsertSavedProduct = z.infer<typeof insertSavedProductSchema>;
export type StoryView = typeof storyViews.$inferSelect;
export type InsertStoryView = z.infer<typeof insertStoryViewSchema>;
export type FlyerView = typeof flyerViews.$inferSelect;
export type InsertFlyerView = z.infer<typeof insertFlyerViewSchema>;
export type ProductLike = typeof productLikes.$inferSelect;
export type InsertProductLike = z.infer<typeof insertProductLikeSchema>;
export type ScratchedProduct = typeof scratchedProducts.$inferSelect;
export type InsertScratchedProduct = z.infer<typeof insertScratchedProductSchema>;
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type ScratchCampaign = typeof scratchCampaigns.$inferSelect;
export type InsertScratchCampaign = z.infer<typeof insertScratchCampaignSchema>;
export type VirtualScratchClone = typeof virtualScratchClones.$inferSelect;
export type InsertVirtualScratchClone = z.infer<typeof insertVirtualScratchCloneSchema>;

export type StoreWithProducts = Store & {
  products: Product[];
};

export type ProductWithStore = Product & {
  store: Store;
};

export type SavedProductWithDetails = SavedProduct & {
  product: ProductWithStore;
};

export type CouponWithDetails = Coupon & {
  product: Product;
  store: Store;
};

export type ScratchCampaignWithDetails = ScratchCampaign & {
  product: Product;
  store: Store;
  virtualClones?: VirtualScratchClone[];
};

export type VirtualScratchCloneWithDetails = VirtualScratchClone & {
  campaign: ScratchCampaign;
  product: Product;
  store: Store;
  assignedUser?: User;
};

// Types para novo sistema de promoções
export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type UpdatePromotion = z.infer<typeof updatePromotionSchema>;
export type PromotionScratch = typeof promotionScratches.$inferSelect;
export type InsertPromotionScratch = z.infer<typeof insertPromotionScratchSchema>;

export type PromotionWithDetails = Promotion & {
  store: Store;
  baseProduct?: Product;
  scratches?: PromotionScratch[];
};

export type PromotionScratchWithDetails = PromotionScratch & {
  promotion: PromotionWithDetails;
};
