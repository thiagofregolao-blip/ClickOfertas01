import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import type { Product } from "@shared/schema";

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

export default function ProductCard({ 
  product, 
  currency, 
  themeColor, 
  showFeaturedBadge = false 
}: ProductCardProps) {
  const categoryColors = getCategoryColors(product.category);
  
  return (
    <div className={`${categoryColors.bg} border-2 ${categoryColors.border} overflow-hidden group text-center`}>
      <div className="relative">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="w-full h-20 md:h-24 lg:h-28 object-cover"
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
        
        {/* Placeholder for when image fails to load or doesn't exist */}
        <div 
          className="w-full h-20 md:h-24 lg:h-28 bg-gray-200 flex items-center justify-center"
          style={{ display: product.imageUrl ? 'none' : 'flex' }}
        >
          <span className="text-gray-500 text-xs">Sem imagem</span>
        </div>
        
        {(product.isFeatured && showFeaturedBadge) && (
          <div className="absolute top-1 right-1">
            <div className="bg-red-500 text-white text-xs px-1 py-0.5 rounded">
              ⭐
            </div>
          </div>
        )}
      </div>
      
      <div className="p-2">
        <h3 className="text-xs font-semibold text-gray-900 mb-1 line-clamp-2">
          {product.name}
        </h3>
        
        {product.description && (
          <div className="text-xs text-gray-500 mb-2 line-clamp-1">
            {product.description}
          </div>
        )}
        
        <div 
          className="flex items-baseline justify-center gap-0.5"
          style={{ color: categoryColors.accent }}
        >
          <span className="text-sm font-medium">{currency}</span>
          <span className="text-xl md:text-2xl font-bold">
            {Math.floor((product.price || 0) / 1000)}
          </span>
          <span className="text-sm font-bold">
            ,{String(Math.floor(((product.price || 0) % 1000) / 10)).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}
