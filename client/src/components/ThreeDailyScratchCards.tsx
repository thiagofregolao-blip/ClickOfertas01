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
  isScratching: boolean;
}

function MiniScratchCard({ card, onScratch, isScratching: isProcessing }: MiniScratchCardProps) {
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

  // Função de scratch (adaptada do scratch-card.tsx)
  const handleScratch = (clientX: number, clientY: number) => {
    if (!canvasRef.current || card.isScratched || isProcessing || revelationStarted.current) return;

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
    <div
      className={`
        relative w-full h-[110px] p-3 rounded-lg border-2 transition-all duration-300
        ${getCardStyle()}
        ${isRevealing ? 'animate-pulse' : ''}
        ${!card.isScratched ? 'shadow-md hover:shadow-xl' : 'shadow-sm'}
      `}
      data-testid={`scratch-card-${card.cardNumber}`}
    >
      {/* Número da carta */}
      <div className="absolute top-1 left-1 w-5 h-5 bg-white/80 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
        {card.cardNumber}
      </div>

      {/* Debug temporário */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-0 right-0 text-xs bg-red-100 p-1 rounded z-50">
          {card.isScratched ? 'RASPADA' : 'NOVA'}
        </div>
      )}

      {/* Conteúdo principal */}
      <div className="h-full flex flex-col items-center justify-center space-y-2 relative z-20">
        {getIcon()}
        
        {card.isScratched ? (
          card.won ? (
            <div className="text-center animate-bounce-once">
              <div className="text-xs font-bold text-yellow-700 mb-1">🎉 GANHOU!</div>
              <div className="text-xs text-yellow-600 font-medium">
                {card.prizeValue?.includes('%') 
                  ? `${card.prizeValue} OFF` 
                  : `R$ ${card.prizeValue}`
                }
              </div>
              <div className="text-xs text-yellow-500 mt-1 font-semibold">✨ Parabéns! ✨</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-xs font-medium text-gray-500">😔 Não foi dessa vez</div>
              <div className="text-xs text-gray-400">Tente Novamente</div>
              <div className="text-xs text-gray-400">Amanhã</div>
            </div>
          )
        ) : isRevealing ? (
          <div className="text-center animate-pulse">
            <div className="text-xs font-medium text-blue-700">✨ Revelando...</div>
            <div className="text-xs font-bold text-blue-600">PRÊMIO</div>
          </div>
        ) : isProcessing ? (
          <div className="text-center">
            <div className="text-xs font-medium text-orange-700">⏳ Processando...</div>
            <div className="text-xs font-bold text-orange-600">AGUARDE</div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-xs font-medium text-purple-700">Clique para</div>
            <div className="text-xs font-bold text-purple-600">RASPAR</div>
          </div>
        )}
      </div>

      {/* Animação de raspagem aprimorada */}
      {isRevealing && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 opacity-60 rounded-lg animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        </>
      )}

      {/* Animação de confete para prêmios ganhos */}
      {card.isScratched && card.won && !isRevealing && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-bounce"
              style={{
                left: `${20 + (i * 10)}%`,
                top: `${10 + (i % 3) * 20}%`,
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][i % 6],
                animationDelay: `${i * 100}ms`,
                animationDuration: '1.5s'
              }}
            />
          ))}
        </div>
      )}

      {/* Canvas de raspadinha APENAS para cartas não raspadas */}
      {!card.isScratched && !isRevealing && !isProcessing && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full rounded-lg cursor-pointer z-10"
          style={{ touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        />
      )}
      
      {/* Efeito sparkle para cartas não raspadas */}
      {!card.isScratched && (
        <Sparkles className="absolute top-2 right-2 w-3 h-3 text-purple-400 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}

export default function ThreeDailyScratchCards() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar as 3 cartas diárias
  const { data: cardsData, isLoading, isError, error } = useQuery({
    queryKey: ['/api/daily-scratch/cards'],
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // 30 segundos
  });

  const cards = (cardsData as any)?.cards || [];

  // Mutation para raspar uma carta
  const scratchMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const res = await apiRequest('POST', `/api/daily-scratch/cards/${cardId}/scratch`);
      const data = await res.json();
      return data;
    },
    onSuccess: (data: any) => {
      // Invalidar queries para atualizar estado
      queryClient.invalidateQueries({ queryKey: ['/api/daily-scratch/cards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-scratch/stats'] });
      
      // Mostrar resultado
      toast({
        title: data.won ? "🎉 Parabéns!" : "😔 Não foi dessa vez!",
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
    <div className="w-full space-y-[5px]">
      {/* Primeira linha: cartas 1, 2, 3 */}
      <div className="grid grid-cols-3 gap-[5px] w-full h-[110px]">
        {card1 && (
          <MiniScratchCard
            card={card1}
            onScratch={scratchMutation.mutate}
            isScratching={scratchMutation.isPending}
          />
        )}
        {card2 && (
          <MiniScratchCard
            card={card2}
            onScratch={scratchMutation.mutate}
            isScratching={scratchMutation.isPending}
          />
        )}
        {card3 && (
          <MiniScratchCard
            card={card3}
            onScratch={scratchMutation.mutate}
            isScratching={scratchMutation.isPending}
          />
        )}
      </div>
      
      {/* Segunda linha: cartas 4, 5, 6 */}
      <div className="grid grid-cols-3 gap-[5px] w-full h-[110px]">
        {card4 && (
          <MiniScratchCard
            card={card4}
            onScratch={scratchMutation.mutate}
            isScratching={scratchMutation.isPending}
          />
        )}
        {card5 && (
          <MiniScratchCard
            card={card5}
            onScratch={scratchMutation.mutate}
            isScratching={scratchMutation.isPending}
          />
        )}
        {card6 && (
          <MiniScratchCard
            card={card6}
            onScratch={scratchMutation.mutate}
            isScratching={scratchMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}