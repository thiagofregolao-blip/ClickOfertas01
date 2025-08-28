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

// Raspadinhas que foram "raspadas" pelos usuários
export const scratchedProducts = pgTable("scratched_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: varchar("user_id"), // pode ser anônimo
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  scratchedAt: timestamp("scratched_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // Quando expira para este usuário específico
  hasRedeemed: boolean("has_redeemed").default(false), // Se já foi até a loja comprar
});

// Cupons gerados pelas raspadinhas
export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
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

// --- Scratch Offers ---
export const scratchOffers = pgTable("scratch_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  productId: varchar("product_id").references(() => products.id),
  status: varchar("status").notNull().default("eligible"), // "eligible", "revealed", "expired", "redeemed"
  createdAt: timestamp("created_at").defaultNow(),
  revealedAt: timestamp("revealed_at"),
  expiresAt: timestamp("expires_at"),
  cooldownUntil: timestamp("cooldown_until"),
  // Adição necessária porque o storage atualiza 'updatedAt'
  updatedAt: timestamp("updated_at"),
});

export type ScratchOffer = typeof scratchOffers.$inferSelect;
export type InsertScratchOffer = typeof scratchOffers.$inferInsert;
