import { Link, useLocation } from "wouter";
import type { StoreWithProducts } from "@shared/schema";

// Componente Stories das Lojas (estilo Instagram)
export function StoreStoriesSection({ stores, isMobile }: { stores: StoreWithProducts[], isMobile?: boolean }) {
  const [, setLocation] = useLocation();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="bg-white border-b">
      <div className={`mx-auto ${isMobile ? 'max-w-2xl' : 'max-w-4xl'}`}>
        <div className="overflow-x-auto scrollbar-hide py-4">
          <div className="flex space-x-4 px-4" style={{ width: 'max-content' }}>
          {stores.map((store) => {
            // Verificar produtos nos stories
            const storiesProducts = store.products.filter(product => 
              product.showInStories && product.isActive
            );
            const hasStoriesProducts = storiesProducts.length > 0;
            const storiesCount = storiesProducts.length;

            return (
              <div
                key={store.id}
                className="flex flex-col items-center space-y-2 cursor-pointer hover:scale-105 transition-transform"
                onClick={(e) => {
                  if (hasStoriesProducts) {
                    // Captura a posição do logo para animação
                    const rect = e.currentTarget.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    
                    // Armazena posição no sessionStorage
                    sessionStorage.setItem('storiesOrigin', JSON.stringify({
                      x: centerX,
                      y: centerY,
                      slug: store.slug
                    }));
                    
                    // Navega para os stories instantaneamente
                    setLocation(`/stores/${store.slug}`);
                  }
                }}
              >
                <div className="relative">
                    {/* Anel segmentado igual WhatsApp */}
                    {hasStoriesProducts && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                          {storiesCount === 1 ? (
                            // 1 story = círculo completo
                            <circle
                              cx="50"
                              cy="50"
                              r="48"
                              fill="none"
                              stroke={store.themeColor || '#E11D48'}
                              strokeWidth="3"
                              className="animate-pulse"
                            />
                          ) : (
                            // Múltiplos stories = segmentos divididos
                            Array.from({ length: storiesCount }, (_, index) => {
                              const segmentAngle = 360 / storiesCount;
                              const startAngle = index * segmentAngle;
                              const endAngle = startAngle + segmentAngle - 3; // -3 para gap entre segmentos
                              
                              // Converter ângulos para coordenadas do arco SVG
                              const startX = 50 + 48 * Math.cos((startAngle * Math.PI) / 180);
                              const startY = 50 + 48 * Math.sin((startAngle * Math.PI) / 180);
                              const endX = 50 + 48 * Math.cos((endAngle * Math.PI) / 180);
                              const endY = 50 + 48 * Math.sin((endAngle * Math.PI) / 180);
                              
                              const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
                              
                              return (
                                <path
                                  key={index}
                                  d={`M ${startX} ${startY} A 48 48 0 ${largeArcFlag} 1 ${endX} ${endY}`}
                                  fill="none"
                                  stroke={store.themeColor || '#E11D48'}
                                  strokeWidth="3"
                                  opacity={0.9}
                                  className="animate-pulse"
                                  style={{ animationDelay: `${index * 0.2}s` }}
                                />
                              );
                            })
                          )}
                        </svg>
                      </div>
                    )}
                    
                    {/* Avatar da loja */}
                    <div 
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white font-bold shadow-lg ring-4 ${hasStoriesProducts ? 'ring-white' : 'ring-opacity-30'}`}
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