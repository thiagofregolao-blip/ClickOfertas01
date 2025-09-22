import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation, Link } from "wouter";
import { Search, X, BarChart3, User, Settings, ShoppingCart, LogOut } from "lucide-react";
import AssistantBar from "@/components/AssistantBar";

interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

const getCategoryIcon = (categorySlug: string) => {
  switch (categorySlug) {
    case 'celulares':
      return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
        <line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>;
    case 'perfumes':
      return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12z"/>
        <path d="M12 6v6l4 2"/>
      </svg>;
    case 'notebooks':
      return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>;
    case 'tvs':
      return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
        <polyline points="17,2 12,7 7,2"/>
      </svg>;
    default:
      return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>;
  }
};

export default function StandardHeader() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  

  // Buscar categorias do backend
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Texto animado na barra de busca
  const [currentText, setCurrentText] = useState("");
  const searchTexts = [
    "Buscar produtos...",
    "Buscar lojas...", 
    "Encontrar ofertas...",
    "Comparar preços..."
  ];

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setCurrentText(searchTexts[index]);
      index = (index + 1) % searchTexts.length;
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCategoryFilter = (categorySlug: string | null) => {
    setSelectedCategory(categorySlug);
    // Redirecionar para a página principal com filtro
    if (categorySlug) {
      setLocation(`/cards?category=${categorySlug}`);
    } else {
      setLocation('/cards');
    }
  };

  const handleSearch = () => {
    if (searchInput.trim()) {
      setLocation(`/cards?search=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };


  return (
    <>
    <div className="sticky top-0 z-50" style={{background: 'linear-gradient(to bottom right, #F04940, #FA7D22)'}}>
      {/* Desktop: Layout original */}
      <div className={`py-4 px-2 ml-[5%]`}>
        {/* Logo e Barra de Busca - PRIMEIRO */}
        <div className="flex items-center gap-4 mb-6">
          {/* Título */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-white font-bold text-2xl tracking-normal" style={{textShadow: '0 1px 2px rgba(0,0,0,0.1)', fontWeight: '700'}}>Click</span>
            <span className="font-bold text-2xl tracking-normal">
              <span className="text-white">Ofertas.</span>
              <span style={{color: '#FFE600'}}>PY</span>
            </span>
          </div>

          {/* Botão Comparar Preços */}
          <Link href="/price-comparison">
            <Button
              variant="outline"
              size="sm"
              className="border-2 text-black font-semibold hover:opacity-90 backdrop-blur-sm"
              style={{ backgroundColor: '#FFE600', borderColor: '#FFE600' }}
              data-testid="button-price-comparison"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Comparar Preços
            </Button>
          </Link>
          
          {/* Click Pro Assistant Bar - A BARRA É O ASSISTENTE */}
          <div className="flex-1 max-w-4xl">
            <AssistantBar />
          </div>
          

          {/* Sino de notificações - Desktop */}
          <button
            className="bg-white/90 backdrop-blur-sm text-gray-600 hover:text-orange-500 p-2 rounded-lg shadow-sm transition-colors relative"
            title="Notificações"
            data-testid="button-notifications-desktop"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
            {/* Badge de notificação */}
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              3
            </span>
          </button>
        </div>

        {/* Menu de Navegação - SEGUNDO */}
        <div className="flex items-center justify-start gap-3 -ml-2">
          
          {/* Botão temporário de acesso Super Admin */}
          <button
            onClick={() => {
              window.location.href = '/super-admin-login';
            }}
            className="fixed bottom-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50 hidden lg:block"
          >
            🔧 Super Admin
          </button>
          
          {isAuthenticated ? (
            // Desktop - menu na mesma linha
            <div className="flex items-center gap-4">
              {/* Saudação */}
              <div className="text-white font-medium flex items-center gap-2">
                <User className="w-5 h-5" />
                <span className="text-sm">
                  Olá, {user?.firstName || user?.fullName || user?.email?.split('@')[0] || 'Usuário'}
                </span>
              </div>
              
              {/* Botões do menu */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setLocation('/settings')}
                  className="text-white hover:text-gray-200 font-medium flex items-center gap-1 text-sm"
                  data-testid="button-user-config"
                >
                  <Settings className="w-4 h-4" />
                  Configurações
                </button>
                
                <button
                  onClick={() => setLocation('/shopping-list')}
                  className="text-white hover:text-gray-200 font-medium flex items-center gap-1 text-sm"
                  data-testid="button-shopping-list"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Lista de Compras
                </button>
                
                <button
                  onClick={() => setLocation('/my-coupons')}
                  className="text-white hover:text-gray-200 font-medium flex items-center gap-1 text-sm"
                  data-testid="button-my-coupons"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="18" rx="2" ry="2"/>
                    <line x1="8" y1="2" x2="8" y2="22"/>
                    <line x1="16" y1="2" x2="16" y2="22"/>
                  </svg>
                  Meus Cupons
                </button>

                {/* Separador visual */}
                <span className="text-gray-400 text-sm">|</span>
                
                {/* Botão "Todos" */}
                <button
                  onClick={() => handleCategoryFilter(null)}
                  className={`font-medium flex items-center gap-1 text-sm px-2 py-1 rounded transition-colors ${
                    selectedCategory === null
                      ? 'bg-yellow-400 text-gray-900 shadow-sm'
                      : 'text-white hover:text-gray-200'
                  }`}
                  data-testid="button-category-todos-desktop"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                  Todos
                </button>
                
                {/* Categorias Dinâmicas do Backend */}
                {categoriesLoading ? (
                  <div className="text-white/70 text-sm">Carregando categorias...</div>
                ) : (
                  categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryFilter(category.slug)}
                      className={`font-medium flex items-center gap-1 text-sm px-2 py-1 rounded transition-colors ${
                        selectedCategory === category.slug || selectedCategory === category.name
                          ? 'bg-yellow-400 text-gray-900 shadow-sm'
                          : 'text-white hover:text-gray-200'
                      }`}
                      data-testid={`button-category-${category.slug}`}
                    >
                      {getCategoryIcon(category.slug)}
                      {category.name}
                    </button>
                  ))
                )}
                
                <button
                  onClick={() => window.location.href = '/api/auth/logout'}
                  className="text-red-300 hover:text-red-100 font-medium flex items-center gap-1 text-sm"
                  data-testid="button-user-logout"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            </div>
          ) : (
            // Usuário não logado - mostrar botão entrar
            <button
              onClick={() => window.location.href = '/'}
              className="text-white hover:text-gray-200 font-medium flex items-center gap-1"
              data-testid="button-user-login"
            >
              <User className="w-4 h-4" />
              Entrar
            </button>
          )}

        </div>
      </div>
    </div>

    </>
  );
}