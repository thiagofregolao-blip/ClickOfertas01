import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Gift, Star, Sparkles } from 'lucide-react';
import mascoteImage from '@/assets/mascote-click.png';

interface DailyScratchCard {
  id: string;
  cardNumber: string;
  isScratched: boolean;
  won: boolean;
  prizeType?: string;
  prizeValue?: string;
  prizeDescription?: string;
  couponCode?: string;
}

interface MiniScratchCardProps {
  card: DailyScratchCard;
  onScratch: (cardId: string) => void;
  processingCardId?: string;
}

interface MiniScratchCardProps {
  card: DailyScratchCard;
  onScratch: (cardId: string) => void;
  processingCardId?: string;
  funnyMessage?: FunnyMessage;
}

function MiniScratchCard({ card, onScratch, processingCardId, funnyMessage }: MiniScratchCardProps) {
  const [isRevealing, setIsRevealing] = useState(false);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const rafId = useRef<number | null>(null);
  const needsProgressCalc = useRef<boolean>(false);
  const lastScratchTime = useRef<number>(0);
  const revelationStarted = useRef<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastSoundTime = useRef<number>(0);

  const SCRATCH_THROTTLE = 16; // ~60fps
  const SOUND_COOLDOWN = 120; // ms entre sons
  
  // Reset scratching state when card changes
  useEffect(() => {
    if (card.isScratched) {
      setIsScratching(false);
      revelationStarted.current = false;
    }
  }, [card.isScratched, card.id]);

  // Inicializar canvas com mascote (adaptado do scratch-card.tsx)
  useEffect(() => {
    if (card.isScratched || revelationStarted.current) return;
    
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      const actualWidth = rect.width || 200;
      const actualHeight = rect.height || 110;
      
      canvas.width = Math.round(actualWidth * dpr);
      canvas.height = Math.round(actualHeight * dpr);
      ctx.scale(dpr, dpr);
      
      canvas.style.width = actualWidth + 'px';
      canvas.style.height = actualHeight + 'px';
      
      const cssWidth = actualWidth;
      const cssHeight = actualHeight;

      // Desenhar mascote como fundo
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, cssWidth, cssHeight);
        
        // Texto "RASPE AQUI" com contorno para contraste
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        
        // Contorno preto para destacar sobre o mascote
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.strokeText('RASPE AQUI', cssWidth / 2, cssHeight / 2);
        
        // Texto branco por cima
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('RASPE AQUI', cssWidth / 2, cssHeight / 2);
      };
      img.src = mascoteImage;
      
      startProgressLoop();
    }, 100);
  }, [card.id, card.isScratched]);

  // Medir progresso real por alpha (adaptado do scratch-card.tsx)
  const measureRealProgress = () => {
    if (!canvasRef.current || !needsProgressCalc.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    try {
      needsProgressCalc.current = false;
      const step = 10; // Progresso mais lento (era 6)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let transparent = 0;
      let total = 0;
      
      for (let i = 3; i < data.length; i += 4 * step) {
        total++;
        if (data[i] === 0) transparent++;
      }
      
      const progress = total > 0 ? transparent / total : 0;
      setScratchProgress(progress);
      
      // Revelar quando raspou 70% (aumentado de 50% para mais trabalho)
      if (progress >= 0.7 && !card.isScratched && !isRevealing && !revelationStarted.current) {
        revelationStarted.current = true;
        setIsRevealing(true);
        setIsScratching(false); // Reset scratching state
        
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
        
        setTimeout(() => {
          onScratch(card.id);
          setIsRevealing(false);
        }, 500); // Mais suspense (era 300ms)
      }
    } catch (e) {
      // Fallback silencioso
    }
  };
  
  // Loop de RAF para medição
  const startProgressLoop = () => {
    if (rafId.current) return;
    
    const loop = () => {
      measureRealProgress();
      rafId.current = requestAnimationFrame(loop);
    };
    
    rafId.current = requestAnimationFrame(loop);
  };
  
  // Cleanup do RAF
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, []);

  // Determinar se esta carta específica está sendo processada
  const isProcessing = processingCardId === card.id;

  // Função de scratch (adaptada do scratch-card.tsx)
  const handleScratch = (clientX: number, clientY: number) => {
    if (!canvasRef.current || card.isScratched || isProcessing || revelationStarted.current) return;
    
    // Indicar que começou a raspar na primeira interação
    if (!isScratching) {
      setIsScratching(true);
    }

    const now = Date.now();
    if (now - lastScratchTime.current < SCRATCH_THROTTLE) return;
    lastScratchTime.current = now;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const scratchRadius = 10; // Menor raio = mais trabalho (era 15)

    // Som de raspagem realista
    const soundNow = Date.now();
    if (soundNow - lastSoundTime.current >= SOUND_COOLDOWN) {
      try {
        // Criar AudioContext apenas uma vez
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const audioCtx = audioCtxRef.current;
        
        // Criar ruído branco filtrado para som "xiiii" sibilante
        const bufferSize = audioCtx.sampleRate * 0.15; // 150ms de áudio
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        // Gerar ruído branco
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        
        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        // Filtro passa-alta para enfatizar frequências sibilantes (xiiii)
        const highPassFilter = audioCtx.createBiquadFilter();
        highPassFilter.type = 'highpass';
        highPassFilter.frequency.setValueAtTime(2000 + Math.random() * 1000, audioCtx.currentTime); // 2-3kHz
        highPassFilter.Q.setValueAtTime(3, audioCtx.currentTime);
        
        // Gain para controlar volume
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.01); // Ataque rápido
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15); // Decay "xiiii"
        
        // Conectar: ruído -> filtro -> gain -> destino
        noiseSource.connect(highPassFilter);
        highPassFilter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        noiseSource.start(audioCtx.currentTime);
        noiseSource.stop(audioCtx.currentTime + 0.15);
        
        lastSoundTime.current = soundNow;
      } catch (e) {
        // Som não disponível no navegador
      }
    }

    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = scratchRadius * 2;
    
    if (lastPoint.current) {
      // Desenhar linha contínua
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      // Primeiro ponto - desenhar círculo
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.beginPath();
      ctx.arc(x, y, scratchRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    lastPoint.current = { x, y };
    needsProgressCalc.current = true;
    startProgressLoop();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (card.isScratched || isProcessing) return;
    setIsScratching(true);
    lastPoint.current = null;
    handleScratch(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsScratching(false);
    lastPoint.current = null;
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isScratching) {
      handleScratch(e.clientX, e.clientY);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (card.isScratched || isProcessing) return;
    setIsScratching(true);
    lastPoint.current = null;
    if (e.touches[0]) {
      handleScratch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    setIsScratching(false);
    lastPoint.current = null;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isScratching && e.touches[0]) {
      e.preventDefault();
      handleScratch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const getCardStyle = () => {
    if (card.isScratched) {
      return card.won 
        ? 'bg-gradient-to-br from-yellow-100 via-yellow-50 to-amber-100 border-yellow-300 shadow-yellow-200/50 shadow-lg transform scale-105' 
        : 'bg-gradient-to-br from-gray-100 via-gray-50 to-slate-100 border-gray-300 shadow-sm';
    }
    if (isRevealing) {
      return 'bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100 border-blue-300 shadow-lg';
    }
    if (isProcessing) {
      return 'bg-gradient-to-br from-orange-100 via-yellow-50 to-orange-100 border-orange-300 shadow-md';
    }
    return 'bg-gradient-to-br from-purple-100 via-indigo-50 to-blue-100 border-purple-300 cursor-pointer hover:shadow-lg transform hover:scale-105';
  };

  const getIcon = () => {
    if (card.isScratched) {
      return card.won ? (
        <Star className="w-6 h-6 text-yellow-600" />
      ) : (
        <div className="w-6 h-6 flex items-center justify-center text-gray-500 text-sm">😔</div>
      );
    }
    return <Gift className="w-6 h-6 text-purple-600" />;
  };

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0">
      {/* Círculo da raspaldinha */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 p-0.5 hover:scale-105 transition-transform cursor-pointer">
          <div 
            className={`
              w-full h-full rounded-full overflow-hidden flex items-center justify-center relative transition-all duration-300
              ${card.isScratched 
                ? card.won 
                  ? 'bg-gradient-to-br from-yellow-100 to-yellow-200' 
                  : 'bg-gradient-to-br from-gray-100 to-gray-200'
                : 'bg-gradient-to-br from-purple-100 to-pink-100'
              }
              ${isRevealing ? 'animate-pulse' : ''}
            `}
            data-testid={`scratch-card-${card.cardNumber}`}
          >
            {/* Ícone central */}
            <div className="flex flex-col items-center justify-center">
              {card.isScratched === true ? (
                card.won === true ? (
                  <Star className="w-8 h-8 text-yellow-600" />
                ) : (
                  <div className="w-8 h-8 flex items-center justify-center text-gray-500 text-xl">😔</div>
                )
              ) : isRevealing === true ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isProcessing === true ? (
                <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Gift className="w-8 h-8 text-purple-600" />
              )}
            </div>

            {/* Canvas de raspadinha para círculo */}
            {card.isScratched !== true && isRevealing !== true && isProcessing !== true && (
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full rounded-full cursor-pointer z-30"
                style={{ touchAction: 'none' }}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
              />
            )}
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="text-xs text-gray-600 w-20 text-center leading-tight">
        <span className="block truncate">Raspadinha {card.cardNumber}</span>
      </div>
    </div>
    </div>
  );
}

interface FunnyMessage {
  id: string;
  message: string;
  emoji: string;
  category: string;
}

export default function ThreeDailyScratchCards() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [funnyMessages, setFunnyMessages] = useState<{ [cardId: string]: FunnyMessage }>({});

  // Função para buscar mensagem engraçada aleatória
  const fetchFunnyMessage = async (): Promise<FunnyMessage> => {
    const response = await fetch('/api/funny-messages/random');
    if (!response.ok) {
      throw new Error('Failed to fetch funny message');
    }
    return await response.json();
  };

  // Buscar as cartas diárias
  const { data: cardsData, isLoading, isError, error } = useQuery({
    queryKey: ['/api/daily-scratch/cards'],
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // 30 segundos
  });

  const cards = (cardsData as any)?.cards || [];

  // 🐛 DEBUG: Status dos cards
  console.log('🎯 STATUS DOS CARDS:', {
    totalCards: cards.length,
    scratchedCards: cards.filter((c: DailyScratchCard) => c.isScratched).length,
    lostCards: cards.filter((c: DailyScratchCard) => c.isScratched && !c.won).length,
    funnyMessagesCount: Object.keys(funnyMessages).length,
    funnyMessages: Object.keys(funnyMessages).map(id => ({
      id,
      message: funnyMessages[id]?.message,
      emoji: funnyMessages[id]?.emoji
    }))
  });

  // 🎯 NOVO: Buscar frases para cards perdidos que já existem
  useEffect(() => {
    if (!cards.length) return;
    
    const loadFunnyMessagesForExistingCards = async () => {
      // Encontrar cards que perderam e precisam de frase
      const cardsNeedingMessages = cards.filter((card: DailyScratchCard) => 
        card.isScratched && !card.won && !funnyMessages[card.id]
      );
      
      console.log('🔍 Cards que perderam e precisam de frase:', {
        totalLostCards: cards.filter((c: DailyScratchCard) => c.isScratched && !c.won).length,
        cardsNeedingMessages: cardsNeedingMessages.length,
        details: cardsNeedingMessages.map(c => ({ id: c.id, cardNumber: c.cardNumber }))
      });
      
      if (cardsNeedingMessages.length === 0) {
        return;
      }
      
      // Buscar frases para todos os cards que precisam
      for (const card of cardsNeedingMessages) {
        console.log(`📝 Buscando frase para card ${card.cardNumber}...`);
        try {
          const message = await fetchFunnyMessage();
          console.log(`✅ Frase encontrada para card ${card.cardNumber}:`, message);
          setFunnyMessages(prev => {
            const updated = {
              ...prev,
              [card.id]: message
            };
            console.log('🎭 Frases atualizadas:', updated);
            return updated;
          });
          
          // Pequeno delay para evitar sobrecarga
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`❌ Erro ao buscar frase para card ${card.cardNumber}:`, error);
        }
      }
    };

    loadFunnyMessagesForExistingCards();
  }, [cards]); // Executar quando as cartas carregarem

  // Mutation para raspar uma carta
  const scratchMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const res = await apiRequest('POST', `/api/daily-scratch/cards/${cardId}/scratch`);
      const data = await res.json();
      return data;
    },
    onSuccess: async (data: any, cardId: string) => {
      // Invalidar queries para atualizar estado
      queryClient.invalidateQueries({ queryKey: ['/api/daily-scratch/cards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-scratch/stats'] });
      
      // Se perdeu, buscar uma mensagem engraçada para esta carta
      if (!data.won) {
        try {
          const funnyMessage = await fetchFunnyMessage();
          setFunnyMessages(prev => ({
            ...prev,
            [cardId]: funnyMessage
          }));
        } catch (error) {
          console.error('Failed to fetch funny message:', error);
        }
      }
      
      // Mostrar resultado
      toast({
        title: data.won ? "🎉 Parabéns!" : "😔 Que azar!",
        description: data.message,
        variant: data.won ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao raspar",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="w-full space-y-[5px]">
        {/* Primeira linha skeleton */}
        <div className="grid grid-cols-3 gap-[5px] h-[110px]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
        {/* Segunda linha skeleton */}
        <div className="grid grid-cols-3 gap-[5px] h-[110px]">
          {[4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-sm text-red-600 p-4 bg-red-50 rounded-lg">
        Falha ao carregar as raspadinhas: {(error as any)?.message || 'erro desconhecido'}
      </div>
    );
  }

  if (cards.length === 0) {
    return null;
  }

  // Organizar as 6 cartas em duas linhas horizontais de 3 cada
  const card1 = cards.find((c: DailyScratchCard) => c.cardNumber === '1');
  const card2 = cards.find((c: DailyScratchCard) => c.cardNumber === '2');
  const card3 = cards.find((c: DailyScratchCard) => c.cardNumber === '3');
  const card4 = cards.find((c: DailyScratchCard) => c.cardNumber === '4');
  const card5 = cards.find((c: DailyScratchCard) => c.cardNumber === '5');
  const card6 = cards.find((c: DailyScratchCard) => c.cardNumber === '6');

  return (
    <>
      {/* Apenas 3 raspadinhas em linha horizontal */}
      {card1 && (
        <MiniScratchCard
          card={card1}
          onScratch={scratchMutation.mutate}
          processingCardId={scratchMutation.isPending ? scratchMutation.variables : undefined}
          funnyMessage={funnyMessages[card1.id]}
        />
      )}
      {card2 && (
        <MiniScratchCard
          card={card2}
          onScratch={scratchMutation.mutate}
          processingCardId={scratchMutation.isPending ? scratchMutation.variables : undefined}
          funnyMessage={funnyMessages[card2.id]}
        />
      )}
      {card3 && (
        <MiniScratchCard
          card={card3}
          onScratch={scratchMutation.mutate}
          processingCardId={scratchMutation.isPending ? scratchMutation.variables : undefined}
          funnyMessage={funnyMessages[card3.id]}
        />
      )}
    </>
  );
}