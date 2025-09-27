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
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  placeholder={isSearchFocused || searchInput ? "Digite sua busca..." : (displayText || "Digite sua busca...")}
                  className="bg-white/90 border border-white/50 text-gray-800 placeholder-gray-600"
                  data-testid="search-input"
                />
                {searchInput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                    onClick={() => setSearchInput('')}
                    data-testid="button-clear-search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                onClick={handleSearch}
                className="bg-white/90 hover:bg-white text-primary border border-white/50"
                data-testid="button-search"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>

    </>
  );
}