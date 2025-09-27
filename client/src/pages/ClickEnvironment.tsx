import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Heart, ShoppingCart, Star, Sparkles, Zap, CheckCircle, Store, MapPin, DollarSign } from 'lucide-react';
import { LazyImage } from '@/components/lazy-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import GeminiAssistantBar from '@/components/GeminiAssistantBar';

interface Product {
  id: string;
  title: string;
  category: string;
  imageUrl?: string;
  price?: { USD?: number };
  storeId: string;
  storeName: string;
  storeLogoUrl?: string;
  storePremium?: boolean;
}

interface ClickEnvironmentProps {
  params: { productId?: string; category?: string };
}

export default function ClickEnvironment({ params }: ClickEnvironmentProps) {
  const [, setLocation] = useLocation();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Buscar produto principal e sugestões relacionadas
  const { data: suggestions, isLoading } = useQuery<{
    mainProduct?: Product;
    relatedProducts: Product[];
    aiMessage: string;
  }>({
    queryKey: [`/api/click-suggestions`, params.productId, params.category],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.productId) searchParams.set('productId', params.productId);
      if (params.category) searchParams.set('category', params.category);
      
      const response = await fetch(`/api/click-suggestions?${searchParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      return response.json();
    },
    enabled: !!(params.productId || params.category),
  });

  // Mutation para salvar produto
  const saveProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      return apiRequest("POST", `/api/products/${productId}/save`);
    },
    onSuccess: (_, productId) => {
      setSelectedProducts(prev => [...prev, productId]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      queryClient.invalidateQueries({ queryKey: ['/api/saved-products'] });
      toast({
        title: "Produto salvo!",
        description: "O produto foi adicionado à sua lista de compras.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o produto. Faça login para continuar.",
        variant: "destructive",
      });
    },
  });

  const handleAddToCart = (productId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Login necessário",
        description: "Faça login para salvar produtos na sua lista de compras.",
        variant: "destructive",
      });
      return;
    }
    
    saveProductMutation.mutate(productId);
  };

  const handleGoToShoppingList = () => {
    setLocation('/shopping-list');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-700 dark:text-gray-300">Click preparando sugestões especiais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Gemini Assistant Bar - Show-then-Ask */}
      <GeminiAssistantBar />
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/')}
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar</span>
              </Button>
              {suggestions?.mainProduct && (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <LazyImage
                      src={suggestions.mainProduct.imageUrl || ''}
                      alt={suggestions.mainProduct.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                      {suggestions.mainProduct.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {suggestions.mainProduct.category}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToShoppingList}
              className="flex items-center space-x-2"
              data-testid="shopping-list-button"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Lista ({selectedProducts.length})</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Featured Product */}
            {suggestions?.mainProduct && (
              <Card className="overflow-hidden">
                <div className="md:flex">
                  <div className="md:w-1/3">
                    <div className="aspect-square bg-gray-100 dark:bg-gray-800">
                      <LazyImage
                        src={suggestions.mainProduct.imageUrl || ''}
                        alt={suggestions.mainProduct.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="md:w-2/3 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <Badge variant="secondary" className="mb-2">
                          {suggestions.mainProduct.category}
                        </Badge>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                          {suggestions.mainProduct.title}
                        </h1>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                          <Store className="h-4 w-4" />
                          <span>{suggestions.mainProduct.storeName}</span>
                          {suggestions.mainProduct.storePremium && (
                            <Badge variant="outline" className="text-xs">Premium</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {suggestions.mainProduct.price?.USD && (
                          <div>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              ${suggestions.mainProduct.price.USD}
                            </div>
                            <div className="text-sm text-gray-500">
                              ≈ R$ {(suggestions.mainProduct.price.USD * 5.34).toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button 
                        onClick={() => handleAddToCart(suggestions.mainProduct!.id)}
                        className="flex-1"
                        disabled={selectedProducts.includes(suggestions.mainProduct.id)}
                      >
                        {selectedProducts.includes(suggestions.mainProduct.id) ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Salvo
                          </>
                        ) : (
                          <>
                            <Heart className="h-4 w-4 mr-2" />
                            Salvar
                          </>
                        )}
                      </Button>
                      <Button variant="outline">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Comparar
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Related Products Grid */}
            {suggestions?.relatedProducts && suggestions.relatedProducts.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
                  Sugestões Inteligentes
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {suggestions.relatedProducts.map(product => (
                    <ProductCard 
                      key={product.id}
                      product={product} 
                      isSelected={selectedProducts.includes(product.id)}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Tips Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Dicas do Click
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {suggestions?.aiMessage || "Com base na sua busca, aqui estão algumas sugestões que podem te ajudar! 🎯 Não se esqueça de salvar em sua lista de compras."}
                </p>
                
                <div className="mt-6 space-y-3">
                  <div className="flex items-start space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin className="h-3 w-3 mt-0.5" />
                    <span>Produtos disponíveis em Ciudad del Este</span>
                  </div>
                  <div className="flex items-start space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <DollarSign className="h-3 w-3 mt-0.5" />
                    <span>Preços em USD • Câmbio estimado</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleGoToShoppingList}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Ver Lista ({selectedProducts.length})
          </Button>
          <Button 
            className="flex-1"
            onClick={() => setLocation('/assistant')}
          >
            <Zap className="h-4 w-4 mr-2" />
            Falar com IA
          </Button>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-20 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Produto salvo!</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({ 
  product, 
  isSelected, 
  onAddToCart 
}: { 
  product: Product; 
  isSelected: boolean; 
  onAddToCart: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-square bg-gray-100 dark:bg-gray-800">
        <LazyImage
          src={product.imageUrl || ''}
          alt={product.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <Badge variant="outline" className="text-xs mb-1">
              {product.category}
            </Badge>
            <h3 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
              {product.title}
            </h3>
          </div>
          {product.price?.USD && (
            <div className="text-right ml-2">
              <div className="font-bold text-green-600 dark:text-green-400">
                ${product.price.USD}
              </div>
              <div className="text-xs text-gray-500">
                ≈ R$ {(product.price.USD * 5.34).toFixed(0)}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
            <Store className="h-3 w-3" />
            <span className="truncate">{product.storeName}</span>
            {product.storePremium && (
              <Badge variant="outline" className="text-xs px-1">⭐</Badge>
            )}
          </div>
          
          <Button
            size="sm"
            variant={isSelected ? "default" : "outline"}
            onClick={() => onAddToCart(product.id)}
            disabled={isSelected}
            className="ml-2"
            data-testid={`save-product-${product.id}`}
          >
            {isSelected ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <Heart className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}