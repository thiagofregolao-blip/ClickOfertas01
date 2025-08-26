import { useLocation } from "wouter";
import type { StoreWithProducts, Product } from "@shared/schema";

// Função para limitar nome a duas palavras no mobile
function limitStoreName(name: string, isMobile: boolean): string {
  if (!isMobile) return name;
  const words = name.split(' ');
  return words.slice(0, 2).join(' ');
}

interface StoreResultItemProps {
  store: StoreWithProducts;
  searchQuery: string;
  isMobile?: boolean;
  onProductClick?: (product: Product) => void;
}

export function StoreResultItem({ 
  store, 
  searchQuery,
  isMobile = false,
  onProductClick
}: StoreResultItemProps) {
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
            <span>{limitStoreName(store.name, isMobile)}</span>
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