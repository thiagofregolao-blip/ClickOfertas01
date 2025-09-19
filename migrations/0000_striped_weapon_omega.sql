-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"full_name" varchar,
	"phone" varchar,
	"city" varchar,
	"state" varchar,
	"country" varchar,
	"provider" varchar DEFAULT 'email',
	"provider_id" varchar,
	"is_email_verified" boolean DEFAULT false,
	"password" varchar,
	"store_name" varchar,
	"address" text,
	"store_owner_token" varchar,
	"is_super_admin" boolean DEFAULT false,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "category_sellers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"whatsapp" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"sort_order" varchar DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scratch_offers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"product_id" varchar,
	"status" varchar DEFAULT 'eligible' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"revealed_at" timestamp,
	"expires_at" timestamp,
	"cooldown_until" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "flyer_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" varchar NOT NULL,
	"user_id" varchar,
	"user_agent" text,
	"ip_address" varchar,
	"viewed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_likes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"user_id" varchar,
	"user_agent" text,
	"ip_address" varchar,
	"liked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "story_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" varchar NOT NULL,
	"product_id" varchar,
	"user_id" varchar,
	"user_agent" text,
	"ip_address" varchar,
	"viewed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scratched_products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"user_id" varchar,
	"user_agent" text,
	"ip_address" varchar,
	"scratched_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"has_redeemed" boolean DEFAULT false,
	"clone_id" varchar
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar,
	"store_id" varchar NOT NULL,
	"user_id" varchar,
	"user_agent" text,
	"ip_address" varchar,
	"coupon_code" varchar NOT NULL,
	"original_price" numeric(12, 2) NOT NULL,
	"discount_price" numeric(12, 2) NOT NULL,
	"discount_percentage" varchar NOT NULL,
	"qr_code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_redeemed" boolean DEFAULT false,
	"redeemed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"clone_id" varchar,
	"promotion_name" text,
	"promotion_image_url" text,
	"promotion_description" text,
	CONSTRAINT "coupons_coupon_code_key" UNIQUE("coupon_code")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(12, 2) NOT NULL,
	"image_url" text,
	"is_featured" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"sort_order" varchar DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"category" varchar DEFAULT 'Perfumaria',
	"show_in_stories" boolean DEFAULT false,
	"image_url2" text,
	"image_url3" text,
	"category_id" varchar,
	"is_scratch_card" boolean DEFAULT false,
	"scratch_price" numeric(12, 2),
	"scratch_expires_at" timestamp,
	"scratch_time_limit_minutes" varchar DEFAULT '60',
	"max_scratch_redemptions" varchar DEFAULT '10',
	"current_scratch_redemptions" varchar DEFAULT '0',
	"scratch_message" text DEFAULT 'Raspe aqui e ganhe um super desconto!',
	"show_in_totem" boolean DEFAULT false,
	"gtin" varchar(14),
	"brand" varchar,
	"product_code" varchar,
	"source_type" varchar DEFAULT 'manual'
);
--> statement-breakpoint
CREATE TABLE "scratch_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"store_id" varchar NOT NULL,
	"title" text DEFAULT 'Raspe e ganhe desconto!' NOT NULL,
	"description" text DEFAULT 'Raspe aqui e ganhe um super desconto!',
	"discount_price" numeric(12, 2) NOT NULL,
	"discount_percentage" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"max_clones" varchar DEFAULT '10',
	"clones_created" varchar DEFAULT '0',
	"clones_used" varchar DEFAULT '0',
	"distribute_to_all" boolean DEFAULT false,
	"selected_user_ids" text,
	"expires_at" timestamp,
	"clone_expiration_hours" varchar DEFAULT '24',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "virtual_scratch_clones" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"store_id" varchar NOT NULL,
	"assigned_user_id" varchar,
	"product_name" text NOT NULL,
	"product_description" text,
	"original_price" numeric(12, 2) NOT NULL,
	"discount_price" numeric(12, 2) NOT NULL,
	"product_image_url" text,
	"product_category" varchar,
	"is_used" boolean DEFAULT false,
	"is_expired" boolean DEFAULT false,
	"notification_sent" boolean DEFAULT false,
	"used_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "instagram_stories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"media_type" varchar NOT NULL,
	"media_url" text NOT NULL,
	"caption" text,
	"product_name" text,
	"product_price" varchar,
	"product_discount_price" varchar,
	"product_category" varchar,
	"is_product_promo" boolean DEFAULT false,
	"background_color" varchar DEFAULT '#ffffff',
	"text_color" varchar DEFAULT '#000000',
	"is_active" boolean DEFAULT true,
	"views_count" varchar DEFAULT '0',
	"likes_count" varchar DEFAULT '0',
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promotion_scratches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" varchar NOT NULL,
	"user_id" varchar,
	"user_agent" varchar,
	"ip_address" varchar,
	"is_used" boolean DEFAULT false,
	"used_at" timestamp,
	"coupon_code" varchar,
	"created_at" timestamp DEFAULT now(),
	"scratched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "instagram_story_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" varchar NOT NULL,
	"viewer_id" varchar,
	"user_agent" text,
	"ip_address" varchar,
	"viewed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" varchar NOT NULL,
	"base_product_id" varchar,
	"name" varchar NOT NULL,
	"description" text,
	"image_url" varchar,
	"category" varchar NOT NULL,
	"original_price" varchar NOT NULL,
	"promotional_price" varchar NOT NULL,
	"discount_percentage" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"max_clients" varchar NOT NULL,
	"used_count" varchar DEFAULT '0',
	"valid_from" timestamp NOT NULL,
	"valid_until" timestamp NOT NULL,
	"scratch_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promotion_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"status" varchar DEFAULT 'assigned' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "instagram_story_likes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" varchar NOT NULL,
	"user_id" varchar,
	"user_agent" text,
	"ip_address" varchar,
	"liked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "brazilian_prices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_name" varchar NOT NULL,
	"product_brand" varchar,
	"product_model" varchar,
	"product_variant" varchar,
	"store_name" varchar NOT NULL,
	"store_url" varchar,
	"product_url" varchar,
	"price" varchar NOT NULL,
	"currency" varchar DEFAULT 'BRL' NOT NULL,
	"availability" varchar DEFAULT 'in_stock' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"store_priority" numeric(3, 0) DEFAULT '99',
	"is_relevant_store" boolean DEFAULT false,
	CONSTRAINT "brazilian_prices_product_url_key" UNIQUE("product_url")
);
--> statement-breakpoint
CREATE TABLE "product_suggestions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_product_id" varchar NOT NULL,
	"suggested_product_name" varchar NOT NULL,
	"suggestion_reason" varchar NOT NULL,
	"confidence_score" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "price_comparisons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"product_id" varchar NOT NULL,
	"paraguay_price" varchar NOT NULL,
	"paraguay_currency" varchar DEFAULT 'USD' NOT NULL,
	"best_brazilian_price" varchar,
	"savings" varchar,
	"savings_percentage" varchar,
	"brazilian_stores_found" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"compared_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_name" text NOT NULL,
	"ml_item_id" varchar,
	"store_name" varchar DEFAULT 'Mercado Livre' NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"availability" varchar DEFAULT 'in_stock' NOT NULL,
	"product_url" text,
	"free_shipping" boolean DEFAULT false,
	"condition" varchar DEFAULT 'new',
	"sold_quantity" varchar DEFAULT '0',
	"recorded_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "price_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"product_name" text NOT NULL,
	"target_price" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"is_active" boolean DEFAULT true,
	"email_notification" boolean DEFAULT true,
	"last_checked_at" timestamp,
	"last_notified_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "user_daily_attempts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"attempt_date" varchar NOT NULL,
	"has_attempted" boolean DEFAULT false,
	"attempted_at" timestamp,
	"won" boolean DEFAULT false,
	"prize_won_id" varchar,
	"user_agent" text,
	"ip_address" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_daily_attempts_user_id_attempt_date_key" UNIQUE("user_id","attempt_date")
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_url" text NOT NULL,
	"link_url" text,
	"banner_type" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"priority" varchar DEFAULT '0',
	"background_color" varchar DEFAULT '#ffffff',
	"text_color" varchar DEFAULT '#000000',
	"starts_at" timestamp DEFAULT now(),
	"ends_at" timestamp,
	"views_count" varchar DEFAULT '0',
	"clicks_count" varchar DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "banner_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"banner_id" varchar NOT NULL,
	"user_id" varchar,
	"user_agent" text,
	"ip_address" varchar,
	"viewed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_prizes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"prize_type" varchar DEFAULT 'discount' NOT NULL,
	"discount_percentage" numeric(5, 2),
	"discount_value" numeric(12, 2),
	"min_purchase_amount" numeric(12, 2) DEFAULT '0.00',
	"max_discount_amount" numeric(12, 2),
	"product_id" varchar,
	"coupon_code" varchar,
	"coupon_code_prefix" varchar,
	"total_wins_limit" varchar DEFAULT '100',
	"current_wins" varchar DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"starts_at" timestamp DEFAULT now(),
	"expires_at" timestamp DEFAULT (now() + '30 days'::interval),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"image_url" varchar,
	"probability" varchar DEFAULT '0.001',
	"max_daily_wins" varchar DEFAULT '1',
	"total_wins_all_time" varchar DEFAULT '0',
	"total_wins_today" varchar DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "banner_clicks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"banner_id" varchar NOT NULL,
	"user_id" varchar,
	"user_agent" text,
	"ip_address" varchar,
	"clicked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"theme_color" varchar(7) DEFAULT '#E11D48',
	"currency" varchar(10) DEFAULT 'Gs.',
	"whatsapp" varchar,
	"instagram" varchar,
	"address" text,
	"slug" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"display_currency" varchar(10) DEFAULT 'local',
	"dollar_rate" numeric(10, 2) DEFAULT '7500.00',
	"custom_usd_brl_rate" numeric(10, 4),
	"banner_url" text,
	"banner_text" text,
	"banner_subtext" text,
	"banner_gradient" varchar(50) DEFAULT 'purple-to-pink',
	"is_premium" boolean DEFAULT false,
	CONSTRAINT "stores_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "algorithm_suggestions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"suggested_product_id" varchar NOT NULL,
	"algorithm_score" numeric(5, 2) NOT NULL,
	"popularity_score" numeric(5, 2) DEFAULT '0.00',
	"price_score" numeric(5, 2) DEFAULT '0.00',
	"margin_score" numeric(5, 2) DEFAULT '0.00',
	"novelty_score" numeric(5, 2) DEFAULT '0.00',
	"category_score" numeric(5, 2) DEFAULT '0.00',
	"suggested_prize_type" varchar NOT NULL,
	"suggested_discount_percentage" numeric(5, 2),
	"estimated_cost" numeric(12, 2),
	"status" varchar DEFAULT 'pending' NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by_user_id" varchar,
	"review_notes" text,
	"generated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_scratch_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"scratch_date" varchar NOT NULL,
	"won" boolean DEFAULT false,
	"prize_id" varchar,
	"prize_type" varchar,
	"prize_description" text,
	"prize_value" numeric(12, 2),
	"coupon_code" varchar,
	"coupon_expires_at" timestamp,
	"redemption_status" varchar DEFAULT 'active',
	"redeemed_at" timestamp,
	"user_agent" text,
	"ip_address" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "funny_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" text NOT NULL,
	"emoji" text NOT NULL,
	"category" varchar(10) DEFAULT 'lose',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_scratch_cards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"card_date" varchar NOT NULL,
	"card_number" varchar NOT NULL,
	"is_scratched" boolean DEFAULT false,
	"scratched_at" timestamp,
	"won" boolean DEFAULT false,
	"prize_id" varchar,
	"prize_type" varchar,
	"prize_value" varchar,
	"prize_description" text,
	"coupon_code" varchar,
	"coupon_expires_at" timestamp,
	"user_agent" text,
	"ip_address" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "daily_scratch_cards_user_id_card_date_card_number_key" UNIQUE("user_id","card_date","card_number")
);
--> statement-breakpoint
CREATE TABLE "campaign_counters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" varchar NOT NULL,
	"global_scratches" integer DEFAULT 0 NOT NULL,
	"wins_today" integer DEFAULT 0 NOT NULL,
	"wins20" integer DEFAULT 0 NOT NULL,
	"wins30" integer DEFAULT 0 NOT NULL,
	"wins50" integer DEFAULT 0 NOT NULL,
	"wins70" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_counters_date_key" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "campaign_prize_tier" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"discount_percent" integer NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"daily_quota" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_daily_cards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"date" varchar NOT NULL,
	"cards_used" integer DEFAULT 0 NOT NULL,
	"wins_today" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_daily_cards_user_id_date_key" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "maintenance_mode" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_active" boolean DEFAULT false,
	"title" text DEFAULT 'Em Breve',
	"message" text DEFAULT 'Estamos preparando as melhores ofertas do Paraguai para você!',
	"access_password" varchar DEFAULT 'CLICKOFERTAS2025',
	"updated_at" timestamp DEFAULT now(),
	"updated_by" varchar
);
--> statement-breakpoint
CREATE TABLE "scratch_system_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guaranteed_win_every" varchar DEFAULT '1000',
	"current_attempt_count" varchar DEFAULT '0',
	"last_guaranteed_win_at" timestamp,
	"daily_attempt_reset_hour" varchar DEFAULT '0',
	"daily_attempt_reset_timezone" varchar DEFAULT 'America/Asuncion',
	"max_attempts_per_user_per_day" varchar DEFAULT '1',
	"system_active" boolean DEFAULT true,
	"popularity_weight" numeric(3, 2) DEFAULT '0.30',
	"price_weight" numeric(3, 2) DEFAULT '0.20',
	"margin_weight" numeric(3, 2) DEFAULT '0.20',
	"novelty_weight" numeric(3, 2) DEFAULT '0.15',
	"category_weight" numeric(3, 2) DEFAULT '0.15',
	"min_prize_value" numeric(12, 2) DEFAULT '10.00',
	"max_prize_value" numeric(12, 2) DEFAULT '500.00',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"algorithm_type" varchar DEFAULT 'weighted_random',
	"enable_auto_product_suggestion" boolean DEFAULT true,
	"suggestion_refresh_hours" varchar DEFAULT '24',
	"one_in_n" integer DEFAULT 1000 NOT NULL,
	"cards_per_user_per_day" integer DEFAULT 3 NOT NULL,
	"max_wins_per_day" integer,
	"max_wins_per_user_per_day" integer DEFAULT 1 NOT NULL,
	"mode" varchar DEFAULT 'automatic',
	"win_chance" varchar DEFAULT '25',
	"products_per_day" varchar DEFAULT '5',
	"is_enabled" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "budget_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_budget" numeric(12, 2) DEFAULT '100.00',
	"monthly_budget" numeric(12, 2) DEFAULT '3000.00',
	"daily_spent" numeric(12, 2) DEFAULT '0.00',
	"monthly_spent" numeric(12, 2) DEFAULT '0.00',
	"last_daily_reset" varchar,
	"last_monthly_reset" varchar,
	"daily_alert_threshold" numeric(3, 2) DEFAULT '0.80',
	"monthly_alert_threshold" numeric(3, 2) DEFAULT '0.85',
	"daily_alert_sent" boolean DEFAULT false,
	"monthly_alert_sent" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"auto_reset_daily" boolean DEFAULT true,
	"auto_reset_monthly" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "totem_content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"media_url" text NOT NULL,
	"media_type" varchar DEFAULT 'image',
	"display_duration" varchar DEFAULT '10',
	"schedule_start" timestamp,
	"schedule_end" timestamp,
	"sort_order" varchar DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "totem_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" varchar NOT NULL,
	"background_color" varchar DEFAULT '#000000',
	"transition_effect" varchar DEFAULT 'fade',
	"transition_duration" varchar DEFAULT '500',
	"auto_rotate" boolean DEFAULT true,
	"rotation_interval" varchar DEFAULT '10',
	"is_active" boolean DEFAULT true,
	"last_sync" timestamp,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "totem_settings_store_id_key" UNIQUE("store_id")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" varchar NOT NULL,
	"device_type" varchar,
	"screen_resolution" varchar,
	"browser_info" varchar,
	"visit_duration" numeric(10, 2),
	"pages_viewed" numeric(5, 0) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"last_activity" timestamp DEFAULT now(),
	CONSTRAINT "user_sessions_session_token_key" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "product_searches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" varchar NOT NULL,
	"search_term" text NOT NULL,
	"category" varchar,
	"price_min" numeric(12, 2),
	"price_max" numeric(12, 2),
	"results_count" numeric(5, 0),
	"clicked_product_id" varchar,
	"store_id" varchar,
	"search_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"product_name" text NOT NULL,
	"product_category" varchar,
	"product_price" numeric(12, 2),
	"store_id" varchar NOT NULL,
	"store_name" text,
	"view_duration" numeric(10, 2),
	"came_from_search" boolean DEFAULT false,
	"search_term" text,
	"was_compared" boolean DEFAULT false,
	"was_saved" boolean DEFAULT false,
	"viewed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trending_products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"rank" numeric(2, 0) NOT NULL,
	"product_name" text NOT NULL,
	"category" varchar,
	"search_count" numeric(10, 0) DEFAULT '0',
	"view_count" numeric(10, 0) DEFAULT '0',
	"save_count" numeric(10, 0) DEFAULT '0',
	"compare_count" numeric(10, 0) DEFAULT '0',
	"total_score" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"slug" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "generated_totem_arts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" varchar NOT NULL,
	"generation_date" timestamp NOT NULL,
	"trending_products_data" jsonb NOT NULL,
	"image_url" text NOT NULL,
	"image_prompt" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"displayed_at" timestamp,
	"impressions" numeric(10, 0) DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_banks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"zipfilename" text NOT NULL,
	"uploadedby" text NOT NULL,
	"totalproducts" integer DEFAULT 0 NOT NULL,
	"isactive" boolean DEFAULT true NOT NULL,
	"createdat" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedat" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_bank_items" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bankid" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"brand" text,
	"model" text,
	"color" text,
	"storage" text,
	"ram" text,
	"foldername" text NOT NULL,
	"imageurls" text[] DEFAULT '{""}' NOT NULL,
	"primaryimageurl" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"usagecount" integer DEFAULT 0 NOT NULL,
	"createdat" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedat" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scratch_offers" ADD CONSTRAINT "scratch_offers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scratch_offers" ADD CONSTRAINT "scratch_offers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flyer_views" ADD CONSTRAINT "flyer_views_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_likes" ADD CONSTRAINT "product_likes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_products" ADD CONSTRAINT "saved_products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_products" ADD CONSTRAINT "saved_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scratched_products" ADD CONSTRAINT "scratched_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scratched_products" ADD CONSTRAINT "scratched_products_clone_id_fkey" FOREIGN KEY ("clone_id") REFERENCES "public"."virtual_scratch_clones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_clone_id_fkey" FOREIGN KEY ("clone_id") REFERENCES "public"."virtual_scratch_clones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scratch_campaigns" ADD CONSTRAINT "scratch_campaigns_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scratch_campaigns" ADD CONSTRAINT "scratch_campaigns_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_scratch_clones" ADD CONSTRAINT "virtual_scratch_clones_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."scratch_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_scratch_clones" ADD CONSTRAINT "virtual_scratch_clones_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_scratch_clones" ADD CONSTRAINT "virtual_scratch_clones_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_scratch_clones" ADD CONSTRAINT "virtual_scratch_clones_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_stories" ADD CONSTRAINT "instagram_stories_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_stories" ADD CONSTRAINT "instagram_stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_story_views" ADD CONSTRAINT "instagram_story_views_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."instagram_stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_assignments" ADD CONSTRAINT "promotion_assignments_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_assignments" ADD CONSTRAINT "promotion_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_story_likes" ADD CONSTRAINT "instagram_story_likes_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."instagram_stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_daily_attempts" ADD CONSTRAINT "user_daily_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_daily_attempts" ADD CONSTRAINT "user_daily_attempts_prize_won_id_fkey" FOREIGN KEY ("prize_won_id") REFERENCES "public"."daily_prizes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banner_views" ADD CONSTRAINT "banner_views_banner_id_fkey" FOREIGN KEY ("banner_id") REFERENCES "public"."banners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banner_clicks" ADD CONSTRAINT "banner_clicks_banner_id_fkey" FOREIGN KEY ("banner_id") REFERENCES "public"."banners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "algorithm_suggestions" ADD CONSTRAINT "algorithm_suggestions_suggested_product_id_fkey" FOREIGN KEY ("suggested_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "algorithm_suggestions" ADD CONSTRAINT "algorithm_suggestions_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_scratch_results" ADD CONSTRAINT "daily_scratch_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_scratch_results" ADD CONSTRAINT "daily_scratch_results_prize_id_fkey" FOREIGN KEY ("prize_id") REFERENCES "public"."daily_prizes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_scratch_cards" ADD CONSTRAINT "daily_scratch_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_scratch_cards" ADD CONSTRAINT "daily_scratch_cards_prize_id_fkey" FOREIGN KEY ("prize_id") REFERENCES "public"."daily_prizes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_mode" ADD CONSTRAINT "maintenance_mode_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_totem_arts" ADD CONSTRAINT "generated_totem_arts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bank_items" ADD CONSTRAINT "product_bank_items_bankid_fkey" FOREIGN KEY ("bankid") REFERENCES "public"."product_banks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_user_sessions_created" ON "user_sessions" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_user_sessions_token" ON "user_sessions" USING btree ("session_token" text_ops);--> statement-breakpoint
CREATE INDEX "idx_product_searches_date" ON "product_searches" USING btree ("search_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_product_searches_session" ON "product_searches" USING btree ("session_token" text_ops);--> statement-breakpoint
CREATE INDEX "idx_product_searches_store" ON "product_searches" USING btree ("store_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_product_searches_term" ON "product_searches" USING btree ("search_term" text_ops);--> statement-breakpoint
CREATE INDEX "idx_product_views_date" ON "product_views" USING btree ("viewed_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_product_views_product" ON "product_views" USING btree ("product_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_product_views_session" ON "product_views" USING btree ("session_token" text_ops);--> statement-breakpoint
CREATE INDEX "idx_product_views_store" ON "product_views" USING btree ("store_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_trending_products_date" ON "trending_products" USING btree ("date" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_trending_products_rank" ON "trending_products" USING btree ("rank" numeric_ops);--> statement-breakpoint
CREATE INDEX "idx_generated_arts_active" ON "generated_totem_arts" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_generated_arts_date" ON "generated_totem_arts" USING btree ("generation_date" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_generated_arts_store" ON "generated_totem_arts" USING btree ("store_id" text_ops);
*/