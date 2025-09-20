import { useState, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Brain } from "lucide-react";
import { useScrollDetection } from "@/hooks/use-scroll-detection";

interface TwoPartHeaderProps {
  // Primeira parte - Header superior
  title?: string;
  titleComponent?: ReactNode;
  showSearch?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  onSearchFocus?: () => void;
  onSearchBlur?: () => void;
  showNotifications?: boolean;
  notificationCount?: number;
  onNotificationClick?: () => void;
  searchMode?: 'intelligent' | 'traditional';
  
  // Segunda parte - Menu deslizante
  children?: ReactNode;
  
  
  // Personalização visual
  gradient?: string;
  className?: string;
  
  // Controle do scroll
  scrollThreshold?: number;
  
  // Altura da primeira parte (para posicionar a segunda)
  headerHeight?: number;
}

/**
 * Componente reutilizável TwoPartHeader com header fixo e menu deslizante
 * Baseado na implementação do stores-gallery.tsx
 */
export function TwoPartHeader({
  title = "Click Ofertas.PY",
  titleComponent,
  showSearch = true,
  searchValue = "",
  searchPlaceholder = "Buscar produtos ou lojas...",
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  showNotifications = true,
  notificationCount = 0,
  onNotificationClick,
  searchMode = 'traditional',
  children,
  gradient = "linear-gradient(135deg, #F04940 0%, #FA7D22 100%)",
  className = "",
  scrollThreshold = 100,
  headerHeight = 72
}: TwoPartHeaderProps) {
  
  const [searchInput, setSearchInput] = useState(searchValue);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const { isVisible: isMenuVisible } = useScrollDetection({ 
    threshold: scrollThreshold 
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    onSearchChange?.(value);
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    onSearchFocus?.();
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    onSearchBlur?.();
  };

  const clearSearch = () => {
    setSearchInput('');
    onSearchChange?.('');
  };


  return (
    <>
      {/* PARTE 1: Header superior fixo (sempre visível) */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 ${className}`}
        style={{ background: gradient }}
      >
        <div className="py-4 px-2 ml-[5%]">
          {/* Logo e Barra de Busca */}
          <div className="flex items-center gap-4">
            
            {/* Título customizável */}
            {titleComponent || (
              <div className="flex items-center gap-1 flex-shrink-0">
                <span 
                  className="text-white font-bold text-2xl tracking-normal" 
                  style={{
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)', 
                    fontWeight: '700'
                  }}
                >
                  {title.split('.')[0]}
                </span>
                {title.includes('.') && (
                  <span className="font-bold text-2xl tracking-normal">
                    <span className="text-white">.</span>
                    <span style={{color: '#FFE600'}}>
                      {title.split('.')[1]}
                    </span>
                  </span>
                )}
              </div>
            )}
            
            {/* Barra de Busca */}
            {showSearch && (
              <div className="flex-1 max-w-4xl">
                <div className="relative">
                  {searchMode === 'intelligent' ? (
                    <Brain className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-4 h-4" title="Busca Inteligente IA" />
                  ) : (
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  )}
                  <Input
                    placeholder={searchPlaceholder}
                    value={searchInput}
                    onChange={handleSearchChange}
                    onFocus={handleSearchFocus}
                    onBlur={handleSearchBlur}
                    className="pl-10 pr-10 py-2 w-full bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-blue-200"
                    data-testid="header-search-input"
                  />
                  {searchInput && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Limpar busca"
                      data-testid="clear-search-button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Botão de Saudação */}
            <button
              className="bg-white/90 backdrop-blur-sm text-gray-600 hover:text-blue-500 px-3 py-2 rounded-lg shadow-sm transition-colors font-medium"
              title="Saudação"
              data-testid="greeting-button"
            >
              <span className="text-sm">👋 Olá!</span>
            </button>


            {/* Sino de notificações */}
            {showNotifications && (
              <button
                onClick={onNotificationClick}
                className="bg-white/90 backdrop-blur-sm text-gray-600 hover:text-orange-500 p-2 rounded-lg shadow-sm transition-colors relative"
                title="Notificações"
                data-testid="notifications-button"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                </svg>
                {/* Badge de notificação */}
                {notificationCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                    data-testid="notification-badge"
                  >
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PARTE 2: Menu de navegação (deslizante) */}
      {children && (
        <div 
          className={`fixed left-0 right-0 z-40 transition-transform duration-300 ease-in-out ${
            isMenuVisible ? 'translate-y-0' : '-translate-y-full'
          }`}
          style={{
            top: `${headerHeight}px`,
            background: gradient
          }}
          data-testid="sliding-menu"
        >
          <div className="py-3 px-2 ml-[5%]">
            <div className="flex items-center justify-start gap-3 -ml-2">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}