import { pgTable, index, varchar, jsonb, timestamp, unique, boolean, text, foreignKey, numeric, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const sessions = pgTable("sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: jsonb().notNull(),
	expire: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const users = pgTable("users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	email: varchar().notNull(),
	firstName: varchar("first_name"),
	lastName: varchar("last_name"),
	profileImageUrl: varchar("profile_image_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	fullName: varchar("full_name"),
	phone: varchar(),
	city: varchar(),
	state: varchar(),
	country: varchar(),
	provider: varchar().default('email'),
	providerId: varchar("provider_id"),
	isEmailVerified: boolean("is_email_verified").default(false),
	password: varchar(),
	storeName: varchar("store_name"),
	address: text(),
	storeOwnerToken: varchar("store_owner_token"),
	isSuperAdmin: boolean("is_super_admin").default(false),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const categorySellers = pgTable("category_sellers", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	categoryId: varchar("category_id").notNull(),
	name: varchar().notNull(),
	whatsapp: varchar().notNull(),
	isActive: boolean("is_active").default(true),
	sortOrder: varchar("sort_order").default('0'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const scratchOffers = pgTable("scratch_offers", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id"),
	productId: varchar("product_id"),
	status: varchar().default('eligible').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	revealedAt: timestamp("revealed_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	cooldownUntil: timestamp("cooldown_until", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "scratch_offers_user_id_fkey"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "scratch_offers_product_id_fkey"
		}),
]);

export const flyerViews = pgTable("flyer_views", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	storeId: varchar("store_id").notNull(),
	userId: varchar("user_id"),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address"),
	viewedAt: timestamp("viewed_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "flyer_views_store_id_stores_id_fk"
		}).onDelete("cascade"),
]);

export const productLikes = pgTable("product_likes", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	productId: varchar("product_id").notNull(),
	userId: varchar("user_id"),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address"),
	likedAt: timestamp("liked_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_likes_product_id_products_id_fk"
		}).onDelete("cascade"),
]);

export const savedProducts = pgTable("saved_products", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	productId: varchar("product_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "saved_products_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "saved_products_product_id_products_id_fk"
		}).onDelete("cascade"),
]);

export const storyViews = pgTable("story_views", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	storeId: varchar("store_id").notNull(),
	productId: varchar("product_id"),
	userId: varchar("user_id"),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address"),
	viewedAt: timestamp("viewed_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "story_views_store_id_stores_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "story_views_product_id_products_id_fk"
		}).onDelete("cascade"),
]);

export const scratchedProducts = pgTable("scratched_products", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	productId: varchar("product_id").notNull(),
	userId: varchar("user_id"),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address"),
	scratchedAt: timestamp("scratched_at", { mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	hasRedeemed: boolean("has_redeemed").default(false),
	cloneId: varchar("clone_id"),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "scratched_products_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.cloneId],
			foreignColumns: [virtualScratchClones.id],
			name: "scratched_products_clone_id_fkey"
		}).onDelete("cascade"),
]);

export const coupons = pgTable("coupons", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	productId: varchar("product_id"),
	storeId: varchar("store_id").notNull(),
	userId: varchar("user_id"),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address"),
	couponCode: varchar("coupon_code").notNull(),
	originalPrice: numeric("original_price", { precision: 12, scale:  2 }).notNull(),
	discountPrice: numeric("discount_price", { precision: 12, scale:  2 }).notNull(),
	discountPercentage: varchar("discount_percentage").notNull(),
	qrCode: text("qr_code").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	isRedeemed: boolean("is_redeemed").default(false),
	redeemedAt: timestamp("redeemed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	cloneId: varchar("clone_id"),
	promotionName: text("promotion_name"),
	promotionImageUrl: text("promotion_image_url"),
	promotionDescription: text("promotion_description"),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "coupons_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "coupons_store_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.cloneId],
			foreignColumns: [virtualScratchClones.id],
			name: "coupons_clone_id_fkey"
		}).onDelete("cascade"),
	unique("coupons_coupon_code_key").on(table.couponCode),
]);

export const products = pgTable("products", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	storeId: varchar("store_id").notNull(),
	name: text().notNull(),
	description: text(),
	price: numeric({ precision: 12, scale:  2 }).notNull(),
	imageUrl: text("image_url"),
	isFeatured: boolean("is_featured").default(false),
	isActive: boolean("is_active").default(true),
	sortOrder: varchar("sort_order").default('0'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	category: varchar().default('Perfumaria'),
	showInStories: boolean("show_in_stories").default(false),
	imageUrl2: text("image_url2"),
	imageUrl3: text("image_url3"),
	categoryId: varchar("category_id"),
	isScratchCard: boolean("is_scratch_card").default(false),
	scratchPrice: numeric("scratch_price", { precision: 12, scale:  2 }),
	scratchExpiresAt: timestamp("scratch_expires_at", { mode: 'string' }),
	scratchTimeLimitMinutes: varchar("scratch_time_limit_minutes").default('60'),
	maxScratchRedemptions: varchar("max_scratch_redemptions").default('10'),
	currentScratchRedemptions: varchar("current_scratch_redemptions").default('0'),
	scratchMessage: text("scratch_message").default('Raspe aqui e ganhe um super desconto!'),
	showInTotem: boolean("show_in_totem").default(false),
	gtin: varchar({ length: 14 }),
	brand: varchar(),
	productCode: varchar("product_code"),
	sourceType: varchar("source_type").default('manual'),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "products_store_id_stores_id_fk"
		}).onDelete("cascade"),
]);

export const scratchCampaigns = pgTable("scratch_campaigns", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	productId: varchar("product_id").notNull(),
	storeId: varchar("store_id").notNull(),
	title: text().default('Raspe e ganhe desconto!').notNull(),
	description: text().default('Raspe aqui e ganhe um super desconto!'),
	discountPrice: numeric("discount_price", { precision: 12, scale:  2 }).notNull(),
	discountPercentage: varchar("discount_percentage").notNull(),
	isActive: boolean("is_active").default(true),
	maxClones: varchar("max_clones").default('10'),
	clonesCreated: varchar("clones_created").default('0'),
	clonesUsed: varchar("clones_used").default('0'),
	distributeToAll: boolean("distribute_to_all").default(false),
	selectedUserIds: text("selected_user_ids"),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	cloneExpirationHours: varchar("clone_expiration_hours").default('24'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "scratch_campaigns_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "scratch_campaigns_store_id_fkey"
		}).onDelete("cascade"),
]);

export const virtualScratchClones = pgTable("virtual_scratch_clones", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	campaignId: varchar("campaign_id").notNull(),
	productId: varchar("product_id").notNull(),
	storeId: varchar("store_id").notNull(),
	assignedUserId: varchar("assigned_user_id"),
	productName: text("product_name").notNull(),
	productDescription: text("product_description"),
	originalPrice: numeric("original_price", { precision: 12, scale:  2 }).notNull(),
	discountPrice: numeric("discount_price", { precision: 12, scale:  2 }).notNull(),
	productImageUrl: text("product_image_url"),
	productCategory: varchar("product_category"),
	isUsed: boolean("is_used").default(false),
	isExpired: boolean("is_expired").default(false),
	notificationSent: boolean("notification_sent").default(false),
	usedAt: timestamp("used_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.campaignId],
			foreignColumns: [scratchCampaigns.id],
			name: "virtual_scratch_clones_campaign_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "virtual_scratch_clones_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "virtual_scratch_clones_store_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.assignedUserId],
			foreignColumns: [users.id],
			name: "virtual_scratch_clones_assigned_user_id_fkey"
		}).onDelete("cascade"),
]);

export const instagramStories = pgTable("instagram_stories", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	storeId: varchar("store_id").notNull(),
	userId: varchar("user_id").notNull(),
	mediaType: varchar("media_type").notNull(),
	mediaUrl: text("media_url").notNull(),
	caption: text(),
	productName: text("product_name"),
	productPrice: varchar("product_price"),
	productDiscountPrice: varchar("product_discount_price"),
	productCategory: varchar("product_category"),
	isProductPromo: boolean("is_product_promo").default(false),
	backgroundColor: varchar("background_color").default('#ffffff'),
	textColor: varchar("text_color").default('#000000'),
	isActive: boolean("is_active").default(true),
	viewsCount: varchar("views_count").default('0'),
	likesCount: varchar("likes_count").default('0'),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "instagram_stories_store_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "instagram_stories_user_id_fkey"
		}).onDelete("cascade"),
]);

export const promotionScratches = pgTable("promotion_scratches", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	promotionId: varchar("promotion_id").notNull(),
	userId: varchar("user_id"),
	userAgent: varchar("user_agent"),
	ipAddress: varchar("ip_address"),
	isUsed: boolean("is_used").default(false),
	usedAt: timestamp("used_at", { mode: 'string' }),
	couponCode: varchar("coupon_code"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	scratchedAt: timestamp("scratched_at", { mode: 'string' }).defaultNow(),
});

export const instagramStoryViews = pgTable("instagram_story_views", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	storyId: varchar("story_id").notNull(),
	viewerId: varchar("viewer_id"),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address"),
	viewedAt: timestamp("viewed_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.storyId],
			foreignColumns: [instagramStories.id],
			name: "instagram_story_views_story_id_fkey"
		}).onDelete("cascade"),
]);

export const promotions = pgTable("promotions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	storeId: varchar("store_id").notNull(),
	baseProductId: varchar("base_product_id"),
	name: varchar().notNull(),
	description: text(),
	imageUrl: varchar("image_url"),
	category: varchar().notNull(),
	originalPrice: varchar("original_price").notNull(),
	promotionalPrice: varchar("promotional_price").notNull(),
	discountPercentage: varchar("discount_percentage").notNull(),
	isActive: boolean("is_active").default(true),
	maxClients: varchar("max_clients").notNull(),
	usedCount: varchar("used_count").default('0'),
	validFrom: timestamp("valid_from", { mode: 'string' }).notNull(),
	validUntil: timestamp("valid_until", { mode: 'string' }).notNull(),
	scratchMessage: text("scratch_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const promotionAssignments = pgTable("promotion_assignments", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	promotionId: varchar("promotion_id").notNull(),
	userId: varchar("user_id").notNull(),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
	status: varchar().default('assigned').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.promotionId],
			foreignColumns: [promotions.id],
			name: "promotion_assignments_promotion_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "promotion_assignments_user_id_fkey"
		}).onDelete("cascade"),
]);

export const instagramStoryLikes = pgTable("instagram_story_likes", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	storyId: varchar("story_id").notNull(),
	userId: varchar("user_id"),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address"),
	likedAt: timestamp("liked_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.storyId],
			foreignColumns: [instagramStories.id],
			name: "instagram_story_likes_story_id_fkey"
		}).onDelete("cascade"),
]);

export const brazilianPrices = pgTable("brazilian_prices", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	productName: varchar("product_name").notNull(),
	productBrand: varchar("product_brand"),
	productModel: varchar("product_model"),
	productVariant: varchar("product_variant"),
	storeName: varchar("store_name").notNull(),
	storeUrl: varchar("store_url"),
	productUrl: varchar("product_url"),
	price: varchar().notNull(),
	currency: varchar().default('BRL').notNull(),
	availability: varchar().default('in_stock').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	storePriority: numeric("store_priority", { precision: 3, scale:  0 }).default('99'),
	isRelevantStore: boolean("is_relevant_store").default(false),
}, (table) => [
	unique("brazilian_prices_product_url_key").on(table.productUrl),
]);

export const productSuggestions = pgTable("product_suggestions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	originalProductId: varchar("original_product_id").notNull(),
	suggestedProductName: varchar("suggested_product_name").notNull(),
	suggestionReason: varchar("suggestion_reason").notNull(),
	confidenceScore: varchar("confidence_score"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const priceComparisons = pgTable("price_comparisons", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id"),
	productId: varchar("product_id").notNull(),
	paraguayPrice: varchar("paraguay_price").notNull(),
	paraguayCurrency: varchar("paraguay_currency").default('USD').notNull(),
	bestBrazilianPrice: varchar("best_brazilian_price"),
	savings: varchar(),
	savingsPercentage: varchar("savings_percentage"),
	brazilianStoresFound: varchar("brazilian_stores_found"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	comparedAt: timestamp("compared_at", { mode: 'string' }).defaultNow(),
});

export const priceHistory = pgTable("price_history", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	productName: text("product_name").notNull(),
	mlItemId: varchar("ml_item_id"),
	storeName: varchar("store_name").default('Mercado Livre').notNull(),
	price: numeric({ precision: 12, scale:  2 }).notNull(),
	currency: varchar({ length: 3 }).default('BRL').notNull(),
	availability: varchar().default('in_stock').notNull(),
	productUrl: text("product_url"),
	freeShipping: boolean("free_shipping").default(false),
	condition: varchar().default('new'),
	soldQuantity: varchar("sold_quantity").default('0'),
	recordedAt: timestamp("recorded_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const priceAlerts = pgTable("price_alerts", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id"),
	productName: text("product_name").notNull(),
	targetPrice: numeric("target_price", { precision: 12, scale:  2 }).notNull(),
	currency: varchar({ length: 3 }).default('BRL').notNull(),
	isActive: boolean("is_active").default(true),
	emailNotification: boolean("email_notification").default(true),
	lastCheckedAt: timestamp("last_checked_at", { mode: 'string' }),
	lastNotifiedAt: timestamp("last_notified_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "price_alerts_user_id_fkey"
		}).onDelete("cascade"),
]);

export const userDailyAttempts = pgTable("user_daily_attempts", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	attemptDate: varchar("attempt_date").notNull(),
	hasAttempted: boolean("has_attempted").default(false),
	attemptedAt: timestamp("attempted_at", { mode: 'string' }),
	won: boolean().default(false),
	prizeWonId: varchar("prize_won_id"),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_daily_attempts_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.prizeWonId],
			foreignColumns: [dailyPrizes.id],
			name: "user_daily_attempts_prize_won_id_fkey"
		}),
	unique("user_daily_attempts_user_id_attempt_date_key").on(table.userId, table.attemptDate),
]);

export const banners = pgTable("banners", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	imageUrl: text("image_url").notNull(),
	linkUrl: text("link_url"),
	bannerType: varchar("banner_type").notNull(),
	isActive: boolean("is_active").default(true),
	priority: varchar().default('0'),
	backgroundColor: varchar("background_color").default('#ffffff'),
	textColor: varchar("text_color").default('#000000'),
	startsAt: timestamp("starts_at", { mode: 'string' }).defaultNow(),
	endsAt: timestamp("ends_at", { mode: 'string' }),
	viewsCount: varchar("views_count").default('0'),
	clicksCount: varchar("clicks_count").default('0'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const bannerViews = pgTable("banner_views", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	bannerId: varchar("banner_id").notNull(),
	userId: varchar("user_id"),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address"),
	viewedAt: timestamp("viewed_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.bannerId],
			foreignColumns: [banners.id],
			name: "banner_views_banner_id_fkey"
		}).onDelete("cascade"),
]);

export const dailyPrizes = pgTable("daily_prizes", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: varchar().notNull(),
	description: text(),
	prizeType: varchar("prize_type").default('discount').notNull(),
	discountPercentage: numeric("discount_percentage", { precision: 5, scale:  2 }),
	discountValue: numeric("discount_value", { precision: 12, scale:  2 }),
	minPurchaseAmount: numeric("min_purchase_amount", { precision: 12, scale:  2 }).default('0.00'),
	maxDiscountAmount: numeric("max_discount_amount", { precision: 12, scale:  2 }),
	productId: varchar("product_id"),
	couponCode: varchar("coupon_code"),
	couponCodePrefix: varchar("coupon_code_prefix"),
	totalWinsLimit: varchar("total_wins_limit").default('100'),
	currentWins: varchar("current_wins").default('0'),
	isActive: boolean("is_active").default(true),
	startsAt: timestamp("starts_at", { mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).default(sql`(now() + '30 days'::interval)`),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	imageUrl: varchar("image_url"),
	probability: varchar().default('0.001'),
	maxDailyWins: varchar("max_daily_wins").default('1'),
	totalWinsAllTime: varchar("total_wins_all_time").default('0'),
	totalWinsToday: varchar("total_wins_today").default('0'),
});

export const bannerClicks = pgTable("banner_clicks", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	bannerId: varchar("banner_id").notNull(),
	userId: varchar("user_id"),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address"),
	clickedAt: timestamp("clicked_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.bannerId],
			foreignColumns: [banners.id],
			name: "banner_clicks_banner_id_fkey"
		}).onDelete("cascade"),
]);

export const stores = pgTable("stores", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	name: text().notNull(),
	logoUrl: text("logo_url"),
	themeColor: varchar("theme_color", { length: 7 }).default('#E11D48'),
	currency: varchar({ length: 10 }).default('Gs.'),
	whatsapp: varchar(),
	instagram: varchar(),
	address: text(),
	slug: varchar(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	latitude: numeric({ precision: 10, scale:  8 }),
	longitude: numeric({ precision: 11, scale:  8 }),
	displayCurrency: varchar("display_currency", { length: 10 }).default('local'),
	dollarRate: numeric("dollar_rate", { precision: 10, scale:  2 }).default('7500.00'),
	customUsdBrlRate: numeric("custom_usd_brl_rate", { precision: 10, scale:  4 }),
	bannerUrl: text("banner_url"),
	bannerText: text("banner_text"),
	bannerSubtext: text("banner_subtext"),
	bannerGradient: varchar("banner_gradient", { length: 50 }).default('purple-to-pink'),
	isPremium: boolean("is_premium").default(false),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "stores_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("stores_slug_unique").on(table.slug),
]);

export const algorithmSuggestions = pgTable("algorithm_suggestions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	suggestedProductId: varchar("suggested_product_id").notNull(),
	algorithmScore: numeric("algorithm_score", { precision: 5, scale:  2 }).notNull(),
	popularityScore: numeric("popularity_score", { precision: 5, scale:  2 }).default('0.00'),
	priceScore: numeric("price_score", { precision: 5, scale:  2 }).default('0.00'),
	marginScore: numeric("margin_score", { precision: 5, scale:  2 }).default('0.00'),
	noveltyScore: numeric("novelty_score", { precision: 5, scale:  2 }).default('0.00'),
	categoryScore: numeric("category_score", { precision: 5, scale:  2 }).default('0.00'),
	suggestedPrizeType: varchar("suggested_prize_type").notNull(),
	suggestedDiscountPercentage: numeric("suggested_discount_percentage", { precision: 5, scale:  2 }),
	estimatedCost: numeric("estimated_cost", { precision: 12, scale:  2 }),
	status: varchar().default('pending').notNull(),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	reviewedByUserId: varchar("reviewed_by_user_id"),
	reviewNotes: text("review_notes"),
	generatedAt: timestamp("generated_at", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.suggestedProductId],
			foreignColumns: [products.id],
			name: "algorithm_suggestions_suggested_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.reviewedByUserId],
			foreignColumns: [users.id],
			name: "algorithm_suggestions_reviewed_by_user_id_fkey"
		}),
]);

export const dailyScratchResults = pgTable("daily_scratch_results", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	scratchDate: varchar("scratch_date").notNull(),
	won: boolean().default(false),
	prizeId: varchar("prize_id"),
	prizeType: varchar("prize_type"),
	prizeDescription: text("prize_description"),
	prizeValue: numeric("prize_value", { precision: 12, scale:  2 }),
	couponCode: varchar("coupon_code"),
	couponExpiresAt: timestamp("coupon_expires_at", { mode: 'string' }),
	redemptionStatus: varchar("redemption_status").default('active'),
	redeemedAt: timestamp("redeemed_at", { mode: 'string' }),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "daily_scratch_results_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.prizeId],
			foreignColumns: [dailyPrizes.id],
			name: "daily_scratch_results_prize_id_fkey"
		}),
]);

export const funnyMessages = pgTable("funny_messages", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	message: text().notNull(),
	emoji: text().notNull(),
	category: varchar({ length: 10 }).default('lose'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const dailyScratchCards = pgTable("daily_scratch_cards", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	cardDate: varchar("card_date").notNull(),
	cardNumber: varchar("card_number").notNull(),
	isScratched: boolean("is_scratched").default(false),
	scratchedAt: timestamp("scratched_at", { mode: 'string' }),
	won: boolean().default(false),
	prizeId: varchar("prize_id"),
	prizeType: varchar("prize_type"),
	prizeValue: varchar("prize_value"),
	prizeDescription: text("prize_description"),
	couponCode: varchar("coupon_code"),
	couponExpiresAt: timestamp("coupon_expires_at", { mode: 'string' }),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "daily_scratch_cards_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.prizeId],
			foreignColumns: [dailyPrizes.id],
			name: "daily_scratch_cards_prize_id_fkey"
		}),
	unique("daily_scratch_cards_user_id_card_date_card_number_key").on(table.userId, table.cardDate, table.cardNumber),
]);

export const campaignCounters = pgTable("campaign_counters", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	date: varchar().notNull(),
	globalScratches: integer("global_scratches").default(0).notNull(),
	winsToday: integer("wins_today").default(0).notNull(),
	wins20: integer().default(0).notNull(),
	wins30: integer().default(0).notNull(),
	wins50: integer().default(0).notNull(),
	wins70: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("campaign_counters_date_key").on(table.date),
]);

export const campaignPrizeTier = pgTable("campaign_prize_tier", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: varchar().notNull(),
	description: text(),
	discountPercent: integer("discount_percent").notNull(),
	weight: integer().default(1).notNull(),
	dailyQuota: integer("daily_quota"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const userDailyCards = pgTable("user_daily_cards", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	date: varchar().notNull(),
	cardsUsed: integer("cards_used").default(0).notNull(),
	winsToday: integer("wins_today").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("user_daily_cards_user_id_date_key").on(table.userId, table.date),
]);

export const maintenanceMode = pgTable("maintenance_mode", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	isActive: boolean("is_active").default(false),
	title: text().default('Em Breve'),
	message: text().default('Estamos preparando as melhores ofertas do Paraguai para você!'),
	accessPassword: varchar("access_password").default('CLICKOFERTAS2025'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	updatedBy: varchar("updated_by"),
}, (table) => [
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "maintenance_mode_updated_by_fkey"
		}),
]);

export const scratchSystemConfig = pgTable("scratch_system_config", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	guaranteedWinEvery: varchar("guaranteed_win_every").default('1000'),
	currentAttemptCount: varchar("current_attempt_count").default('0'),
	lastGuaranteedWinAt: timestamp("last_guaranteed_win_at", { mode: 'string' }),
	dailyAttemptResetHour: varchar("daily_attempt_reset_hour").default('0'),
	dailyAttemptResetTimezone: varchar("daily_attempt_reset_timezone").default('America/Asuncion'),
	maxAttemptsPerUserPerDay: varchar("max_attempts_per_user_per_day").default('1'),
	systemActive: boolean("system_active").default(true),
	popularityWeight: numeric("popularity_weight", { precision: 3, scale:  2 }).default('0.30'),
	priceWeight: numeric("price_weight", { precision: 3, scale:  2 }).default('0.20'),
	marginWeight: numeric("margin_weight", { precision: 3, scale:  2 }).default('0.20'),
	noveltyWeight: numeric("novelty_weight", { precision: 3, scale:  2 }).default('0.15'),
	categoryWeight: numeric("category_weight", { precision: 3, scale:  2 }).default('0.15'),
	minPrizeValue: numeric("min_prize_value", { precision: 12, scale:  2 }).default('10.00'),
	maxPrizeValue: numeric("max_prize_value", { precision: 12, scale:  2 }).default('500.00'),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	algorithmType: varchar("algorithm_type").default('weighted_random'),
	enableAutoProductSuggestion: boolean("enable_auto_product_suggestion").default(true),
	suggestionRefreshHours: varchar("suggestion_refresh_hours").default('24'),
	oneInN: integer("one_in_n").default(1000).notNull(),
	cardsPerUserPerDay: integer("cards_per_user_per_day").default(3).notNull(),
	maxWinsPerDay: integer("max_wins_per_day"),
	maxWinsPerUserPerDay: integer("max_wins_per_user_per_day").default(1).notNull(),
	mode: varchar().default('automatic'),
	winChance: varchar("win_chance").default('25'),
	productsPerDay: varchar("products_per_day").default('5'),
	isEnabled: boolean("is_enabled").default(true),
});

export const budgetConfig = pgTable("budget_config", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	dailyBudget: numeric("daily_budget", { precision: 12, scale:  2 }).default('100.00'),
	monthlyBudget: numeric("monthly_budget", { precision: 12, scale:  2 }).default('3000.00'),
	dailySpent: numeric("daily_spent", { precision: 12, scale:  2 }).default('0.00'),
	monthlySpent: numeric("monthly_spent", { precision: 12, scale:  2 }).default('0.00'),
	lastDailyReset: varchar("last_daily_reset"),
	lastMonthlyReset: varchar("last_monthly_reset"),
	dailyAlertThreshold: numeric("daily_alert_threshold", { precision: 3, scale:  2 }).default('0.80'),
	monthlyAlertThreshold: numeric("monthly_alert_threshold", { precision: 3, scale:  2 }).default('0.85'),
	dailyAlertSent: boolean("daily_alert_sent").default(false),
	monthlyAlertSent: boolean("monthly_alert_sent").default(false),
	isActive: boolean("is_active").default(true),
	autoResetDaily: boolean("auto_reset_daily").default(true),
	autoResetMonthly: boolean("auto_reset_monthly").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const totemContent = pgTable("totem_content", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	storeId: varchar("store_id").notNull(),
	title: varchar().notNull(),
	description: text(),
	mediaUrl: text("media_url").notNull(),
	mediaType: varchar("media_type").default('image'),
	displayDuration: varchar("display_duration").default('10'),
	scheduleStart: timestamp("schedule_start", { mode: 'string' }),
	scheduleEnd: timestamp("schedule_end", { mode: 'string' }),
	sortOrder: varchar("sort_order").default('0'),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const totemSettings = pgTable("totem_settings", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	storeId: varchar("store_id").notNull(),
	backgroundColor: varchar("background_color").default('#000000'),
	transitionEffect: varchar("transition_effect").default('fade'),
	transitionDuration: varchar("transition_duration").default('500'),
	autoRotate: boolean("auto_rotate").default(true),
	rotationInterval: varchar("rotation_interval").default('10'),
	isActive: boolean("is_active").default(true),
	lastSync: timestamp("last_sync", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("totem_settings_store_id_key").on(table.storeId),
]);

export const userSessions = pgTable("user_sessions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	sessionToken: varchar("session_token").notNull(),
	deviceType: varchar("device_type"),
	screenResolution: varchar("screen_resolution"),
	browserInfo: varchar("browser_info"),
	visitDuration: numeric("visit_duration", { precision: 10, scale:  2 }),
	pagesViewed: numeric("pages_viewed", { precision: 5, scale:  0 }).default('0'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	lastActivity: timestamp("last_activity", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_sessions_created").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_user_sessions_token").using("btree", table.sessionToken.asc().nullsLast().op("text_ops")),
	unique("user_sessions_session_token_key").on(table.sessionToken),
]);

export const productSearches = pgTable("product_searches", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	sessionToken: varchar("session_token").notNull(),
	searchTerm: text("search_term").notNull(),
	category: varchar(),
	priceMin: numeric("price_min", { precision: 12, scale:  2 }),
	priceMax: numeric("price_max", { precision: 12, scale:  2 }),
	resultsCount: numeric("results_count", { precision: 5, scale:  0 }),
	clickedProductId: varchar("clicked_product_id"),
	storeId: varchar("store_id"),
	searchAt: timestamp("search_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_product_searches_date").using("btree", table.searchAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_product_searches_session").using("btree", table.sessionToken.asc().nullsLast().op("text_ops")),
	index("idx_product_searches_store").using("btree", table.storeId.asc().nullsLast().op("text_ops")),
	index("idx_product_searches_term").using("btree", table.searchTerm.asc().nullsLast().op("text_ops")),
]);

export const productViews = pgTable("product_views", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	sessionToken: varchar("session_token").notNull(),
	productId: varchar("product_id").notNull(),
	productName: text("product_name").notNull(),
	productCategory: varchar("product_category"),
	productPrice: numeric("product_price", { precision: 12, scale:  2 }),
	storeId: varchar("store_id").notNull(),
	storeName: text("store_name"),
	viewDuration: numeric("view_duration", { precision: 10, scale:  2 }),
	cameFromSearch: boolean("came_from_search").default(false),
	searchTerm: text("search_term"),
	wasCompared: boolean("was_compared").default(false),
	wasSaved: boolean("was_saved").default(false),
	viewedAt: timestamp("viewed_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_product_views_date").using("btree", table.viewedAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_product_views_product").using("btree", table.productId.asc().nullsLast().op("text_ops")),
	index("idx_product_views_session").using("btree", table.sessionToken.asc().nullsLast().op("text_ops")),
	index("idx_product_views_store").using("btree", table.storeId.asc().nullsLast().op("text_ops")),
]);

export const trendingProducts = pgTable("trending_products", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	rank: numeric({ precision: 2, scale:  0 }).notNull(),
	productName: text("product_name").notNull(),
	category: varchar(),
	searchCount: numeric("search_count", { precision: 10, scale:  0 }).default('0'),
	viewCount: numeric("view_count", { precision: 10, scale:  0 }).default('0'),
	saveCount: numeric("save_count", { precision: 10, scale:  0 }).default('0'),
	compareCount: numeric("compare_count", { precision: 10, scale:  0 }).default('0'),
	totalScore: numeric("total_score", { precision: 12, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_trending_products_date").using("btree", table.date.asc().nullsLast().op("timestamp_ops")),
	index("idx_trending_products_rank").using("btree", table.rank.asc().nullsLast().op("numeric_ops")),
]);

export const categories = pgTable("categories", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	slug: varchar({ length: 100 }).notNull(),
	isActive: boolean("is_active").default(true),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("categories_slug_key").on(table.slug),
]);

export const generatedTotemArts = pgTable("generated_totem_arts", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	storeId: varchar("store_id").notNull(),
	generationDate: timestamp("generation_date", { mode: 'string' }).notNull(),
	trendingProductsData: jsonb("trending_products_data").notNull(),
	imageUrl: text("image_url").notNull(),
	imagePrompt: text("image_prompt").notNull(),
	isActive: boolean("is_active").default(true),
	displayedAt: timestamp("displayed_at", { mode: 'string' }),
	impressions: numeric({ precision: 10, scale:  0 }).default('0'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_generated_arts_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_generated_arts_date").using("btree", table.generationDate.asc().nullsLast().op("timestamp_ops")),
	index("idx_generated_arts_store").using("btree", table.storeId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "generated_totem_arts_store_id_fkey"
		}).onDelete("cascade"),
]);

export const productBanks = pgTable("product_banks", {
	id: text().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	zipfilename: text().notNull(),
	uploadedby: text().notNull(),
	totalproducts: integer().default(0).notNull(),
	isactive: boolean().default(true).notNull(),
	createdat: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedat: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const productBankItems = pgTable("product_bank_items", {
	id: text().default(gen_random_uuid()).primaryKey().notNull(),
	bankid: text().notNull(),
	name: text().notNull(),
	description: text(),
	category: text().notNull(),
	brand: text(),
	model: text(),
	color: text(),
	storage: text(),
	ram: text(),
	foldername: text().notNull(),
	imageurls: text().array().default([""]).notNull(),
	primaryimageurl: text().notNull(),
	metadata: jsonb().default({}),
	usagecount: integer().default(0).notNull(),
	createdat: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedat: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.bankid],
			foreignColumns: [productBanks.id],
			name: "product_bank_items_bankid_fkey"
		}).onDelete("cascade"),
]);
