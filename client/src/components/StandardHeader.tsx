import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation, Link } from "wouter";
import { Search, X, BarChart3, User, Settings, ShoppingCart, LogOut } from "lucide-react";
import AssistantBarInline from "@/components/AssistantBarInline";

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

  // Sistema de frases animadas com IA
  const [currentText, setCurrentText] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [robotAnimation, setRobotAnimation] = useState("");

  // Buscar frases engraçadas da IA
  const { data: aiPhrases } = useQuery({
    queryKey: ['/api/assistant/funny-phrases'],
    staleTime: 10 * 60 * 1000, // 10 minutos
    refetchInterval: 5 * 60 * 1000, // Atualizar a cada 5 minutos
  });

  // Frases fixas divertidas como fallback
  const fallbackPhrases = [
    "Vamos gastar fofinho? 💸",
    "Bora garimpar oferta? 💎", 
    "CDE te espera! 🛍️",
    "Que tal uma comprinha? 😍",
    "Paraguai te chama! 🇵🇾",
    "Oferta boa demais! 🔥",
    "Hora das compras! ⏰",
    "Vem pro paraíso das compras! 🏝️"
  ];

  const phrases = aiPhrases?.phrases || fallbackPhrases;

  // Typewriter effect
  const typeText = (text: string) => {
    // Cancelar typing anterior se estiver em progresso
    if (typewriterRef.current) {
      clearTimeout(typewriterRef.current);
    }
    
    setIsTyping(true);
    setDisplayText("");
    setRobotAnimation("animate-bounce");
    
    let i = 0;
    const type = () => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
        typewriterRef.current = setTimeout(type, 50);
      } else {
        setIsTyping(false);
        setRobotAnimation("animate-pulse");
        setTimeout(() => setRobotAnimation(""), 1000);
      }
    };
    type();
  };

  // Cancelar typing quando focar na busca
  const handleFocus = () => {
    setIsSearchFocused(true);
    if (typewriterRef.current) {
      clearTimeout(typewriterRef.current);
      setIsTyping(false);
      setRobotAnimation("");
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Retomar animação quando desfoca
  const handleBlur = () => {
    setIsSearchFocused(false);
  };

  useEffect(() => {
    if (phrases.length === 0) return;

    // Limpar interval anterior se existir
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Só iniciar se não estiver focado e sem texto
    if (!isSearchFocused && !searchInput) {
      let index = 0;
      intervalRef.current = setInterval(() => {
        const nextText = phrases[index];
        setCurrentText(nextText);
        typeText(nextText);
        index = (index + 1) % phrases.length;
      }, 4000);

      // Primeira frase se ainda não tiver
      if (!currentText && phrases.length > 0) {
        const firstText = phrases[0];
        setCurrentText(firstText);
        typeText(firstText);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (typewriterRef.current) {
        clearTimeout(typewriterRef.current);
      }
    };
  }, [phrases, isSearchFocused, searchInput]);

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
      // Verifica se o assistente está ativo antes de fazer busca normal
      const form = e.currentTarget.closest('form');
      if (form?.dataset.assistantActive) {
        return; // Deixa o assistente lidar com o Enter
      }
      handleSearch();
    }
  };


  return (
    <>
    {/* Componente inline do assistente */}
    <AssistantBarInline />
    
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
          
          {/* Barra de Busca com Click Assistant Integrado */}
          <form 
            className="flex-1 max-w-4xl relative" 
            onSubmit={(e) => { 
              e.preventDefault(); 
              // Verifica se o assistente está ativo antes de fazer busca normal
              if (e.currentTarget.dataset.assistantActive) {
                return; // Deixa o assistente lidar com o submit
              }
              handleSearch(); 
            }}
            data-anchor="search-form"
          >
            <div className="flex items-center gap-2 rounded-2xl px-4 py-2 bg-white shadow border">
              {/* Robozinho Animado */}
              <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white grid place-content-center text-xs relative overflow-hidden ${robotAnimation}`}>
                <div className="relative">
                  {/* Corpo do robô */}
                  <div className="w-5 h-5 bg-white rounded-sm relative">
                    {/* Olhinhos */}
                    <div className="absolute top-1 left-1 w-1 h-1 bg-indigo-600 rounded-full animate-pulse"></div>
                    <div className="absolute top-1 right-1 w-1 h-1 bg-indigo-600 rounded-full animate-pulse"></div>
                    {/* Boquinha */}
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-0.5 bg-indigo-400 rounded-full"></div>
                    {/* Anteninhas */}
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0.5 h-1 bg-yellow-400"></div>
                    <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
                  </div>
                </div>
              </div>
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyPress={handleKeyPress}
                placeholder={isSearchFocused || searchInput ? "Converse com o Click (ex.: iPhone 15 em CDE)" : (displayText || currentText)}
                className="flex-1 outline-none border-0 bg-transparent text-base shadow-none focus:ring-0 focus-visible:ring-0"
                data-testid="search-input"
              />
              <button 
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90" 
                data-testid="button-search-submit"
              >
                Enviar
              </button>
            </div>
          </form>
          

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