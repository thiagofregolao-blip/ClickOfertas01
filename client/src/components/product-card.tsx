import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Heart, Bookmark, BarChart3 } from "lucide-react";
import type { Product } from "@shared/schema";
import { Likeable } from "@/components/heart-animation";
import { useEngagement } from "@/hooks/use-engagement";
import { useAuth } from "@/hooks/useAuth";
import ScratchCard from "./scratch-card";
import { formatBrazilianPrice } from "@/lib/priceUtils";
import PriceComparisonPopup from "./price-comparison-popup";
import { useState } from "react";


interface ProductCardProps {
  product: Product;
  currency: string;
  themeColor: string;
  showFeaturedBadge?: boolean;
  enableEngagement?: boolean;
  onClick?: (product: Product) => void;
  customUsdBrlRate?: number; // Taxa personalizada da loja
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
  customUsdBrlRate
}: ProductCardProps) {
  const { hearts, handleDoubleTap, handleSaveProduct, isSaving, isProductLiked, isProductSaved, toggleLike } = useEngagement();
  const { isAuthenticated } = useAuth();
  const categoryColors = getCategoryColors(product.category || undefined);
  const [showPriceComparison, setShowPriceComparison] = useState(false);
  
  const handleCardClick = () => {
    if (onClick) {
      onClick(product);
    }
  };

  // CORRIGIDO: Produto original SEMPRE aparece normal
  // Clones virtuais são exibidos separadamente no flyer

  const productContent = (
    <div 
      className={`group cursor-pointer pb-4 mb-4 rounded-lg overflow-hidden ${
        product.isFeatured 
          ? 'border border-red-500' 
          : 'border border-gray-200'
      } ${onClick ? 'hover:shadow-lg transition-all duration-200' : ''}`}
      onClick={handleCardClick}
      data-testid={`card-product-${product.id}`}
    >
      <div className="relative">
        {/* Thumbnail YouTube-style */}
        <div className="relative aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
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
          
          {/* Overlay com preço */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all">
            {/* Preço sobreposto */}
            <div className="absolute bottom-2 right-2 bg-black/80 text-yellow-400 text-xs px-2 py-1 rounded font-semibold">
              {currency} {formatBrazilianPrice(product.price || '0')}
            </div>
            
            {/* Featured Badge - Hidden on mobile */}
            {showFeaturedBadge && product.isFeatured && (
              <div className="absolute top-2 left-2 hidden sm:block">
                <Badge variant="destructive" className="bg-red-500 text-white text-xs px-2 py-1">
                  <Star className="w-3 h-3 mr-1" />
                  Destaque
                </Badge>
              </div>
            )}
            
            {/* Price comparison button - Hidden on mobile */}
            <div className="absolute top-2 right-2 hidden sm:block">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPriceComparison(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-all duration-200"
                title="Comparar preços no Brasil"
              >
                BR
              </button>
            </div>
          </div>
        </div>
        
        {/* Info estilo YouTube */}
        <div className="mt-3 px-3">
          <h3 className="font-medium text-sm text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
          <div className="mt-1">
            <p className="text-xs text-gray-500 line-clamp-1">
              {product.description || ''}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              R$ {(() => {
                const priceUSD = Number(product.price || 0);
                const rate = customUsdBrlRate || 5.47;
                const priceBRL = priceUSD * rate;
                return formatBrazilianPrice(priceBRL);
              })()}
            </p>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-gray-100">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (enableEngagement) {
                  toggleLike(product.id, e);
                }
              }}
              className="flex flex-col items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
            >
              <Heart className={`w-4 h-4 ${enableEngagement && isProductLiked(product.id) ? 'text-red-500 fill-red-500' : ''}`} />
              <span>Curtir</span>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (enableEngagement) {
                  handleSaveProduct(product.id);
                }
              }}
              disabled={isSaving}
              className="flex flex-col items-center gap-1 text-xs text-gray-500 hover:text-blue-500 transition-colors"
            >
              <Bookmark className={`w-4 h-4 ${enableEngagement && isAuthenticated && isProductSaved(product.id) ? 'text-blue-600 fill-blue-600' : ''}`} />
              <span>Salvar</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-xs text-gray-500 hover:text-green-500 transition-colors">
              <BarChart3 className="w-4 h-4" />
              <span>Comparar</span>
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