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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <Skeleton className="h-8 w-64 mx-auto mb-2" />
            <Skeleton className="h-4 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="h-80">
                <Skeleton className="h-full" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stores || stores.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Nenhuma loja encontrada</h2>
          <p className="text-gray-600">Ainda não há panfletos disponíveis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Panfletos das Lojas
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Descubra as melhores ofertas das lojas locais. Clique em qualquer panfleto para ver todos os produtos e preços.
          </p>
        </div>

        {/* Stores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-500">
            Total de {stores.length} {stores.length === 1 ? 'loja' : 'lojas'} disponível
          </p>
        </div>
      </div>
    </div>
  );
}

function StoreCard({ store }: { store: StoreWithProducts }) {
  const activeProducts = store.products.filter(p => p.isActive);
  const featuredProducts = activeProducts.filter(p => p.isFeatured);
  const displayProducts = activeProducts.slice(0, 4); // Show max 4 products

  return (
    <Link href={`/flyer/${store.slug}`}>
      <Card className="group hover:shadow-lg transition-shadow duration-300 overflow-hidden cursor-pointer h-80">
        <CardContent className="p-0">
          {/* Store Header */}
          <div 
            className="h-16 flex items-center justify-center text-white font-bold text-lg px-4"
            style={{ backgroundColor: store.themeColor || '#E11D48' }}
          >
            {store.logoUrl ? (
              <img 
                src={store.logoUrl} 
                alt={store.name}
                className="max-h-10 max-w-full object-contain"
              />
            ) : (
              <span className="truncate">{store.name}</span>
            )}
          </div>

          {/* Products Preview */}
          <div className="p-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 truncate">
                {store.name}
              </h3>
              {featuredProducts.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {featuredProducts.length} destaque{featuredProducts.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Product Grid Preview */}
            {displayProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {displayProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className="bg-gray-100 rounded p-2 text-center relative"
                  >
                    {product.isFeatured && (
                      <div className="absolute -top-1 -right-1 text-red-500 text-xs">⭐</div>
                    )}
                    <div className="text-xs font-medium text-gray-800 line-clamp-2 mb-1">
                      {product.name}
                    </div>
                    <div className="text-sm font-bold" style={{ color: store.themeColor || '#E11D48' }}>
                      {store.currency} {Number(product.price).toLocaleString('es-PY')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Sem produtos ativos</p>
              </div>
            )}

            {/* Store Info */}
            <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
              <span>{activeProducts.length} produto{activeProducts.length !== 1 ? 's' : ''}</span>
              {store.whatsapp && (
                <span className="text-green-600">📱 WhatsApp</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}