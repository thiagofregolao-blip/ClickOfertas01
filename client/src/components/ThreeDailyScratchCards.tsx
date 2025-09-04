import { useState, useEffect } from 'react';
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

function MiniScratchCard({ card, onScratch, isScratching }: MiniScratchCardProps) {
  const [isRevealing, setIsRevealing] = useState(false);

  const handleScratch = () => {
    if (card.isScratched || isScratching) return;
    
    setIsRevealing(true);
    setTimeout(() => {
      onScratch(card.id);
      setIsRevealing(false);
    }, 500);
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
        relative w-full aspect-square p-3 rounded-lg border-2 transition-all duration-300
        ${getCardStyle()}
        ${isRevealing ? 'animate-pulse' : ''}
        ${!card.isScratched ? 'shadow-md hover:shadow-xl' : 'shadow-sm'}
      `}
      onClick={handleScratch}
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

      {/* Efeito sparkle para cartas não raspadas */}
      {!card.isScratched && (
        <Sparkles className="absolute top-2 right-2 w-3 h-3 text-purple-400 animate-pulse" />
      )}
    </div>
  );
}

export default function ThreeDailyScratchCards() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar as 3 cartas diárias
  const { data: cardsData, isLoading } = useQuery({
    queryKey: ['/api/daily-scratch/cards'],
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // 30 segundos
  });

  const cards = cardsData?.cards || [];

  // Mutation para raspar uma carta
  const scratchMutation = useMutation({
    mutationFn: async (cardId: string) => {
      return await apiRequest(`/api/daily-scratch/cards/${cardId}/scratch`, 'POST');
    },
    onSuccess: (data) => {
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
      <div className="space-y-[5px]">
        {[1, 2].map((i) => (
          <div key={i} className="w-[400px] h-[110px] bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return null;
  }

  // Organizar as 3 cartas em layout 2x2 (onde a terceira fica embaixo das duas primeiras)
  const card1 = cards.find((c: DailyScratchCard) => c.cardNumber === '1');
  const card2 = cards.find((c: DailyScratchCard) => c.cardNumber === '2');
  const card3 = cards.find((c: DailyScratchCard) => c.cardNumber === '3');

  return (
    <div className="space-y-[5px]">
      {/* Linha superior: 2 cartas lado a lado */}
      <div className="grid grid-cols-2 gap-[5px] w-[400px] h-[110px]">
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
      </div>
      
      {/* Linha inferior: 1 carta centralizada */}
      <div className="flex justify-center w-[400px] h-[110px]">
        {card3 && (
          <div className="w-[195px]">
            <MiniScratchCard
              card={card3}
              onScratch={scratchMutation.mutate}
              isScratching={scratchMutation.isPending}
            />
          </div>
        )}
      </div>
    </div>
  );
}