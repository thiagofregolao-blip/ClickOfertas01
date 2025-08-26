import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Star, Grid, List, User, Settings, LogOut } from "lucide-react";
import { StoreStoriesSection } from "@/components/store-stories";
import ProductCard from "@/components/product-card";
import { ProductDetailModal } from "@/components/product-detail-modal";
import LoginPage from "@/components/login-page";
import { useAppVersion, type AppVersionType } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import type { StoreWithProducts, Product } from "@shared/schema";

export default function StoresGallery() {
  const [searchQuery, setSearchQuery] = useState('');
  const { isMobile, isDesktop, version, versionName } = useAppVersion();
  const [viewMode, setViewMode] = useState<AppVersionType>('mobile');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreWithProducts | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  // Fecha o menu do usuário quando clica fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isUserMenuOpen) {
        const target = event.target as HTMLElement;
        // Verifica se o clique foi fora do menu do usuário
        if (!target.closest('[data-testid="button-user-menu"]') && 
            !target.closest('.user-dropdown-menu')) {
          setIsUserMenuOpen(false);
        }
      }
    };
    
    if (isUserMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isUserMenuOpen]);

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
    const handleOpenProductModal = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { product, store } = customEvent.detail;
      setSelectedProduct(product);
      setSelectedStore(store);
    };
    
    window.addEventListener('openProductModal', handleOpenProductModal as EventListener);
    return () => window.removeEventListener('openProductModal', handleOpenProductModal as EventListener);
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

  // Criar resultados de busca combinados (lojas + produtos)
  const searchResults = searchQuery.trim() && stores ? (() => {
    const query = searchQuery.toLowerCase();
    const results: Array<{ type: 'store' | 'product', data: any, store: any }> = [];
    
    stores.forEach(store => {
      // Buscar lojas por nome
      if (store.name.toLowerCase().includes(query)) {
        results.push({ type: 'store', data: store, store });
      }
      
      // Buscar produtos
      store.products
        .filter(product => 
          product.isActive && (
            product.name.toLowerCase().includes(query) ||
            product.description?.toLowerCase().includes(query) ||
            product.category?.toLowerCase().includes(query)
          )
        )
        .forEach(product => {
          results.push({ type: 'product', data: { ...product, store }, store });
        });
    });
    
    // Ordenar: lojas primeiro, depois produtos por preço
    return results.sort((a, b) => {
      if (a.type === 'store' && b.type === 'product') return -1;
      if (a.type === 'product' && b.type === 'store') return 1;
      if (a.type === 'product' && b.type === 'product') {
        return Number(a.data.price || 0) - Number(b.data.price || 0);
      }
      return 0;
    });
  })() : [];

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
      <div className="border-b sticky top-0 z-10" style={{ backgroundColor: '#21409A' }}>
        <div className={`mx-auto px-4 py-4 ${isMobile ? 'max-w-2xl' : 'max-w-4xl'}`}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">🛍️ Panfleto Rápido</h1>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                // Usuário logado - mostrar informações e menu
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="text-white hover:text-gray-200 font-medium flex items-center gap-2"
                    data-testid="button-user-menu"
                  >
                    <User className="w-5 h-5" />
                    <span className="text-sm">
                      Olá, {user?.firstName || user?.fullName || user?.email?.split('@')[0] || 'Usuário'}
                    </span>
                    <Settings className="w-4 h-4" />
                  </button>
                  
                  {/* Menu dropdown do usuário */}
                  {isUserMenuOpen && (
                    <div className="user-dropdown-menu absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsUserMenuOpen(false);
                          setLocation('/settings');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                        data-testid="button-user-config"
                      >
                        <Settings className="w-4 h-4" />
                        Configurações
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsUserMenuOpen(false);
                          window.location.href = '/api/auth/logout?redirect_uri=/cards';
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-red-600"
                        data-testid="button-user-logout"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Usuário não logado - mostrar botão entrar
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="text-white hover:text-gray-200 font-medium flex items-center gap-1"
                  data-testid="button-user-login"
                >
                  <User className="w-4 h-4" />
                  Entrar
                </button>
              )}
              
              <button
                onClick={() => window.location.href = '/'}
                className="text-white hover:text-gray-200 font-medium"
              >
                Início
              </button>
            </div>
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
        stores={searchQuery.trim() ? stores || [] : filteredStores} 
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

      {/* Login Modal - Para Usuários */}
      <LoginPage 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        mode="user"
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
                🔍 Nenhum resultado encontrado para "{searchQuery}"
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
                  <span className="ml-2 text-xs text-gray-500">• Lojas e produtos</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  💡 Clique nos itens para ver detalhes
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {searchResults.map((result, index) => (
                  result.type === 'store' ? (
                    <StoreResultItem 
                      key={`store-${result.store.id}`} 
                      store={result.data}
                      searchQuery={searchQuery}
                      isMobile={isMobile}
                      onProductClick={(product) => onProductSelect(product, result.data)}
                    />
                  ) : (
                    <SearchResultItem 
                      key={`product-${result.store.id}-${result.data.id}`} 
                      product={result.data} 
                      store={result.store}
                      onClick={() => onProductSelect(result.data, result.store)}
                      isMobile={isMobile}
                    />
                  )
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

// Componente para mostrar lojas nos resultados de busca
function StoreResultItem({ 
  store, 
  searchQuery,
  isMobile = false,
  onProductClick
}: { 
  store: StoreWithProducts,
  searchQuery: string,
  isMobile?: boolean,
  onProductClick?: (product: Product) => void
}) {
  const [, setLocation] = useLocation();
  const activeProducts = store.products.filter(p => p.isActive);
  const featuredProducts = activeProducts.filter(p => p.isFeatured).slice(0, 3);
  const displayProducts = featuredProducts.length > 0 ? featuredProducts : activeProducts.slice(0, 3);

  const handleStoreClick = () => {
    setLocation(`/flyer/${store.slug}`);
  };

  return (
    <button 
      onClick={handleStoreClick}
      className={`${isMobile ? 'p-3' : 'p-4'} hover:bg-blue-50 transition-all border-l-4 border-blue-500 bg-blue-25 w-full text-left cursor-pointer`}
    >
      {/* Store Header */}
      <div className="flex items-center gap-3">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: store.themeColor || '#E11D48' }}
        >
          🏪
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span>{store.name}</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
              LOJA
            </span>
          </h3>
          <p className="text-xs text-gray-500">
            {activeProducts.length} produto{activeProducts.length !== 1 ? 's' : ''} disponível{activeProducts.length !== 1 ? 'is' : ''}
          </p>
        </div>
      </div>
    </button>
  );
}

function SearchResultItem({ 
  product, 
  store, 
  onClick,
  isMobile = false
}: { 
  product: Product & { store: StoreWithProducts }, 
  store: StoreWithProducts,
  onClick?: () => void,
  isMobile?: boolean
}) {
  return (
    <div 
      className={`${isMobile ? 'p-3' : 'p-4'} hover:bg-blue-50 hover:border-l-4 hover:border-blue-500 transition-all cursor-pointer border-l-4 border-transparent group`}
      onClick={onClick}
      data-testid={`search-result-${product.id}`}
      title="Clique para ver detalhes do produto"
    >
      <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
        {/* Product Image */}
        <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} flex-shrink-0`}>
          <img
            src={product.imageUrl || '/api/placeholder/64/64'}
            alt={product.name}
            className="w-full h-full object-cover rounded-lg border"
          />
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 overflow-hidden">
                <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors flex-1 min-w-0">
                  {product.name}
                  {product.isFeatured && (
                    <Badge className="ml-2 text-xs bg-gradient-to-r from-red-500 to-orange-500 text-white border-none">
                      🔥 Destaque
                    </Badge>
                  )}
                </h3>
                <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  👆
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-1 overflow-hidden">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: store.themeColor || '#E11D48' }}
                />
                <span className="text-sm text-gray-600 truncate flex-1 min-w-0">{store.name}</span>
                {product.category && (
                  <span className="text-xs text-gray-400 flex-shrink-0">• {product.category}</span>
                )}
              </div>
              
              {product.description && (
                <p className={`text-xs text-gray-500 mt-1 ${isMobile ? 'line-clamp-1 break-words' : 'line-clamp-2'} max-w-full overflow-hidden`}>
                  {product.description}
                </p>
              )}
            </div>

            {/* Price and Action */}
            <div className={`flex-shrink-0 text-right ${isMobile ? 'ml-2' : 'ml-4'} ${isMobile ? 'min-w-0' : ''}`}>
              <div className={`flex items-end ${isMobile ? 'justify-end flex-wrap' : 'justify-center'} gap-0.5 mb-1`} style={{ color: store.themeColor || '#E11D48' }}>
                <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>{store.currency || 'Gs.'}</span>
                <div className="flex items-start">
                  {(() => {
                    const price = Number(product.price || 0);
                    const integerPart = Math.floor(price);
                    const decimalPart = Math.round((price - integerPart) * 100);
                    return (
                      <>
                        <span className={`${isMobile ? 'text-lg' : 'text-xl md:text-2xl'} font-bold`}>
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
                  className={`${isMobile ? 'text-xs py-1 px-2' : 'text-xs py-1 px-3'} font-medium rounded-full border transition-all hover:scale-105`}
                  style={{ 
                    borderColor: store.themeColor || '#E11D48',
                    color: store.themeColor || '#E11D48',
                    background: `linear-gradient(135deg, transparent, ${store.themeColor || '#E11D48'}10)`
                  }}
                >
                  {isMobile ? 'Ver' : 'Ver loja'}
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
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold mr-3 shadow-lg cursor-pointer hover:scale-105 transition-transform"
              style={{ backgroundColor: store.themeColor || '#E11D48' }}
            >
              {store.logoUrl ? (
                <img 
                  src={store.logoUrl} 
                  alt={store.name}
                  className="rounded-full object-cover"
                  style={{ 
                    width: '3.75rem', 
                    height: '3.75rem',
                    filter: 'brightness(1.1) contrast(1.3) saturate(1.1)'
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement as HTMLElement;
                    if (parent) {
                      parent.innerHTML = `<span class="text-xl drop-shadow-sm">${store.name.charAt(0)}</span>`;
                    }
                  }}
                />
              ) : (
                <span className="text-xl drop-shadow-sm">{store.name.charAt(0)}</span>
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