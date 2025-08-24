import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Heart, Bookmark } from "lucide-react";
import type { Product } from "@shared/schema";
import { Likeable } from "@/components/heart-animation";
import { useEngagement } from "@/hooks/use-engagement";
import { useAuth } from "@/hooks/useAuth";


interface ProductCardProps {
  product: Product;
  currency: string;
  themeColor: string;
  showFeaturedBadge?: boolean;
  enableEngagement?: boolean;
}

// Molduras temáticas e paletas por categoria
function getCategoryTheme(category?: string) {
  const themes = {
    'Perfumes': {
      bg: 'bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50',
      border: 'border-pink-300',
      borderGradient: 'bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400',
      accent: '#EC4899',
      shadowColor: 'shadow-pink-200/50',
      glowEffect: 'shadow-lg shadow-pink-200/30',
      pattern: 'elegant'
    },
    'Eletrônicos': {
      bg: 'bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50',
      border: 'border-blue-300',
      borderGradient: 'bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400',
      accent: '#3B82F6',
      shadowColor: 'shadow-blue-200/50',
      glowEffect: 'shadow-lg shadow-blue-200/30',
      pattern: 'tech'
    },
    'Roupas': {
      bg: 'bg-gradient-to-br from-purple-50 via-fuchsia-50 to-pink-50',
      border: 'border-purple-300',
      borderGradient: 'bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400',
      accent: '#A855F7',
      shadowColor: 'shadow-purple-200/50',
      glowEffect: 'shadow-lg shadow-purple-200/30',
      pattern: 'fashion'
    },
    'Pesca': {
      bg: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50',
      border: 'border-emerald-300',
      borderGradient: 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400',
      accent: '#10B981',
      shadowColor: 'shadow-emerald-200/50',
      glowEffect: 'shadow-lg shadow-emerald-200/30',
      pattern: 'nature'
    },
    'Beleza': {
      bg: 'bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50',
      border: 'border-rose-300',
      borderGradient: 'bg-gradient-to-r from-rose-400 via-pink-400 to-orange-400',
      accent: '#F43F5E',
      shadowColor: 'shadow-rose-200/50',
      glowEffect: 'shadow-lg shadow-rose-200/30',
      pattern: 'beauty'
    },
    'Casa': {
      bg: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50',
      border: 'border-amber-300',
      borderGradient: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400',
      accent: '#F59E0B',
      shadowColor: 'shadow-amber-200/50',
      glowEffect: 'shadow-lg shadow-amber-200/30',
      pattern: 'home'
    },
    'Saúde': {
      bg: 'bg-gradient-to-br from-green-50 via-lime-50 to-emerald-50',
      border: 'border-green-300',
      borderGradient: 'bg-gradient-to-r from-green-400 via-lime-400 to-emerald-400',
      accent: '#22C55E',
      shadowColor: 'shadow-green-200/50',
      glowEffect: 'shadow-lg shadow-green-200/30',
      pattern: 'health'
    },
    'Geral': {
      bg: 'bg-gradient-to-br from-gray-50 via-slate-50 to-zinc-50',
      border: 'border-gray-300',
      borderGradient: 'bg-gradient-to-r from-gray-400 via-slate-400 to-zinc-400',
      accent: '#6B7280',
      shadowColor: 'shadow-gray-200/50',
      glowEffect: 'shadow-lg shadow-gray-200/30',
      pattern: 'minimal'
    }
  };
  
  return themes[category as keyof typeof themes] || themes['Geral'];
}


export default function ProductCard({ 
  product, 
  currency, 
  themeColor, 
  showFeaturedBadge = false,
  enableEngagement = false
}: ProductCardProps) {
  const { hearts, handleDoubleTap, handleSaveProduct, isSaving, isProductLiked, toggleLike } = useEngagement();
  const { isAuthenticated } = useAuth();
  const categoryTheme = getCategoryTheme(product.category || undefined);
  
  const productContent = (
    <div className={`relative ${categoryTheme.bg} border-2 ${categoryTheme.border} ${categoryTheme.glowEffect} overflow-hidden group text-center flex flex-col h-full rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}>
      {/* Moldura decorativa com gradiente */}
      <div className={`absolute inset-0 ${categoryTheme.borderGradient} opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300`}></div>
      
      {/* Padrão decorativo sutil */}
      <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-transparent via-white to-transparent rounded-xl"></div>
      {/* Engagement Buttons */}
      {enableEngagement && (
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(product.id, e);
            }}
            className="bg-white/90 hover:bg-white backdrop-blur-sm p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
            title={isProductLiked(product.id) ? "Descurtir produto" : "Curtir produto"}
          >
            <Heart className={`w-4 h-4 ${isProductLiked(product.id) ? 'text-red-500 fill-red-500' : 'text-red-500'}`} />
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
        
        {/* Placeholder when no image */}
        <div 
          className="product-image w-full h-20 md:h-24 lg:h-28 bg-gray-100 flex items-center justify-center"
          style={{ display: product.imageUrl ? 'none' : 'flex' }}
        >
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-300 rounded opacity-30"></div>
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
        <h3 className="product-title text-[10px] sm:text-xs font-semibold text-gray-900 mb-1 mt-1 line-clamp-2 h-8 sm:h-10 flex items-center justify-center text-center">
          {product.name}
        </h3>
        
        <div className="text-xs sm:text-sm text-gray-500 mb-2 line-clamp-4 h-14 sm:h-16 flex items-start justify-center text-center leading-tight">
          {product.description || ''}
        </div>
        
        <div 
          className="flex items-end justify-center gap-0.5 h-6 sm:h-8 mt-auto relative z-10"
          style={{ color: categoryTheme.accent }}
        >
          {/* Destaque sutil no preço */}
          <div className={`absolute inset-0 ${categoryTheme.borderGradient} opacity-10 rounded-lg blur-sm`}></div>
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
