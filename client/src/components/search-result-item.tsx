import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { LazyImage } from "@/components/lazy-image";
import { useAnalytics } from "@/hooks/useAnalytics";
import type { StoreWithProducts, Product } from "@shared/schema";

// Função para limitar nome a duas palavras no mobile
function limitStoreName(name: string, isMobile: boolean): string {
  if (!isMobile) return name;
  const words = name.split(' ');
  return words.slice(0, 2).join(' ');
}

interface SearchResultItemProps {
  product: Product & { store: StoreWithProducts };
  store: StoreWithProducts;
  onClick?: () => void;
  isMobile?: boolean;
  searchTerm?: string;
}

export function SearchResultItem({ 
  product, 
  store, 
  onClick,
  isMobile = false,
  searchTerm
}: SearchResultItemProps) {
  const { trackEvent, sessionToken } = useAnalytics();

  const handleClick = () => {
    // Capturar evento de clique em produto desde busca
    if (sessionToken && searchTerm) {
      trackEvent('searchClick', {
        sessionToken,
        productId: product.id,
        searchTerm
      });
    }

    // Capturar visualização de produto
    if (sessionToken) {
      trackEvent('productView', {
        sessionToken,
        productId: product.id,
        productName: product.name,
        category: product.category || undefined,
        price: product.price,
        storeId: store.id,
        source: searchTerm ? 'search' : 'direct'
      });
    }

    onClick?.();
  };
  return (
    <div 
      className={`${isMobile ? 'p-3' : 'p-4'} hover:bg-blue-50 hover:border-l-4 hover:border-blue-500 transition-all cursor-pointer border-l-4 border-transparent group`}
      onClick={handleClick}
      data-testid={`search-result-${product.id}`}
      title="Clique para ver detalhes do produto"
    >
      <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
        {/* Product Image */}
        <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} flex-shrink-0`}>
          <LazyImage
            src={product.imageUrl || '/api/placeholder/64/64'}
            alt={product.name}
            className="w-full h-full object-cover rounded-lg border"
            placeholder="📦"
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