
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import { LazyImage } from './lazy-image';
import { useSuggestions } from '@/hooks/use-suggestions';
import { Search, Sparkles, Zap, Bot, TrendingUp } from 'lucide-react';
import { getPersistedSessionId } from '@/lib/session';

// Importar sistema V2
import { VendorInterface, useIntelligentVendor } from './intelligent-vendor-v2';
import type { Product as V2Product, VendorConfig } from './intelligent-vendor-v2';

/**
 * GeminiAssistantBar V2 - Integração completa com o sistema de Vendedor Inteligente V2
 * Mantém a interface original mas adiciona funcionalidades avançadas do V2
 */

/**
 * Usa SEMPRE o text que vem do backend.
 * Sem fallback local baseado em items.length.
 */
function pickAssistantText(resp: any) {
  // SEMPRE prioriza o texto do servidor - sem checagem de items.length
  return resp?.text || "";
}

export default function GeminiAssistantBarV2() {
  // Evita setup duplicado em React StrictMode e loops de render
  const didInitRef = useRef(false);
  
  const [, setLocation] = useLocation();
  const uid = useMemo(() => localStorage.getItem('uid') || (localStorage.setItem('uid','u-'+Math.random().toString(36).slice(2,8)), localStorage.getItem('uid')!), []);
  const userName = useMemo(() => localStorage.getItem('userName') || 'Cliente', []);
  
  // Estados do sistema original
  const [sessionId, setSessionId] = useState<string | null>(null);
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
  
  // Estados específicos do V2
  const [useV2Mode, setUseV2Mode] = useState(false);
  const [v2SessionId, setV2SessionId] = useState<string | null>(null);
  
  // Configuração do V2
  const v2Config: Partial<VendorConfig> = {
    personality: 'friendly',
    language: 'pt',
    maxRecommendations: 6,
    enableComparison: true,
    enablePriceAlerts: true,
    enableWishlist: true
  };

  // Hook do sistema V2
  const intelligentVendor = useIntelligentVendor({
    sessionId: v2SessionId || undefined,
    userId: uid,
    config: v2Config,
    onSessionUpdate: (session) => {
      console.log('🤖 [V2] Sessão atualizada:', session.id);
    },
    onProductClick: (product) => {
      console.log('🤖 [V2] Produto clicado:', product.title);
      // Integrar com sistema de analytics existente se necessário
    },
    onAnalyticsEvent: (event) => {
      console.log('📊 [V2] Analytics:', event);
    }
  });

  // Refs do sistema original
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

  // Context tracking para herança de produto/categoria
  const lastProductRef = useRef<string | null>(null);
  const lastCategoryRef = useRef<string | null>(null);

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

  // Frases específicas para Gemini V2
  const geminiV2Phrases = [
    "🤖 IA Gemini V2: Vendedor inteligente com IA avançada!",
    "✨ Gemini V2: Recomendações personalizadas e conversas naturais",
    "🚀 IA que aprende: Entende suas preferências e sugere melhor",
    "💎 Gemini V2: Analytics em tempo real + busca inteligente",
    "🎯 Vendedor IA V2: Comparações automáticas e alertas de preço",
    "⚡ Gemini V2: Sistema híbrido - chat + busca + recomendações",
    "🔍 IA V2: Entende contexto e mantém histórico de preferências",
    "🤖 Gemini V2: Follow-up inteligente + análise de sentimento",
    "💫 Vendedor V2: Aprende com cada interação para melhorar",
    "🎪 IA Gemini V2: Personalidade adaptável e suporte multilíngue!"
  ];

  // Função para detectar produto/categoria no texto do usuário
  function sniffProdCat(text: string) {
    const s = text.toLowerCase();
    const prod = (s.match(/\b(iphone|galaxy|drone|perfume|tv|blusa|notebook|camiseta|camisa)\b/) || [])[1];
    if (prod) lastProductRef.current = prod;
    
    // Detectar categoria baseada no produto ou palavras-chave
    if (prod === 'iphone' || prod === 'galaxy' || s.includes('celular') || s.includes('smartphone')) {
      lastCategoryRef.current = 'celular';
    } else if (prod === 'drone') {
      lastCategoryRef.current = 'drone';
    } else if (prod === 'perfume' || s.includes('perfumaria')) {
      lastCategoryRef.current = 'perfume';
    } else if (prod === 'tv' || s.includes('televisão') || s.includes('televisao')) {
      lastCategoryRef.current = 'tv';
    } else if (prod === 'blusa' || prod === 'camiseta' || prod === 'camisa' || s.includes('roupa')) {
      lastCategoryRef.current = 'roupa';
    } else if (prod === 'notebook' || s.includes('computador') || s.includes('laptop')) {
      lastCategoryRef.current = 'eletronicos';
    }
  }

  // Event listeners para integração com header - versão Gemini V2
  useEffect(() => {
    console.log('🎧 [GeminiAssistantBarV2] Registrando event listeners Gemini V2');
    
    const handleGeminiHeaderFocus = (e: CustomEvent) => {
      console.log('🎯 [GeminiAssistantBarV2] Gemini V2 header focus event received:', e.detail);
      if (e.detail?.source === 'gemini-header') {
        if (e.detail.useV2) {
          setUseV2Mode(true);
        }
        setOpen(true);
        setShowResults(true);
        setHeaderTriggered(true);
        if (e.detail.query) {
          setOverlayInput(e.detail.query);
        }
      }
    };
    
    const handleGeminiHeaderSubmit = (e: CustomEvent) => {
      console.log('🚀 [GeminiAssistantBarV2] Gemini V2 header submit event received:', { 
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
          console.log('🚫 [GeminiAssistantBarV2] Duplicate submission blocked');
          return;
        }
        
        lastHeaderQueryRef.current = query;
        lastHeaderSubmitTime.current = now;
        
        // Verificar se deve usar V2
        if (e.detail.useV2 || query.toLowerCase().includes('v2') || query.toLowerCase().includes('inteligente')) {
          setUseV2Mode(true);
          if (intelligentVendor.isReady) {
            intelligentVendor.sendMessage(query);
          }
        } else {
          setUseV2Mode(false);
          // Usar sistema original
          setOpen(true);
          setShowResults(true);
          setHeaderTriggered(true);
          setOverlayInput(query);
          
          if (sessionIdRef.current) {
            console.log('✅ [GeminiAssistantBarV2] Session available, starting Gemini stream for:', query);
            pendingSearchRef.current = query;
            hasTriggeredSearchRef.current = false;
            
            setChatMessages(prev => [...prev, { type: 'user', text: query }]);
            startGeminiStream(query);
          } else {
            pendingSearchRef.current = query;
            hasTriggeredSearchRef.current = false;
          }
        }
      }
    };
    
    window.addEventListener('gemini-assistant:focus', handleGeminiHeaderFocus as EventListener);
    window.addEventListener('gemini-assistant:submit', handleGeminiHeaderSubmit as EventListener);
    
    return () => {
      window.removeEventListener('gemini-assistant:focus', handleGeminiHeaderFocus as EventListener);
      window.removeEventListener('gemini-assistant:submit', handleGeminiHeaderSubmit as EventListener);
    };
  }, [intelligentVendor]);

  // Inicialização única e estável
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    
    console.log("🤖 [GeminiAssistantBarV2] Componente inicializado");

    // Sessão persistida para sistema original
    const sidKey = "gemini.sessionId";
    let sid = localStorage.getItem(sidKey);
    if (!sid) {
      sid = `web_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(sidKey, sid);
    }
    setSessionId(sid);
    sessionIdRef.current = sid;
    
    // Sessão para V2
    const v2SidKey = "gemini.v2.sessionId";
    let v2Sid = localStorage.getItem(v2SidKey);
    if (!v2Sid) {
      v2Sid = `v2_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(v2SidKey, v2Sid);
    }
    setV2SessionId(v2Sid);
    
    console.log("✅ [GeminiAssistantBarV2] Sessões criadas/sincronizadas:", { sid, v2Sid });
  }, []);

  // Função para buscar resposta final quando não houver streaming (sistema original)
  const fetchFinalResponse = async (message: string, sessionId: string, requestId: string) => {
    try {
      sniffProdCat(message);
      
      const response = await fetch('/api/assistant/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          sessionId,
          lang: 'pt',
          context: {
            lastProduct: lastProductRef.current,
            lastCategory: lastCategoryRef.current
          }
        })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      if (data?.debug) {
        console.log("🧠 assistant debug >", {
          priceOnlyFollowUp: data.debug?.priceOnlyFollowUp,
          sort: data.debug?.query?.sort,
          focoAtual: data.debug?.session?.focoAtual,
          lastQuery: data.debug?.session?.lastQuery,
          categoriaAtual: data.debug?.session?.categoriaAtual,
          itens: (data?.items || []).length
        });
      }
      
      const finalMessage = pickAssistantText(data);
      setChatMessages(prev => [...prev, { type: 'assistant', text: finalMessage }]);
      
      if (data?.items?.length > 0) {
        const products = data.items;
        if (products.length <= 6) {
          setTopBox([]);
          setFeed(products);
        } else {
          setTopBox(products.slice(0, 3));
          setFeed(products.slice(3));
        }
      }
      
    } catch (error) {
      console.error('❌ [GeminiAssistantBarV2] Erro na consulta final:', error);
      setChatMessages(prev => [...prev, { 
        type: 'assistant', 
        text: 'Desculpe, houve um problema. Pode tentar novamente?' 
      }]);
    }
  };

  // Função para iniciar stream Gemini (sistema original)
  const startGeminiStream = async (message: string) => {
    const sid = localStorage.getItem("gemini.sessionId")!;
    if (!sid || !message.trim()) return;
    
    setIsTyping(true);
    setStreaming('');
    
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (e) {
        console.warn('Erro ao cancelar stream anterior:', e);
      }
    }
    
    const requestId = Date.now().toString();
    activeRequestIdRef.current = requestId;
    latestRequestIdRef.current = requestId;
    haveProductsInThisRequestRef.current = false;
    
    let accumulatedMessage = '';
    
    try {
      sniffProdCat(message);
      
      console.log('🚀 start stream', { message, sessionId: sid, requestId });
      
      const response = await fetch('/api/assistant/gemini/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          sessionId: sid,
          horaLocal: new Date().getHours(),
          context: {
            lastProduct: lastProductRef.current,
            lastCategory: lastCategoryRef.current
          }
        })
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
        if (latestRequestIdRef.current !== requestId) {
          console.log('🚫 [GeminiAssistantBarV2] Requisição Gemini cancelada - nova requisição iniciada');
          await reader.cancel();
          break;
        }
        
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ [GeminiAssistantBarV2] Gemini stream concluído');
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
              console.log('📨 SSE evento >', data);
              
              if (data.debug) {
                console.log('[assistant debug]', data.debug);
              }
              
              if (latestRequestIdRef.current !== requestId) {
                console.log('🚫 [GeminiAssistantBarV2] Evento SSE ignorado - requisição obsoleta');
                continue;
              }
              
              if (data.text) {
                accumulatedMessage += data.text;
                setStreaming(prev => prev + data.text);
              }
              
              if (data.products && data.products.length > 0 && data.provider === 'gemini') {
                console.log('📦 [GeminiAssistantBarV2] Produtos Gemini recebidos:', data.products.length);
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
              console.log('🏁 [GeminiAssistantBarV2] Gemini stream marcado como completo');
            }
          }
        }
      }
      
    } catch (error) {
      console.error('❌ [GeminiAssistantBarV2] Erro no Gemini stream:', error);
      setStreaming('Ops! Problema na conexão. Tenta de novo? 🤖');
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setIsTyping(false);
        
        const serverText = accumulatedMessage.trim();
        if (serverText.trim()) {
          setChatMessages(prev => [...prev, { type: 'assistant', text: serverText }]);
        }
        
        setStreaming('');
        readerRef.current = null;
        activeRequestIdRef.current = null;
      }
    }
  };

  // Handlers de eventos
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
    if (!t) return;
    
    // Detectar se deve usar V2
    if (t.toLowerCase().includes('v2') || t.toLowerCase().includes('inteligente') || t.toLowerCase().includes('avançado')) {
      setUseV2Mode(true);
      if (intelligentVendor.isReady) {
        intelligentVendor.sendMessage(t);
      }
      setQuery('');
      setOpen(false);
      setShowResults(true);
      setShowSuggestions(false);
      return;
    }
    
    // Usar sistema original
    const sid = localStorage.getItem("gemini.sessionId");
    if (!sid) {
      console.log('🔄 [GeminiAssistantBarV2] Sessão não pronta, enfileirando busca:', t);
      pendingSearchRef.current = t;
      pendingMessageRef.current = t;
      setOpen(true);
      setShowResults(true);
      return;
    }
    
    console.log('🔄 [GeminiAssistantBarV2] Resetando estado para nova consulta Gemini:', t);
    
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

  const onOverlaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = overlayInput.trim();
    if (!t) return;
    
    // Detectar se deve usar V2
    if (t.toLowerCase().includes('v2') || t.toLowerCase().includes('inteligente') || t.toLowerCase().includes('avançado')) {
      setUseV2Mode(true);
      if (intelligentVendor.isReady) {
        intelligentVendor.sendMessage(t);
      }
      setOverlayInput('');
      return;
    }
    
    // Usar sistema original
    const sid = localStorage.getItem("gemini.sessionId");
    if (!sid) {
      console.log('🔄 [GeminiAssistantBarV2] Overlay - Sessão não pronta, enfileirando:', t);
      pendingSearchRef.current = t;
      pendingMessageRef.current = t;
      setQuery(t);
      setOverlayInput('');
      return;
    }
    
    console.log('🔄 [GeminiAssistantBarV2] Overlay submit - nova consulta Gemini:', t);
    
    setTopBox([]);
    setFeed([]);
    setCombina([]);
    
    setChatMessages(prev => [...prev, { type: 'user', text: t }]);
    setOverlayInput('');
    
    startGeminiStream(t);
  };

  const onSuggestionClick = (suggestion: string) => {
    setShowSuggestions(false);
    setQuery('');
    setShowResults(true);
    setOpen(false);
    
    const contextualMessage = `Estou procurando por ${suggestion}. Pode me ajudar a encontrar as melhores opções disponíveis?`;
    
    // Detectar se deve usar V2
    if (suggestion.toLowerCase().includes('v2') || suggestion.toLowerCase().includes('inteligente')) {
      setUseV2Mode(true);
      if (intelligentVendor.isReady) {
        intelligentVendor.sendMessage(contextualMessage);
      }
      return;
    }
    
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
    setUseV2Mode(false);
    if (readerRef.current) {
      readerRef.current.cancel().catch(console.warn);
    }
  };

  const toggleV2Mode = () => {
    setUseV2Mode(!useV2Mode);
    if (!useV2Mode && intelligentVendor.isReady) {
      // Ao ativar V2, enviar mensagem de boas-vindas se não houver mensagens
      if (intelligentVendor.messages.length <= 1) {
        intelligentVendor.sendMessage("Olá! Gostaria de experimentar o novo sistema V2 do vendedor inteligente.");
      }
    }
  };

  return (
    <>
      {/* Barra Principal Gemini V2 - Visual diferenciado */}
      <div className="relative w-full max-w-4xl mx-auto px-4 mt-4">
        <div className="relative">
          <div className="relative flex items-center bg-gradient-to-r from-primary/5 to-orange-50 dark:from-primary/10 dark:to-orange-950/30 border-2 border-primary/20 dark:border-primary/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group">
            
            {/* Ícone Gemini V2 */}
            <div className="absolute left-4 flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-primary dark:text-primary/80" />
              {useV2Mode && <Zap className="h-4 w-4 text-orange-500 animate-pulse" />}
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
              placeholder={displayText || (useV2Mode ? "🤖 Gemini V2: IA avançada com recomendações personalizadas..." : "🤖 Gemini: Ask-then-show - busca inteligente...")}
              className="w-full pl-16 pr-32 py-4 text-lg bg-transparent border-0 outline-none placeholder-primary/60 dark:placeholder-primary/70 text-gray-900 dark:text-gray-100"
              data-testid="input-gemini-search-v2"
              autoComplete="off"
            />
            
            {/* Toggle V2 */}
            <button
              type="button"
              onClick={toggleV2Mode}
              className={`absolute right-16 flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                useV2Mode 
                  ? 'bg-orange-500 text-white shadow-md' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              title={useV2Mode ? "Usando Gemini V2" : "Ativar Gemini V2"}
            >
              {useV2Mode ? (
                <>
                  <Bot className="h-3 w-3 mr-1" />
                  V2
                </>
              ) : (
                <>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  V2
                </>
              )}
            </button>
            
            {/* Botão de busca */}
            <button
              type="submit"
              onClick={onSubmit}
              disabled={!query.trim()}
              className="absolute right-4 flex items-center justify-center w-10 h-10 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-gemini-search-v2"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
          
          {/* Badge Gemini V2 */}
          <div className={`absolute -top-2 left-6 px-3 py-1 text-primary-foreground text-xs font-bold rounded-full shadow-md transition-all duration-300 ${
            useV2Mode 
              ? 'bg-gradient-to-r from-orange-500 to-red-500 animate-pulse' 
              : 'bg-primary'
          }`}>
            {useV2Mode ? 'GEMINI V2 AI' : 'GEMINI AI'}
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
                data-testid={`suggestion-gemini-v2-${index}`}
              >
                <div className="flex items-center">
                  <Search className="h-4 w-4 text-primary mr-3" />
                  <span className="text-gray-900 dark:text-gray-100">{suggestion}</span>
                  {suggestion.toLowerCase().includes('v2') && (
                    <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                      V2
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sistema V2 - Interface Avançada */}
      {useV2Mode && showResults && (
        <VendorInterface
          sessionId={v2SessionId || undefined}
          userId={uid}
          config={v2Config}
          onProductClick={(product: V2Product) => {
            console.log('🤖 [V2] Produto selecionado:', product.title);
            // Integrar com sistema existente se necessário
          }}
          onClose={onClose}
          className="z-50"
        />
      )}

      {/* Overlay de Resultados Gemini Original */}
      {!useV2Mode && showResults && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-4 px-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col">
            
            {/* Header com toggle V2 */}
            <div className="p-6 border-b border-primary/20 dark:border-primary/30 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Sparkles className="h-6 w-6 text-primary dark:text-primary/80 mr-2" />
                  <h2 className="text-xl font-bold text-primary dark:text-primary/80">Gemini Assistant</h2>
                  <span className="ml-2 px-2 py-1 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary/80 text-xs rounded-full">
                    Ask-Then-Show
                  </span>
                  
                  {/* Toggle V2 no header */}
                  <button
                    onClick={toggleV2Mode}
                    className="ml-4 px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full hover:shadow-lg transition-all duration-200 animate-pulse"
                    title="Experimentar Gemini V2"
                  >
                    <Bot className="h-3 w-3 inline mr-1" />
                    Experimentar V2
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  data-testid="button-close-gemini-v2"
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
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Digite o nome de um produto para começar a busca inteligente
                    </p>
                    
                    {/* Botão para experimentar V2 */}
                    <button
                      onClick={toggleV2Mode}
                      className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:shadow-lg transition-all duration-200 animate-pulse"
                    >
                      <Bot className="h-5 w-5 inline mr-2" />
                      Experimentar Gemini V2
                    </button>
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
                  placeholder="🤖 Digite seu produto (ex.: iPhone, drone, perfume) ou 'V2' para modo avançado..."
                  className="flex-1 px-4 py-3 border border-primary/30 dark:border-primary/40 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-800 dark:text-white"
                  data-testid="input-gemini-overlay-v2"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!overlayInput.trim()}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                  data-testid="button-submit-gemini-v2"
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
