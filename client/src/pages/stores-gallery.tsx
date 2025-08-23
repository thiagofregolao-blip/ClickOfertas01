import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import ProductCard from "@/components/product-card";
import type { StoreWithProducts } from "@shared/schema";

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

      {/* Feed Vertical */}
      <div className="max-w-2xl mx-auto">
        {searchQuery.trim() && filteredStores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              🔍 Nenhum produto encontrado para "{searchQuery}"
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Tente buscar por outro produto ou loja
            </p>
          </div>
        ) : (
          filteredStores.map((store) => (
            <StorePost key={store.id} store={store} />
          ))
        )}
        
        {/* Footer do Feed */}
        <div className="bg-white border-b p-6 text-center">
          <p className="text-gray-500">
            {filteredStores.length} {filteredStores.length === 1 ? 'loja disponível' : 'lojas disponíveis'}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Desenvolvido com ❤️ para pequenos comércios do Paraguai
          </p>
        </div>
      </div>
    </div>
  );
}

function StorePost({ store }: { store: StoreWithProducts }) {
  const activeProducts = store.products.filter(p => p.isActive);
  const featuredProducts = activeProducts.filter(p => p.isFeatured);
  
  // Priorizar produtos em destaque, depois os outros
  const sortedProducts = [...featuredProducts, ...activeProducts.filter(p => !p.isFeatured)];
  const displayProducts = sortedProducts.slice(0, 4); // Mostrar 4 produtos em destaque

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
          <style>{`
            .small-product-card { 
              height: 170px !important; 
              display: flex !important;
              flex-direction: column !important;
            }
            .small-product-card > div { 
              border-radius: 8px !important; 
              overflow: hidden !important;
              height: 100% !important;
              display: flex !important;
              flex-direction: column !important;
            }
            .small-product-card .product-image { 
              height: 85px !important; 
              object-fit: contain !important;
              background: white !important;
              border-radius: 8px !important;
              padding: 6px !important;
              margin: 4px !important;
              overflow: hidden !important;
              flex-shrink: 0 !important;
            }
            .small-product-card img { 
              border-radius: 6px !important;
              overflow: hidden !important;
            }
            .small-product-card .product-content { 
              padding: 6px 4px 4px 4px !important; 
              flex: 1 !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              min-height: 60px !important;
            }
            .small-product-card .product-title { 
              font-size: 9px !important; 
              line-height: 1.1 !important; 
              margin-bottom: 4px !important;
              display: -webkit-box !important;
              -webkit-line-clamp: 2 !important;
              -webkit-box-orient: vertical !important;
              overflow: hidden !important;
              text-align: center !important;
              flex: 1 !important;
            }
            .small-product-card .product-price { 
              font-size: 13px !important; 
              font-weight: bold !important;
              white-space: nowrap !important;
              overflow: visible !important;
            }
            .small-product-card .product-currency { 
              font-size: 10px !important;
              white-space: nowrap !important;
            }
            .small-product-card .category-icon { 
              width: 10px !important; 
              height: 10px !important; 
              bottom: 2px !important;
              left: 2px !important;
            }
            .small-product-card .featured-badge { 
              font-size: 9px !important; 
              padding: 1px 3px !important; 
              top: 2px !important;
              right: 2px !important;
            }
          `}</style>
          <div className="grid grid-cols-4 gap-2">
            {displayProducts.map((product) => (
              <div key={product.id} className="small-product-card">
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
              💰 Ver {activeProducts.length > 4 ? `+${activeProducts.length - 4} ofertas` : 'panfleto'}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}