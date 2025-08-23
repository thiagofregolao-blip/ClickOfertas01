import { useState, useEffect } from "react";
import type { StoreWithProducts } from "@shared/schema";

// Função para embaralhar array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Componente Stories das Lojas (estilo Instagram)
export function StoreStoriesSection({ stores, isMobile }: { stores: StoreWithProducts[], isMobile?: boolean }) {
  const [shuffledStores, setShuffledStores] = useState<StoreWithProducts[]>(stores);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Embaralhar lojas a cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setShuffledStores(shuffleArray(stores));
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [stores]);

  // Embaralhar na primeira renderização
  useEffect(() => {
    setShuffledStores(shuffleArray(stores));
  }, [stores]);

  return (
    <div className="bg-white border-b">
      <div className={`mx-auto ${isMobile ? 'max-w-2xl' : 'max-w-4xl'}`}>
        <div className="overflow-x-auto scrollbar-hide py-4">
          <div className="flex space-x-4 px-4" style={{ width: 'max-content' }}>
          {shuffledStores.map((store) => {
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
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white font-bold shadow-lg ring-4 ${hasNewToday ? 'ring-white' : 'ring-opacity-30'}`}
                    style={{ 
                      backgroundColor: store.themeColor || '#E11D48',
                      '--tw-ring-color': store.themeColor || '#E11D48'
                    } as React.CSSProperties}
                  >
                    {store.logoUrl ? (
                      <img 
                        src={store.logoUrl} 
                        alt={store.name}
                        className="w-18 h-18 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement as HTMLElement;
                          if (parent) {
                            parent.innerHTML = `<span class="text-2xl">${store.name.charAt(0)}</span>`;
                          }
                        }}
                      />
                    ) : (
                      <span className="text-2xl">{store.name.charAt(0)}</span>
                    )}
                  </div>
                </div>
                
                {/* Nome da loja */}
                <span className="text-xs font-medium text-gray-800 text-center max-w-20 truncate">
                  {store.name}
                </span>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}