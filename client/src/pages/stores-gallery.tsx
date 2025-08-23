import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Star } from "lucide-react";
import ProductCard from "@/components/product-card";
import type { StoreWithProducts, Product } from "@shared/schema";

export default function StoresGallery() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: stores, isLoading } = useQuery<StoreWithProducts[]>({
    queryKey: ['/api/public/stores']
  });

  // Filtrar lojas por produtos que contenham o termo de busca
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
      {/* Header Style Instagram */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Panfletos</h1>
            <button
              onClick={() => window.location.href = '/'}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Início
            </button>
          </div>
          
          {/* Barra de Busca */}
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

      {/* Feed Vertical ou Resultados de Busca */}
      <div className="max-w-2xl mx-auto">
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
          filteredStores.map((store) => (
            <StorePost key={store.id} store={store} searchQuery={searchQuery} />
          ))
        )}
        
        {/* Footer do Feed */}
        {!searchQuery.trim() && (
          <div className="bg-white border-b p-6 text-center">
            <p className="text-gray-500">
              {filteredStores.length} {filteredStores.length === 1 ? 'loja disponível' : 'lojas disponíveis'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Desenvolvido com ❤️ para pequenos comércios do Paraguai
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

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

function StorePost({ store, searchQuery = '' }: { store: StoreWithProducts, searchQuery?: string }) {
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
      {/* Post Header */}
      <div className="px-4 py-3 flex items-center">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mr-3"
          style={{ backgroundColor: store.themeColor || '#E11D48' }}
        >
          {store.logoUrl ? (
            <img 
              src={store.logoUrl} 
              alt={store.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <span className="text-lg">{store.name.charAt(0)}</span>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center">
            <h3 className="font-bold text-gray-900 mr-2">{store.name}</h3>
            {featuredProducts.length > 0 && (
              <Badge className="text-xs bg-gradient-to-r from-red-500 to-orange-500 text-white border-none shadow-md animate-pulse">
                🔥 {featuredProducts.length} oferta{featuredProducts.length > 1 ? 's' : ''} imperdível{featuredProducts.length > 1 ? 'eis' : ''}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Products Horizontal Cards */}
      {displayProducts.length > 0 ? (
        <div className="px-4 pb-3">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {displayProducts.map((product) => (
              <div key={product.id} className="flex-shrink-0 w-32 sm:w-36 md:w-40">
                <ProductCard
                  product={product}
                  currency={store.currency || 'Gs.'}
                  themeColor={store.themeColor || '#E11D48'}
                  showFeaturedBadge={true}
                />
              </div>
            ))}
          </div>
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