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
    <Card className="overflow-hidden hover:shadow-xl transition-shadow group">
      <div className="relative">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
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
          className="w-full h-32 bg-gray-200 flex items-center justify-center"
          style={{ display: product.imageUrl ? 'none' : 'flex' }}
        >
          <span className="text-gray-500 text-sm">Sem imagem</span>
        </div>
        
        {(product.isFeatured && showFeaturedBadge) && (
          <div className="absolute top-3 right-3">
            <Badge 
              className="text-white font-semibold shadow-lg"
              style={{ backgroundColor: themeColor }}
            >
              <Star className="w-3 h-3 mr-1" />
              DESTAQUE
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-2">
          {product.name}
        </h3>
        
        {product.description && (
          <p className="text-gray-600 text-xs mb-3 line-clamp-1">
            {product.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div 
            className="text-lg font-bold"
            style={{ color: themeColor }}
          >
            {currency} {product.price?.toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
