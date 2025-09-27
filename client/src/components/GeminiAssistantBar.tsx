import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import { LazyImage } from './lazy-image';
import { useSuggestions } from '@/hooks/use-suggestions';
import { Search, Sparkles } from 'lucide-react';

// Sessão simples por usuário (cache 1h) - separada para Gemini
const geminiSessionCache = new Map();
const ONE_HOUR = 60 * 60 * 1000;

export default function GeminiAssistantBar() {
  console.log('🤖 [GeminiAssistantBar] Componente Gemini sendo renderizado/inicializado');
  console.log('🤖 [GeminiAssistantBar] GEMINI COMPONENT MOUNTED AND RENDERING!');
  
  const [, setLocation] = useLocation();
  const uid = useMemo(() => localStorage.getItem('uid') || (localStorage.setItem('uid','u-'+Math.random().toString(36).slice(2,8)), localStorage.getItem('uid')!), []);
  const userName = useMemo(() => localStorage.getItem('userName') || 'Cliente', []);
  
  console.log('🤖 [GeminiAssistantBar] UID:', uid, 'UserName:', userName);
  
  const [sessionId, setSessionId] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [streaming, setStreaming] = useState('');
  const [greeting, setGreeting] = useState('');
  const [topBox, setTopBox] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [combina, setCombina] = useState<any[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{type: 'user' | 'assistant', text: string}>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [overlayInput, setOverlayInput] = useState('');
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const bootRef = useRef(false);
  const chatRef = useRef<HTMLFormElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const hasTriggeredSearchRef = useRef(false);
  const pendingSearchRef = useRef('');
  const pendingMessageRef = useRef('');
  const [headerTriggered, setHeaderTriggered] = useState(false);
  const sessionIdRef = useRef('');
  const lastHeaderQueryRef = useRef('');
  const lastHeaderSubmitTime = useRef(0);
  const activeRequestIdRef = useRef<string | null>(null);
  const haveProductsInThisRequestRef = useRef(false);
  const firingRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRequestIdRef = useRef<string | null>(null);

  // Estados para animações da barra de busca
  const [displayText, setDisplayText] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Estados para sugestões de autocomplete
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions, isLoading: suggestionsLoading, hasResults } = useSuggestions(query, {
    enabled: showSuggestions && !open,
    minLength: 2,
    debounceDelay: 300
  });
  
  // Manter sessionId atualizado no ref
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Frases específicas para Gemini - "ask-then-show" theme  
  const geminiPhrases = [
    "🤖 IA Gemini: Conversa primeiro, mostra depois!",
    "✨ Gemini powered: Chat inteligente + follow-up",
    "🚀 IA que entende: Pergunta antes de mostrar",
    "💎 Gemini search: Ask-then-show philosophy",
    "🎯 Chat natural com IA Gemini - sem pressa",
    "⚡ Gemini: Conversa inteligente + busca precisa",
    "🔍 Ask-then-show: Entende suas intenções",
    "🤖 Gemini IA: Follow-up inteligente sempre",
    "💫 Conversa primeira, produtos depois - Gemini style",
    "🎪 IA Gemini: Entende 'gostei' e 'quero esse'!"
  ];

  // Event listeners para integração com header - versão Gemini
  useEffect(() => {
    console.log('🎧 [GeminiAssistantBar] Registrando event listeners Gemini');
    
    const handleGeminiHeaderFocus = (e: CustomEvent) => {
      console.log('🎯 [GeminiAssistantBar] Gemini header focus event received:', e.detail);
      if (e.detail?.source === 'gemini-header') {
        setOpen(true);
        setShowResults(true);
        setHeaderTriggered(true);
        if (e.detail.query) {
          setOverlayInput(e.detail.query);
        }
      }
    };
    
    const handleGeminiHeaderSubmit = (e: CustomEvent) => {
      console.log('🚀 [GeminiAssistantBar] Gemini header submit event received:', { 
        detail: e.detail, 
        sessionId: sessionIdRef.current,
        hasSession: !!sessionIdRef.current 
      });
      
      // 🚫 Anti-duplicação
      if (firingRef.current) return;
      firingRef.current = true;
      setTimeout(() => (firingRef.current = false), 800);
      
      if (e.detail?.source === 'gemini-header' && e.detail.query) {
        const query = e.detail.query;
        const now = Date.now();
        
        if (lastHeaderQueryRef.current === query && now - lastHeaderSubmitTime.current < 500) {
          console.log('🚫 [GeminiAssistantBar] Duplicate submission blocked');
          return;
        }
        
        lastHeaderQueryRef.current = query;
        lastHeaderSubmitTime.current = now;
        
        setOpen(true);
        setShowResults(true);
        setHeaderTriggered(true);
        setOverlayInput(query);
        
        if (sessionIdRef.current) {
          console.log('✅ [GeminiAssistantBar] Session available, starting Gemini stream for:', query);
          pendingSearchRef.current = query;
          hasTriggeredSearchRef.current = false;
          
          setChatMessages(prev => [...prev, { type: 'user', text: query }]);
          startGeminiStream(query);
        } else {
          pendingSearchRef.current = query;
          hasTriggeredSearchRef.current = false;
        }
      }
    };
    
    window.addEventListener('gemini-assistant:focus', handleGeminiHeaderFocus as EventListener);
    window.addEventListener('gemini-assistant:submit', handleGeminiHeaderSubmit as EventListener);
    
    return () => {
      window.removeEventListener('gemini-assistant:focus', handleGeminiHeaderFocus as EventListener);
      window.removeEventListener('gemini-assistant:submit', handleGeminiHeaderSubmit as EventListener);
    };
  }, []);

  // Criar/recuperar sessão Gemini
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    
    (async () => {
      const key = `${uid}_gemini`;
      const cached = geminiSessionCache.get(key);
      const now = Date.now();
      
      if (cached && now - cached.ts < ONE_HOUR) {
        setSessionId(cached.id);
        return;
      }
      
      try {
        const res = await fetch('/api/assistant/sessions', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': uid, 
            'x-user-name': userName,
            'x-provider': 'gemini'
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          const id = data.session?.id;
          if (id) {
            console.log('🎉 [GeminiAssistantBar] Gemini session created successfully:', id);
            setSessionId(id);
            geminiSessionCache.set(key, { id, ts: now });
            if (data.greeting) setGreeting(data.greeting);
            if (data.suggest?.products) {
              const products = data.suggest.products;
              setTopBox(products.slice(0, 3));
              setFeed(products.slice(3));
            }
          } else {
            console.warn('⚠️ [GeminiAssistantBar] No session ID in response:', data);
          }
        } else {
          console.error('❌ [GeminiAssistantBar] Gemini session creation failed:', res.status, res.statusText);
        }
      } catch (e) {
        console.error('Gemini session error:', e);
      }
    })();
  }, [uid, userName]);

  // Auto-flush pendente quando sessão fica disponível (versão Gemini)
  useEffect(() => {
    if (sessionId && pendingSearchRef.current && !hasTriggeredSearchRef.current) {
      const searchTerm = pendingSearchRef.current;
      const contextualMessage = pendingMessageRef.current;
      
      pendingMessageRef.current = '';
      hasTriggeredSearchRef.current = false;
      
      setOpen(false);
      setShowResults(true);
      console.log('🔄 [GeminiAssistantBar] Mantendo produtos existentes durante processamento Gemini');
      
      const messageToShow = contextualMessage || searchTerm;
      const messageToStream = contextualMessage || searchTerm;
      
      setChatMessages(prev => [...prev, { type: 'user', text: messageToShow }]);
      startGeminiStream(messageToStream);
    }
  }, [sessionId]);

  // Efeito typewriter para frases Gemini
  useEffect(() => {
    if (isSearchFocused || query.trim()) {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const startCycle = () => {
      const randomIndex = Math.floor(Math.random() * geminiPhrases.length);
      const currentPhrase = geminiPhrases[randomIndex];
      let charIndex = 0;

      const typeText = () => {
        if (charIndex <= currentPhrase.length) {
          setDisplayText(currentPhrase.substring(0, charIndex));
          charIndex++;
          animationRef.current = setTimeout(typeText, 50);
        } else {
          animationRef.current = setTimeout(eraseText, 1500);
        }
      };

      const eraseText = () => {
        let eraseIndex = currentPhrase.length;
        
        const doErase = () => {
          if (eraseIndex >= 0) {
            setDisplayText(currentPhrase.substring(0, eraseIndex));
            eraseIndex--;
            animationRef.current = setTimeout(doErase, 30);
          } else {
            animationRef.current = setTimeout(startCycle, 300);
          }
        };
        
        doErase();
      };

      typeText();
    };

    startCycle();

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isSearchFocused, query]);

  // Função para iniciar stream Gemini
  const startGeminiStream = async (message: string) => {
    if (!sessionId || !message.trim()) return;
    
    setIsTyping(true);
    setStreaming('');
    
    // Cancelar stream anterior se existir
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (e) {
        console.warn('Erro ao cancelar stream anterior:', e);
      }
    }
    
    // Gerar ID único para esta requisição
    const requestId = Date.now().toString();
    activeRequestIdRef.current = requestId;
    latestRequestIdRef.current = requestId;
    haveProductsInThisRequestRef.current = false;
    
    // Variável para capturar mensagem final antes do finally
    let accumulatedMessage = '';
    
    try {
      console.log('🤖 [GeminiAssistantBar] Iniciando Gemini stream:', { message, sessionId, requestId });
      
      const response = await fetch('/api/assistant/gemini/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader');
      }
      
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        // Verificar se esta requisição ainda é a mais recente
        if (latestRequestIdRef.current !== requestId) {
          console.log('🚫 [GeminiAssistantBar] Requisição Gemini cancelada - nova requisição iniciada');
          await reader.cancel();
          break;
        }
        
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ [GeminiAssistantBar] Gemini stream concluído');
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const eventData = line.slice(6);
            if (eventData === '[DONE]') continue;
            
            try {
              const data = JSON.parse(eventData);
              console.log('🤖 [GeminiAssistantBar] Evento SSE recebido:', data);
              
              // Verificar novamente se ainda é a requisição ativa
              if (latestRequestIdRef.current !== requestId) {
                console.log('🚫 [GeminiAssistantBar] Evento SSE ignorado - requisição obsoleta');
                continue;
              }
              
              if (data.text) {
                accumulatedMessage += data.text;
                setStreaming(prev => prev + data.text);
              }
              
              if (data.products && data.products.length > 0 && data.provider === 'gemini') {
                console.log('📦 [GeminiAssistantBar] Produtos Gemini recebidos:', data.products.length);
                haveProductsInThisRequestRef.current = true;
                
                const products = data.products;
                if (products.length <= 6) {
                  setTopBox([]);
                  setFeed(products);
                } else {
                  setTopBox(products.slice(0, 3));
                  setFeed(products.slice(3));
                }
                setCombina([]);
              }
            } catch (e) {
              console.warn('Erro ao parsear evento SSE Gemini:', e);
            }
          } else if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            if (eventType === 'complete') {
              console.log('🏁 [GeminiAssistantBar] Gemini stream marcado como completo');
            }
          }
        }
      }
      
    } catch (error) {
      console.error('❌ [GeminiAssistantBar] Erro no Gemini stream:', error);
      setStreaming('Ops! Problema na conexão. Tenta de novo? 🤖');
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setIsTyping(false);
        
        // Usar mensagem acumulada para garantir que não se perca
        const finalMessage = accumulatedMessage.trim();
        if (finalMessage) {
          setChatMessages(prev => [...prev, { type: 'assistant', text: finalMessage }]);
        }
        
        // Limpar streaming apenas após adicionar ao chat
        setStreaming('');
        
        readerRef.current = null;
        activeRequestIdRef.current = null;
      }
    }
  };

  const onFocus = () => {
    setIsSearchFocused(true);
    if (query && query.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const onBlur = () => {
    setIsSearchFocused(false);
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const onChange = (value: string) => {
    setQuery(value);
    setShowSuggestions(!!value && value.length >= 2 && !open && isSearchFocused);
    
    if (!value.trim()) {
      setShowSuggestions(false);
      return;
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = query.trim();
    if (!t || !sessionId) return;
    
    console.log('🔄 [GeminiAssistantBar] Resetando estado para nova consulta Gemini:', t);
    
    pendingSearchRef.current = t;
    hasTriggeredSearchRef.current = false;
    
    setTopBox([]);
    setFeed([]);
    setCombina([]);
    
    setChatMessages(prev => [...prev, { type: 'user', text: t }]);
    
    setQuery('');
    setOpen(false);
    setShowResults(true);
    setShowSuggestions(false);
    
    startGeminiStream(t);
  };

  // Função específica para o overlay form
  const onOverlaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = overlayInput.trim();
    if (!t || !sessionId) return;
    
    console.log('🔄 [GeminiAssistantBar] Overlay submit - nova consulta Gemini:', t);
    
    // Resetar estado para nova busca
    setTopBox([]);
    setFeed([]);
    setCombina([]);
    
    // Adicionar mensagem do usuário ao chat
    setChatMessages(prev => [...prev, { type: 'user', text: t }]);
    
    // Limpar input do overlay
    setOverlayInput('');
    
    // Iniciar stream
    startGeminiStream(t);
  };

  const onSuggestionClick = (suggestion: string) => {
    setShowSuggestions(false);
    setQuery('');
    setShowResults(true);
    setOpen(false);
    
    const contextualMessage = `Estou procurando por ${suggestion}. Pode me ajudar a encontrar as melhores opções disponíveis?`;
    
    pendingSearchRef.current = suggestion;
    hasTriggeredSearchRef.current = false;
    
    if (sessionIdRef.current) {
      setChatMessages(prev => [...prev, { type: 'user', text: contextualMessage }]);
      startGeminiStream(contextualMessage);
    } else {
      pendingMessageRef.current = contextualMessage;
    }
  };

  const onClose = () => {
    setOpen(false);
    setShowResults(false);
    setQuery('');
    setOverlayInput('');
    setShowSuggestions(false);
    if (readerRef.current) {
      readerRef.current.cancel().catch(console.warn);
    }
  };

  return (
    <>
      {/* Barra Principal Gemini - Visual diferenciado */}
      <div className="relative w-full max-w-4xl mx-auto px-4 mt-4">
        <div className="relative">
          <div className="relative flex items-center bg-gradient-to-r from-primary/5 to-blue-50 dark:from-primary/10 dark:to-blue-950/30 border-2 border-primary/20 dark:border-primary/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group">
            
            {/* Ícone Gemini */}
            <div className="absolute left-4 flex items-center">
              <Sparkles className="h-5 w-5 text-primary dark:text-primary/80" />
            </div>
            
            {/* Input */}
            <input
              type="text"
              value={query}
              onChange={(e) => onChange(e.target.value)}
              onFocus={onFocus}
              onBlur={onBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSubmit(e as any);
                }
              }}
              placeholder={displayText || "🤖 Gemini: Ask-then-show - busca inteligente..."}
              className="w-full pl-12 pr-20 py-4 text-lg bg-transparent border-0 outline-none placeholder-primary/60 dark:placeholder-primary/70 text-gray-900 dark:text-gray-100"
              data-testid="input-gemini-search"
              autoComplete="off"
            />
            
            {/* Botão de busca */}
            <button
              type="submit"
              onClick={onSubmit}
              disabled={!query.trim() || !sessionId}
              className="absolute right-4 flex items-center justify-center w-10 h-10 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-gemini-search"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
          
          {/* Badge Gemini */}
          <div className="absolute -top-2 left-6 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-md">
            GEMINI AI
          </div>
        </div>

        {/* Sugestões de Autocomplete */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-primary/30 dark:border-primary/40 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick(suggestion)}
                className="w-full px-4 py-3 text-left hover:bg-primary/10 dark:hover:bg-primary/20 border-b border-primary/10 dark:border-primary/20 last:border-b-0 transition-colors"
                data-testid={`suggestion-gemini-${index}`}
              >
                <div className="flex items-center">
                  <Search className="h-4 w-4 text-primary mr-3" />
                  <span className="text-gray-900 dark:text-gray-100">{suggestion}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Overlay de Resultados Gemini */}
      {showResults && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-4 px-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col">
            
            {/* Header simples sem busca */}
            <div className="p-6 border-b border-primary/20 dark:border-primary/30 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Sparkles className="h-6 w-6 text-primary dark:text-primary/80 mr-2" />
                  <h2 className="text-xl font-bold text-primary dark:text-primary/80">Gemini Assistant</h2>
                  <span className="ml-2 px-2 py-1 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary/80 text-xs rounded-full">
                    Ask-Then-Show
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  data-testid="button-close-gemini"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Conteúdo Principal com Scroll */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Chat Gemini */}
              <div className="w-1/3 border-r border-primary/20 dark:border-primary/30 flex flex-col">
                <div className="p-4 bg-primary/5 dark:bg-primary/10">
                  <h3 className="font-semibold text-primary dark:text-primary/80 flex items-center">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gemini Chat
                  </h3>
                  <p className="text-sm text-primary/70 dark:text-primary/60 mt-1">
                    Conversa primeiro, mostra depois
                  </p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatScrollRef}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block max-w-[80%] p-3 rounded-2xl ${
                        msg.type === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                      }`}>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  
                  {(isTyping || streaming) && (
                    <div className="text-left">
                      <div className="inline-block max-w-[80%] p-3 rounded-2xl bg-gray-100 dark:bg-gray-800">
                        {isTyping && !streaming && (
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            <span className="text-xs text-primary ml-2">Gemini pensando...</span>
                          </div>
                        )}
                        {streaming && (
                          <p className="text-sm text-gray-900 dark:text-gray-100">{streaming}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Produtos */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingSug && (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-primary dark:text-primary/80 mt-2">Gemini procurando...</p>
                  </div>
                )}

                {/* Top Box */}
                {topBox.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-primary dark:text-primary/80 mb-4 flex items-center">
                      <Sparkles className="h-5 w-5 mr-2" />
                      Destaques Gemini
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {topBox.map((product, index) => (
                        <div key={product.id || index} className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-primary/20 dark:border-primary/30">
                          <LazyImage
                            src={product.imageUrl || '/placeholder-product.jpg'}
                            alt={product.title || product.name}
                            className="w-full h-48 object-cover rounded-t-xl"
                          />
                          <div className="p-4">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-2 line-clamp-2">
                              {product.title || product.name}
                            </h4>
                            {product.price?.USD && (
                              <p className="text-primary dark:text-primary/80 font-bold text-lg">
                                ${product.price.USD}
                              </p>
                            )}
                            {product.storeName && (
                              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                                {product.storeName}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feed */}
                {feed.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-primary dark:text-primary/80 mb-4">
                      Resultados Gemini
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {feed.map((product, index) => (
                        <div key={product.id || index} className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-primary/20 dark:border-primary/30">
                          <LazyImage
                            src={product.imageUrl || '/placeholder-product.jpg'}
                            alt={product.title || product.name}
                            className="w-full h-32 object-cover rounded-t-xl"
                          />
                          <div className="p-3">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-2 line-clamp-2">
                              {product.title || product.name}
                            </h4>
                            {product.price?.USD && (
                              <p className="text-primary dark:text-primary/80 font-bold">
                                ${product.price.USD}
                              </p>
                            )}
                            {product.storeName && (
                              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                                {product.storeName}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Estado vazio */}
                {!loadingSug && topBox.length === 0 && feed.length === 0 && (
                  <div className="text-center py-12">
                    <Sparkles className="h-16 w-16 text-primary/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-primary dark:text-primary/80 mb-2">
                      Gemini Assistant Pronto!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Digite o nome de um produto para começar a busca inteligente
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Input no Rodapé */}
            <div className="p-6 border-t border-primary/20 dark:border-primary/30 flex-shrink-0">
              <form onSubmit={onOverlaySubmit} className="flex gap-3">
                <input
                  type="text"
                  value={overlayInput}
                  onChange={(e) => setOverlayInput(e.target.value)}
                  placeholder="🤖 Digite seu produto (ex.: iPhone, drone, perfume)..."
                  className="flex-1 px-4 py-3 border border-primary/30 dark:border-primary/40 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-800 dark:text-white"
                  data-testid="input-gemini-overlay"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!overlayInput.trim() || !sessionId}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                  data-testid="button-submit-gemini"
                >
                  <Search className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}