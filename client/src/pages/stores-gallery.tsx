import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Star, Grid, List } from "lucide-react";
import { StoreStoriesSection } from "@/components/store-stories";
import ProductCard from "@/components/product-card";
import { ProductDetailModal } from "@/components/product-detail-modal";
import { useAppVersion, type AppVersionType } from "@/hooks/use-mobile";
import type { StoreWithProducts, Product } from "@shared/schema";

export default function StoresGallery() {
  const [searchQuery, setSearchQuery] = useState('');
  const { isMobile, isDesktop, version, versionName } = useAppVersion();
  const [viewMode, setViewMode] = useState<AppVersionType>('mobile');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreWithProducts | null>(null);

  // Sincronizar viewMode com a detecção automática
  useEffect(() => {
    setViewMode(version);
  }, [version]);

  // Log da versão atual (para desenvolvimento)
  useEffect(() => {
    console.log(`🎯 Executando: ${versionName} (${version})`);
  }, [versionName, version]);
  
  // Event listener para produtos similares
  useEffect(() => {
    const handleOpenProductModal = (event: CustomEvent) => {
      const { product, store } = event.detail;
      setSelectedProduct(product);
      setSelectedStore(store);
    };
    
    window.addEventListener('openProductModal', handleOpenProductModal);
    return () => window.removeEventListener('openProductModal', handleOpenProductModal);
  }, []);
  
  const { data: stores, isLoading } = useQuery<StoreWithProducts[]>({
    queryKey: ['/api/public/stores'],
    staleTime: 10 * 60 * 1000, // 10 minutos (aumentado)
    gcTime: 30 * 60 * 1000, // 30 minutos (aumentado) 
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false, // Evita refetch ao reconectar
  });

  // Função para verificar se a loja postou produtos hoje
  const hasProductsToday = (store: StoreWithProducts): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return store.products.some(product => {
      if (!product.updatedAt) return false;
      const productDate = new Date(product.updatedAt);
      productDate.setHours(0, 0, 0, 0);
      return productDate.getTime() === today.getTime() && product.isActive;
    });
  };

  // Filtrar e ordenar lojas
  const filteredStores = stores?.filter(store => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    
    // Buscar no nome da loja
    if (store.name.toLowerCase().includes(query)) return true;
    
    // Buscar nos produtos
    return store.products.some(product => 
      product.isActive && (
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query)
      )
    );
  }).sort((a, b) => {
    // Priorizar lojas que postaram produtos hoje
    const aHasToday = hasProductsToday(a);
    const bHasToday = hasProductsToday(b);
    
    if (aHasToday && !bHasToday) return -1;
    if (!aHasToday && bHasToday) return 1;
    
    // Se ambas têm ou não têm produtos hoje, ordenar por mais recente
    const aLatest = Math.max(...a.products.map(p => p.updatedAt ? new Date(p.updatedAt).getTime() : 0));
    const bLatest = Math.max(...b.products.map(p => p.updatedAt ? new Date(p.updatedAt).getTime() : 0));
    
    return bLatest - aLatest;
  }) || [];

  // Criar lista de produtos para busca (quando há termo de busca)
  const searchResults = searchQuery.trim() && stores ? 
    stores.flatMap(store => 
      store.products
        .filter(product => 
          product.isActive && (
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.category?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        )
        .map(product => ({ ...product, store }))
    ).sort((a, b) => Number(a.price || 0) - Number(b.price || 0)) // Ordenar por menor preço
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
        
        {/* Loading Posts */}
        <div className="max-w-2xl mx-auto">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="bg-white mb-4 border-b">
              <div className="p-4">
                <Skeleton className="h-12 w-12 rounded-full mb-3" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-48 mb-4" />
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stores || stores.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Nenhuma loja encontrada</h2>
          <p className="text-gray-600">Ainda não há panfletos disponíveis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Responsivo */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className={`mx-auto px-4 py-4 ${isMobile ? 'max-w-2xl' : 'max-w-4xl'}`}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: '#21409A' }}>🛍️ Panfleto Rápido</h1>
            <button
              onClick={() => window.location.href = '/'}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Início
            </button>
          </div>
          
        </div>
      </div>

      {/* Stories das Lojas */}
      {!searchQuery.trim() && (
        <StoreStoriesSection stores={filteredStores} isMobile={isMobile} />
      )}

      {/* Barra de Busca */}
      <div className="bg-white border-b">
        <div className={`mx-auto py-3 px-4 ${isMobile ? 'max-w-2xl' : 'max-w-4xl'}`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar produtos ou lojas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border-gray-200 focus:border-red-300 focus:ring-red-200"
            />
          </div>
        </div>
      </div>

      {/* Feed Unificado */}
      <UnifiedFeedView 
        stores={filteredStores} 
        searchQuery={searchQuery} 
        searchResults={searchResults} 
        isMobile={isMobile}
        onProductSelect={(product, store) => {
          setSelectedProduct(product);
          setSelectedStore(store);
        }}
      />
      
      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        store={selectedStore}
        isOpen={!!selectedProduct}
        onClose={() => {
          setSelectedProduct(null);
          setSelectedStore(null);
        }}
      />
    </div>
  );
}

// Componente para visualização Unificada (Feed estilo Instagram)
function UnifiedFeedView({ stores, searchQuery, searchResults, isMobile, onProductSelect }: { 
  stores: StoreWithProducts[], 
  searchQuery: string, 
  searchResults: any[],
  isMobile: boolean,
  onProductSelect: (product: Product, store: StoreWithProducts) => void
}) {
  return (
    <div className={`mx-auto ${isMobile ? 'max-w-2xl' : 'max-w-4xl'}`}>
        {searchQuery.trim() ? (
          // Layout de Busca Compacto
          searchResults.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                🔍 Nenhum produto encontrado para "{searchQuery}"
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Tente buscar por outro produto ou loja
              </p>
            </div>
          ) : (
            <div className="bg-white">
              <div className="p-4 border-b bg-gray-50">
                <p className="text-sm text-gray-600">
                  {searchResults.length} resultado{searchResults.length > 1 ? 's' : ''} para "{searchQuery}" 
                  <span className="ml-2 text-xs text-gray-500">• Ordenado por menor preço</span>
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {searchResults.map((result) => (
                  <SearchResultItem key={`${result.store.id}-${result.id}`} product={result} store={result.store} />
                ))}
              </div>
            </div>
          )
        ) : (
          // Layout de Feed Normal
          stores.map((store) => (
            <StorePost 
              key={store.id} 
              store={store} 
              searchQuery={searchQuery} 
              isMobile={isMobile}
              onProductClick={(product) => onProductSelect(product, store)}
            />
          ))
        )}
        
        {/* Footer do Feed */}
        {!searchQuery.trim() && (
          <div className="bg-white border-b p-6 text-center">
            <p className="text-gray-500">
              {stores.length} {stores.length === 1 ? 'loja disponível' : 'lojas disponíveis'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Desenvolvido com ❤️ para pequenos comércios do Paraguai
            </p>
          </div>
        )}
      </div>
  );
}

// Remove this component, we'll add the modal directly to the main component


function SearchResultItem({ product, store }: { product: Product & { store: StoreWithProducts }, store: StoreWithProducts }) {
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-4">
        {/* Product Image */}
        <div className="w-16 h-16 flex-shrink-0">
          <img
            src={product.imageUrl || '/api/placeholder/64/64'}
            alt={product.name}
            className="w-full h-full object-cover rounded-lg border"
          />
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {product.name}
                {product.isFeatured && (
                  <Badge className="ml-2 text-xs bg-gradient-to-r from-red-500 to-orange-500 text-white border-none">
                    🔥 Destaque
                  </Badge>
                )}
              </h3>
              
              <div className="flex items-center gap-2 mt-1">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: store.themeColor || '#E11D48' }}
                />
                <span className="text-sm text-gray-600 truncate">{store.name}</span>
                {product.category && (
                  <span className="text-xs text-gray-400">• {product.category}</span>
                )}
              </div>
              
              {product.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {product.description}
                </p>
              )}
            </div>

            {/* Price and Action */}
            <div className="flex-shrink-0 text-right ml-4">
              <div className="flex items-end justify-center gap-0.5 mb-1" style={{ color: store.themeColor || '#E11D48' }}>
                <span className="text-sm font-medium">{store.currency || 'Gs.'}</span>
                <div className="flex items-start">
                  {(() => {
                    const price = Number(product.price || 0);
                    const integerPart = Math.floor(price);
                    const decimalPart = Math.round((price - integerPart) * 100);
                    return (
                      <>
                        <span className="text-xl md:text-2xl font-bold">
                          {integerPart.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-xs font-medium mt-0.5">
                          ,{String(decimalPart).padStart(2, '0')}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
              <Link href={`/flyer/${store.slug}`}>
                <button
                  className="text-xs font-medium py-1 px-3 rounded-full border transition-all hover:scale-105"
                  style={{ 
                    borderColor: store.themeColor || '#E11D48',
                    color: store.themeColor || '#E11D48',
                    background: `linear-gradient(135deg, transparent, ${store.themeColor || '#E11D48'}10)`
                  }}
                >
                  Ver loja
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StorePost({ store, searchQuery = '', isMobile = true, onProductClick }: { 
  store: StoreWithProducts, 
  searchQuery?: string, 
  isMobile?: boolean,
  onProductClick?: (product: Product) => void
}) {
  const activeProducts = store.products.filter(p => p.isActive);
  
  // Se há busca ativa, filtrar apenas produtos que correspondem à busca
  const filteredProducts = searchQuery.trim() 
    ? activeProducts.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activeProducts;
  
  const featuredProducts = filteredProducts.filter(p => p.isFeatured);
  
  // Verificar se a loja postou produtos hoje
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const hasNewProductsToday = store.products.some(product => {
    if (!product.updatedAt) return false;
    const productDate = new Date(product.updatedAt);
    productDate.setHours(0, 0, 0, 0);
    return productDate.getTime() === today.getTime() && product.isActive;
  });
  
  // Agrupar por categoria para ordem consistente
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    const category = product.category || 'Geral';
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {} as Record<string, typeof filteredProducts>);

  // Ordenar categorias
  const categoryOrder = ['Perfumes', 'Eletrônicos', 'Pesca', 'Geral'];
  const sortedCategories = Object.keys(productsByCategory).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Produtos ordenados por categoria, priorizando destacados
  const categorySortedProducts = sortedCategories.flatMap(category => {
    const categoryProducts = productsByCategory[category];
    const featured = categoryProducts.filter(p => p.isFeatured);
    const regular = categoryProducts.filter(p => !p.isFeatured);
    return [...featured, ...regular];
  });
  
  // Priorizar produtos em destaque de diferentes categorias
  const featuredByCategory: Record<string, any> = {};
  const regularProducts: any[] = [];
  
  categorySortedProducts.forEach(product => {
    const category = product.category || 'Geral';
    if (product.isFeatured && !featuredByCategory[category]) {
      featuredByCategory[category] = product;
    } else {
      regularProducts.push(product);
    }
  });
  
  const featuredFromDifferentCategories = Object.values(featuredByCategory);
  const displayProducts = [...featuredFromDifferentCategories, ...regularProducts].slice(0, 5); // Mostrar 5 produtos em destaque

  return (
    <div className="bg-white mb-3 border-b">
      {/* Post Header with Background Effect */}
      <div className="relative overflow-hidden">
        {/* Background Effect */}
        <div 
          className="absolute inset-0 opacity-8"
          style={{
            background: `linear-gradient(135deg, ${store.themeColor || '#E11D48'}15, transparent 70%)`
          }}
        />
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            background: `radial-gradient(circle at top right, ${store.themeColor || '#E11D48'}20, transparent 60%)`
          }}
        />
        
        {/* Content */}
        <div className="relative px-4 py-3 flex items-center backdrop-blur-[0.5px]">
          <Link href={`/flyer/${store.slug}`}>
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mr-3 shadow-lg ring-2 ring-white/20 cursor-pointer hover:scale-105 transition-transform"
              style={{ backgroundColor: store.themeColor || '#E11D48' }}
            >
              {store.logoUrl ? (
                <img 
                  src={store.logoUrl} 
                  alt={store.name}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement as HTMLElement;
                    if (parent) {
                      parent.innerHTML = `<span class="text-lg drop-shadow-sm">${store.name.charAt(0)}</span>`;
                    }
                  }}
                />
              ) : (
                <span className="text-lg drop-shadow-sm">{store.name.charAt(0)}</span>
              )}
            </div>
          </Link>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 drop-shadow-sm">{store.name}</h3>
              
              {featuredProducts.length > 0 && (
                <Badge className="text-xs bg-gradient-to-r from-red-500 to-orange-500 text-white border-none shadow-lg animate-pulse ring-1 ring-white/30">
                  🔥 {featuredProducts.length} oferta{featuredProducts.length > 1 ? 's' : ''} imperdível{featuredProducts.length > 1 ? 'eis' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Products Horizontal Cards */}
      {displayProducts.length > 0 ? (
        <div className="px-4 pb-3">
          {isMobile ? (
            /* Layout Mobile - Carousel horizontal com scroll */
            <div className="relative">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {displayProducts.map((product) => (
                  <div key={product.id} className="flex-shrink-0 w-32 sm:w-36 md:w-40 h-56 sm:h-60">
                    <ProductCard
                      product={product}
                      currency={store.currency || 'Gs.'}
                      themeColor={store.themeColor || '#E11D48'}
                      showFeaturedBadge={true}
                      onClick={onProductClick}
                      customUsdBrlRate={store.customUsdBrlRate ? Number(store.customUsdBrlRate) : undefined}
                    />
                  </div>
                ))}
              </div>
              
              {/* Indicador de scroll para mobile */}
              {displayProducts.length > 3 && (
                <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white via-white/80 to-transparent flex items-center justify-center pointer-events-none">
                  <div className="bg-gray-400 rounded-full p-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Layout Desktop - Grid horizontal sem scroll */
            <div className="grid grid-cols-5 gap-3">
              {displayProducts.slice(0, 5).map((product) => (
                <div key={product.id} className="h-72">
                  <ProductCard
                    product={product}
                    currency={store.currency || 'Gs.'}
                    themeColor={store.themeColor || '#E11D48'}
                    showFeaturedBadge={true}
                    onClick={onProductClick}
                    customUsdBrlRate={store.customUsdBrlRate ? Number(store.customUsdBrlRate) : undefined}
                  />
                </div>
              ))}
              
              {/* Preencher slots vazios se houver menos de 5 produtos */}
              {Array.from({ length: Math.max(0, 5 - displayProducts.length) }).map((_, index) => (
                <div key={`empty-${index}`} className="h-72 bg-gray-100 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-xs">+</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-gray-500">
          <p>Esta loja ainda não tem produtos ativos</p>
        </div>
      )}

      {/* View All Products Footer */}
      <div className="px-4 pb-3 border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm">
            {store.whatsapp && (
              <a 
                href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=Olá! Vi suas ofertas no Panfleto Rápido e gostaria de mais informações.`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-700 transition-colors"
              >
                📱 WhatsApp
              </a>
            )}
            {store.instagram && (
              <a 
                href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-600 hover:text-pink-700 transition-colors"
              >
                📸 Instagram
              </a>
            )}
          </div>
          
          <Link href={`/flyer/${store.slug}`}>
            <button 
              className="text-sm font-medium py-2 px-4 rounded-full border-2 transition-all hover:scale-105 hover:shadow-md"
              style={{ 
                borderColor: store.themeColor || '#E11D48',
                color: store.themeColor || '#E11D48',
                background: `linear-gradient(135deg, transparent, ${store.themeColor || '#E11D48'}10)`
              }}
            >
              💰 Ver {filteredProducts.length > 4 ? `+${filteredProducts.length - 4} ofertas` : 'panfleto'}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}