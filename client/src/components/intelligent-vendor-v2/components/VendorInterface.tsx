
import React, { useState, useRef, useEffect } from 'react';
import { VendorCore } from '../VendorCore';
import { ChatMessage, Product, VendorConfig } from '../types';
import { ProductGrid } from './ProductGrid';
import { ChatInterface } from './ChatInterface';
import { SearchBar } from './SearchBar';
import { Sparkles, ShoppingBag, TrendingUp, Zap } from 'lucide-react';

interface VendorInterfaceProps {
  sessionId?: string;
  userId?: string;
  config?: Partial<VendorConfig>;
  onProductClick?: (product: Product) => void;
  onClose?: () => void;
  className?: string;
}

export const VendorInterface: React.FC<VendorInterfaceProps> = ({
  sessionId,
  userId,
  config = {},
  onProductClick,
  onClose,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const vendorCore = VendorCore({
    sessionId,
    userId,
    config,
    onProductClick,
    onAnalyticsEvent: (event) => {
      console.log('📊 Analytics event:', event);
    }
  });

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll do chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [vendorCore.session?.messages, vendorCore.streamingMessage]);

  const handleSubmit = async (message: string) => {
    if (!message.trim()) return;
    
    setCurrentInput('');
    setShowSuggestions(false);
    await vendorCore.processUserMessage(message);
  };

  const handleProductClick = (product: Product) => {
    vendorCore.handleProductClick(product);
    onProductClick?.(product);
  };

  const getLastAssistantMessage = (): ChatMessage | null => {
    if (!vendorCore.session) return null;
    
    const assistantMessages = vendorCore.session.messages.filter(m => m.type === 'assistant');
    return assistantMessages[assistantMessages.length - 1] || null;
  };

  const getDisplayedProducts = (): Product[] => {
    const lastMessage = getLastAssistantMessage();
    return lastMessage?.products || [];
  };

  const suggestions = [
    "iPhone mais barato",
    "Drone com câmera",
    "Perfume masculino",
    "TV 55 polegadas",
    "Notebook gamer",
    "Tênis esportivo"
  ];

  if (!isOpen) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 group"
          title="Abrir Vendedor Inteligente V2"
        >
          <div className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline font-medium">Vendedor IA V2</span>
          </div>
          
          {/* Badge de novidade */}
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 animate-pulse">
            NOVO
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 ${className}`}>
      <div className="bg-white dark:bg-gray-900 w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-orange-500 text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 rounded-full p-2">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Vendedor Inteligente V2</h2>
                <p className="text-white/80 text-sm">
                  IA avançada para recomendações personalizadas
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Indicadores de status */}
              <div className="flex items-center space-x-1 bg-white/20 rounded-full px-3 py-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs">Online</span>
              </div>
              
              <button
                onClick={() => {
                  setIsOpen(false);
                  onClose?.();
                }}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/20 rounded-full"
              >
                ✕
              </button>
            </div>
          </div>
          
          {/* Stats rápidas */}
          <div className="flex items-center space-x-6 mt-4 text-sm">
            <div className="flex items-center space-x-1">
              <ShoppingBag className="h-4 w-4" />
              <span>Produtos: {getDisplayedProducts().length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-4 w-4" />
              <span>Sessão: {vendorCore.session?.messages.length || 0} msgs</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="h-4 w-4" />
              <span>Modo: {vendorCore.config.personality}</span>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Chat Lateral */}
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Sparkles className="h-4 w-4 mr-2 text-primary" />
                Conversa Inteligente
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Conte-me o que você procura
              </p>
            </div>
            
            <ChatInterface
              messages={vendorCore.session?.messages || []}
              streamingMessage={vendorCore.streamingMessage}
              isTyping={vendorCore.isTyping}
              onSendMessage={handleSubmit}
              currentInput={currentInput}
              onInputChange={setCurrentInput}
              config={vendorCore.config}
              ref={chatScrollRef}
            />
          </div>

          {/* Área de Produtos */}
          <div className="flex-1 flex flex-col">
            
            {/* Barra de Busca Rápida */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <SearchBar
                value={currentInput}
                onChange={setCurrentInput}
                onSubmit={handleSubmit}
                suggestions={showSuggestions ? suggestions : []}
                onSuggestionClick={(suggestion) => {
                  setCurrentInput(suggestion);
                  setShowSuggestions(false);
                  handleSubmit(suggestion);
                }}
                placeholder="Busca rápida de produtos..."
                isLoading={vendorCore.isLoading}
              />
            </div>

            {/* Grid de Produtos */}
            <div className="flex-1 overflow-y-auto p-6">
              {vendorCore.isLoading && getDisplayedProducts().length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Buscando produtos inteligentemente...
                    </p>
                  </div>
                </div>
              ) : getDisplayedProducts().length > 0 ? (
                <ProductGrid
                  products={getDisplayedProducts()}
                  onProductClick={handleProductClick}
                  config={vendorCore.config}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <Sparkles className="h-16 w-16 text-primary/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Vendedor Inteligente V2 Pronto!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Use a conversa ao lado ou a busca rápida acima para encontrar produtos incríveis com IA avançada.
                    </p>
                    
                    {/* Sugestões rápidas */}
                    <div className="grid grid-cols-2 gap-2">
                      {suggestions.slice(0, 4).map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSubmit(suggestion)}
                          className="p-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
