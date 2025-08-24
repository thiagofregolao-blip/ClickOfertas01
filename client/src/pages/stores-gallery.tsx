import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Star } from "lucide-react";
import { StoreStoriesSection } from "@/components/store-stories";
import ProductCard from "@/components/product-card";
import type { StoreWithProducts } from "@shared/schema";

export default function StoresGallery() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: stores, isLoading } = useQuery<StoreWithProducts[]>({
    queryKey: ['/api/public/stores'],
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });

  // Filtrar lojas (otimizado)
  const filteredStores = useMemo(() => {
    if (!stores) return [];
    if (!searchQuery.trim()) return stores;
    
    const query = searchQuery.toLowerCase();
    return stores.filter(store => 
      store.name.toLowerCase().includes(query) ||
      store.products.some(product => 
        product.isActive && product.name.toLowerCase().includes(query)
      )
    );
  }, [stores, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-6">
          <div className="grid gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-white shadow-sm">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2 mb-4" />
                  <div className="grid grid-cols-3 gap-2">
                    {[...Array(3)].map((_, j) => (
                      <Skeleton key={j} className="h-20 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Panfleto Rápido</h1>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Buscar lojas ou produtos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>
      </div>

      {/* Stories Section */}
      <StoreStoriesSection stores={filteredStores} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {filteredStores && filteredStores.length > 0 ? (
          <div className="space-y-6">
            {filteredStores.map((store) => {
              const activeProducts = store.products.filter(p => p.isActive);
              const featuredProducts = activeProducts.filter(p => p.isFeatured);
              const displayProducts = featuredProducts.length > 0 
                ? [...featuredProducts, ...activeProducts.filter(p => !p.isFeatured)].slice(0, 5)
                : activeProducts.slice(0, 5);

              if (displayProducts.length === 0) return null;

              return (
                <Card key={store.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    {/* Store Header */}
                    <div className="p-4 border-b bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {store.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <Link href={`/stores/${store.slug}`}>
                              <h3 className="font-bold text-lg text-gray-800 hover:text-blue-600 cursor-pointer">
                                {store.name}
                              </h3>
                            </Link>
                            {store.address && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <MapPin className="w-4 h-4" />
                                <span>{store.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Badge variant="secondary" className="mb-1">
                            {activeProducts.length} produto{activeProducts.length !== 1 ? 's' : ''}
                          </Badge>
                          {featuredProducts.length > 0 && (
                            <div className="flex items-center gap-1 text-sm text-yellow-600">
                              <Star className="w-4 h-4 fill-current" />
                              <span>{featuredProducts.length} em destaque</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Products Grid */}
                    <div className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {displayProducts.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            currency={store.currency || "Gs."}
                            themeColor={store.themeColor || "#E11D48"}
                            showFeaturedBadge={product.isFeatured || false}
                            enableEngagement={false}
                          />
                        ))}
                      </div>
                      
                      {activeProducts.length > 5 && (
                        <div className="mt-4 text-center">
                          <Link href={`/stores/${store.slug}`}>
                            <span className="text-blue-600 hover:text-blue-700 text-sm font-medium cursor-pointer">
                              Ver mais {activeProducts.length - 5} produtos →
                            </span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : searchQuery.trim() ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Nenhum resultado encontrado
            </h3>
            <p className="text-gray-500">
              Tente buscar por outro termo ou navegue pelas lojas disponíveis.
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Nenhuma loja disponível
            </h3>
            <p className="text-gray-500">
              As lojas ainda não publicaram seus produtos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}