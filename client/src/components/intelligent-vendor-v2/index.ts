
// Exportações principais do sistema V2 do Vendedor Inteligente
export { VendorCore } from './VendorCore';
export { VendorInterface } from './components/VendorInterface';
export { ChatInterface } from './components/ChatInterface';
export { ProductGrid } from './components/ProductGrid';
export { SearchBar } from './components/SearchBar';

// Serviços
export { VendorAPI } from './services/VendorAPI';
export { ConversationManager } from './services/ConversationManager';
export { ProductRecommendationEngine } from './services/ProductRecommendationEngine';
export { AnalyticsService } from './services/AnalyticsService';

// Tipos
export type {
  Product,
  ChatMessage,
  VendorSession,
  SearchFilters,
  VendorConfig,
  AnalyticsEvent
} from './types';

// Hook personalizado para usar o Vendedor Inteligente V2
export { useIntelligentVendor } from './hooks/useIntelligentVendor';
