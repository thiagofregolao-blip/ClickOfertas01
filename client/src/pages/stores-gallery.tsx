import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { StoreWithProducts } from "@shared/schema";

export default function StoresGallery() {
  const { data: stores, isLoading } = useQuery<StoreWithProducts[]>({
    queryKey: ['/api/public/stores']
  });

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
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Panfletos</h1>
            <button
              onClick={() => window.location.href = '/'}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Início
            </button>
          </div>
        </div>
      </div>

      {/* Feed Vertical */}
      <div className="max-w-2xl mx-auto">
        {stores.map((store) => (
          <StorePost key={store.id} store={store} />
        ))}
        
        {/* Footer do Feed */}
        <div className="bg-white border-b p-6 text-center">
          <p className="text-gray-500">
            {stores.length} {stores.length === 1 ? 'loja disponível' : 'lojas disponíveis'}
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
              <Badge variant="destructive" className="text-xs">
                {featuredProducts.length} destaque{featuredProducts.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {activeProducts.length} produto{activeProducts.length !== 1 ? 's' : ''} 
            {store.address && ` • ${store.address.split(',')[0]}`}
          </p>
        </div>
      </div>

      {/* Products Vertical List */}
      {displayProducts.length > 0 ? (
        <div className="pb-3">
          {displayProducts.map((product, index) => (
            <div key={product.id} className={`px-4 ${index < displayProducts.length - 1 ? 'mb-3' : ''}`}>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                {/* Product Image Placeholder */}
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs text-center">Sem<br/>imagem</span>
                  )}
                </div>
                
                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 mr-3">
                      <h4 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">
                        {product.name}
                      </h4>
                      {product.description && (
                        <p className="text-xs text-gray-600 line-clamp-1">
                          {product.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold" style={{ color: store.themeColor || '#E11D48' }}>
                        {store.currency} {Math.floor(Number(product.price) / 1000)}.{String(Math.floor((Number(product.price) % 1000) / 10)).padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Featured Badge */}
                {product.isFeatured && (
                  <div className="ml-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                    ⭐
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-gray-500">
          <p>Esta loja ainda não tem produtos ativos</p>
        </div>
      )}

      {/* View All Products Footer */}
      <div className="px-4 pb-3 border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{activeProducts.length} produtos total</span>
            {store.whatsapp && (
              <span className="text-green-600">📱 WhatsApp</span>
            )}
            {store.instagram && (
              <span className="text-pink-600">📸 Instagram</span>
            )}
          </div>
          
          <Link href={`/flyer/${store.slug}`}>
            <button 
              className="text-sm font-medium py-1 px-3 rounded-full border-2 transition-colors hover:bg-opacity-10"
              style={{ 
                borderColor: store.themeColor || '#E11D48',
                color: store.themeColor || '#E11D48'
              }}
            >
              Ver todos
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}