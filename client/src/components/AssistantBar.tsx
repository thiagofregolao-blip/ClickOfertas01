import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import { LazyImage } from './lazy-image';
import { useSuggestions } from '@/hooks/use-suggestions';
import { Search } from 'lucide-react';

// Sessão simples por usuário (cache 1h)
const sessionCache = new Map();
const ONE_HOUR = 60 * 60 * 1000;

export default function AssistantBar() {
  console.log('🚀 [AssistantBar] Componente sendo renderizado/inicializado');
  
  const [, setLocation] = useLocation();
  const uid = useMemo(() => localStorage.getItem('uid') || (localStorage.setItem('uid','u-'+Math.random().toString(36).slice(2,8)), localStorage.getItem('uid')!), []);
  const userName = useMemo(() => localStorage.getItem('userName') || 'Cliente', []);
  
  console.log('👤 [AssistantBar] UID:', uid, 'UserName:', userName);
  
  const [sessionId, setSessionId] = useState('');
  
  // Manter sessionId atualizado no ref
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Auto-flush pendente quando sessão fica disponível 
  useEffect(() => {
    if (sessionId && pendingSearchRef.current && !hasTriggeredSearchRef.current) {
      const searchTerm = pendingSearchRef.current;
      const contextualMessage = pendingMessageRef.current;
      
      // Limpar apenas pendingMessageRef (pendingSearchRef precisa ficar para startStream usar)
      pendingMessageRef.current = '';
      hasTriggeredSearchRef.current = false;
      
      // Alinhar estado da UI com onSubmit
      setOpen(false);
      setShowResults(true);
      // 🔧 NÃO LIMPAR produtos aqui - só limpar no onSubmit para nova busca
      console.log('🔄 [AssistantBar] Mantendo produtos existentes durante processamento do header');
      
      // Usar mensagem contextual se disponível, senão usar termo de busca
      const messageToShow = contextualMessage || searchTerm;
      const messageToStream = contextualMessage || searchTerm;
      
      // Adicionar mensagem do usuário
      setChatMessages(prev => [...prev, { type: 'user', text: messageToShow }]);
      
      // Enviar para IA
      startStream(messageToStream);
    }
  }, [sessionId]);
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
  const pendingMessageRef = useRef(''); // Para armazenar mensagem contextual quando sessão não está pronta
  const [headerTriggered, setHeaderTriggered] = useState(false);
  const sessionIdRef = useRef('');
  const lastHeaderQueryRef = useRef('');
  const lastHeaderSubmitTime = useRef(0);
  const activeRequestIdRef = useRef<string | null>(null);
  const haveProductsInThisRequestRef = useRef(false); // trava contra fetchSuggest sobrescrever
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
    enabled: showSuggestions && !open, // Só buscar se não está aberto o dropdown principal
    minLength: 2,
    debounceDelay: 300
  });
  
  // Event listeners para integração com header
  useEffect(() => {
    console.log('🎧 [AssistantBar] Registrando event listeners');
    
    const handleHeaderFocus = (e: CustomEvent) => {
      console.log('🎯 [AssistantBar] Header focus event received:', e.detail);
      if (e.detail?.source === 'header') {
        setOpen(true);
        setShowResults(true);
        setHeaderTriggered(true);
        if (e.detail.query) {
          setOverlayInput(e.detail.query);
        }
      }
    };
    
    const handleHeaderSubmit = (e: CustomEvent) => {
      console.log('🚀 [AssistantBar] Header submit event received:', { 
        detail: e.detail, 
        sessionId: sessionIdRef.current,
        hasSession: !!sessionIdRef.current 
      });
      
      // 🚫 Anti-duplicação
      if (firingRef.current) return;
      firingRef.current = true;
      setTimeout(() => (firingRef.current = false), 800);
      
      if (e.detail?.source === 'header' && e.detail.query) {
        const query = e.detail.query;
        const now = Date.now();
        
        // Prevenir submissões duplicadas (cooldown de 500ms)
        if (lastHeaderQueryRef.current === query && now - lastHeaderSubmitTime.current < 500) {
          console.log('🚫 [AssistantBar] Duplicate submission blocked');
          return;
        }
        
        lastHeaderQueryRef.current = query;
        lastHeaderSubmitTime.current = now;
        
        setOpen(true);
        setShowResults(true);
        setHeaderTriggered(true);
        setOverlayInput(query);
        
        // Processar a busca usando sessionIdRef para evitar closure stale
        if (sessionIdRef.current) {
          console.log('✅ [AssistantBar] Session available, starting stream for:', query);
          pendingSearchRef.current = query;
          hasTriggeredSearchRef.current = false;
          
          // Adicionar mensagem do usuário
          setChatMessages(prev => [...prev, { type: 'user', text: query }]);
          
          // Enviar para IA
          startStream(query);
        } else {
          // Se não há sessão ainda, aguardar
          pendingSearchRef.current = query;
          hasTriggeredSearchRef.current = false;
        }
      }
    };
    
    window.addEventListener('assistant:focus', handleHeaderFocus as EventListener);
    window.addEventListener('assistant:submit', handleHeaderSubmit as EventListener);
    
    return () => {
      window.removeEventListener('assistant:focus', handleHeaderFocus as EventListener);
      window.removeEventListener('assistant:submit', handleHeaderSubmit as EventListener);
    };
  }, []);

  // Frases divertidas do assistente IA
  const phrases = [
    "IA caçando promoções mais rápido que você 😎",
    "Robôzinho pesquisador ativado 🤖🔍",
    "IA já sabe o que você quer… mas digita mesmo assim 😂",
    "Buscando com inteligência (artificial, claro)",
    "Aqui a IA procura até a paciência da sua sogra 😅",
    "Deixa que o cérebro de silício resolve 🧠⚡",
    "IA no modo detetive… já volto 🕵️",
    "Pesquisando com 0% preguiça, 100% algoritmo 🚀",
    "Procura turbo by IA 🛠️",
    "Pode confiar, eu sou um robô treinado pra isso 🤖",
    "Enquanto você digita, a IA já achou 3 promoções 💸",
    "Robôzinho no corre da sua compra 🏃‍♂️🤖",
    "Inteligência artificial, humor natural 😂",
    "IA vasculhando até as entrelinhas do Paraguai 📡",
    "Se não tiver, a IA inventa (brincadeira 👀)",
    "Buscando com a força dos algoritmos 💪",
    "Aqui a pesquisa é tão rápida que parece magia ✨🤖",
    "IA já fez a busca antes de você pensar nisso 🧠⚡",
    "Procurando bugigangas em modo automático 🤖",
    "Relaxa, a IA faz o trabalho sujo 🕶️",
    "IA com faro de promoção ativado 🐶💻",
    "Pesquisando mais fundo que o Google 🔍🤖",
    "IA na missão: achar sua compra perdida 🛰️",
    "Robô caçador de pechinchas em ação 💥",
    "Sua busca virou algoritmo… e achou coisa boa 😉",
    "Procurando em 3, 2, 1… beep bop 🤖",
    "IA mais rápida que mototaxi na fronteira 🏍️💨",
    "Buscando com poder computacional (e fofura) 🐧",
    "Quem procura é IA, quem gasta é você 😏",
    "Pesquisa inteligente, gasto automático 💳🤖",
    "IA procurando mais rápido que cambista na Ponte 🏃‍♂️💨",
    "Robôzinho já foi e voltou do Paraguai com sua compra 🛒🤖",
    "Beep bop… achando promoções secretas 🔐",
    "IA com visão de raio-x nos preços 👀⚡",
    "Quem nunca quis um robô personal shopper?",
    "Eu procuro, você só gasta 😏",
    "IA detectando desconto em 3, 2, 1…",
    "Pesquisando com chips… mas não de mandioca 😂",
    "Robôzinho com faro de sacoleiro 🛍️🤖",
    "Deixa comigo, humano! 🔍",
    "IA trabalha, você só desliza o dedo 😎",
    "Achando até o que você não pediu 😂",
    "IA lendo pensamento… e carrinho também 🧠🛒",
    "Robô mode: caça-pechincha ativado 🔥",
    "Cuidado: IA pode sugerir mais do que você queria 👀",
    "Promo detectada! 🚨🤖",
    "IA já aprendeu com milhões de sacoleiros 😅",
    "Mais rápido que atravessar a Ponte da Amizade 🚀",
    "IA não dorme, só busca 💻",
    "Pesquisa mais esperta que seu amigo do zap 🤫",
    "IA no modo Sherlock Holmes 🕵️",
    "Robôzinho fuçando as prateleiras digitais 🛍️",
    "Buscando ofertas escondidas até no Paraguai profundo 🌴",
    "IA nunca esquece… diferente de você 😅",
    "Mais certeiro que mototaxi na rodoviária 🏍️",
    "Quem tem IA não precisa de GPS pra achar oferta 🌎",
    "Pesquisando com café digital ☕🤖",
    "IA escaneando até pensamento confuso 😂",
    "Robôzinho no corre por você, patrão!",
    "Achando produto até em universos paralelos 🪐",
    "IA trabalha rápido, mas o cartão chora lento 💳😅",
    "Robô caçador de bugigangas em ação 🛠️",
    "Procura sem erro, só algoritmo ⚡",
    "IA não julga suas buscas estranhas 👀",
    "Robôzinho mais confiável que amigo que traz muamba",
    "Pesquisa turbo: powered by IA 🚀",
    "IA nunca erra (quase nunca, vai…) 😅",
    "Quem procura com IA, encontra desconto 🎯",
    "IA com mira laser nas promoções 🔫",
    "Robôzinho sacoleiro de elite 🤖🛍️",
    "Procura no modo automático: on ⚡",
    "IA fuçando mais rápido que cambista em jogo 🎫",
    "Achei antes mesmo de você terminar a frase 😏",
    "Robôzinho 24h de plantão pra você 🕛",
    "IA caçando preço bom na velocidade da luz 💡",
    "Mais rápido que Wi-Fi de shopping 📶",
    "Robôzinho na função: achar tudo!",
    "IA mais dedicada que amigo trazendo chip do PY 📱",
    "Promo detectada pelo radar IA 📡",
    "Buscando até nos becos do Paraguai 😅",
    "IA pesquisando até em sonhos 💭",
    "Robôzinho caçador de promo com radar ligado 🚨",
    "Se tiver, eu acho. Se não tiver, eu invento 😂",
    "IA com sede de promoção 🥤",
    "Mais rápido que atravessar na cota 💸",
    "Procura feita com bits e amor 💖🤖",
    "IA sempre pronta pro rolê de compras 🎉",
    "Robôzinho mais rápido que o cambista do terminal 🏃",
    "Busca inteligente, gasto garantido 💳",
    "IA garimpeira de promoções ⛏️",
    "Procurando até no fundo da internet 🕳️",
    "IA com alma de vendedor ambulante 😂",
    "Robôzinho ativado: busca sem preguiça 😎",
    "Mais afiado que faca paraguaia 🔪",
    "IA pesquisando enquanto você toma tereré 🧉",
    "Beep bop! Oferta encontrada 🚀",
    "IA no modo ninja da pesquisa 🥷",
    "Procura em tempo recorde, tipo Usain Bolt 🏅",
    "Robôzinho no corre, cartão no desespero 💳😂",
    "IA pesquisando com humor e algoritmo 🤖✨"
  ];

  // Criar/recuperar sessão
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    
    (async () => {
      const key = uid;
      const cached = sessionCache.get(key);
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
            'x-user-name': userName 
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          const id = data.session?.id;
          if (id) {
            console.log('🎉 [AssistantBar] Session created successfully:', id);
            setSessionId(id);
            sessionCache.set(key, { id, ts: now });
            if (data.greeting) setGreeting(data.greeting);
            if (data.suggest?.products) {
              const products = data.suggest.products;
              setTopBox(products.slice(0, 3));
              setFeed(products.slice(3));
            }
          } else {
            console.warn('⚠️ [AssistantBar] No session ID in response:', data);
          }
        } else {
          console.error('❌ [AssistantBar] Session creation failed:', res.status, res.statusText);
        }
      } catch (e) {
        console.error('Session error:', e);
      }
    })();
  }, [uid, userName]);

  // Efeito typewriter completo: digitar → pausar → apagar → próxima
  useEffect(() => {
    // Se focado ou com texto, parar animação
    if (isSearchFocused || query.trim()) {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const startCycle = () => {
      // Escolher frase aleatória
      const randomIndex = Math.floor(Math.random() * phrases.length);
      const currentPhrase = phrases[randomIndex];
      let charIndex = 0;

      // FASE 1: Digitar letra por letra (mais rápido)
      const typeText = () => {
        if (charIndex <= currentPhrase.length) {
          setDisplayText(currentPhrase.substring(0, charIndex));
          charIndex++;
          animationRef.current = setTimeout(typeText, 50);
        } else {
          // FASE 2: Pausar com texto completo
          animationRef.current = setTimeout(eraseText, 1500);
        }
      };

      // FASE 3: Apagar letra por letra (mais rápido)
      const eraseText = () => {
        let eraseIndex = currentPhrase.length;
        
        const doErase = () => {
          if (eraseIndex >= 0) {
            setDisplayText(currentPhrase.substring(0, eraseIndex));
            eraseIndex--;
            animationRef.current = setTimeout(doErase, 30);
          } else {
            // FASE 4: Próxima frase (aleatória)
            animationRef.current = setTimeout(startCycle, 300);
          }
        };
        
        doErase();
      };

      // Iniciar digitação
      typeText();
    };

    // Iniciar o ciclo
    startCycle();

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isSearchFocused, query]);

  // Gerenciar classes CSS do body quando showResults está ativo
  useEffect(() => {
    if (showResults) {
      document.documentElement.classList.add('assistant-search-active');
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.classList.remove('assistant-search-active');
      document.body.style.overflow = '';
    }
    
    return () => {
      document.documentElement.classList.remove('assistant-search-active');
      document.body.style.overflow = '';
    };
  }, [showResults]);

  const onFocus = () => {
    // Não abrir dropdown automático - só na pesquisa
    // Mas ativar sugestões se há texto
    if (query && query.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const onChange = (value: string) => {
    setQuery(value);
    
    // Mostrar sugestões apenas se:
    // 1. Há texto digitado (2+ caracteres)
    // 2. Não está aberto o dropdown principal  
    // 3. Usuário está focado no campo
    setShowSuggestions(!!value && value.length >= 2 && !open && isSearchFocused);
    
    // 🔧 NÃO LIMPAR produtos automaticamente - só quando nova busca
    // Só limpar sugestões se não há valor
    if (!value.trim()) {
      setShowSuggestions(false);
      return;
    }
    
    // Não chamar fetchSuggest aqui - usar apenas useSuggestions para autocomplete
    // fetchSuggest será chamado apenas no submit ou quando o assistant sinalizar
  };
  
  // Função para gerar mensagens contextuais inteligentes baseadas no produto
  const generateContextualMessage = (suggestion: string) => {
    const lowerSuggestion = suggestion.toLowerCase();
    
    if (lowerSuggestion.includes('iphone')) {
      return `Estou interessado no ${suggestion}. Pode me mostrar as melhores opções disponíveis e preços?`;
    } else if (lowerSuggestion.includes('samsung')) {
      return `Quero ver opções do ${suggestion}. Quais são as melhores ofertas disponíveis?`;
    } else if (lowerSuggestion.includes('notebook') || lowerSuggestion.includes('laptop')) {
      return `Preciso de informações sobre ${suggestion}. Pode me ajudar com especificações e preços?`;
    } else if (lowerSuggestion.includes('mouse') || lowerSuggestion.includes('teclado') || lowerSuggestion.includes('headset')) {
      return `Estou procurando ${suggestion}. Quais são as melhores opções para games e trabalho?`;
    } else if (lowerSuggestion.includes('perfume') || lowerSuggestion.includes('cosmético')) {
      return `Quero comprar ${suggestion}. Pode me mostrar as marcas e fragrâncias disponíveis?`;
    } else if (lowerSuggestion.includes('cabo') || lowerSuggestion.includes('carregador') || lowerSuggestion.includes('fone')) {
      return `Preciso de ${suggestion}. Quais são as melhores opções de qualidade e preço?`;
    } else {
      return `Estou procurando por ${suggestion}. Pode me ajudar a encontrar as melhores opções disponíveis?`;
    }
  };

  // Função para quando clicar numa sugestão - NOVA IMPLEMENTAÇÃO
  const onSuggestionClick = (suggestion: string) => {
    // Fechar sugestões e configurar UI para overlay (igual aos outros fluxos)
    setShowSuggestions(false);
    setQuery('');
    setShowResults(true);
    setOpen(false); // Consistente com onSubmit
    
    // Gerar mensagem contextual inteligente
    const contextualMessage = generateContextualMessage(suggestion);
    
    // Configurar busca de produtos (necessário para mostrar produtos após conversa)
    pendingSearchRef.current = suggestion; // Usar sugestão original para busca
    hasTriggeredSearchRef.current = false;
    
    // Iniciar conversa se sessão estiver pronta
    if (sessionIdRef.current) {
      // Sessão pronta - adicionar mensagem e iniciar stream imediatamente
      setChatMessages(prev => [...prev, { type: 'user', text: contextualMessage }]);
      startStream(contextualMessage);
    } else {
      // Sessão não pronta - armazenar mensagem contextual para o auto-flush effect usar
      pendingMessageRef.current = contextualMessage;
    }
  };

  const fetchSuggest = async (term: string) => {
    if (!term.trim() || loadingSug) return;
    setLoadingSug(true);
    
    try {
      // 📦 Se já chegaram produtos por SSE neste request, NÃO toque na UI de produtos
      if (haveProductsInThisRequestRef.current) {
        console.log('↩️ fetchSuggest cancelado: já há produtos do SSE neste request');
        return;
      }
      
      let r = await fetch(`/suggest?q=${encodeURIComponent(term)}`);
      if (!r.ok) r = await fetch(`/api/suggest?q=${encodeURIComponent(term)}`);
      const d = await r.json();
      const prods = d?.products || [];
      
      // Se poucos produtos, mostrar todos no feed; se muitos, dividir
      if (prods.length <= 6) {
        setTopBox([]);
        setFeed(prods);
      } else {
        setTopBox(prods.slice(0, 3));
        setFeed(prods.slice(3));
      }
      
      // Acessórios simples baseados na categoria
      const cat = (prods[0]?.category || '').toLowerCase();
      const accessories = cat.includes('celular') || cat.includes('telefone') ? 
        ['capinha', 'película', 'carregador'] : [];
      
      if (accessories.length) {
        const accQ = accessories.join(' OR ');
        let r2 = await fetch(`/suggest?q=${encodeURIComponent(accQ)}`);
        if (!r2.ok) r2 = await fetch(`/api/suggest?q=${encodeURIComponent(accQ)}`);
        const d2 = await r2.json();
        setCombina((d2?.products || []).slice(0, 6));
      } else {
        setCombina([]);
      }
    } finally {
      setLoadingSug(false);
    }
  };

  // Detectar produtos mencionados e atualizar busca
  const detectAndSearchProducts = (text: string) => {
    const keywords = ['iphone', 'samsung', 'xiaomi', 'motorola', 'lg', 'huawei', 'apple', 
                     'mouse', 'teclado', 'headset', 'fone', 'notebook', 'laptop', 'tablet', 'smartwatch', 
                     'logitech', 'razer', 'hyperx', 'corsair', 'dell', 'hp', 'lenovo', 'asus', 'acer'];
    
    const lowerText = text.toLowerCase();
    // Usar word boundaries para evitar matches parciais (ex: perfumes contém "fume" que contém "me")
    const foundKeyword = keywords.find(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(lowerText);
    });
    
    if (foundKeyword) {
      // Extrair termo mais específico se possível
      const words = lowerText.split(/\s+/);
      const keywordIndex = words.findIndex(word => word === foundKeyword);
      
      let searchTerm = foundKeyword;
      
      // Tentar capturar modelo específico (ex: "iPhone 15", "Galaxy S24")
      if (keywordIndex !== -1 && keywordIndex < words.length - 1) {
        const nextWord = words[keywordIndex + 1];
        if (/^[0-9]+[a-z]*$/i.test(nextWord)) {
          searchTerm = `${foundKeyword} ${nextWord}`;
        }
      }
      
      // Atualizar busca se for diferente da atual
      if (searchTerm !== query.toLowerCase().trim()) {
        fetchSuggest(searchTerm);
      }
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = query.trim();
    if (!t || !sessionId) return;
    
    // 🔄 RESET COMPLETO para nova consulta
    console.log('🔄 [onSubmit] Resetando estado para nova consulta:', t);
    
    // Armazenar termo para buscar após o chat informar
    pendingSearchRef.current = t;
    hasTriggeredSearchRef.current = false; // Reset flag
    
    // Limpar produtos existentes SEMPRE
    setTopBox([]);
    setFeed([]);
    setCombina([]);
    
    // Mostrar mensagem do usuário
    setChatMessages(prev => [...prev, { type: 'user', text: t }]);
    
    // Limpar campo
    setQuery('');
    
    // Ativar overlay de resultados e fechar dropdown
    setShowResults(true);
    setOpen(false);
    
    startStream(t);
  };

  const startStream = async (message: string) => {
    // 🔒 CONTROLE DE CONCORRÊNCIA: Só um stream por vez
    if (readerRef.current) {
      console.log('🔒 [AssistantBar] Cancelando stream anterior');
      try { await readerRef.current.cancel(); } catch {}
      readerRef.current = null;
    }
    
    // 🔄 RESET APENAS STREAMING (NÃO produtos)
    console.log('🔄 [AssistantBar] Iniciando nova consulta:', message);
    setIsTyping(true);
    setStreaming('');
    // Reset flags críticas
    pendingSearchRef.current = message;
    hasTriggeredSearchRef.current = false;
    
    console.log('📡 [AssistantBar] Iniciando stream para:', message);
    
    try {
      const res = await fetch('/api/assistant/stream', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': uid, 
          'x-user-name': userName 
        },
        body: JSON.stringify({ sessionId, message })
      });
      
      if (!res.ok || !res.body) {
        setIsTyping(false);
        return;
      }
      
      // 🆔 gere um requestId local (se o backend não enviar)
      const reqId = `r-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      activeRequestIdRef.current = reqId;
      haveProductsInThisRequestRef.current = false;
      
      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessage = '';
      let assistantMessageId = `assistant-${Date.now()}`;
      
      // 🚫 Helper para aceitar apenas eventos da requisição corrente
      const acceptEvent = (payload: any) => {
        // Se o backend mandar requestId no JSON, valide:
        if (payload?.requestId && activeRequestIdRef.current && payload.requestId !== activeRequestIdRef.current) {
          console.log('⏭️ descartando evento de request antigo', payload.requestId);
          return false;
        }
        return true;
      };
      
      // 🕰️ Timeout de segurança no front (não ficar eterno em "digitando")
      function armSafetyTimer() {
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = setTimeout(() => {
          if (isTyping) {
            assistantMessage += "\n(continuo aqui… quase lá) ";
            setStreaming(assistantMessage);
            // se nada chegar mais 8s, encerra com bolha mínima
            safetyTimerRef.current = setTimeout(() => {
              if (isTyping) {
                assistantMessage += " (me diz a cidade e orçamento que acelero a busca)";
                setChatMessages(prev => [...prev, { type: 'assistant', text: assistantMessage.trim() }]);
                setIsTyping(false);
                setStreaming('');
              }
            }, 8000);
          }
        }, 7000);
      }
      
      console.log('👂 [AssistantBar] Reader iniciado, aguardando chunks...');
      
      // 🚀 Iniciar timeout de segurança
      armSafetyTimer();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log('🏁 [AssistantBar] Stream finalizado');
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        console.log('📦 [AssistantBar] Chunk recebido:', chunk.substring(0, 200) + (chunk.length > 200 ? '...' : ''));
        
        buffer += chunk;
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        
        console.log('🔄 [AssistantBar] Processando', parts.length, 'partes');
        
        for (const part of parts) {
          const line = part.trim().replace(/^data:\s?/, '');
          
          // 🛡️ PROTEÇÃO: Só processar linhas não vazias
          if (!line) {
            console.log('⏭️ [DEBUG] Linha vazia ignorada');
            continue;
          }
          
          console.log('🔍 [DEBUG] Processando parte:', line.substring(0, 150) + (line.length > 150 ? '...' : ''));
          
          // 🧠 PARSER ROBUSTO: Tentar JSON primeiro, só aceitar texto se NÃO for JSON malformado
          let isValidEvent = false;
          try {
            // 🔄 Parser SSE robusto - compatibilidade dupla de eventos
            let payload: any;
            try {
              // Tentar direto como JSON {type:...}
              payload = JSON.parse(line);
            } catch {
              // Se falhar, tentar como evento nomeado
              if (line.includes('event:') && line.includes('data:')) {
                const eventMatch = /event:\s*(.+)/.exec(line);
                const dataMatch = /data:\s*(.+)/.exec(line);
                if (dataMatch) {
                  try {
                    const eventType = eventMatch?.[1]?.trim() || 'message';
                    const data = JSON.parse(dataMatch[1]);
                    payload = { ...data, type: eventType, event: eventType };
                  } catch {
                    continue; // JSON inválido
                  }
                }
              } else {
                continue; // Formato desconhecido
              }
            }
            
            isValidEvent = true;
            console.log('✅ [DEBUG] Evento SSE processado:', payload.type || payload.event);
            
            // 🚫 Validar se evento é da requisição atual
            if (!acceptEvent(payload)) continue;
            
            // 🆔 Handler SSE unificado
            const eventType = (payload.type || payload.event || '').toLowerCase();
            
            if (eventType === 'meta') {
              latestRequestIdRef.current = payload.requestId;
              armSafetyTimer(); // Rearmar timer
              continue;
            }
            
            if (eventType === 'delta' || eventType === 'chunk') {
              if (payload.text) {
                console.log('✅ [DEBUG] Processando texto delta/chunk:', payload.text.substring(0, 50));
                if (isTyping) setIsTyping(false); // 🔄 desligar aqui, no primeiro delta real
                assistantMessage += payload.text;
                setStreaming(assistantMessage);
                armSafetyTimer(); // Rearmar timer a cada delta
                
                // 🔍 Detectar quando assistente fala sobre buscar
                const spokeAboutSearch = /busca|procurando|opções|aqui estão|vou buscar|procurar/i.test(assistantMessage);
                if (pendingSearchRef.current && !hasTriggeredSearchRef.current && spokeAboutSearch && !haveProductsInThisRequestRef.current) {
                  fetchSuggest(pendingSearchRef.current);
                  hasTriggeredSearchRef.current = true;
                }
              }
              continue;
            }
            
            if (eventType === 'products' || eventType === 'cards') {
              // 🔄 Marcar que chegaram produtos pela IA
              haveProductsInThisRequestRef.current = true;
              
              console.log('📦 [AssistantBar] ✅ Produtos recebidos via SSE:', payload.products?.length || payload.items?.length || 0);
              
              const products = payload.products || payload.items || [];
              if (products.length > 0) {
                const validProducts = products.filter((product: any) => 
                  product && 
                  product.id && 
                  (typeof product.id === 'string' || typeof product.id === 'number') &&
                  String(product.id).trim().length > 0 &&
                  (product.title || product.name) &&
                  (product.title || product.name).trim().length > 0
                );
                
                if (validProducts.length > 0) {
                  const normalizedProducts = validProducts.map((product: any) => ({
                    ...product,
                    name: product.name || product.title,
                    title: product.title || product.name,
                    validatedById: true
                  }));
                  
                  setTopBox(normalizedProducts.slice(0, 3));
                  setFeed(normalizedProducts.slice(3));
                  setShowResults(true);
                  
                  console.log('📦 [HARD GROUNDING] ✅ Interface atualizada com produtos validados por ID');
                }
              }
              continue;
            }
            
            if (eventType === 'done' || eventType === 'complete' || eventType === 'end') {
              console.log('🏁 [DEBUG] Stream finalizado com tipo:', eventType);
              if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
              
              // Fallback de busca se necessário
              if (pendingSearchRef.current && !hasTriggeredSearchRef.current) {
                fetchSuggest(pendingSearchRef.current);
                hasTriggeredSearchRef.current = true;
                pendingSearchRef.current = '';
              }
              
              // Finalizar mensagem
              if (assistantMessage.trim()) {
                setChatMessages(prev => [...prev, { type: 'assistant', text: assistantMessage.trim() }]);
              } else {
                setChatMessages(prev => [...prev, { type: 'assistant', text: "Estou aqui 👍 Me diga a categoria e a cidade que eu já busco ofertas." }]);
              }
              setStreaming('');
              setIsTyping(false);
              break;
            }
            
            // O novo handler SSE acima já processou o evento
            continue;
          } catch (error) {
            // 🚨 CRÍTICO: SÓ adicionar ao texto se NÃO parecer JSON malformado
            const looksLikeJSON = line.includes('{') && (line.includes('"type"') || line.includes('"products"'));
            
            if (looksLikeJSON) {
              console.warn('🚨 [DEBUG] JSON malformado detectado - IGNORANDO:', line.substring(0, 50));
              // NÃO adicionar ao assistantMessage - ignorar JSON malformado
            } else {
              console.log('📝 [DEBUG] Texto simples adicionado:', line.substring(0, 50));
              assistantMessage += line;
              setStreaming(assistantMessage);
            }
          }
        }
      }
      
      // 🔧 FALLBACK: Se terminar sem 'end', ainda adicionar a mensagem (evitar duplicatas)
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      if (assistantMessage.trim() && !chatMessages.some(m => m.text === assistantMessage.trim())) {
        setChatMessages(prev => [...prev, { type: 'assistant', text: assistantMessage.trim() }]);
        setStreaming('');
        setIsTyping(false);
      }
    } catch (e) {
      console.error('Stream error:', e);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      setIsTyping(false);
      setStreaming('');
    }
  };

  const goProduct = (p: any) => {
    if (p?.id) {
      // Adicionar mensagem da IA antes do redirecionamento
      setChatMessages(prev => [...prev, { 
        type: 'assistant', 
        text: 'Vou te redirecionar para o ambiente Click com mais algumas sugestões!' 
      }]);
      
      // Aguardar um pouco antes de redirecionar para o usuário ver a mensagem
      setTimeout(() => {
        setLocation(`/click-environment/${encodeURIComponent(p.id)}`);
      }, 1000);
    }
  };

  const closeResults = () => {
    setShowResults(false);
  };

  // Handler para ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showResults) {
        closeResults();
      }
    };
    
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showResults]);

  const sendOverlayMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const message = overlayInput.trim();
    if (!message || !sessionId) return;
    
    // 🔄 RESET para overlay message
    console.log('🔄 [sendOverlayMessage] Nova consulta via overlay:', message);
    
    // Armazenar termo para buscar após o chat informar (mesmo padrão do onSubmit)
    pendingSearchRef.current = message;
    hasTriggeredSearchRef.current = false; // Reset flag
    
    // Limpar produtos existentes para nova consulta
    setTopBox([]);
    setFeed([]);
    setCombina([]);
    
    // Adicionar mensagem do usuário
    setChatMessages(prev => [...prev, { type: 'user', text: message }]);
    
    // Limpar input
    setOverlayInput('');
    
    // Enviar para IA
    startStream(message);
  };

  // Auto-scroll para última mensagem com timing e suavidade
  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTo({
          top: chatScrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  // Auto-scroll quando mensagens mudam ou durante streaming
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, streaming, isTyping]);

  return (
    <>
      {/* WRAPPER RELATIVE para ancorar */} 
      <div className="w-full relative">
        {/* Barra = chat */}
        <form ref={chatRef} onSubmit={onSubmit} className="flex items-center gap-2 rounded-2xl px-4 py-2 bg-white shadow border">
          <div className="w-7 h-7 grid place-content-center text-lg">🤖</div>
          <input
            value={query}
            onChange={e => onChange(e.target.value)}
            onFocus={() => {
              setIsSearchFocused(true);
              onFocus();
            }}
            onBlur={(e) => {
              // Delay para permitir clique nas sugestões
              setTimeout(() => setIsSearchFocused(false), 200);
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder={isSearchFocused || query ? "Converse com o Click (ex.: iPhone 15 em CDE)" : (displayText || "Carregando frases...")}
            className="flex-1 outline-none text-base"
            data-testid="search-input"
          />
          <button className="px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90" type="submit">Click</button>
        </form>

        {/* DROPDOWN DE SUGESTÕES (aparece enquanto usuário digita) */}
        {showSuggestions && hasResults && !open && (
          <div className="absolute left-0 right-0 top-full mt-1 z-30">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-3 max-h-60 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => onSuggestionClick(suggestion)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full text-sm font-medium transition-colors border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                    data-testid={`suggestion-${index}`}
                  >
                    <Search className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-200">{suggestion}</span>
                  </button>
                ))}
              </div>
              {suggestionsLoading && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                  <div className="w-3 h-3 border border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-400 rounded-full animate-spin"></div>
                  Buscando sugestões...
                </div>
              )}
            </div>
          </div>
        )}

        {/* DROPDOWN ancorado (apenas Chat + 3 recomendados) */}
        {open && (
          <div className="absolute left-0 right-0 top-full mt-2 z-40">
            <div className="mx-auto max-w-5xl grid grid-cols-12 gap-4">
              {/* Chat com scroll */}
              <div className="col-span-12 lg:col-span-9">
                <div className="rounded-2xl border bg-white/90 backdrop-blur p-3 shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Click Assistant</div>
                  <div className="rounded-xl bg-gray-50 border p-3 max-h-[220px] overflow-auto">
                    {/* Saudação inicial se não houver mensagens */}
                    {chatMessages.length === 0 && !streaming && greeting && (
                      <div className="mb-2">{greeting}</div>
                    )}
                    
                    {/* Histórico de mensagens */}
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`mb-2 ${msg.type === 'user' ? 'text-right' : ''}`}>
                        {msg.type === 'user' ? (
                          <span className="inline-block bg-blue-500 text-white px-3 py-1 rounded-lg max-w-xs">{msg.text}</span>
                        ) : (
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                        )}
                      </div>
                    ))}
                    
                    {/* Indicador de digitação */}
                    {isTyping && (
                      <div className="mb-2 text-gray-500 italic">Click Assistant está digitando...</div>
                    )}
                    
                    {/* Streaming da resposta atual */}
                    {streaming && (
                      <div className="mb-2 whitespace-pre-wrap">{streaming}</div>
                    )}
                  </div>
                  {loadingSug && <div className="text-xs text-gray-500 mt-2">Buscando ofertas…</div>}
                </div>
              </div>

              {/* 3 recomendados */}
              <div className="col-span-12 lg:col-span-3">
                <div className="rounded-2xl border bg-white/90 backdrop-blur p-4 shadow-sm">
                  <div className="text-sm font-semibold mb-3">Produtos Recomendados</div>
                  {topBox.length === 0 ? (
                    <div className="text-xs text-gray-500">Converse comigo e eu trago as melhores opções!</div>
                  ) : (
                    <div className="grid gap-3">
                      {topBox.map(p => (
                        <button key={p.id} onClick={() => goProduct(p)} className="text-left p-3 rounded-xl border hover:shadow-sm transition" data-testid={`card-product-${p.id}`}>
                          <div className="flex items-start gap-2 mb-2">
                            {/* Logo da loja */}
                            <div className="w-6 h-6 flex-shrink-0">
                              <LazyImage
                                src={p.storeLogoUrl || '/api/placeholder/24/24'}
                                alt={p.storeName || 'Loja'}
                                className="w-full h-full object-contain bg-gray-50 rounded border"
                                placeholder="🏪"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate mb-1">{p.title}</div>
                              <div className="text-xs text-gray-500 mb-1">{p.storeName || p.category || '—'}</div>
                              <div className="text-sm">{p.price?.USD ? `USD ${p.price.USD}` : 'sem preço'}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* OVERLAY FIXO DE RESULTADOS (só aparece após submit) */}
      {showResults && (
        <div data-overlay className="fixed inset-0 z-[999] bg-black/20 backdrop-blur-sm">
          {/* Backdrop clickável */}
          <div className="absolute inset-0" onClick={closeResults}></div>
          
          {/* Container de resultados posicionado abaixo do chat */}
          <div 
            data-overlay
            className="absolute left-4 right-4 top-0 max-w-5xl mx-auto"
            style={{
              paddingTop: chatRef.current ? 
                (chatRef.current.getBoundingClientRect().bottom + 16) + 'px' : 
                '120px'
            }}
          >
            {/* Botão de fechar */}
            <div className="flex justify-end mb-2">
              <button 
                onClick={closeResults}
                className="bg-white/90 backdrop-blur rounded-full p-2 shadow-sm hover:bg-white transition"
                data-testid="button-close-results"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Chat replicado (fixo no topo do overlay) */}
            <div className="mb-4">
              <div className="rounded-2xl border bg-white/95 backdrop-blur p-3 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">Click Assistant</div>
                <div ref={chatScrollRef} className="rounded-xl bg-gray-50 border p-3 max-h-[300px] overflow-y-auto">
                  {/* Histórico de mensagens */}
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`mb-2 ${msg.type === 'user' ? 'text-right' : ''}`}>
                      {msg.type === 'user' ? (
                        <span className="inline-block bg-blue-500 text-white px-3 py-1 rounded-lg max-w-xs">{msg.text}</span>
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      )}
                    </div>
                  ))}
                  
                  {/* Indicador de digitação */}
                  {isTyping && (
                    <div className="mb-2 text-gray-500 italic">Click Assistant está digitando...</div>
                  )}
                  
                  {/* Streaming da resposta atual */}
                  {streaming && (
                    <div className="mb-2 whitespace-pre-wrap">{streaming}</div>
                  )}
                </div>
                
                {/* Campo para continuar conversa */}
                <form onSubmit={sendOverlayMessage} className="mt-3 flex gap-2">
                  <input
                    value={overlayInput}
                    onChange={(e) => setOverlayInput(e.target.value)}
                    placeholder="Continue a conversa..."
                    className="flex-1 px-3 py-2 rounded-lg border bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    data-testid="overlay-chat-input"
                  />
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
                    data-testid="overlay-send-button"
                  >
                    Enviar
                  </button>
                </form>
              </div>
            </div>

            {/* Container scrollável para resultados */}
            <div className="bg-white/95 backdrop-blur rounded-2xl border shadow-sm max-h-[50vh] overflow-auto">
              {/* Resultados principais */}
              <div className="p-4">
                <div className="text-sm font-semibold mb-3">Resultados da Pesquisa</div>
                {loadingSug || pendingSearchRef.current ? (
                  <div className="text-sm text-gray-500">Buscando ofertas…</div>
                ) : feed.length === 0 ? (
                  <div className="text-sm text-gray-500">Nada encontrado…</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {feed.map(p => (
                      <button key={p.id} onClick={() => goProduct(p)} className="text-left p-3 rounded-xl border hover:shadow-sm transition" data-testid={`card-product-${p.id}`}>
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-12 h-12 flex-shrink-0">
                            <LazyImage
                              src={p.imageUrl || '/api/placeholder/48/48'}
                              alt={p.title}
                              className="w-full h-full object-contain bg-gray-50 rounded-lg border"
                              placeholder="📦"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate mb-1">{p.title}</div>
                            <div className="flex items-center gap-2 mb-1">
                              {/* Logo da loja */}
                              <div className="w-4 h-4 flex-shrink-0">
                                <LazyImage
                                  src={p.storeLogoUrl || '/api/placeholder/16/16'}
                                  alt={p.storeName || 'Loja'}
                                  className="w-full h-full object-contain bg-gray-50 rounded"
                                  placeholder="🏪"
                                />
                              </div>
                              <span className="text-xs text-gray-600 truncate">{p.storeName || p.category || '—'}</span>
                            </div>
                            <div className="text-sm">{p.price?.USD ? `USD ${p.price.USD}` : 'sem preço'}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Seção "Combina com" */}
              {combina.length > 0 && (
                <div className="border-t p-4">
                  <div className="text-sm font-semibold mb-3">Combina com</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {combina.map(p => (
                      <button key={p.id} onClick={() => goProduct(p)} className="text-left p-3 rounded-xl border hover:shadow-sm transition" data-testid={`card-product-${p.id}`}>
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-12 h-12 flex-shrink-0">
                            <LazyImage
                              src={p.imageUrl || '/api/placeholder/48/48'}
                              alt={p.title}
                              className="w-full h-full object-contain bg-gray-50 rounded-lg border"
                              placeholder="📦"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate mb-1">{p.title}</div>
                            <div className="flex items-center gap-2 mb-1">
                              {/* Logo da loja */}
                              <div className="w-4 h-4 flex-shrink-0">
                                <LazyImage
                                  src={p.storeLogoUrl || '/api/placeholder/16/16'}
                                  alt={p.storeName || 'Loja'}
                                  className="w-full h-full object-contain bg-gray-50 rounded"
                                  placeholder="🏪"
                                />
                              </div>
                              <span className="text-xs text-gray-600 truncate">{p.storeName || p.category || '—'}</span>
                            </div>
                            <div className="text-sm">{p.price?.USD ? `USD ${p.price.USD}` : 'sem preço'}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}