import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation, Link } from "wouter";
import { Search, X, BarChart3 } from "lucide-react";
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
      </div>
    </div>

    </>
  );
}