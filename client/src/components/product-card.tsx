import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Heart, Bookmark, BarChart3 } from "lucide-react";
import type { Product } from "@shared/schema";
import { Likeable } from "@/components/heart-animation";
import { useEngagement } from "@/hooks/use-engagement";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/lib/analytics";
import ScratchCard from "./scratch-card";
import { formatBrazilianPrice } from "@/lib/priceUtils";
import PriceComparisonPopup from "./price-comparison-popup";
import { useState, useRef, useEffect } from "react";


interface ProductCardProps {
  product: Product;
  currency: string;
  themeColor: string;
  showFeaturedBadge?: boolean;
  enableEngagement?: boolean;
  onClick?: (product: Product) => void;
  customUsdBrlRate?: number; // Taxa personalizada da loja
  storeId?: string;
  source?: 'search' | 'feed' | 'direct' | 'share';
}

// Cores por categoria
function getCategoryColors(category?: string) {
  const colors = {
    'Perfumes': {
      bg: 'bg-pink-50',
      border: 'border-pink-200',
      accent: '#EC4899'
    },
    'Eletrônicos': {
      bg: 'bg-blue-50',
      border: 'border-blue-200', 
      accent: '#3B82F6'
    },
    'Pesca': {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      accent: '#10B981'
    },
    'Geral': {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      accent: '#6B7280'
    }
  };
  
  return colors[category as keyof typeof colors] || colors['Geral'];
}


export default function ProductCard({ 
  product, 
  currency, 
  themeColor, 
  showFeaturedBadge = false,
  enableEngagement = false,
  onClick,
  customUsdBrlRate,
  storeId,
  source = 'feed'
}: ProductCardProps) {
  const { hearts, handleDoubleTap, handleSaveProduct, isSaving, isProductLiked, isProductSaved, toggleLike } = useEngagement();
  const { isAuthenticated } = useAuth();
  const analytics = useAnalytics();
  const categoryColors = getCategoryColors(product.category || undefined);
  const [showPriceComparison, setShowPriceComparison] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [hasBeenViewed, setHasBeenViewed] = useState(false);
  const [viewStartTime, setViewStartTime] = useState<number | null>(null);
  
  // 📊 IntersectionObserver para tracking automático de visualizações
  useEffect(() => {
    if (!cardRef.current || hasBeenViewed) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // 50% do card visível por 1 segundo = visualização válida
          setTimeout(() => {
            if (entry.isIntersecting && !hasBeenViewed) {
              setHasBeenViewed(true);
              setViewStartTime(Date.now());
              
              // Enviar evento de visualização com batch
              analytics.startProductView(product.id);
              
              console.debug('📊 Product view:', product.name);
            }
          }, 1000);
        } else if (viewStartTime) {
          // Produto saiu da tela - calcular tempo de visualização
          const viewDuration = Math.floor((Date.now() - viewStartTime) / 1000);
          if (viewDuration >= 2) { // Mínimo 2 segundos para contar
            analytics.endProductView({
              productId: product.id,
              storeId: storeId || '',
              source,
              position: 0 // TODO: calcular posição real na lista
            });
            console.debug('📊 Product view ended:', product.name, `${viewDuration}s`);
          }
          setViewStartTime(null);
        }
      },
      {
        threshold: 0.5, // 50% visível
        rootMargin: '0px'
      }
    );

    observer.observe(cardRef.current);
    
    return () => {
      observer.disconnect();
      // Finalizar view se ainda ativo
      if (viewStartTime) {
        const viewDuration = Math.floor((Date.now() - viewStartTime) / 1000);
        if (viewDuration >= 2) {
          analytics.endProductView({
            productId: product.id,
            storeId: storeId || '',
            source,
            position: 0
          });
        }
      }
    };
  }, [hasBeenViewed, viewStartTime, product.id, storeId, source, analytics]);

  const handleCardClick = () => {
    // 📊 Track click event
    analytics.trackClick(product.id);
    
    if (onClick) {
      onClick(product);
    }
  };

  // Override handleSaveProduct para incluir analytics
  const handleSaveWithAnalytics = async (productId: string) => {
    analytics.trackSave(productId);
    return handleSaveProduct(productId);
  };

  // CORRIGIDO: Produto original SEMPRE aparece normal
  // Clones virtuais são exibidos separadamente no flyer

  const productContent = (
    <div 
      ref={cardRef}
      className={`group cursor-pointer rounded-lg overflow-hidden h-full flex flex-col ${
        product.isFeatured 
          ? 'border border-red-500' 
          : 'border border-gray-200'
      } ${onClick ? 'hover:shadow-lg transition-all duration-200' : ''}`}
      onClick={handleCardClick}
      data-testid={`card-product-${product.id}`}
    >
      <div className="relative flex-shrink-0">
        {/* Thumbnail YouTube-style */}
        <div className="relative aspect-[4/3] sm:aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder-image.jpg';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
              <span className="text-gray-600 text-4xl">📦</span>
            </div>
          )}
          
          {/* Overlay limpo */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all">
          </div>
        </div>
        
        {/* Info estilo YouTube */}
        <div className="flex-1 flex flex-col mt-2 px-3 pb-0 sm:mt-3 sm:pb-3">
          {/* Título com altura fixa */}
          <div className="h-8 sm:h-10 flex items-start mb-4 sm:mb-2">
            <h3 className="font-medium text-sm text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors text-left">
              {product.name}
            </h3>
          </div>
          
          {/* Preço */}
          <div className="mb-4 sm:mb-2 text-left">
            {/* Texto "A partir de:" */}
            <p className="text-xs text-gray-500 mb-1">A partir de:</p>
            {/* Preço USD em vermelho - mobile e desktop */}
            <p className="text-base text-red-600 font-medium mb-1">
              {currency} {formatBrazilianPrice(product.price || '0')}
            </p>
            {/* Preço BRL */}
            <p className="text-sm text-gray-500">
              R$ {(() => {
                const priceUSD = Number(product.price || 0);
                const rate = customUsdBrlRate || 5.47;
                const priceBRL = priceUSD * rate;
                return formatBrazilianPrice(priceBRL);
              })()}
            </p>
          </div>
          
          {/* Action buttons - sempre na parte inferior */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 mt-auto pt-0 sm:pt-2 sm:border-t sm:border-gray-100 -mx-3 px-3 sm:mx-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (enableEngagement) {
                  toggleLike(product.id, e);
                }
              }}
              className="hidden sm:flex flex-col items-center gap-0 sm:gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
            >
              <Heart className={`w-3 h-3 sm:w-4 sm:h-4 ${enableEngagement && isProductLiked(product.id) ? 'text-red-500 fill-red-500' : ''}`} />
              <span className="text-xs sm:text-xs">Curtir</span>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (enableEngagement) {
                  handleSaveWithAnalytics(product.id);
                }
              }}
              disabled={isSaving}
              className="flex flex-col items-center gap-0 sm:gap-1 text-xs text-gray-500 hover:text-blue-500 transition-colors"
            >
              <Bookmark className={`w-5 h-5 sm:w-4 sm:h-4 ${enableEngagement && isAuthenticated && isProductSaved(product.id) ? 'text-blue-600 fill-blue-600' : ''}`} />
              <span className="text-xs sm:text-xs">Salvar</span>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                analytics.trackCompare(product.id);
                setShowPriceComparison(true);
              }}
              className="flex flex-col items-center gap-0 sm:gap-1 text-xs text-gray-500 hover:text-green-500 transition-colors"
            >
              <BarChart3 className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-xs">Comparar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Popup de Comparação de Preços */}
      <PriceComparisonPopup
        isOpen={showPriceComparison}
        onClose={() => setShowPriceComparison(false)}
        productId={product.id}
        productName={product.name}
      />
    </div>
  );

  if (enableEngagement) {
    return (
      <Likeable
        onDoubleTap={(event) => handleDoubleTap(product.id, event)}
        hearts={hearts}
        className="relative"
      >
        {productContent}
      </Likeable>
    );
  }

  return productContent;
}