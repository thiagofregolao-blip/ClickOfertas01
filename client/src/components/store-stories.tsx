import type { StoreWithProducts } from "@shared/schema";

// Componente Stories das Lojas (estilo Instagram)
export function StoreStoriesSection({ stores }: { stores: StoreWithProducts[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="bg-white border-b">
      <div className="overflow-x-auto scrollbar-hide py-4">
        <div className="flex space-x-4 px-4" style={{ width: 'max-content' }}>
          {stores.map((store) => {
            // Verificar se postou hoje
            const hasNewToday = store.products.some(product => {
              if (!product.updatedAt) return false;
              const productDate = new Date(product.updatedAt);
              productDate.setHours(0, 0, 0, 0);
              return productDate.getTime() === today.getTime() && product.isActive;
            });

            return (
              <div key={store.id} className="flex flex-col items-center space-y-2">
                <div className="relative">
                  {/* Anel animado para lojas ativas hoje */}
                  {hasNewToday && (
                    <div className="absolute inset-0 rounded-full animate-spin" style={{
                      background: `linear-gradient(45deg, ${store.themeColor || '#E11D48'}, #FF6B6B, #4ECDC4, ${store.themeColor || '#E11D48'})`,
                      padding: '3px'
                    }}>
                      <div className="w-full h-full rounded-full bg-white"></div>
                    </div>
                  )}
                  
                  {/* Avatar da loja */}
                  <div 
                    className={`relative w-16 h-16 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${hasNewToday ? 'ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: store.themeColor || '#E11D48' }}
                  >
                    {store.logoUrl ? (
                      <img 
                        src={store.logoUrl} 
                        alt={store.name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xl">{store.name.charAt(0)}</span>
                    )}
                  </div>
                </div>
                
                {/* Nome da loja */}
                <span className="text-xs font-medium text-gray-800 text-center max-w-16 truncate">
                  {store.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}