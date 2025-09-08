import { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, TrendingUp, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Store, Product } from '@shared/schema';

interface StoreWithProducts extends Store {
  products?: Product[];
  matchingProducts?: Product[];
  lowestPrice?: number;
}

export default function SearchHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const [matchingStores, setMatchingStores] = useState<string[]>([]);

  // Fetch stores and products
  const { data: stores = [], isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ['/api/public/stores'],
  });

  const { data: allProducts = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/public/products'],
  });

  // Process stores with product data and search matching
  const storesWithData = useMemo(() => {
    if (!stores.length || !allProducts.length) return [];

    return stores.map((store: Store) => {
      const storeProducts = allProducts.filter((p: Product) => p.storeId === store.id);
      const matchingProducts = searchQuery 
        ? storeProducts.filter((p: Product) => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
            p.description?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : [];

      const lowestPrice = storeProducts.length > 0 
        ? Math.min(...storeProducts.map(p => parseFloat(p.price)))
        : 0;

      return {
        ...store,
        products: storeProducts,
        matchingProducts,
        lowestPrice: lowestPrice || 0
      };
    });
  }, [stores, allProducts, searchQuery]);

  // Update matching stores when search changes
  useEffect(() => {
    const matching = storesWithData
      .filter(store => store.matchingProducts && store.matchingProducts.length > 0)
      .map(store => store.id);
    setMatchingStores(matching);
  }, [storesWithData]);

  // Popular search suggestions
  const popularSearches = [
    'iPhone', 'Samsung', 'Notebook', 'TV', 'Perfume', 
    'Tênis', 'Relógio', 'Headphone', 'Camera'
  ];

  const isLoading = storesLoading || productsLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Background Blur Effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        {/* Header Section */}
        <div className="pt-20 pb-16 text-center">
          <div className="container mx-auto px-4">
            {/* Logo */}
            <div className="mb-12">
              <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                Click Ofertas
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Compare preços • Economize dinheiro • Paraguay & Brasil
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 dark:bg-gray-800/30 backdrop-blur-lg rounded-full border border-white/20 shadow-xl"></div>
                <div className="relative flex items-center">
                  <Search className="absolute left-6 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Pesquise produtos, marcas ou categorias..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-14 pr-6 py-6 text-lg bg-transparent border-none focus:ring-0 rounded-full placeholder:text-gray-500"
                    data-testid="search-input"
                  />
                  <Button 
                    className="absolute right-2 rounded-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    data-testid="search-button"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Popular Searches */}
            {!searchQuery && (
              <div className="max-w-3xl mx-auto">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Pesquisas populares:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {popularSearches.map((term) => (
                    <Button
                      key={term}
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery(term)}
                      className="rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-white/30 hover:bg-white/70 dark:hover:bg-gray-700/70"
                      data-testid={`popular-search-${term.toLowerCase()}`}
                    >
                      {term}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stores Grid */}
        <div className="container mx-auto px-4 pb-20">
          {isLoading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando lojas...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {storesWithData.map((store) => {
                const hasMatches = matchingStores.includes(store.id);
                const matchCount = store.matchingProducts?.length || 0;
                
                return (
                  <Card 
                    key={store.id}
                    className={`group relative overflow-hidden transition-all duration-500 cursor-pointer ${
                      hasMatches 
                        ? 'ring-4 ring-yellow-400 shadow-2xl scale-105 animate-pulse bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20' 
                        : 'hover:scale-105 hover:shadow-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm'
                    }`}
                    data-testid={`store-card-${store.id}`}
                  >
                    <CardContent className="p-6 text-center">
                      {/* Store Avatar */}
                      <div className="relative mb-4">
                        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg ${
                          hasMatches 
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 animate-bounce' 
                            : 'bg-gradient-to-br from-blue-500 to-purple-600'
                        }`}>
                          {store.name.substring(0, 2).toUpperCase()}
                        </div>
                        
                        {/* Notification Badge */}
                        {hasMatches && (
                          <Badge className="absolute -top-2 -right-2 bg-red-500 text-white animate-ping">
                            {matchCount}
                          </Badge>
                        )}
                      </div>

                      {/* Store Info */}
                      <h3 className="font-semibold text-sm mb-2 text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {store.name}
                      </h3>
                      
                      {/* Location & Stats */}
                      <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center justify-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{store.address}</span>
                        </div>
                        
                        {store.products && store.products.length > 0 && (
                          <div className="flex items-center justify-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            <span>{store.products.length} produtos</span>
                          </div>
                        )}

                        {/* Price Preview */}
                        {store.lowestPrice > 0 && (
                          <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 font-medium">
                            <span>A partir de</span>
                            <span className="font-bold">R$ {store.lowestPrice.toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      {/* Match Indicator */}
                      {hasMatches && (
                        <div className="mt-3 flex items-center justify-center gap-1 text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                          <Zap className="h-3 w-3" />
                          <span>{matchCount} produto{matchCount > 1 ? 's' : ''} encontrado{matchCount > 1 ? 's' : ''}!</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* No Results */}
          {!isLoading && searchQuery && matchingStores.length === 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Nenhum resultado encontrado
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Não encontramos produtos relacionados a "{searchQuery}". Tente pesquisar por:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {popularSearches.slice(0, 5).map((term) => (
                  <Button
                    key={term}
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery(term)}
                    className="rounded-full"
                    data-testid={`suggestion-${term.toLowerCase()}`}
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `
      }} />
    </div>
  );
}