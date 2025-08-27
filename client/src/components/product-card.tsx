import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Heart, Bookmark } from "lucide-react";
import type { Product } from "@shared/schema";
import { Likeable } from "@/components/heart-animation";
import { useEngagement } from "@/hooks/use-engagement";
import { useAuth } from "@/hooks/useAuth";
import ScratchCard from "./scratch-card";


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
  
  const handleCardClick = () => {
    if (onClick) {
      onClick(product);
    }
  };

  // Verificar se é uma raspadinha ativa
  const isScratchCard = product.isScratchCard && 
    product.scratchExpiresAt && 
    new Date(product.scratchExpiresAt) > new Date();

  // Se for raspadinha, mostrar ScratchCard
  if (isScratchCard) {
    return (
      <ScratchCard
        product={product}
        currency={currency}
        themeColor={themeColor}
        onClick={onClick}
        onRevealed={() => {
          // Atualizar produto revelado se necessário
          console.log('Produto raspado:', product.name);
        }}
      />
    );
  }

  const productContent = (
    <div 
      className={`relative ${categoryColors.bg} border-2 ${categoryColors.border} overflow-hidden group text-center flex flex-col h-full min-h-[200px] sm:min-h-[220px] ${
        onClick ? 'cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]' : ''
      }`}
      onClick={handleCardClick}
      data-testid={`card-product-${product.id}`}
    >
      <div className="h-full flex flex-col">
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
              className={`backdrop-blur-sm p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110 ${
                isAuthenticated && isProductSaved(product.id)
                  ? 'bg-blue-100/90 hover:bg-blue-200/90'
                  : 'bg-white/90 hover:bg-white'
              }`}
              title={isAuthenticated && isProductSaved(product.id) ? "Produto salvo" : "Salvar produto"}
            >
              <Bookmark className={`w-4 h-4 ${
                isAuthenticated && isProductSaved(product.id)
                  ? 'text-blue-600 fill-blue-600'
                  : isAuthenticated 
                    ? 'text-blue-600' 
                    : 'text-gray-400'
              }`} />
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

          {/* Badge de etiqueta para produtos em destaque */}
          {(product.isFeatured && showFeaturedBadge) && (
            <div className="absolute top-0 left-0 z-10">
              <img 
                src="/attached_assets/ChatGPT Image 26 de ago. de 2025, 19_53_25_1756248832502.png" 
                alt="Oferta Especial"
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain animate-pulse drop-shadow-lg"
              />
            </div>
          )}
        </div>
        
        <div className="product-content p-2 flex flex-col h-full">
          <h3 className="product-title text-xs sm:text-sm font-bold text-blue-600 mb-1 mt-1 line-clamp-2 h-8 sm:h-10 flex items-center justify-center text-center">
            {product.name}
          </h3>
          
          <div className="text-[10px] sm:text-xs text-gray-500 mb-2 text-center leading-tight">
            <p className="line-clamp-2">{product.description || ''}</p>
          </div>
          
          <div className="flex flex-col items-center justify-center mt-auto space-y-1">
            <span className="text-[10px] sm:text-xs text-gray-600 font-medium">A partir de</span>
            
            <div className="flex items-end justify-center gap-0.5 relative">
              <span className="text-xs sm:text-sm font-medium self-end" style={{ color: '#A21614' }}>US$</span>
              <div className="flex items-start">
                {(() => {
                  const price = Number(product.price || 0);
                  const integerPart = Math.floor(price);
                  const decimalPart = Math.round((price - integerPart) * 100);
                  return (
                    <>
                      <span className="text-lg sm:text-xl md:text-2xl font-bold leading-none" style={{ color: '#A21614' }}>
                        {integerPart.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-xs sm:text-sm font-medium mt-0.5 leading-none" style={{ color: '#A21614' }}>
                        ,{String(decimalPart).padStart(2, '0')}
                      </span>
                    </>
                  );
                })()}
              </div>
              
            </div>

            {/* Preço em Real - para todas as lojas */}
            <div className="text-xs sm:text-sm text-gray-600 font-medium">
              R$ {(() => {
                const priceUSD = Number(product.price || 0);
                // Usar taxa personalizada da loja ou taxa padrão 5.47
                const rate = customUsdBrlRate || 5.47;
                const priceBRL = priceUSD * rate;
                return priceBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              })()}
            </div>
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