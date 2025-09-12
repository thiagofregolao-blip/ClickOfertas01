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
  unique,
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

// Funny messages for scratch cards
export const funnyMessages = pgTable("funny_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  message: text("message").notNull(),
  emoji: text("emoji").notNull(),
  category: varchar("category", { length: 10 }).default("lose"), // 'lose', 'win'
  createdAt: timestamp("created_at").defaultNow(),
});

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
  storeOwnerToken: varchar("store_owner_token"),
  isSuperAdmin: boolean("is_super_admin").default(false), // Super admin do sistema
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
  
  // Banner YouTube-style fields
  bannerUrl: text("banner_url"), // URL da imagem de fundo do banner
  bannerText: text("banner_text"), // Texto principal do banner (ex: "IURI INDICA")
  bannerSubtext: text("banner_subtext"), // Texto secundário/descrição
  bannerGradient: varchar("banner_gradient", { length: 50 }).default("purple-to-pink"), // Gradiente: purple-to-pink, blue-to-cyan, etc.
  
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
  showInTotem: boolean("show_in_totem").default(false), // NOVO: Controla exibição no totem
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

// Instagram Stories - Nova funcionalidade
export const instagramStories = pgTable("instagram_stories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Conteúdo do story
  mediaType: varchar("media_type").notNull(), // 'photo', 'video'
  mediaUrl: text("media_url").notNull(),
  caption: text("caption"), // Legenda para vídeos ou texto adicional
  
  // Dados do produto (se for promoção)
  productName: text("product_name"),
  productPrice: varchar("product_price"),
  productDiscountPrice: varchar("product_discount_price"),
  productCategory: varchar("product_category"),
  isProductPromo: boolean("is_product_promo").default(false),
  
  // Configurações do story
  backgroundColor: varchar("background_color").default("#ffffff"),
  textColor: varchar("text_color").default("#000000"),
  
  // Status e controle
  isActive: boolean("is_active").default(true),
  viewsCount: varchar("views_count").default("0"),
  likesCount: varchar("likes_count").default("0"),
  
  // Expiração automática (24h)
  expiresAt: timestamp("expires_at").notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Views dos Instagram Stories
export const instagramStoryViews = pgTable("instagram_story_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storyId: varchar("story_id").notNull().references(() => instagramStories.id, { onDelete: "cascade" }),
  viewerId: varchar("viewer_id"), // pode ser anônimo
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// Likes dos Instagram Stories  
export const instagramStoryLikes = pgTable("instagram_story_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storyId: varchar("story_id").notNull().references(() => instagramStories.id, { onDelete: "cascade" }),
  userId: varchar("user_id"), // pode ser anônimo
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  likedAt: timestamp("liked_at").defaultNow(),
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
  
  // 🎯 DADOS DA PROMOÇÃO (quando productId = null)
  promotionName: text("promotion_name"), // Nome da promoção raspada
  promotionImageUrl: text("promotion_image_url"), // Imagem da promoção raspada  
  promotionDescription: text("promotion_description"), // Descrição da promoção
  
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

// NOVA TABELA: Controle de distribuição de promoções para usuários
export const promotionAssignments = pgTable("promotion_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promotionId: varchar("promotion_id").notNull().references(() => promotions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow(),
  status: varchar("status").notNull().default("assigned"), // 'assigned', 'generated', 'redeemed'
  createdAt: timestamp("created_at").defaultNow(),
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
  promotionAssignments: many(promotionAssignments),
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
  totemContent: many(totemContent),
  totemSettings: many(totemSettings),
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
// Novas relations para promotion_assignments
export const promotionAssignmentsRelations = relations(promotionAssignments, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionAssignments.promotionId],
    references: [promotions.id],
  }),
  user: one(users, {
    fields: [promotionAssignments.userId],
    references: [users.id],
  }),
}));

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
  assignments: many(promotionAssignments),
  // REMOVIDO: coupons relation - sem campo promotionId
}));

export const promotionScratchesRelations = relations(promotionScratches, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionScratches.promotionId],
    references: [promotions.id],
  }),
}));

// Controle do modo manutenção
export const maintenanceMode = pgTable("maintenance_mode", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  isActive: boolean("is_active").default(false),
  title: text("title").default("Em Breve"),
  message: text("message").default("Estamos preparando as melhores ofertas do Paraguai para você!"),
  accessPassword: varchar("access_password").default("CLICKOFERTAS2025"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// Sistema de Totems - Gerenciamento de conteúdo para TVs
export const totemContent = pgTable("totem_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  
  // Informações do conteúdo
  title: text("title").notNull(),
  description: text("description"),
  mediaUrl: text("media_url").notNull(), // URL da imagem/vídeo
  mediaType: varchar("media_type").notNull(), // 'image', 'video'
  
  // Configurações de exibição
  displayDuration: varchar("display_duration").default("10"), // Segundos para exibir
  isActive: boolean("is_active").default(true),
  sortOrder: varchar("sort_order").default("0"),
  
  // Agendamento (opcional)
  scheduleStart: timestamp("schedule_start"),
  scheduleEnd: timestamp("schedule_end"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Configurações específicas do totem por loja
export const totemSettings = pgTable("totem_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  
  // Configurações visuais
  backgroundColor: varchar("background_color").default("#000000"),
  transitionEffect: varchar("transition_effect").default("fade"), // 'fade', 'slide', 'zoom'
  transitionDuration: varchar("transition_duration").default("1000"), // ms
  
  // Configurações de rotação
  autoRotate: boolean("auto_rotate").default(true),
  rotationInterval: varchar("rotation_interval").default("10"), // segundos
  
  // Controles
  isActive: boolean("is_active").default(true),
  lastSync: timestamp("last_sync").defaultNow(),
  
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.storeId), // Uma configuração por loja
]);

// Relations para totem
export const totemContentRelations = relations(totemContent, ({ one }) => ({
  store: one(stores, {
    fields: [totemContent.storeId],
    references: [stores.id],
  }),
}));

export const totemSettingsRelations = relations(totemSettings, ({ one }) => ({
  store: one(stores, {
    fields: [totemSettings.storeId],
    references: [stores.id],
  }),
}));

// Histórico de preços para monitoramento
export const priceHistory = pgTable("price_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productName: text("product_name").notNull(),
  mlItemId: varchar("ml_item_id"), // ID do produto no Mercado Livre
  storeName: varchar("store_name").notNull().default("Mercado Livre"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
  availability: varchar("availability").notNull().default("in_stock"),
  productUrl: text("product_url"),
  
  // Informações extras do ML
  freeShipping: boolean("free_shipping").default(false),
  condition: varchar("condition").default("new"), // new, used
  soldQuantity: varchar("sold_quantity").default("0"),
  
  // Timestamp para rastreamento
  recordedAt: timestamp("recorded_at").defaultNow(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Alertas de preço para usuários
export const priceAlerts = pgTable("price_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(),
  targetPrice: decimal("target_price", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
  
  // Configurações do alerta
  isActive: boolean("is_active").default(true),
  emailNotification: boolean("email_notification").default(true),
  
  // Estado do alerta
  lastCheckedAt: timestamp("last_checked_at"),
  lastNotifiedAt: timestamp("last_notified_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sistema de Banners
export const banners = pgTable("banners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"), // URL para onde o banner leva quando clicado
  
  // Tipo do banner
  bannerType: varchar("banner_type").notNull(), // 'rotating', 'static_left', 'static_right'
  
  // Controles de exibição
  isActive: boolean("is_active").default(true),
  priority: varchar("priority").default("0"), // Ordem de exibição (menor número = maior prioridade)
  
  // Configurações visuais
  backgroundColor: varchar("background_color").default("#ffffff"),
  textColor: varchar("text_color").default("#000000"),
  
  // Período de exibição
  startsAt: timestamp("starts_at").defaultNow(),
  endsAt: timestamp("ends_at"), // null = sem data de término
  
  // Estatísticas
  viewsCount: varchar("views_count").default("0"),
  clicksCount: varchar("clicks_count").default("0"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Visualizações dos banners
export const bannerViews = pgTable("banner_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bannerId: varchar("banner_id").notNull().references(() => banners.id, { onDelete: "cascade" }),
  userId: varchar("user_id"), // pode ser anônimo
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// Cliques nos banners
export const bannerClicks = pgTable("banner_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bannerId: varchar("banner_id").notNull().references(() => banners.id, { onDelete: "cascade" }),
  userId: varchar("user_id"), // pode ser anônimo
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  clickedAt: timestamp("clicked_at").defaultNow(),
});



// Insert schemas
export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  customUsdBrlRate: z.string().optional().transform(val => val ? Number(val) : undefined)
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  storeId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scratchExpiresAt: z.union([z.string(), z.date()]).optional().nullable(),
});

export const updateStoreSchema = insertStoreSchema.partial();
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

// Schema para promotion_assignments
export const insertPromotionAssignmentSchema = createInsertSchema(promotionAssignments).omit({
  id: true,
  assignedAt: true,
  createdAt: true,
});

export const updatePromotionAssignmentSchema = insertPromotionAssignmentSchema.partial();

// Schemas para Instagram Stories
export const insertInstagramStorySchema = createInsertSchema(instagramStories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewsCount: true,
  likesCount: true,
}).extend({
  expiresAt: z.union([z.string(), z.date()]).optional(),
});

export const updateInstagramStorySchema = insertInstagramStorySchema.partial();

export const insertInstagramStoryViewSchema = createInsertSchema(instagramStoryViews).omit({
  id: true,
  viewedAt: true,
});

export const insertInstagramStoryLikeSchema = createInsertSchema(instagramStoryLikes).omit({
  id: true,
  likedAt: true,
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

// Schema para cadastro de super admin
export const registerSuperAdminSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha de admin deve ter pelo menos 8 caracteres"),
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  adminCode: z.string().min(1, "Código de administrador é obrigatório"),
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
export type RegisterSuperAdminType = z.infer<typeof registerSuperAdminSchema>;
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

// Instagram Stories types
export type InstagramStory = typeof instagramStories.$inferSelect;
export type InsertInstagramStory = z.infer<typeof insertInstagramStorySchema>;
export type UpdateInstagramStory = z.infer<typeof updateInstagramStorySchema>;
export type InstagramStoryView = typeof instagramStoryViews.$inferSelect;
export type InsertInstagramStoryView = z.infer<typeof insertInstagramStoryViewSchema>;
export type InstagramStoryLike = typeof instagramStoryLikes.$inferSelect;
export type InsertInstagramStoryLike = z.infer<typeof insertInstagramStoryLikeSchema>;

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

// Instagram Stories com detalhes
export type InstagramStoryWithDetails = InstagramStory & {
  store: Store;
  user: User;
  views?: InstagramStoryView[];
  likes?: InstagramStoryLike[];
};

export type StoreWithInstagramStories = Store & {
  instagramStories: InstagramStory[];
};

// Types para novo sistema de promoções
export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type UpdatePromotion = z.infer<typeof updatePromotionSchema>;
export type PromotionScratch = typeof promotionScratches.$inferSelect;
export type InsertPromotionScratch = z.infer<typeof insertPromotionScratchSchema>;
export type PromotionAssignment = typeof promotionAssignments.$inferSelect;
export type InsertPromotionAssignment = z.infer<typeof insertPromotionAssignmentSchema>;
export type UpdatePromotionAssignment = z.infer<typeof updatePromotionAssignmentSchema>;

export type PromotionWithDetails = Promotion & {
  store: Store;
  baseProduct?: Product;
  scratches?: PromotionScratch[];
};

export type PromotionScratchWithDetails = PromotionScratch & {
  promotion: PromotionWithDetails;
};

// === COMPARAÇÃO DE PREÇOS INTERNACIONAL ===

// Tabela para armazenar preços brasileiros encontrados via scraping
export const brazilianPrices = pgTable("brazilian_prices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productName: text("product_name").notNull(), // Nome do produto normalizado
  productBrand: varchar("product_brand"), // Marca (Apple, Samsung, etc)
  productModel: varchar("product_model"), // Modelo específico
  productVariant: varchar("product_variant"), // Variação (128GB, 256GB, etc)
  storeName: varchar("store_name").notNull(), // Nome da loja brasileira
  storeUrl: text("store_url"), // URL base da loja
  productUrl: text("product_url").notNull(), // URL específica do produto
  price: text("price").notNull(), // Preço como string para compatibilidade
  currency: varchar("currency", { length: 3 }).default("BRL"),
  availability: varchar("availability").default("in_stock"), // in_stock, out_of_stock, limited
  storePriority: decimal("store_priority", { precision: 3, scale: 0 }).default("99"), // Prioridade da loja (1-99)
  isRelevantStore: boolean("is_relevant_store").default(false), // Se é uma loja relevante
  isActive: boolean("is_active").default(true), // Se o preço ainda é válido
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabela para histórico de comparações realizadas
export const priceComparisons = pgTable("price_comparisons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // Usuário que fez a comparação (opcional)
  productId: varchar("product_id").notNull().references(() => products.id), // Produto do Paraguay
  paraguayPrice: varchar("paraguay_price").notNull(),
  paraguayCurrency: varchar("paraguay_currency").default("USD"),
  bestBrazilianPrice: varchar("best_brazilian_price"),
  savings: varchar("savings"), // Economia em reais
  savingsPercentage: varchar("savings_percentage"), // % de economia
  brazilianStoresFound: varchar("brazilian_stores_found").default("0"), // Quantas lojas encontraram
  comparedAt: timestamp("compared_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabela para sugestões de produtos similares
export const productSuggestions = pgTable("product_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalProductId: varchar("original_product_id").notNull().references(() => products.id),
  suggestedProductId: varchar("suggested_product_id").notNull().references(() => products.id),
  similarityType: varchar("similarity_type").notNull(), // "same_brand", "same_category", "storage_variant"
  similarityScore: decimal("similarity_score", { precision: 3, scale: 2 }), // 0-1 score
  reason: text("reason"), // Explicação da similaridade
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relações para comparação de preços
export const brazilianPricesRelations = relations(brazilianPrices, ({ one }) => ({
  // Não precisa de relação direta com products, pois é baseado em nome/modelo
}));

export const priceComparisonsRelations = relations(priceComparisons, ({ one }) => ({
  user: one(users, {
    fields: [priceComparisons.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [priceComparisons.productId],
    references: [products.id],
  }),
}));

export const productSuggestionsRelations = relations(productSuggestions, ({ one }) => ({
  originalProduct: one(products, {
    fields: [productSuggestions.originalProductId],
    references: [products.id],
  }),
  suggestedProduct: one(products, {
    fields: [productSuggestions.suggestedProductId],
    references: [products.id],
  }),
}));

// Schemas Zod para validação
export const insertBrazilianPriceSchema = createInsertSchema(brazilianPrices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPriceComparisonSchema = createInsertSchema(priceComparisons).omit({
  id: true,
  comparedAt: true,
  createdAt: true,
});

export const insertProductSuggestionSchema = createInsertSchema(productSuggestions).omit({
  id: true,
  createdAt: true,
});

// Types para comparação de preços
export type BrazilianPrice = typeof brazilianPrices.$inferSelect;
export type InsertBrazilianPrice = z.infer<typeof insertBrazilianPriceSchema>;
export type PriceComparison = typeof priceComparisons.$inferSelect;
export type InsertPriceComparison = z.infer<typeof insertPriceComparisonSchema>;
export type ProductSuggestion = typeof productSuggestions.$inferSelect;
export type InsertProductSuggestion = z.infer<typeof insertProductSuggestionSchema>;

export type PriceComparisonWithDetails = PriceComparison & {
  user?: User;
  product: Product & { store: Store };
};

// Schemas para histórico de preços e alertas
export const insertPriceHistorySchema = createInsertSchema(priceHistory).omit({
  id: true,
  recordedAt: true,
  createdAt: true,
});

export const insertPriceAlertSchema = createInsertSchema(priceAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types para histórico de preços
export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = z.infer<typeof insertPriceAlertSchema>;

// Relations dos banners
export const bannersRelations = relations(banners, ({ many }) => ({
  views: many(bannerViews),
  clicks: many(bannerClicks),
}));

export const bannerViewsRelations = relations(bannerViews, ({ one }) => ({
  banner: one(banners, {
    fields: [bannerViews.bannerId],
    references: [banners.id],
  }),
}));

export const bannerClicksRelations = relations(bannerClicks, ({ one }) => ({
  banner: one(banners, {
    fields: [bannerClicks.bannerId],
    references: [banners.id],
  }),
}));

// ==========================================
// SISTEMA DE RASPADINHA DIÁRIA INTELIGENTE
// ==========================================

// Prêmios configuráveis pelo Super Admin
export const dailyPrizes = pgTable("daily_prizes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Tipo de prêmio
  prizeType: varchar("prize_type").notNull(), // 'product', 'discount', 'cashback'
  
  // Dados do produto (quando prizeType = 'product')
  productId: varchar("product_id").references(() => products.id, { onDelete: "cascade" }),
  
  // Dados de desconto/cashback (quando prizeType != 'product')
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }),
  discountValue: decimal("discount_value", { precision: 12, scale: 2 }),
  maxDiscountAmount: decimal("max_discount_amount", { precision: 12, scale: 2 }),
  
  // Configurações do prêmio
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  
  // Controle de probabilidade e uso
  probability: decimal("probability", { precision: 5, scale: 4 }).notNull().default("0.001"), // 0.1% por padrão
  maxDailyWins: varchar("max_daily_wins").default("1"), // Máximo de vitórias por dia
  totalWinsToday: varchar("total_wins_today").default("0"), // Contador diário
  totalWinsAllTime: varchar("total_wins_all_time").default("0"), // Contador total
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Validade
  validFrom: timestamp("starts_at").defaultNow(),
  validUntil: timestamp("expires_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cartas diárias de raspadinha (3 cartas por usuário por dia)
export const dailyScratchCards = pgTable("daily_scratch_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Controle diário
  cardDate: varchar("card_date").notNull(), // 'YYYY-MM-DD'
  cardNumber: varchar("card_number").notNull(), // '1', '2', '3'
  
  // Estado da carta
  isScratched: boolean("is_scratched").default(false),
  scratchedAt: timestamp("scratched_at"),
  
  // Resultado
  won: boolean("won").default(false),
  prizeId: varchar("prize_id").references(() => dailyPrizes.id),
  prizeType: varchar("prize_type"), // 'discount', 'cashback', etc.
  prizeValue: varchar("prize_value"), // Valor do prêmio
  prizeDescription: text("prize_description"), // Descrição do prêmio
  
  // Cupom gerado (se ganhou)
  couponCode: varchar("coupon_code"),
  couponExpiresAt: timestamp("coupon_expires_at"),
  
  // Metadados
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Garantir que cada usuário tenha no máximo 3 cartas por dia
  uniqueUserDateCard: unique().on(table.userId, table.cardDate, table.cardNumber),
}));

// Tentativas diárias dos usuários (mantida para compatibilidade)
export const userDailyAttempts = pgTable("user_daily_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Controle diário
  attemptDate: varchar("attempt_date").notNull(), // 'YYYY-MM-DD'
  hasAttempted: boolean("has_attempted").default(false),
  attemptedAt: timestamp("attempted_at"),
  
  // Resultado
  won: boolean("won").default(false),
  prizeWonId: varchar("prize_won_id").references(() => dailyPrizes.id),
  
  // Dados da tentativa
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Configurações do sistema de raspadinha
export const scratchSystemConfig = pgTable("scratch_system_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 🎯 Configurações do Super Admin (campos adicionados)
  mode: varchar("mode").default("automatic"), // 'automatic' | 'manual'
  winChance: varchar("win_chance").default("25"), // Porcentagem de chance (0-100)
  productsPerDay: varchar("products_per_day").default("5"), // Máximo de produtos/prêmios por dia
  isEnabled: boolean("is_enabled").default(true), // Sistema ativo/inativo
  
  // Configurações de algoritmo
  algorithmType: varchar("algorithm_type").notNull().default("weighted_random"), // 'weighted_random', 'guaranteed_win', 'time_based'
  guaranteedWinEvery: varchar("guaranteed_win_every").default("1000"), // 1 prêmio a cada X tentativas
  currentAttemptCount: varchar("current_attempt_count").default("0"), // Contador atual
  
  // Configurações de seleção de produtos
  enableAutoProductSuggestion: boolean("enable_auto_product_suggestion").default(true),
  suggestionRefreshHours: varchar("suggestion_refresh_hours").default("24"), // A cada quantas horas atualizar sugestões
  
  // Pesos do algoritmo de seleção
  popularityWeight: decimal("popularity_weight", { precision: 3, scale: 2 }).default("0.30"),
  priceWeight: decimal("price_weight", { precision: 3, scale: 2 }).default("0.20"),
  marginWeight: decimal("margin_weight", { precision: 3, scale: 2 }).default("0.20"),
  noveltynWeight: decimal("novelty_weight", { precision: 3, scale: 2 }).default("0.15"),
  categoryWeight: decimal("category_weight", { precision: 3, scale: 2 }).default("0.15"),
  
  // Configurações de prêmios
  minPrizeValue: decimal("min_prize_value", { precision: 12, scale: 2 }).default("10.00"),
  maxPrizeValue: decimal("max_prize_value", { precision: 12, scale: 2 }).default("500.00"),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sugestões do algoritmo para o Super Admin
export const algorithmSuggestions = pgTable("algorithm_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Produto sugerido
  suggestedProductId: varchar("suggested_product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  
  // Análise do algoritmo
  algorithmScore: decimal("algorithm_score", { precision: 5, scale: 2 }).notNull(),
  popularityScore: decimal("popularity_score", { precision: 5, scale: 2 }).default("0.00"),
  priceScore: decimal("price_score", { precision: 5, scale: 2 }).default("0.00"),
  marginScore: decimal("margin_score", { precision: 5, scale: 2 }).default("0.00"),
  noveltyScore: decimal("novelty_score", { precision: 5, scale: 2 }).default("0.00"),
  categoryScore: decimal("category_score", { precision: 5, scale: 2 }).default("0.00"),
  
  // Recomendações
  suggestedPrizeType: varchar("suggested_prize_type").notNull(), // 'product', 'discount_50', 'discount_30', etc
  suggestedDiscountPercentage: decimal("suggested_discount_percentage", { precision: 5, scale: 2 }),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  
  // Status da sugestão
  status: varchar("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'used'
  reviewedAt: timestamp("reviewed_at"),
  reviewedByUserId: varchar("reviewed_by_user_id").references(() => users.id),
  reviewNotes: text("review_notes"),
  
  // Dados de criação
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Resultados das raspadinhas diárias
export const dailyScratchResults = pgTable("daily_scratch_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Data e resultado
  scratchDate: varchar("scratch_date").notNull(), // 'YYYY-MM-DD'
  won: boolean("won").default(false),
  
  // Prêmio (se ganhou)
  prizeId: varchar("prize_id").references(() => dailyPrizes.id),
  prizeType: varchar("prize_type"), // 'product', 'discount', 'cashback'
  prizeDescription: text("prize_description"),
  prizeValue: decimal("prize_value", { precision: 12, scale: 2 }),
  
  // Cupom gerado (se aplicável)
  couponCode: varchar("coupon_code"),
  couponExpiresAt: timestamp("coupon_expires_at"),
  
  // Status do prêmio
  isRedeemed: boolean("is_redeemed").default(false),
  redeemedAt: timestamp("redeemed_at"),
  
  // Dados da sessão
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations para o sistema de raspadinha diária
export const dailyPrizesRelations = relations(dailyPrizes, ({ one, many }) => ({
  product: one(products, {
    fields: [dailyPrizes.productId],
    references: [products.id],
  }),
  userAttempts: many(userDailyAttempts),
  scratchResults: many(dailyScratchResults),
}));

export const dailyScratchCardsRelations = relations(dailyScratchCards, ({ one }) => ({
  user: one(users, {
    fields: [dailyScratchCards.userId],
    references: [users.id],
  }),
  prize: one(dailyPrizes, {
    fields: [dailyScratchCards.prizeId],
    references: [dailyPrizes.id],
  }),
}));

export const userDailyAttemptsRelations = relations(userDailyAttempts, ({ one }) => ({
  user: one(users, {
    fields: [userDailyAttempts.userId],
    references: [users.id],
  }),
  prizeWon: one(dailyPrizes, {
    fields: [userDailyAttempts.prizeWonId],
    references: [dailyPrizes.id],
  }),
}));

export const algorithmSuggestionsRelations = relations(algorithmSuggestions, ({ one }) => ({
  suggestedProduct: one(products, {
    fields: [algorithmSuggestions.suggestedProductId],
    references: [products.id],
  }),
  reviewedByUser: one(users, {
    fields: [algorithmSuggestions.reviewedByUserId],
    references: [users.id],
  }),
}));

export const dailyScratchResultsRelations = relations(dailyScratchResults, ({ one }) => ({
  user: one(users, {
    fields: [dailyScratchResults.userId],
    references: [users.id],
  }),
  prize: one(dailyPrizes, {
    fields: [dailyScratchResults.prizeId],
    references: [dailyPrizes.id],
  }),
}));

// Schemas Zod para o sistema de raspadinha
export const insertDailyPrizeSchema = createInsertSchema(dailyPrizes).omit({
  id: true,
  totalWinsToday: true,
  totalWinsAllTime: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyScratchCardSchema = createInsertSchema(dailyScratchCards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserDailyAttemptSchema = createInsertSchema(userDailyAttempts).omit({
  id: true,
  createdAt: true,
});

export const insertScratchSystemConfigSchema = createInsertSchema(scratchSystemConfig).omit({
  id: true,
  currentAttemptCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAlgorithmSuggestionSchema = createInsertSchema(algorithmSuggestions).omit({
  id: true,
  generatedAt: true,
  createdAt: true,
});

export const insertDailyScratchResultSchema = createInsertSchema(dailyScratchResults).omit({
  id: true,
  createdAt: true,
});

// Configurações de orçamento para o sistema de prêmios
export const budgetConfig = pgTable("budget_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Orçamentos configurados
  dailyBudget: decimal("daily_budget", { precision: 12, scale: 2 }).default("100.00"),
  monthlyBudget: decimal("monthly_budget", { precision: 12, scale: 2 }).default("3000.00"),
  
  // Gastos atuais
  dailySpent: decimal("daily_spent", { precision: 12, scale: 2 }).default("0.00"),
  monthlySpent: decimal("monthly_spent", { precision: 12, scale: 2 }).default("0.00"),
  
  // Data do último reset
  lastDailyReset: varchar("last_daily_reset"), // 'YYYY-MM-DD'
  lastMonthlyReset: varchar("last_monthly_reset"), // 'YYYY-MM'
  
  // Alertas de orçamento
  dailyAlertThreshold: decimal("daily_alert_threshold", { precision: 3, scale: 2 }).default("0.80"), // 80%
  monthlyAlertThreshold: decimal("monthly_alert_threshold", { precision: 3, scale: 2 }).default("0.85"), // 85%
  
  // Estado dos alertas
  dailyAlertSent: boolean("daily_alert_sent").default(false),
  monthlyAlertSent: boolean("monthly_alert_sent").default(false),
  
  // Configurações
  isActive: boolean("is_active").default(true),
  autoResetDaily: boolean("auto_reset_daily").default(true),
  autoResetMonthly: boolean("auto_reset_monthly").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBudgetConfigSchema = createInsertSchema(budgetConfig).omit({
  id: true,
  dailySpent: true,
  monthlySpent: true,
  lastDailyReset: true,
  lastMonthlyReset: true,
  dailyAlertSent: true,
  monthlyAlertSent: true,
  createdAt: true,
  updatedAt: true,
});

// Types para o sistema de raspadinha
export type DailyPrize = typeof dailyPrizes.$inferSelect;
export type InsertDailyPrize = z.infer<typeof insertDailyPrizeSchema>;
export type DailyScratchCard = typeof dailyScratchCards.$inferSelect;
export type InsertDailyScratchCard = z.infer<typeof insertDailyScratchCardSchema>;
export type UserDailyAttempt = typeof userDailyAttempts.$inferSelect;
export type InsertUserDailyAttempt = z.infer<typeof insertUserDailyAttemptSchema>;
export type ScratchSystemConfig = typeof scratchSystemConfig.$inferSelect;
export type InsertScratchSystemConfig = z.infer<typeof insertScratchSystemConfigSchema>;
export type AlgorithmSuggestion = typeof algorithmSuggestions.$inferSelect;
export type InsertAlgorithmSuggestion = z.infer<typeof insertAlgorithmSuggestionSchema>;
export type DailyScratchResult = typeof dailyScratchResults.$inferSelect;
export type InsertDailyScratchResult = z.infer<typeof insertDailyScratchResultSchema>;
export type BudgetConfig = typeof budgetConfig.$inferSelect;
export type InsertBudgetConfig = z.infer<typeof insertBudgetConfigSchema>;

// ==========================================
// FIM DO SISTEMA DE RASPADINHA DIÁRIA
// ==========================================

// Banner schemas
export const insertBannerSchema = createInsertSchema(banners).omit({
  id: true,
  viewsCount: true,
  clicksCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof banners.$inferSelect;

// Funny messages schemas and types
export const insertFunnyMessageSchema = createInsertSchema(funnyMessages).omit({
  id: true,
  createdAt: true,
});

export type FunnyMessage = typeof funnyMessages.$inferSelect;
export type InsertFunnyMessage = z.infer<typeof insertFunnyMessageSchema>;

// Types para sistema de totem
export type TotemContent = typeof totemContent.$inferSelect;
export type InsertTotemContent = typeof totemContent.$inferInsert;
export type TotemSettings = typeof totemSettings.$inferSelect;
export type InsertTotemSettings = typeof totemSettings.$inferInsert;
export type UpdateTotemSettings = Partial<InsertTotemSettings>;

// Schemas Zod para validação
export const insertTotemContentSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  mediaUrl: z.string().min(1, "URL ou caminho da mídia é obrigatório").refine(
    (val) => {
      // Aceitar URLs completas ou caminhos relativos que começam com /
      const urlRegex = /^https?:\/\/.+/;
      const pathRegex = /^\/[^\s]+/;
      return urlRegex.test(val) || pathRegex.test(val);
    },
    { message: "Deve ser uma URL válida (http://...) ou caminho relativo (/...)" }
  ),
  mediaType: z.enum(['image', 'video']).default('image'),
  displayDuration: z.string().default('10'),
  sortOrder: z.string().default('0'),
  scheduleStart: z.string().optional(),
  scheduleEnd: z.string().optional(),
});

export const updateTotemContentSchema = createInsertSchema(totemContent).omit({
  id: true,
  storeId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertTotemSettingsSchema = createInsertSchema(totemSettings).omit({
  id: true,
  lastSync: true,
  updatedAt: true,
});

export const updateTotemSettingsSchema = createInsertSchema(totemSettings).omit({
  id: true,
  storeId: true,
  lastSync: true,
  updatedAt: true,
}).partial();

export type MaintenanceMode = typeof maintenanceMode.$inferSelect;

// ================================
// METADADOS ANÔNIMOS PARA ANALYTICS
// ================================

// Sessões anônimas de usuários (sem dados pessoais)
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionToken: varchar("session_token").notNull().unique(), // Token único para rastrear sessão
  deviceType: varchar("device_type"), // 'mobile', 'desktop', 'tablet'
  screenResolution: varchar("screen_resolution"),
  browserInfo: varchar("browser_info"),
  visitDuration: decimal("visit_duration", { precision: 10, scale: 2 }), // segundos
  pagesViewed: decimal("pages_viewed", { precision: 5, scale: 0 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  lastActivity: timestamp("last_activity").defaultNow(),
}, (table) => [
  index("idx_user_sessions_token").on(table.sessionToken),
  index("idx_user_sessions_created").on(table.createdAt),
]);

// Buscas de produtos (anônimas)
export const productSearches = pgTable("product_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionToken: varchar("session_token").notNull(), // Vincula à sessão anônima
  searchTerm: text("search_term").notNull(),
  category: varchar("category"),
  priceMin: decimal("price_min", { precision: 12, scale: 2 }),
  priceMax: decimal("price_max", { precision: 12, scale: 2 }),
  resultsCount: decimal("results_count", { precision: 5, scale: 0 }),
  clickedProductId: varchar("clicked_product_id"), // Se clicou em algum resultado
  storeId: varchar("store_id"), // Loja onde foi feita a busca
  searchAt: timestamp("search_at").defaultNow(),
}, (table) => [
  index("idx_product_searches_session").on(table.sessionToken),
  index("idx_product_searches_term").on(table.searchTerm),
  index("idx_product_searches_date").on(table.searchAt),
  index("idx_product_searches_store").on(table.storeId),
]);

// Visualizações de produtos (anônimas)
export const productViews = pgTable("product_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionToken: varchar("session_token").notNull(),
  productId: varchar("product_id").notNull(),
  productName: text("product_name").notNull(),
  productCategory: varchar("product_category"),
  productPrice: decimal("product_price", { precision: 12, scale: 2 }),
  storeId: varchar("store_id").notNull(),
  storeName: text("store_name"),
  viewDuration: decimal("view_duration", { precision: 10, scale: 2 }), // segundos na página
  cameFromSearch: boolean("came_from_search").default(false),
  searchTerm: text("search_term"), // Se veio de busca
  wasCompared: boolean("was_compared").default(false), // Se foi usado na comparação
  wasSaved: boolean("was_saved").default(false), // Se foi salvo/curtido
  viewedAt: timestamp("viewed_at").defaultNow(),
}, (table) => [
  index("idx_product_views_session").on(table.sessionToken),
  index("idx_product_views_product").on(table.productId),
  index("idx_product_views_store").on(table.storeId),
  index("idx_product_views_date").on(table.viewedAt),
]);

// Produtos em tendência (calculados diariamente)
export const trendingProducts = pgTable("trending_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(), // Data da análise
  rank: decimal("rank", { precision: 2, scale: 0 }).notNull(), // 1-5 (top 5)
  productName: text("product_name").notNull(),
  category: varchar("category"),
  searchCount: decimal("search_count", { precision: 10, scale: 0 }).default("0"),
  viewCount: decimal("view_count", { precision: 10, scale: 0 }).default("0"),
  saveCount: decimal("save_count", { precision: 10, scale: 0 }).default("0"),
  compareCount: decimal("compare_count", { precision: 10, scale: 0 }).default("0"),
  totalScore: decimal("total_score", { precision: 12, scale: 2 }).notNull(), // Score calculado
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_trending_products_date").on(table.date),
  index("idx_trending_products_rank").on(table.rank),
]);

// Artes geradas automaticamente para totem
export const generatedTotemArts = pgTable("generated_totem_arts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  generationDate: timestamp("generation_date").notNull(),
  trendingProductsData: jsonb("trending_products_data").notNull(), // Top 5 produtos + dados
  imageUrl: text("image_url").notNull(), // URL da arte gerada
  imagePrompt: text("image_prompt").notNull(), // Prompt usado para gerar
  isActive: boolean("is_active").default(true),
  displayedAt: timestamp("displayed_at"), // Quando foi exibida no totem
  impressions: decimal("impressions", { precision: 10, scale: 0 }).default("0"), // Quantas vezes foi vista
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_generated_arts_store").on(table.storeId),
  index("idx_generated_arts_date").on(table.generationDate),
  index("idx_generated_arts_active").on(table.isActive),
]);


// Zod schemas para metadados
export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
  lastActivity: true,
});

export const insertProductSearchSchema = createInsertSchema(productSearches).omit({
  id: true,
  searchAt: true,
});

export const insertProductViewSchema = createInsertSchema(productViews).omit({
  id: true,
  viewedAt: true,
});

export const insertTrendingProductSchema = createInsertSchema(trendingProducts).omit({
  id: true,
  createdAt: true,
});

export const insertGeneratedTotemArtSchema = createInsertSchema(generatedTotemArts).omit({
  id: true,
  createdAt: true,
});

// Types para TypeScript
export type UserSession = typeof userSessions.$inferSelect;
export type ProductSearch = typeof productSearches.$inferSelect;
export type ProductView = typeof productViews.$inferSelect;
export type TrendingProduct = typeof trendingProducts.$inferSelect;
export type GeneratedTotemArt = typeof generatedTotemArts.$inferSelect;

export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type InsertProductSearch = z.infer<typeof insertProductSearchSchema>;
export type InsertProductView = z.infer<typeof insertProductViewSchema>;
export type InsertTrendingProduct = z.infer<typeof insertTrendingProductSchema>;
export type InsertGeneratedTotemArt = z.infer<typeof insertGeneratedTotemArtSchema>;
