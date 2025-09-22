import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation, Link } from "wouter";
import { Search, X, BarChart3, User, Settings, ShoppingCart, LogOut, Bot, Sparkles, Send, MessageCircle } from "lucide-react";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  
  // Click Pro Assistant states
  const [isAssistantExpanded, setIsAssistantExpanded] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  
  // Use assistant chat hook
  const {
    messages,
    sendMessage: sendChatMessage,
    isStreaming,
    isSending,
    sessionId,
    sessionLoading,
    personalizedGreeting
  } = useAssistantChat({ autoCreateSession: true });

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
      // If assistant is expanded, send message to assistant
      if (isAssistantExpanded && searchInput.trim()) {
        e.preventDefault();
        handleSendAssistantMessage();
      } else {
        // Otherwise, do regular search
        handleSearch();
      }
    }
  };

  // Handle assistant expansion when user starts typing
  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    setAssistantInput(value);
    
    // Expand assistant if user types something
    if (value.trim() && !isAssistantExpanded) {
      setIsAssistantExpanded(true);
    }
  };

  // Send message to assistant
  const handleSendAssistantMessage = () => {
    const messageText = assistantInput.trim() || searchInput.trim();
    if (!messageText || isSending || isStreaming || !sessionId) return;
    
    sendChatMessage(messageText);
    setAssistantInput('');
    setSearchInput('');
  };

  // Handle assistant keypress
  const handleAssistantKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAssistantMessage();
    }
  };


  // Get product recommendations using React Query
  const { data: recommendationsData, isLoading: recommendationsLoading } = useQuery({
    queryKey: ['assistant', 'recommendations', sessionId, messages.length],
    queryFn: async () => {
      if (!sessionId || messages.length === 0) return { products: [] };
      
      const chatContext = messages.map(msg => msg.content);
      const response = await fetch('/api/assistant/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId,
          context: chatContext,
          limit: 6 
        })
      });
      
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      return await response.json();
    },
    enabled: !!sessionId && messages.length > 0 && !isStreaming,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Update local state when recommendations change
  useEffect(() => {
    if (recommendationsData?.products) {
      setRecommendedProducts(recommendationsData.products);
    }
  }, [recommendationsData]);

  return (
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
          
          {/* Barra de Busca */}
          <div className="flex-1 max-w-4xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={isSearchFocused || searchInput ? "Digite algo para conversar com o Click Pro Assistant..." : currentText}
                value={searchInput}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 100)}
                onKeyPress={handleKeyPress}
                className="pl-10 pr-20 py-2 w-full bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-blue-200"
                data-testid="input-search-assistant"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                {searchInput && (
                  <button
                    onMouseDown={() => setSearchInput('')}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    title="Limpar busca"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onMouseDown={handleSearch}
                  disabled={!searchInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-1 rounded transition-colors"
                  title="Buscar"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Click Pro Assistant Expandido */}
          {isAssistantExpanded && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 max-w-7xl mx-auto" 
                 style={{ minHeight: '400px', maxHeight: '600px' }}>
              
              {/* Header do Assistant */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Click Pro Assistant</h3>
                    <p className="text-sm text-slate-600">Seu assistente de compras inteligente</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAssistantExpanded(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  data-testid="button-close-assistant"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Layout de 2 colunas */}
              <div className="flex h-full">
                
                {/* Coluna do Chat - Esquerda */}
                <div className="flex-1 flex flex-col border-r border-gray-200">
                  
                  {/* Messages Area */}
                  <ScrollArea className="flex-1 p-4" style={{ height: '300px' }}>
                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          <Bot className="w-12 h-12 mx-auto mb-3 text-purple-400" />
                          <p className="text-lg font-medium">
                            {personalizedGreeting || "Olá! Como posso ajudar você hoje?"}
                          </p>
                          <p className="text-sm">Digite algo como "quero um iPhone barato" ou "preciso de um notebook para estudar"</p>
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex gap-3 ${
                              message.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {message.role === 'assistant' && (
                              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <Bot className="h-4 w-4 text-white" />
                              </div>
                            )}
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                message.role === 'user'
                                  ? 'bg-blue-500 text-white ml-auto'
                                  : 'bg-slate-100 text-slate-900'
                              }`}
                            >
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {message.content}
                                {message.isStreaming && <span className="animate-pulse">|</span>}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  {/* Input Area */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Digite sua mensagem..."
                        value={assistantInput}
                        onChange={(e) => setAssistantInput(e.target.value)}
                        onKeyPress={handleAssistantKeyPress}
                        disabled={isSending || isStreaming}
                        className="flex-1"
                        data-testid="input-assistant-message"
                      />
                      <Button
                        onClick={handleSendAssistantMessage}
                        disabled={!assistantInput.trim() || isSending || isStreaming || !sessionId || sessionLoading}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        data-testid="button-send-assistant-message"
                      >
                        {isSending || isStreaming ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Coluna de Produtos Recomendados - Direita */}
                <div className="w-80 p-4">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Produtos Recomendados
                  </h4>
                  
                  {recommendationsLoading ? (
                    <div className="text-center text-gray-500 py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                      </div>
                      <p className="text-sm">Procurando os melhores produtos para você...</p>
                    </div>
                  ) : recommendedProducts.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm">Converse comigo e eu vou recomendar os melhores produtos para você!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {recommendedProducts.slice(0, 6).map((product, index) => (
                        <Card key={product.id || index} className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-3">
                            <div className="aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden">
                              {product.images && product.images[0] && (
                                <img 
                                  src={product.images[0]} 
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <h5 className="font-medium text-xs text-slate-900 line-clamp-2 mb-1">
                              {product.name}
                            </h5>
                            <p className="text-orange-600 font-bold text-sm">
                              {product.currency || 'R$'} {product.price}
                            </p>
                            {product.storeName && (
                              <p className="text-xs text-gray-500 mt-1">{product.storeName}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
            className="fixed bottom-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50"
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
  );
}