import { useState, useEffect, useMemo, useRef } from 'react';
import { LazyImage } from './lazy-image';

// Sessão simples por usuário (cache 1h)
const sessionCache = new Map();
const ONE_HOUR = 60 * 60 * 1000;

export default function AssistantBar() {
  const uid = useMemo(() => localStorage.getItem('uid') || (localStorage.setItem('uid','u-'+Math.random().toString(36).slice(2,8)), localStorage.getItem('uid')!), []);
  const userName = useMemo(() => localStorage.getItem('userName') || 'Cliente', []);
  
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

  // Estados para animações da barra de busca
  const [displayText, setDisplayText] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            setSessionId(id);
            sessionCache.set(key, { id, ts: now });
            if (data.greeting) setGreeting(data.greeting);
            if (data.suggest?.products) {
              const products = data.suggest.products;
              setTopBox(products.slice(0, 3));
              setFeed(products.slice(3));
            }
          }
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
  };

  const onChange = (value: string) => {
    setQuery(value);
    
    // Só limpar dados se não estiver mostrando resultados (overlay ativo)
    if (!value.trim() && !showResults) {
      setFeed([]);
      setTopBox([]);
      setCombina([]);
      return;
    }
    
    if (value.trim()) {
      fetchSuggest(value.trim());
    }
  };

  const fetchSuggest = async (term: string) => {
    setLoadingSug(true);
    try {
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
    
    // Armazenar termo para buscar após o chat informar
    pendingSearchRef.current = t;
    hasTriggeredSearchRef.current = false; // Reset flag
    
    // Limpar produtos existentes
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
    if (readerRef.current) {
      try { await readerRef.current.cancel(); } catch {}
      readerRef.current = null;
    }
    
    // Mostrar indicador de digitação
    setIsTyping(true);
    setStreaming('');
    
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
      
      // Remover indicador de digitação quando começar a receber resposta
      setIsTyping(false);
      
      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessage = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        
        for (const chunk of parts) {
          const line = chunk.trim().replace(/^data:\s?/, '');
          try {
            const p = JSON.parse(line);
            if (p.type === 'chunk' && p.text) {
              assistantMessage += p.text;
              setStreaming(assistantMessage);
              
              // Detectar quando assistente fala sobre buscar e executar busca pendente (apenas uma vez)
              if (pendingSearchRef.current && !hasTriggeredSearchRef.current && 
                  (assistantMessage.toLowerCase().includes('busca') || 
                   assistantMessage.toLowerCase().includes('procurando') ||
                   assistantMessage.toLowerCase().includes('opções') ||
                   assistantMessage.toLowerCase().includes('aqui estão') ||
                   assistantMessage.toLowerCase().includes('vou buscar') ||
                   assistantMessage.toLowerCase().includes('procurar'))) {
                fetchSuggest(pendingSearchRef.current);
                hasTriggeredSearchRef.current = true;
                pendingSearchRef.current = ''; // Limpar busca pendente
              }
            } else if (p.type === 'end') {
              // Fallback: se ainda há busca pendente, executar agora
              if (pendingSearchRef.current && !hasTriggeredSearchRef.current) {
                fetchSuggest(pendingSearchRef.current);
                hasTriggeredSearchRef.current = true;
                pendingSearchRef.current = '';
              }
              
              // Adicionar mensagem completa do assistente ao chat
              setChatMessages(prev => [...prev, { type: 'assistant', text: assistantMessage }]);
              setStreaming('');
              return;
            }
          } catch {
            assistantMessage += line;
            setStreaming(assistantMessage);
          }
        }
      }
      
      // Se terminar sem 'end', ainda adicionar a mensagem
      if (assistantMessage) {
        setChatMessages(prev => [...prev, { type: 'assistant', text: assistantMessage }]);
        setStreaming('');
      }
    } catch (e) {
      console.error('Stream error:', e);
      setIsTyping(false);
    }
  };

  const goProduct = (p: any) => {
    if (p?.id) window.location.href = `/produto/${encodeURIComponent(p.id)}`;
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
    
    // Armazenar termo para buscar após o chat informar (mesmo padrão do onSubmit)
    pendingSearchRef.current = message;
    hasTriggeredSearchRef.current = false; // Reset flag
    
    // Adicionar mensagem do usuário
    setChatMessages(prev => [...prev, { type: 'user', text: message }]);
    
    // Limpar input
    setOverlayInput('');
    
    // Enviar para IA
    startStream(message);
  };

  // Auto-scroll para última mensagem
  const scrollToBottom = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
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
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white grid place-content-center text-xs">🤖</div>
          <input
            value={query}
            onChange={e => onChange(e.target.value)}
            onFocus={() => {
              setIsSearchFocused(true);
              onFocus();
            }}
            onBlur={() => setIsSearchFocused(false)}
            placeholder={isSearchFocused || query ? "Converse com o Click (ex.: iPhone 15 em CDE)" : (displayText || "Carregando frases...")}
            className="flex-1 outline-none text-base"
            data-testid="search-input"
          />
          <button className="px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90" type="submit">Enviar</button>
        </form>

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
                          <div className="font-medium truncate mb-1">{p.title}</div>
                          <div className="text-xs text-gray-500 mb-2">{p.category || '—'}</div>
                          <div className="text-sm">{p.price?.USD ? `USD ${p.price.USD}` : 'sem preço'}</div>
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
                <div ref={chatScrollRef} className="rounded-xl bg-gray-50 border p-3 max-h-[200px] overflow-auto">
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
                            <div className="text-xs text-gray-500 mb-1">{p.category || '—'}</div>
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
                            <div className="text-xs text-gray-500 mb-1">{p.category || '—'}</div>
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