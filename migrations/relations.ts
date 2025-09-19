import { relations } from "drizzle-orm/relations";
import { users, scratchOffers, products, stores, flyerViews, productLikes, savedProducts, storyViews, scratchedProducts, virtualScratchClones, coupons, scratchCampaigns, instagramStories, instagramStoryViews, promotions, promotionAssignments, instagramStoryLikes, priceAlerts, userDailyAttempts, dailyPrizes, banners, bannerViews, bannerClicks, algorithmSuggestions, dailyScratchResults, dailyScratchCards, maintenanceMode, generatedTotemArts, productBanks, productBankItems } from "./schema";

export const scratchOffersRelations = relations(scratchOffers, ({one}) => ({
	user: one(users, {
		fields: [scratchOffers.userId],
		references: [users.id]
	}),
	product: one(products, {
		fields: [scratchOffers.productId],
		references: [products.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	scratchOffers: many(scratchOffers),
	savedProducts: many(savedProducts),
	virtualScratchClones: many(virtualScratchClones),
	instagramStories: many(instagramStories),
	promotionAssignments: many(promotionAssignments),
	priceAlerts: many(priceAlerts),
	userDailyAttempts: many(userDailyAttempts),
	stores: many(stores),
	algorithmSuggestions: many(algorithmSuggestions),
	dailyScratchResults: many(dailyScratchResults),
	dailyScratchCards: many(dailyScratchCards),
	maintenanceModes: many(maintenanceMode),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	scratchOffers: many(scratchOffers),
	productLikes: many(productLikes),
	savedProducts: many(savedProducts),
	storyViews: many(storyViews),
	scratchedProducts: many(scratchedProducts),
	coupons: many(coupons),
	store: one(stores, {
		fields: [products.storeId],
		references: [stores.id]
	}),
	scratchCampaigns: many(scratchCampaigns),
	virtualScratchClones: many(virtualScratchClones),
	algorithmSuggestions: many(algorithmSuggestions),
}));

export const flyerViewsRelations = relations(flyerViews, ({one}) => ({
	store: one(stores, {
		fields: [flyerViews.storeId],
		references: [stores.id]
	}),
}));

export const storesRelations = relations(stores, ({one, many}) => ({
	flyerViews: many(flyerViews),
	storyViews: many(storyViews),
	coupons: many(coupons),
	products: many(products),
	scratchCampaigns: many(scratchCampaigns),
	virtualScratchClones: many(virtualScratchClones),
	instagramStories: many(instagramStories),
	user: one(users, {
		fields: [stores.userId],
		references: [users.id]
	}),
	generatedTotemArts: many(generatedTotemArts),
}));

export const productLikesRelations = relations(productLikes, ({one}) => ({
	product: one(products, {
		fields: [productLikes.productId],
		references: [products.id]
	}),
}));

export const savedProductsRelations = relations(savedProducts, ({one}) => ({
	user: one(users, {
		fields: [savedProducts.userId],
		references: [users.id]
	}),
	product: one(products, {
		fields: [savedProducts.productId],
		references: [products.id]
	}),
}));

export const storyViewsRelations = relations(storyViews, ({one}) => ({
	store: one(stores, {
		fields: [storyViews.storeId],
		references: [stores.id]
	}),
	product: one(products, {
		fields: [storyViews.productId],
		references: [products.id]
	}),
}));

export const scratchedProductsRelations = relations(scratchedProducts, ({one}) => ({
	product: one(products, {
		fields: [scratchedProducts.productId],
		references: [products.id]
	}),
	virtualScratchClone: one(virtualScratchClones, {
		fields: [scratchedProducts.cloneId],
		references: [virtualScratchClones.id]
	}),
}));

export const virtualScratchClonesRelations = relations(virtualScratchClones, ({one, many}) => ({
	scratchedProducts: many(scratchedProducts),
	coupons: many(coupons),
	scratchCampaign: one(scratchCampaigns, {
		fields: [virtualScratchClones.campaignId],
		references: [scratchCampaigns.id]
	}),
	product: one(products, {
		fields: [virtualScratchClones.productId],
		references: [products.id]
	}),
	store: one(stores, {
		fields: [virtualScratchClones.storeId],
		references: [stores.id]
	}),
	user: one(users, {
		fields: [virtualScratchClones.assignedUserId],
		references: [users.id]
	}),
}));

export const couponsRelations = relations(coupons, ({one}) => ({
	product: one(products, {
		fields: [coupons.productId],
		references: [products.id]
	}),
	store: one(stores, {
		fields: [coupons.storeId],
		references: [stores.id]
	}),
	virtualScratchClone: one(virtualScratchClones, {
		fields: [coupons.cloneId],
		references: [virtualScratchClones.id]
	}),
}));

export const scratchCampaignsRelations = relations(scratchCampaigns, ({one, many}) => ({
	product: one(products, {
		fields: [scratchCampaigns.productId],
		references: [products.id]
	}),
	store: one(stores, {
		fields: [scratchCampaigns.storeId],
		references: [stores.id]
	}),
	virtualScratchClones: many(virtualScratchClones),
}));

export const instagramStoriesRelations = relations(instagramStories, ({one, many}) => ({
	store: one(stores, {
		fields: [instagramStories.storeId],
		references: [stores.id]
	}),
	user: one(users, {
		fields: [instagramStories.userId],
		references: [users.id]
	}),
	instagramStoryViews: many(instagramStoryViews),
	instagramStoryLikes: many(instagramStoryLikes),
}));

export const instagramStoryViewsRelations = relations(instagramStoryViews, ({one}) => ({
	instagramStory: one(instagramStories, {
		fields: [instagramStoryViews.storyId],
		references: [instagramStories.id]
	}),
}));

export const promotionAssignmentsRelations = relations(promotionAssignments, ({one}) => ({
	promotion: one(promotions, {
		fields: [promotionAssignments.promotionId],
		references: [promotions.id]
	}),
	user: one(users, {
		fields: [promotionAssignments.userId],
		references: [users.id]
	}),
}));

export const promotionsRelations = relations(promotions, ({many}) => ({
	promotionAssignments: many(promotionAssignments),
}));

export const instagramStoryLikesRelations = relations(instagramStoryLikes, ({one}) => ({
	instagramStory: one(instagramStories, {
		fields: [instagramStoryLikes.storyId],
		references: [instagramStories.id]
	}),
}));

export const priceAlertsRelations = relations(priceAlerts, ({one}) => ({
	user: one(users, {
		fields: [priceAlerts.userId],
		references: [users.id]
	}),
}));

export const userDailyAttemptsRelations = relations(userDailyAttempts, ({one}) => ({
	user: one(users, {
		fields: [userDailyAttempts.userId],
		references: [users.id]
	}),
	dailyPrize: one(dailyPrizes, {
		fields: [userDailyAttempts.prizeWonId],
		references: [dailyPrizes.id]
	}),
}));

export const dailyPrizesRelations = relations(dailyPrizes, ({many}) => ({
	userDailyAttempts: many(userDailyAttempts),
	dailyScratchResults: many(dailyScratchResults),
	dailyScratchCards: many(dailyScratchCards),
}));

export const bannerViewsRelations = relations(bannerViews, ({one}) => ({
	banner: one(banners, {
		fields: [bannerViews.bannerId],
		references: [banners.id]
	}),
}));

export const bannersRelations = relations(banners, ({many}) => ({
	bannerViews: many(bannerViews),
	bannerClicks: many(bannerClicks),
}));

export const bannerClicksRelations = relations(bannerClicks, ({one}) => ({
	banner: one(banners, {
		fields: [bannerClicks.bannerId],
		references: [banners.id]
	}),
}));

export const algorithmSuggestionsRelations = relations(algorithmSuggestions, ({one}) => ({
	product: one(products, {
		fields: [algorithmSuggestions.suggestedProductId],
		references: [products.id]
	}),
	user: one(users, {
		fields: [algorithmSuggestions.reviewedByUserId],
		references: [users.id]
	}),
}));

export const dailyScratchResultsRelations = relations(dailyScratchResults, ({one}) => ({
	user: one(users, {
		fields: [dailyScratchResults.userId],
		references: [users.id]
	}),
	dailyPrize: one(dailyPrizes, {
		fields: [dailyScratchResults.prizeId],
		references: [dailyPrizes.id]
	}),
}));

export const dailyScratchCardsRelations = relations(dailyScratchCards, ({one}) => ({
	user: one(users, {
		fields: [dailyScratchCards.userId],
		references: [users.id]
	}),
	dailyPrize: one(dailyPrizes, {
		fields: [dailyScratchCards.prizeId],
		references: [dailyPrizes.id]
	}),
}));

export const maintenanceModeRelations = relations(maintenanceMode, ({one}) => ({
	user: one(users, {
		fields: [maintenanceMode.updatedBy],
		references: [users.id]
	}),
}));

export const generatedTotemArtsRelations = relations(generatedTotemArts, ({one}) => ({
	store: one(stores, {
		fields: [generatedTotemArts.storeId],
		references: [stores.id]
	}),
}));

export const productBankItemsRelations = relations(productBankItems, ({one}) => ({
	productBank: one(productBanks, {
		fields: [productBankItems.bankid],
		references: [productBanks.id]
	}),
}));

export const productBanksRelations = relations(productBanks, ({many}) => ({
	productBankItems: many(productBankItems),
}));