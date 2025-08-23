import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import type { Product } from "@shared/schema";

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
  showFeaturedBadge = false 
}: ProductCardProps) {
  const categoryColors = getCategoryColors(product.category || undefined);
  const categoryIcon = getCategoryIcon(product.category || undefined);
  
  return (
    <div className={`${categoryColors.bg} border-2 ${categoryColors.border} overflow-hidden group text-center`}>
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
      
      <div className="product-content p-2">
        <h3 className="product-title text-xs font-semibold text-gray-900 mb-1 line-clamp-2">
          {product.name}
        </h3>
        
        {product.description && (
          <div className="text-xs text-gray-500 mb-2 line-clamp-1">
            {product.description}
          </div>
        )}
        
        <div 
          className="flex items-start justify-center gap-0.5"
          style={{ color: categoryColors.accent }}
        >
          <span className="product-currency text-sm font-medium">{currency}</span>
          <div className="flex items-start">
            {(() => {
              const price = Number(product.price || 0);
              const integerPart = Math.floor(price);
              const decimalPart = Math.round((price - integerPart) * 100);
              return (
                <>
                  <span className="product-price text-xl md:text-2xl font-bold">
                    {integerPart.toLocaleString('pt-BR')}
                  </span>
                  <span className="product-cents text-xs font-medium mt-0.5">
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
}
