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
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
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
  category: varchar("category").default("Geral"),
  isFeatured: boolean("is_featured").default(false),
  showInStories: boolean("show_in_stories").default(false),
  isActive: boolean("is_active").default(true),
  sortOrder: varchar("sort_order").default("0"),
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

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
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

export type StoreWithProducts = Store & {
  products: Product[];
};

export type ProductWithStore = Product & {
  store: Store;
};

export type SavedProductWithDetails = SavedProduct & {
  product: ProductWithStore;
};
