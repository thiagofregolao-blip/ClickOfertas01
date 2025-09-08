import { useState, useEffect, useMemo } from 'react';
import { Search, Calculator, Bell, Share2, Smartphone, Crown, TrendingDown, TrendingUp } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Store, Product } from '@shared/schema';

interface ComparisonResult {
  productName: string;
  paraguayPrice: number;
  paraguayStore: string;
  brazilPrice?: number;
  savings?: number;
  storeId: string;
}

export default function SearchHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isComparingPrices, setIsComparingPrices] = useState(false);
  const { toast } = useToast();

  // Fetch stores and products
  const { data: stores = [], isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ['/api/public/stores'],
  });

  const { data: allProducts = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/public/products'],
  });

  // Find matching products across all stores
  const matchingProducts = useMemo(() => {
    if (!searchQuery || !allProducts.length) return [];
    
    return allProducts.filter((product: Product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allProducts, searchQuery]);

  // Get stores that have matching products
  const storesWithMatches = useMemo(() => {
    if (!matchingProducts.length || !stores.length) return [];
    
    const storeIds = [...new Set(matchingProducts.map(p => p.storeId))];
    return stores.filter(store => storeIds.includes(store.id));
  }, [stores, matchingProducts]);

  // Get best price in Paraguay
  const bestParaguayPrice = useMemo(() => {
    if (!matchingProducts.length) return null;
    
    const prices = matchingProducts.map(p => parseFloat(p.price));
    const minPrice = Math.min(...prices);
    const bestProduct = matchingProducts.find(p => parseFloat(p.price) === minPrice);
    const store = stores.find(s => s.id === bestProduct?.storeId);
    
    return bestProduct && store ? {
      price: minPrice,
      product: bestProduct,
      store: store
    } : null;
  }, [matchingProducts, stores]);

  // Brazil price comparison mutation
  const brazilComparisonMutation = useMutation({
    mutationFn: async (productName: string) => {
      const response = await fetch('/api/price-comparison/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productId: bestParaguayPrice?.product.id,
          productName 
        }),
      });
      if (!response.ok) throw new Error('Erro na comparação');
      return response.json();
    },
    onSuccess: (data) => {
      if (bestParaguayPrice && data.comparison) {
        setComparisonResult({
          productName: searchQuery,
          paraguayPrice: bestParaguayPrice.price,
          paraguayStore: bestParaguayPrice.store.name,
          brazilPrice: data.comparison.averageBrazilPrice,
          savings: data.comparison.averageBrazilPrice ? 
            data.comparison.averageBrazilPrice - bestParaguayPrice.price : undefined,
          storeId: bestParaguayPrice.store.id
        });
      }
      setIsComparingPrices(false);
    },
    onError: () => {
      setIsComparingPrices(false);
      toast({
        title: "Erro na comparação",
        description: "Não foi possível comparar preços com o Brasil",
        variant: "destructive"
      });
    }
  });

  // Handle search
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    if (bestParaguayPrice) {
      setIsComparingPrices(true);
      brazilComparisonMutation.mutate(searchQuery);
    }
  };

  // Handle share
  const handleShare = () => {
    if (comparisonResult) {
      const message = `${comparisonResult.productName}\n🇵🇾 Paraguai: R$ ${comparisonResult.paraguayPrice.toFixed(2)}\n🇧🇷 Brasil: R$ ${comparisonResult.brazilPrice?.toFixed(2)}\n💰 Economia: R$ ${comparisonResult.savings?.toFixed(2)}`;
      
      if (navigator.share) {
        navigator.share({
          title: 'Comparação Click Ofertas',
          text: message
        });
      } else {
        navigator.clipboard.writeText(message);
        toast({
          title: "Copiado!",
          description: "Comparação copiada para área de transferência"
        });
      }
    }
  };

  const isLoading = storesLoading || productsLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Search className="h-8 w-8 text-white" />
            <h1 className="text-4xl font-bold text-white">Click Ofertas</h1>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-6">
            <Input
              placeholder="Digite o produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full py-3 px-4 pr-12 rounded-full bg-white border-0 text-lg shadow-lg"
              data-testid="search-input"
            />
            <Button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isComparingPrices}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full w-10 h-8 bg-blue-500 hover:bg-blue-600"
              data-testid="search-button"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Store Icons Grid - Small Circular Icons */}
        {!isLoading && stores.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap justify-center gap-4">
              {stores.map((store) => {
                const hasMatch = storesWithMatches.some(s => s.id === store.id);
                return (
                  <div 
                    key={store.id}
                    className={`relative transition-all duration-300 ${
                      hasMatch ? 'animate-pulse scale-110' : ''
                    }`}
                    data-testid={`store-icon-${store.id}`}
                  >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg ${
                      hasMatch 
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 ring-4 ring-yellow-300' 
                        : 'bg-gradient-to-br from-gray-600 to-gray-700'
                    }`}>
                      {store.name.substring(0, 2).toUpperCase()}
                    </div>
                    <p className="text-xs text-white text-center mt-1 font-medium">
                      {store.name.length > 8 ? store.name.substring(0, 8) + '...' : store.name}
                    </p>
                    {hasMatch && (
                      <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1 animate-bounce">
                        !
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Price Comparison Card */}
        {(comparisonResult || (searchQuery && bestParaguayPrice)) && (
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl" data-testid="comparison-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800">
                  {comparisonResult?.productName || searchQuery} - Comparação de Preços
                </h3>
              </div>

              <div className="space-y-3">
                {/* Paraguay Price */}
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-4 bg-red-500 rounded-sm flex items-center justify-center">
                      <div className="w-4 h-2 bg-white rounded-sm"></div>
                    </div>
                    <span className="font-medium text-gray-700">
                      {comparisonResult?.paraguayStore || bestParaguayPrice?.store.name}
                    </span>
                    <span className="text-xs text-gray-500">Paraguai</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-600 text-lg">
                      R$ {(comparisonResult?.paraguayPrice || bestParaguayPrice?.price || 0).toFixed(2)}
                    </span>
                    <Badge className="bg-orange-500 text-white">
                      <Crown className="h-3 w-3 mr-1" />
                      MELHOR PREÇO
                    </Badge>
                  </div>
                </div>

                {/* Brazil Price */}
                {isComparingPrices ? (
                  <div className="flex items-center justify-center p-4 bg-gray-100 rounded-lg">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-gray-600">Comparando preços no Brasil...</span>
                  </div>
                ) : comparisonResult?.brazilPrice ? (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-4 bg-green-500 rounded-sm flex items-center justify-center">
                        <div className="w-4 h-2 bg-blue-500 rounded-sm"></div>
                      </div>
                      <span className="font-medium text-gray-700">Brasil</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-red-600 text-lg">
                        R$ {comparisonResult.brazilPrice.toFixed(2)}
                      </span>
                      {comparisonResult.savings && comparisonResult.savings > 0 && (
                        <Badge className="bg-red-500 text-white">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +R$ {comparisonResult.savings.toFixed(2)}
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : bestParaguayPrice && (
                  <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                    <Button 
                      onClick={handleSearch} 
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid="compare-brazil-button"
                    >
                      Comparar com Brasil
                    </Button>
                  </div>
                )}

                {/* Savings Display */}
                {comparisonResult?.savings && comparisonResult.savings > 0 && (
                  <div className="text-center p-4 bg-green-100 rounded-lg border-2 border-green-300">
                    <div className="flex items-center justify-center gap-2 text-green-700">
                      <TrendingDown className="h-5 w-5" />
                      <span className="font-bold text-xl">
                        Economia: R$ {comparisonResult.savings.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      Comprando no Paraguai você economiza!
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {comparisonResult && (
                <div className="flex gap-3 mt-6">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    data-testid="calculate-trip-button"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Calcular Viagem
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    data-testid="create-alert-button"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Criar Alerta
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleShare}
                    data-testid="share-button"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Carregando lojas...</p>
          </div>
        )}

        {/* No Results */}
        {!isLoading && searchQuery && !bestParaguayPrice && (
          <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Produto não encontrado
              </h3>
              <p className="text-gray-600 mb-6">
                Não encontramos "{searchQuery}" nas lojas cadastradas.
              </p>
              <p className="text-sm text-gray-500">
                Tente buscar por: iPhone, Samsung, Notebook, TV, Perfume
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}