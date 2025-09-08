import { useState, useEffect, useMemo } from 'react';
import { Search, Calculator, Bell, MapPin } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

  const isLoading = storesLoading || productsLoading;

  // Store icons data (based on the reference images)
  const storeIconsData = [
    { name: 'Magalu', color: '#0066CC', initial: 'M' },
    { name: 'Americanas', color: '#FF0000', initial: 'A' },
    { name: 'Casas', color: '#FF6B00', initial: 'C' },
    { name: 'Bahia', color: '#003366', initial: 'B' },
    { name: 'Carrefour', color: '#005AA0', initial: 'C' },
    { name: 'Amazon', color: '#FF9900', initial: 'A' },
    { name: 'Extra', color: '#FF0000', initial: 'E' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-blue-500 to-purple-600">
      <div className="container mx-auto px-6 py-12 max-w-md">
        
        {/* Header with Logo */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Search className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-light text-white">
              Click<br />Ofertas
            </h1>
          </div>
          
          {/* Search Field */}
          <div className="relative mb-8">
            <Input
              placeholder="Digite o produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full py-4 px-6 rounded-full bg-white border-0 text-base shadow-lg placeholder-gray-500 focus:ring-2 focus:ring-white/50"
              data-testid="search-input"
            />
            <Button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isComparingPrices}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full w-10 h-10 bg-gray-400 hover:bg-gray-500 border-0"
              data-testid="search-button"
            >
              <Search className="h-5 w-5 text-white" />
            </Button>
          </div>
        </div>

        {/* Store Icons Row */}
        {!isLoading && (
          <div className="mb-8">
            <div className="flex justify-center gap-4 flex-wrap">
              {storeIconsData.map((storeIcon, index) => {
                const actualStore = stores.find(s => s.name.toLowerCase().includes(storeIcon.name.toLowerCase()));
                const hasMatch = actualStore && storesWithMatches.some(s => s.id === actualStore.id);
                
                return (
                  <div 
                    key={index}
                    className={`relative transition-all duration-300 ${
                      hasMatch ? 'scale-110' : ''
                    }`}
                    data-testid={`store-icon-${storeIcon.name.toLowerCase()}`}
                  >
                    <div 
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg ${
                        hasMatch 
                          ? 'ring-3 ring-white/50 animate-pulse' 
                          : 'opacity-70'
                      }`}
                      style={{ backgroundColor: storeIcon.color }}
                    >
                      {storeIcon.initial}
                    </div>
                    <p className="text-xs text-white text-center mt-1 opacity-90">
                      {storeIcon.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Comparison Card */}
        {(comparisonResult || (searchQuery && bestParaguayPrice)) && (
          <Card className="bg-white shadow-2xl rounded-2xl overflow-hidden" data-testid="comparison-card">
            <CardContent className="p-0">
              {/* Card Header */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-800">
                    {comparisonResult?.productName || searchQuery} - Comparação de Preços
                  </h3>
                </div>
              </div>

              {/* Price Comparison List */}
              <div className="px-6 py-4 space-y-3">
                
                {/* Paraguay Store */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-4 bg-red-600 rounded-sm flex items-center justify-center relative">
                      <div className="w-4 h-2 bg-white rounded-sm"></div>
                      <div className="absolute w-2 h-2 bg-blue-500 rounded-full top-0 left-0"></div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 text-sm">
                        {comparisonResult?.paraguayStore || bestParaguayPrice?.store.name}
                      </p>
                      <p className="text-xs text-gray-500">Paraguai</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-500">
                      Mil {((comparisonResult?.paraguayPrice || bestParaguayPrice?.price || 0) / 1000).toFixed(1)}
                    </p>
                  </div>
                </div>

                {/* Brazil Comparison */}
                {isComparingPrices ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-gray-600 text-sm">Comparando...</span>
                  </div>
                ) : comparisonResult?.brazilPrice ? (
                  <>
                    {/* Loja B (fake store for comparison) */}
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-4 bg-red-600 rounded-sm flex items-center justify-center relative">
                          <div className="w-4 h-2 bg-white rounded-sm"></div>
                          <div className="absolute w-2 h-2 bg-blue-500 rounded-full top-0 left-0"></div>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 text-sm">Loja B</p>
                          <p className="text-xs text-gray-500">Paraguai</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-600">
                          ~R$ {Math.floor(Math.random() * 500) + 100}
                        </p>
                      </div>
                    </div>

                    {/* Brazil */}
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-4 bg-green-500 rounded-sm flex items-center justify-center relative">
                          <div className="w-4 h-2 bg-yellow-400 rounded-sm"></div>
                          <div className="absolute w-2 h-1 bg-blue-600 top-1 left-1"></div>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 text-sm">Brasil</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">
                          +R$ {comparisonResult.brazilPrice.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                        </p>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {/* Action Buttons */}
              <div className="px-6 py-4 bg-gray-50 flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-lg border-gray-300"
                  data-testid="calculate-trip-button"
                >
                  Calcular Viagem
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-lg border-gray-300"
                  data-testid="create-alert-button"
                >
                  Criar Alerta
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-sm">Carregando...</p>
          </div>
        )}

        {/* No Results */}
        {!isLoading && searchQuery && !bestParaguayPrice && (
          <Card className="bg-white shadow-2xl rounded-2xl">
            <CardContent className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                Produto não encontrado
              </h3>
              <p className="text-gray-600 text-sm">
                Tente: iPhone, Samsung, TV, Notebook
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}