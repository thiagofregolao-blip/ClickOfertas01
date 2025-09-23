import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation, Link } from "wouter";
import { Search, X, BarChart3, User, Settings, ShoppingCart, LogOut } from "lucide-react";
import AssistantBar from "@/components/AssistantBar";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  

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
  const [phraseIndex, setPhraseIndex] = useState(0);

  // Buscar frases engraçadas da IA
  const { data: aiPhrases, isLoading: phrasesLoading, error: phrasesError } = useQuery<{phrases: string[], context: string}>({
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
    
    // Disparar evento para o AssistantBar escutar
    window.dispatchEvent(new CustomEvent('assistant:focus', { 
      detail: { source: 'header', query: searchInput } 
    }));
  };

  // Retomar animação quando desfoca
  const handleBlur = () => {
    setIsSearchFocused(false);
  };

  // Teste básico forçado - sempre rodar
  useEffect(() => {
    // Forçar primeira frase imediatamente 
    setCurrentText("Teste de animação funcionando!");
    setDisplayText("");
    
    let i = 0;
    const testText = "Teste de animação funcionando!";
    const typeInterval = setInterval(() => {
      if (i < testText.length) {
        setDisplayText(testText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typeInterval);
      }
    }, 50);
    
    return () => clearInterval(typeInterval);
  }, []); // Executa apenas uma vez

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Disparar evento para o AssistantBar processar
      window.dispatchEvent(new CustomEvent('assistant:submit', { 
        detail: { source: 'header', query: searchInput.trim() } 
      }));
    }
  };


  return (
    <>
    {/* Componente completo do assistente */}
    <AssistantBar />
    
    <div className="sticky top-0 z-50" style={{background: 'linear-gradient(to bottom right, #F04940, #FA7D22)'}}>
      <div className={`py-4 px-2 ${isMobile ? 'px-4' : 'ml-[5%]'}`}>
        
        {/* Segunda linha: Barra de Busca (Mobile abaixo, Desktop na linha anterior) */}
        {isMobile && (
          <div className="mb-2">
            <form 
              className="w-full relative" 
              onSubmit={(e) => { 
                e.preventDefault(); 
                window.dispatchEvent(new CustomEvent('assistant:submit', { 
                  detail: { source: 'header', query: searchInput.trim() } 
                }));
              }}
              data-anchor="search-form"
            >
              <div className="flex items-center gap-2 rounded-2xl px-4 py-2 bg-white shadow border">
                {/* Robozinho Animado */}
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white grid place-content-center text-xs relative overflow-hidden ${robotAnimation}`}>
                  <div className="relative">
                    <div className="w-5 h-5 bg-white rounded-sm relative">
                      <div className="absolute top-1 left-1 w-1 h-1 bg-indigo-600 rounded-full animate-pulse"></div>
                      <div className="absolute top-1 right-1 w-1 h-1 bg-indigo-600 rounded-full animate-pulse"></div>
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-0.5 bg-indigo-400 rounded-full"></div>
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
                  onKeyDown={handleKeyDown}
                  placeholder={isSearchFocused || searchInput ? "Converse com o Click" : (displayText || "TESTE FORCADO!")}
                  className="flex-1 outline-none border-0 bg-transparent text-base shadow-none focus:ring-0 focus-visible:ring-0"
                  data-testid="search-input"
                />
                <button 
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('assistant:submit', { 
                      detail: { source: 'header', query: searchInput.trim() } 
                    }));
                  }}
                  className="px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90" 
                  data-testid="button-search-submit"
                >
                  Enviar
                </button>
              </div>
            </form>
          </div>
        )}
        

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