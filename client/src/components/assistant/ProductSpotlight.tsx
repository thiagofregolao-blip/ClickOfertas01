import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  Heart, 
  ShoppingCart, 
  ExternalLink,
  Star,
  Zap,
  RefreshCw
} from 'lucide-react';

interface SpotlightProduct {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  imageUrl: string;
  category: string;
  storeName: string;
  rating?: number;
  discount?: number;
  isPopular?: boolean;
  isTrending?: boolean;
  description?: string;
}

interface ProductSpotlightProps {
  sessionId?: string;
  chatContext?: string[];
  onProductSelect?: (product: SpotlightProduct) => void;
  onAddToFavorites?: (productId: string) => void;
  className?: string;
}

export default function ProductSpotlight({
  sessionId,
  chatContext = [],
  onProductSelect,
  onAddToFavorites,
  className = ''
}: ProductSpotlightProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  // Query for spotlight recommendations
  const spotlightQuery = useQuery({
    queryKey: ['assistant', 'spotlight', sessionId, refreshKey, chatContext.join('|')],
    queryFn: async () => {
      const response = await fetch('/api/assistant/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          query: chatContext.slice(-3).join(' '), // Last 3 messages as context
          context: { 
            type: 'spotlight',
            conversationContext: chatContext,
            timestamp: new Date().toISOString()
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      const products = [
        ...(data.recommendations?.popularPicks || []),
        ...(data.recommendations?.searchResults || []),
        ...(data.recommendations?.contextual || [])
      ];

      return products.map((product: any) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        imageUrl: product.imageUrl || product.image,
        category: product.category,
        storeName: product.storeName || product.store?.name,
        rating: product.rating,
        discount: product.discount,
        isPopular: product.isPopular,
        isTrending: product.isTrending,
        description: product.description
      })) as SpotlightProduct[];
    },
    enabled: true,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });

  // Auto-refresh recommendations when chat context changes significantly
  useEffect(() => {
    if (chatContext.length > 0 && chatContext.length % 3 === 0) {
      // Refresh every 3 messages
      setRefreshKey(prev => prev + 1);
    }
  }, [chatContext]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleProductClick = (product: SpotlightProduct) => {
    onProductSelect?.(product);
  };

  const handleAddToFavorites = (productId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onAddToFavorites?.(productId);
  };

  const products = spotlightQuery.data || [];

  return (
    <Card className={`h-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Produtos em Destaque
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={spotlightQuery.isFetching}
            data-testid="button-refresh-spotlight"
          >
            <RefreshCw className={`h-4 w-4 ${spotlightQuery.isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {chatContext.length > 0 && (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Recomendações baseadas na conversa
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-280px)]">
          {spotlightQuery.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <SpotlightProductSkeleton key={index} />
              ))}
            </div>
          ) : spotlightQuery.error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-slate-400 mb-2">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Erro ao carregar produtos</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-slate-400 mb-2">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Nenhum produto encontrado</p>
                <p className="text-xs mt-1">Inicie uma conversa para ver recomendações</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <SpotlightProductCard
                  key={product.id}
                  product={product}
                  onClick={() => handleProductClick(product)}
                  onAddToFavorites={(e) => handleAddToFavorites(product.id, e)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Product card component
function SpotlightProductCard({
  product,
  onClick,
  onAddToFavorites
}: {
  product: SpotlightProduct;
  onClick: () => void;
  onAddToFavorites: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="group p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer hover:shadow-md"
      onClick={onClick}
      data-testid={`card-product-${product.id}`}
    >
      <div className="flex gap-3">
        <div className="relative w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex-shrink-0 overflow-hidden">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-slate-400" />
            </div>
          )}
          
          {/* Badges */}
          {product.discount && (
            <div className="absolute top-1 left-1">
              <Badge variant="destructive" className="text-xs px-1 py-0">
                -{product.discount}%
              </Badge>
            </div>
          )}
          {product.isPopular && (
            <div className="absolute top-1 right-1">
              <div className="bg-orange-500 text-white rounded-full p-1">
                <Star className="h-3 w-3 fill-current" />
              </div>
            </div>
          )}
          {product.isTrending && (
            <div className="absolute bottom-1 right-1">
              <div className="bg-green-500 text-white rounded-full p-1">
                <TrendingUp className="h-3 w-3" />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-slate-900 dark:text-white line-clamp-2 mb-1">
            {product.name}
          </h4>
          
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {product.category}
            </Badge>
            {product.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {product.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
          
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
            {product.storeName}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {product.originalPrice && (
                <span className="text-xs text-slate-400 line-through">
                  {product.originalPrice}
                </span>
              )}
              <span className="font-semibold text-green-600 dark:text-green-400 text-sm">
                {product.price}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onAddToFavorites}
            data-testid={`button-favorite-${product.id}`}
          >
            <Heart className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            data-testid={`button-view-${product.id}`}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Skeleton component for loading state
function SpotlightProductSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex gap-3">
        <Skeleton className="w-16 h-16 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  );
}