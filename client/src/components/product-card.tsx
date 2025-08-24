import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Heart, Bookmark } from "lucide-react";
import type { Product } from "@shared/schema";
import { Likeable } from "@/components/heart-animation";
import { useEngagement } from "@/hooks/use-engagement";
import { useAuth } from "@/hooks/useAuth";

// Import category icons
import perfumeIcon from "@assets/generated_images/Perfume_bottle_icon_6af6063a.png";
import electronicsIcon from "@assets/generated_images/Electronics_devices_icon_e9437aa8.png";
import fishingIcon from "@assets/generated_images/Fishing_equipment_icon_874a4bcf.png";
import generalIcon from "@assets/generated_images/General_shopping_icon_8bba1c24.png";

interface ProductCardProps {
  product: Product;
  currency: string;
  themeColor: string;
  showFeaturedBadge?: boolean;
  enableEngagement?: boolean;
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

// Ícones por categoria
function getCategoryIcon(category?: string) {
  const icons = {
    'Perfumes': perfumeIcon,
    'Eletrônicos': electronicsIcon,
    'Pesca': fishingIcon,
    'Geral': generalIcon
  };
  
  return icons[category as keyof typeof icons] || generalIcon;
}

export default function ProductCard({ 
  product, 
  currency, 
  themeColor, 
  showFeaturedBadge = false,
  enableEngagement = false
}: ProductCardProps) {
  const { hearts, handleDoubleTap, handleSaveProduct, isSaving } = useEngagement();
  const { isAuthenticated } = useAuth();
  const categoryColors = getCategoryColors(product.category || undefined);
  const categoryIcon = getCategoryIcon(product.category || undefined);
  
  const productContent = (
    <div className={`${categoryColors.bg} border-2 ${categoryColors.border} overflow-hidden group text-center flex flex-col h-full`}>
      {/* Engagement Buttons */}
      {enableEngagement && (
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDoubleTap(product.id, e);
            }}
            className="bg-white/90 hover:bg-white backdrop-blur-sm p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
            title="Curtir produto"
          >
            <Heart className="w-4 h-4 text-red-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSaveProduct(product.id);
            }}
            disabled={isSaving}
            className="bg-white/90 hover:bg-white backdrop-blur-sm p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
            title="Salvar produto"
          >
            <Bookmark className={`w-4 h-4 ${isAuthenticated ? 'text-blue-600' : 'text-gray-400'}`} />
          </button>
        </div>
      )}
      <div className="relative">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="product-image w-full h-20 md:h-24 lg:h-28 object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const placeholder = target.nextElementSibling as HTMLElement;
              if (placeholder) {
                placeholder.style.display = 'flex';
              }
            }}
          />
        ) : null}
        
        {/* Placeholder with category icon when no image */}
        <div 
          className="product-image w-full h-20 md:h-24 lg:h-28 bg-gray-100 flex items-center justify-center"
          style={{ display: product.imageUrl ? 'none' : 'flex' }}
        >
          <img 
            src={categoryIcon} 
            alt={product.category || 'Geral'}
            className="w-8 h-8 md:w-10 md:h-10 opacity-60"
          />
        </div>
        
        {/* Category icon overlay */}
        <div className="absolute bottom-1 left-1">
          <img 
            src={categoryIcon} 
            alt={product.category || 'Geral'}
            className="category-icon w-4 h-4 md:w-5 md:h-5 opacity-70 bg-white/80 rounded-full p-0.5"
          />
        </div>
        
        {(product.isFeatured && showFeaturedBadge) && (
          <div className="absolute top-1 right-1">
            <div className="featured-badge bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs px-1 py-0.5 rounded shadow-lg animate-pulse">
              🔥
            </div>
          </div>
        )}
      </div>
      
      <div className="product-content p-2 flex flex-col h-full">
        <h3 className="product-title text-[10px] sm:text-xs font-semibold text-gray-900 mb-1 mt-3 line-clamp-2 h-8 sm:h-10 flex items-center justify-center text-center">
          {product.name}
        </h3>
        
        <div className="text-xs sm:text-sm text-gray-500 mb-2 line-clamp-4 h-14 sm:h-16 flex items-start justify-center text-center leading-tight">
          {product.description || ''}
        </div>
        
        <div 
          className="flex items-end justify-center gap-0.5 h-6 sm:h-8 mt-auto"
          style={{ color: categoryColors.accent }}
        >
          <span className="product-currency text-xs sm:text-sm font-medium self-end">{currency}</span>
          <div className="flex items-start">
            {(() => {
              const price = Number(product.price || 0);
              const integerPart = Math.floor(price);
              const decimalPart = Math.round((price - integerPart) * 100);
              return (
                <>
                  <span className="product-price text-sm sm:text-xl md:text-2xl font-bold leading-none">
                    {integerPart.toLocaleString('pt-BR')}
                  </span>
                  <span className="product-cents text-[10px] sm:text-xs font-medium mt-0.5 leading-none">
                    ,{String(decimalPart).padStart(2, '0')}
                  </span>
                </>
              );
            })()}
          </div>
        </div>
      </div>
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
