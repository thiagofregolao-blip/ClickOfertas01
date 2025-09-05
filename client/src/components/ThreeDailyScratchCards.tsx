import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Gift, Star, Sparkles } from 'lucide-react';

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
  const [scratchPercentage, setScratchPercentage] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Inicializar canvas quando componente monta
  useEffect(() => {
    if (card.isScratched) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    setCanvasSize({ width, height });
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Criar overlay de raspadinha (cor prata/cinza)
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(0, 0, width, height);
    
    // Adicionar padrão de raspadinha
    ctx.fillStyle = '#A0A0A0';
    for (let i = 0; i < width; i += 10) {
      for (let j = 0; j < height; j += 10) {
        if ((i + j) % 20 === 0) {
          ctx.fillRect(i, j, 5, 5);
        }
      }
    }
    
    // Texto "RASPE AQUI"
    ctx.fillStyle = '#666';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RASPE AQUI', width / 2, height / 2);
  }, [card.isScratched, canvasSize.width]);

  const handleScratch = (clientX: number, clientY: number) => {
    if (card.isScratched || isProcessing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Configurar modo de "apagamento"
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, 2 * Math.PI);
    ctx.fill();
    
    // Calcular porcentagem raspada
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;
    
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 255) transparentPixels++;
    }
    
    const percentage = (transparentPixels / (pixels.length / 4)) * 100;
    setScratchPercentage(percentage);
    
    // Se raspou mais de 40%, revelar automaticamente
    if (percentage > 40 && !isRevealing) {
      setIsRevealing(true);
      setTimeout(() => {
        onScratch(card.id);
        setIsRevealing(false);
      }, 300);
    }
  };

  const handleMouseDown = () => setIsScratching(true);
  const handleMouseUp = () => setIsScratching(false);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isScratching) {
      handleScratch(e.clientX, e.clientY);
    }
  };

  const handleTouchStart = () => setIsScratching(true);
  const handleTouchEnd = () => setIsScratching(false);
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isScratching && e.touches[0]) {
      e.preventDefault();
      handleScratch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const getCardStyle = () => {
    if (card.isScratched) {
      return card.won 
        ? 'bg-gradient-to-br from-yellow-100 via-yellow-50 to-amber-100 border-yellow-300 shadow-yellow-200/50' 
        : 'bg-gradient-to-br from-gray-100 via-gray-50 to-slate-100 border-gray-300';
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

      {/* Conteúdo principal */}
      <div className="h-full flex flex-col items-center justify-center space-y-2">
        {getIcon()}
        
        {card.isScratched ? (
          card.won ? (
            <div className="text-center">
              <div className="text-xs font-bold text-yellow-700 mb-1">🎉 GANHOU!</div>
              <div className="text-xs text-yellow-600 font-medium">
                {card.prizeValue?.includes('%') 
                  ? `${card.prizeValue} OFF` 
                  : `R$ ${card.prizeValue}`
                }
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-xs font-medium text-gray-500">Tente Novamente</div>
              <div className="text-xs text-gray-400">Amanhã</div>
            </div>
          )
        ) : (
          <div className="text-center">
            <div className="text-xs font-medium text-purple-700">Clique para</div>
            <div className="text-xs font-bold text-purple-600">RASPAR</div>
          </div>
        )}
      </div>

      {/* Animação de raspagem */}
      {isRevealing && (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 opacity-50 rounded-lg animate-pulse" />
      )}

      {/* Canvas de raspadinha para cartas não raspadas */}
      {!card.isScratched && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full rounded-lg cursor-pointer"
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

  const cards = cardsData?.cards || [];

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
      <div className="w-full">
        <div className="grid grid-cols-3 gap-[5px] h-[110px]">
          {[1, 2, 3].map((i) => (
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

  // Organizar as 3 cartas em uma linha horizontal
  const card1 = cards.find((c: DailyScratchCard) => c.cardNumber === '1');
  const card2 = cards.find((c: DailyScratchCard) => c.cardNumber === '2');
  const card3 = cards.find((c: DailyScratchCard) => c.cardNumber === '3');

  return (
    <div className="w-full">
      {/* 3 cartas em linha horizontal com mesma largura do banner */}
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
    </div>
  );
}