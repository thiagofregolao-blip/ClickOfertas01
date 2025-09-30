
// Tipos para o sistema V2 do Vendedor Inteligente
export interface Product {
  id: string;
  title: string;
  name?: string;
  price?: {
    USD?: number;
    BRL?: number;
  };
  imageUrl?: string;
  storeName?: string;
  category?: string;
  rating?: number;
  reviews?: number;
  availability?: 'in_stock' | 'out_of_stock' | 'limited';
  discount?: number;
  originalPrice?: number;
  url?: string;
  description?: string;
  features?: string[];
  brand?: string;
  model?: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  products?: Product[];
  metadata?: {
    intent?: string;
    confidence?: number;
    searchQuery?: string;
    category?: string;
    priceRange?: {
      min?: number;
      max?: number;
    };
  };
}

export interface VendorSession {
  id: string;
  userId?: string;
  messages: ChatMessage[];
  context: {
    currentProduct?: string;
    currentCategory?: string;
    priceRange?: {
      min?: number;
      max?: number;
    };
    preferences?: {
      brands?: string[];
      features?: string[];
      maxPrice?: number;
    };
    lastSearchQuery?: string;
    conversationStage: 'greeting' | 'discovery' | 'recommendation' | 'comparison' | 'closing';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchFilters {
  category?: string;
  priceMin?: number;
  priceMax?: number;
  brand?: string;
  rating?: number;
  availability?: 'in_stock' | 'out_of_stock' | 'limited';
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'popularity' | 'newest';
}

export interface VendorConfig {
  personality: 'friendly' | 'professional' | 'casual' | 'expert';
  language: 'pt' | 'en' | 'es';
  maxRecommendations: number;
  enableComparison: boolean;
  enablePriceAlerts: boolean;
  enableWishlist: boolean;
}

export interface AnalyticsEvent {
  type: 'search' | 'click' | 'purchase' | 'comparison' | 'wishlist_add';
  productId?: string;
  query?: string;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, any>;
}
