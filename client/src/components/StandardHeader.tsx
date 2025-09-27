import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation, Link } from "wouter";
import { Search, X, BarChart3, Sparkles } from "lucide-react";
import AssistantBar from "@/components/AssistantBar";
import { useIsMobile } from "@/hooks/use-mobile";


export default function StandardHeader() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const isMobile = useIsMobile();

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


  const handleSearch = () => {
    if (searchInput.trim()) {
      setLocation(`/cards?search=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      const query = searchInput.trim();
      console.log('📤 [Header] Disparando evento assistant:submit:', { query, source: 'header' });
      
      // Verificar se há listeners registrados
      const listeners = (window as any)._eventListeners || {};
      console.log('👂 [Header] Event listeners registrados:', Object.keys(listeners));
      
      // Disparar evento para o AssistantBar processar
      const event = new CustomEvent('assistant:submit', { 
        detail: { source: 'header', query } 
      });
      
      console.log('🚀 [Header] Evento criado e sendo disparado:', event);
      window.dispatchEvent(event);
    }
  };


  return (
    <>
    {/* Componente completo do assistente OpenAI */}
    <AssistantBar />
    
    <div className="sticky top-0 z-50" style={{background: 'linear-gradient(to bottom right, #F04940, #FA7D22)'}}>
      <div className={`py-4 px-2 ${isMobile ? 'px-4' : 'ml-[5%]'}`}>
        
        {/* Segunda linha: Barra de Busca (Mobile abaixo, Desktop na linha anterior) */}
        {isMobile && (
          <div className="mb-2">
            {/* Barra Premium Gemini - Design modernizado */}
            <div className="w-full relative">
              <form 
                className="w-full relative" 
                onSubmit={(e) => { 
                  e.preventDefault();
                  const query = searchInput.trim();
                  window.dispatchEvent(new CustomEvent('assistant:submit', { 
                    detail: { source: 'header', query } 
                  }));
                }}
                data-anchor="search-form"
              >
                <div className="relative flex items-center bg-gradient-to-r from-primary/5 to-orange-50 dark:from-primary/10 dark:to-orange-950/30 border-2 border-primary/20 dark:border-primary/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group">
                  
                  {/* Ícone Gemini */}
                  <div className="absolute left-4 flex items-center">
                    <Sparkles className="h-5 w-5 text-primary dark:text-primary/80" />
                  </div>
                  
                  {/* Input */}
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder={isSearchFocused || searchInput ? "🤖 Gemini: Ask-then-show - busca inteligente..." : (displayText || "🤖 Gemini: Ask-then-show - busca inteligente...")}
                    className="w-full pl-12 pr-20 py-4 text-lg bg-transparent border-0 outline-none placeholder-primary/60 dark:placeholder-primary/70 text-gray-900 dark:text-gray-100"
                    data-testid="search-input"
                    autoComplete="off"
                  />
                  
                  {/* Botão de busca modernizado */}
                  <button
                    type="submit"
                    disabled={!searchInput.trim()}
                    className="absolute right-4 flex items-center justify-center w-10 h-10 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="button-search-submit"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </div>
                
                {/* Badge Gemini - Visível e bem posicionado */}
                <div className="absolute -top-2 left-6 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-md">
                  GEMINI AI
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>

    </>
  );
}