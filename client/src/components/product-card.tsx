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

export default function ProductCard({ 
  product, 
  currency, 
  themeColor, 
  showFeaturedBadge = false 
}: ProductCardProps) {
  return (
    <div className="bg-white border border-gray-200 overflow-hidden group text-center">
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
        <h3 className="text-xs font-semibold text-gray-900 mb-2 line-clamp-2 h-8">
          {product.name}
        </h3>
        
        <div 
          className="text-sm md:text-base font-bold"
          style={{ color: themeColor }}
        >
          {currency} {product.price?.toLocaleString()}
        </div>
        
        <div className="text-xs text-gray-500 mt-1">
          Entrega em 24h/48hs
        </div>
      </div>
    </div>
  );
}
