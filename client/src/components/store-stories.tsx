import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { User, Plus } from "lucide-react";
import type { StoreWithProducts } from "@shared/schema";

// Componente Stories das Lojas (estilo Instagram)
export function StoreStoriesSection({ stores, isMobile }: { stores: StoreWithProducts[], isMobile?: boolean }) {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="bg-white border-b">
      <div className={`mx-auto ${isMobile ? 'max-w-2xl' : 'max-w-4xl'}`}>
        <div className="overflow-x-auto scrollbar-hide py-4">
          <div className="flex space-x-6 px-4" style={{ width: 'max-content' }}>
          
          {/* Usuário Logado - Primeiro Item */}
          {isAuthenticated && user && (
            <div className="flex flex-col items-center space-y-2">
              <div className="relative">
                {/* Avatar do usuário */}
                <div 
                  className="relative w-20 h-20 rounded-full flex items-center justify-center text-white font-bold shadow-lg ring-4 ring-blue-500 bg-gradient-to-br from-blue-500 to-purple-600 cursor-pointer hover:scale-105 transition-transform"
                >
                  {user.profileImageUrl ? (
                    <img 
                      src={user.profileImageUrl} 
                      alt="Meu Perfil"
                      className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement as HTMLElement;
                        if (parent) {
                          parent.innerHTML = `<div class="w-8 h-8 text-white flex items-center justify-center"><svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>`;
                        }
                      }}
                    />
                  ) : (
                    <User className="w-8 h-8" />
                  )}
                </div>
                
                {/* Ícone de "+" para adicionar story */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                  <Plus className="w-3 h-3 text-white" />
                </div>
              </div>
              
              {/* Nome do usuário */}
              <span className="text-xs font-medium text-gray-800 text-center max-w-20 truncate">
                {user.firstName || user.fullName || 'Você'}
              </span>
            </div>
          )}
          
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
                    {/* Círculo estilo WhatsApp */}
                    {hasStoriesProducts && (
                      <div 
                        className="absolute -inset-2 rounded-full border-2 animate-pulse"
                        style={{
                          borderColor: store.themeColor || '#E11D48'
                        }}
                      />
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