import { useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, User, LogOut, ArrowLeft, Smartphone, Droplets, Laptop, Monitor, Grid } from "lucide-react";
import { useScrollDetection } from "@/hooks/use-scroll-detection";

// Exportar alturas para uso em outras páginas
export const HEADER_HEIGHT = 72;
export const MENU_HEIGHT = 56;
export const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + MENU_HEIGHT;

interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

// Função para obter ícone da categoria
function getCategoryIcon(slug: string) {
  switch (slug.toLowerCase()) {
    case 'celulares':
      return <Smartphone className="w-4 h-4" />;
    case 'perfumes':
      return <Droplets className="w-4 h-4" />;
    case 'notebooks':
      return <Laptop className="w-4 h-4" />;
    case 'tvs':
      return <Monitor className="w-4 h-4" />;
    default:
      return <Grid className="w-4 h-4" />;
  }
}

interface TwoPartHeaderProps {
  // Controle de variante
  variant?: 'full' | 'primaryOnly';
  
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
  
  // Props para autenticação
  isAuthenticated?: boolean;
  user?: { firstName?: string; fullName?: string; email?: string };
  onLogin?: () => void;
  onLogout?: () => void;
  
  // Props para navegação e categorias
  selectedCategory?: string | null;
  onCategorySelect?: (slug: string | null) => void;
  showBack?: boolean;
  onBack?: () => void;
  
  // Segunda parte - Menu deslizante (compatibilidade)
  children?: ReactNode;
  
  // Personalização visual
  gradient?: string;
  className?: string;
  
  // Controle do scroll
  scrollThreshold?: number;
  
  // Altura da primeira parte (para posicionar a segunda) - mantida para compatibilidade
  headerHeight?: number;
}

/**
 * Componente reutilizável TwoPartHeader com header fixo e menu deslizante
 * 
 * MELHORIAS IMPLEMENTADAS:
 * - Suporte a variants: 'full' (header + categorias) ou 'primaryOnly' (só header)
 * - Integração automática com API de categorias via useQuery
 * - Renderização automática das categorias no menu deslizante
 * - Suporte a botão voltar e navegação de categorias
 * - Espaçamento consistente e alturas exportadas
 * - Data-testids adequados para todos os elementos
 * - Compatibilidade mantida com uso atual
 */
export function TwoPartHeader({
  variant = 'full',
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
  isAuthenticated = false,
  user,
  onLogin,
  onLogout,
  selectedCategory = null,
  onCategorySelect,
  showBack = false,
  onBack,
  children,
  gradient = "linear-gradient(135deg, #F04940 0%, #FA7D22 100%)",
  className = "",
  scrollThreshold = 100,
  headerHeight = HEADER_HEIGHT
}: TwoPartHeaderProps) {
  
  const [searchInput, setSearchInput] = useState(searchValue);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const { isVisible: isMenuVisible } = useScrollDetection({ 
    threshold: scrollThreshold 
  });

  // Buscar categorias ativas do backend (só quando variant é 'full')
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false,
    enabled: variant === 'full', // Só busca quando é variant full
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
        style={{ 
          background: gradient,
          height: `${headerHeight}px`
        }}
        data-testid="header-primary"
      >
        <div className="py-4 px-2 ml-[5%]">
          {/* Logo e Barra de Busca */}
          <div className="flex items-center gap-4">
            
            {/* Título customizável */}
            {titleComponent || (
              <div className="flex items-center gap-1 flex-shrink-0" data-testid="header-logo">
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
                    <span className="text-white">.{title.split('.')[1]?.split(/(?=[A-Z])/)[0]}</span>
                    {title.split('.')[1]?.match(/[A-Z]+$/) && (
                      <span style={{color: '#FFE600'}}>
                        {title.split('.')[1].match(/[A-Z]+$/)?.[0]}
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}
            
            {/* Barra de Busca */}
            {showSearch && (
              <div className="flex-1 max-w-4xl" data-testid="header-search-container">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
            
            {/* Botão de Login/Logout */}
            <div data-testid="header-auth-section">
              {isAuthenticated ? (
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30">
                  <User className="w-4 h-4 text-white" />
                  {user && (
                    <span className="text-white text-sm font-medium" data-testid="user-display-name">
                      {user.firstName || user.fullName || user.email?.split('@')[0] || 'Usuário'}
                    </span>
                  )}
                  <Button
                    onClick={onLogout}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 p-1"
                    data-testid="logout-button"
                  >
                    <LogOut className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={onLogin}
                  variant="ghost"
                  size="sm"
                  className="bg-white/20 text-white hover:bg-white/30 border border-white/30 backdrop-blur-sm"
                  data-testid="login-button"
                >
                  <User className="w-4 h-4 mr-2" />
                  Entrar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PARTE 2: Menu de navegação (deslizante) */}
      {(variant === 'full' || children) && (
        <div 
          className={`fixed left-0 right-0 z-40 transition-transform duration-300 ease-in-out ${
            isMenuVisible ? 'translate-y-0' : '-translate-y-full'
          }`}
          style={{
            top: `${headerHeight}px`,
            background: gradient,
            minHeight: `${MENU_HEIGHT}px`
          }}
          data-testid="sliding-menu"
        >
          <div className="py-3 px-2 ml-[5%]">
            <div className="flex items-center justify-start gap-3 -ml-2">
              {/* Botão voltar (se habilitado) */}
              {showBack && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onBack}
                  className="text-white hover:bg-white/20 transition-colors flex-shrink-0"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              )}
              
              {/* Children customizados (para compatibilidade) */}
              {children}
              
              {/* Categorias automáticas (variant full sem children) */}
              {variant === 'full' && !children && (
                <>
                  {/* Botão "Todos" */}
                  <button
                    onClick={() => onCategorySelect?.(null)}
                    className={`font-medium flex items-center gap-1 text-sm px-3 py-1.5 rounded transition-colors flex-shrink-0 ${
                      selectedCategory === null || selectedCategory === 'all'
                        ? 'bg-yellow-400 text-gray-900 shadow-sm'
                        : 'text-white hover:text-gray-200 hover:bg-white/10'
                    }`}
                    data-testid="button-category-todos"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="m9 12 2 2 4-4"/>
                    </svg>
                    Todos
                  </button>
                  
                  {/* Categorias dinâmicas do backend */}
                  {categoriesLoading ? (
                    <div className="text-white/70 text-sm px-3 py-1.5" data-testid="categories-loading">
                      Carregando categorias...
                    </div>
                  ) : (
                    categories
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((category) => (
                        <button
                          key={category.id}
                          onClick={() => onCategorySelect?.(category.slug)}
                          className={`font-medium flex items-center gap-1 text-sm px-3 py-1.5 rounded transition-colors flex-shrink-0 ${
                            selectedCategory === category.slug || selectedCategory === category.name
                              ? 'bg-yellow-400 text-gray-900 shadow-sm'
                              : 'text-white hover:text-gray-200 hover:bg-white/10'
                          }`}
                          data-testid={`button-category-${category.slug}`}
                        >
                          {getCategoryIcon(category.slug)}
                          {category.name}
                        </button>
                      ))
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}