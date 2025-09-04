import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Gift, Sparkles, Calendar, Trophy, Star } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import mascoteImage from '@/assets/mascote-click.png';

interface ScratchArea {
  x: number;
  y: number;
  radius: number;
}

interface DailyPrize {
  id: string;
  name: string;
  description: string;
  prizeType: string;
  discountPercentage?: number;
  discountValue?: number;
}

interface DailyAttemptResponse {
  canAttempt: boolean;
  hasWon: boolean;
  prizeWon?: DailyPrize;
  lastAttemptDate?: string;
}

interface ScratchAttemptResponse {
  success: boolean;
  won: boolean;
  prize?: DailyPrize;
  message: string;
  nextAttemptIn: string;
}

export default function DailyScratchCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Estados do componente
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [scratchResult, setScratchResult] = useState<ScratchAttemptResponse | null>(null);
  const [revelationStarted, setRevelationStarted] = useState(false);
  
  // Estados do canvas
  const scratchedAreas = useRef<ScratchArea[]>([]);
  const rafId = useRef<number | null>(null);
  const needsProgressCalc = useRef<boolean>(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const lastScratchTime = useRef<number>(0);
  const SCRATCH_THROTTLE = 16; // ~60fps

  // Verificar status da tentativa diária
  const { data: attemptStatus, isLoading } = useQuery<DailyAttemptResponse>({
    queryKey: ['/api/daily-scratch/attempt'],
    retry: false,
  });

  // Mutation para fazer tentativa diária
  const scratchAttemptMutation = useMutation({
    mutationFn: async (): Promise<ScratchAttemptResponse> => {
      const response = await fetch('/api/daily-scratch/attempt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`${response.status}: ${error}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setScratchResult(data);
      setShowResultModal(true);
      
      toast({
        title: data.won ? "🎉 Parabéns!" : "😔 Que pena!",
        description: data.message,
        variant: data.won ? "default" : "destructive",
      });
      
      // Invalidar cache para atualizar status
      queryClient.invalidateQueries({ queryKey: ['/api/daily-scratch/attempt'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na tentativa",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Inicializar canvas
  useEffect(() => {
    if (isRevealed || !attemptStatus?.canAttempt) return;
    
    setTimeout(() => {
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Reset estados
      scratchedAreas.current = [];
      setScratchProgress(0);
      setIsFading(false);
      lastPoint.current = null;
      needsProgressCalc.current = false;

      // Configurar canvas com DPI correto
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      const actualHeight = rect.height || 300;
      const actualWidth = rect.width || 300;
      
      canvas.width = Math.round(actualWidth * dpr);
      canvas.height = Math.round(actualHeight * dpr);
      ctx.scale(dpr, dpr);
      
      canvas.style.width = actualWidth + 'px';
      canvas.style.height = actualHeight + 'px';
      
      const cssWidth = actualWidth;
      const cssHeight = actualHeight;

      // Desenhar fundo com mascote
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, cssWidth, cssHeight);
        
        // Overlay semi-transparente
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, cssWidth, cssHeight);
        
        // Símbolos decorativos
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 8;
        
        // Estrelas nos cantos
        ctx.fillText('⭐', cssWidth * 0.15, cssHeight * 0.15);
        ctx.fillText('🎁', cssWidth * 0.85, cssHeight * 0.15);
        ctx.fillText('🎯', cssWidth * 0.15, cssHeight * 0.85);
        ctx.fillText('💎', cssWidth * 0.85, cssHeight * 0.85);
        
        // Texto principal
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        
        const lines = ['RASPADINHA', 'DIÁRIA', '🎉', 'Raspe aqui', 'e ganhe prêmios', 'incríveis!'];
        const lineHeight = 28;
        const startY = cssHeight / 2 - (lines.length * lineHeight) / 2;
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.shadowBlur = 4;
        
        lines.forEach((line, index) => {
          const x = cssWidth / 2;
          const y = startY + (index * lineHeight);
          
          // Contorno preto
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 4;
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          ctx.strokeText(line, x, y);
          
          // Texto branco por cima
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(line, x, y);
        });
      };
      img.src = mascoteImage;
      
      startProgressLoop();
    }, 100);
  }, [attemptStatus?.canAttempt, isRevealed]);

  // Função para medir progresso real
  const measureRealProgress = () => {
    if (!canvasRef.current || !needsProgressCalc.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    try {
      needsProgressCalc.current = false;
      const step = 8; // Amostragem otimizada
      
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
      
      // Revelar quando progresso suficiente
      if (progress >= 0.6 && !isRevealed && !isFading && !revelationStarted) {
        setRevelationStarted(true);
        setIsFading(true);
        
        // Parar loop
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
        
        setTimeout(() => {
          setIsRevealed(true);
          
          // Fazer tentativa no servidor
          scratchAttemptMutation.mutate();
        }, 500);
      }
    } catch (e) {
      // Fallback silencioso
    }
  };
  
  // Loop de animação
  const startProgressLoop = () => {
    if (rafId.current) return;
    
    const loop = () => {
      measureRealProgress();
      rafId.current = requestAnimationFrame(loop);
    };
    
    rafId.current = requestAnimationFrame(loop);
  };
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, []);

  // Função de scratch
  const handleScratch = (clientX: number, clientY: number) => {
    if (!canvasRef.current || isRevealed || !attemptStatus?.canAttempt) return;

    // Throttle
    const now = Date.now();
    if (now - lastScratchTime.current < SCRATCH_THROTTLE) return;
    lastScratchTime.current = now;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const scratchRadius = 30;

    // Configurar desenho
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = scratchRadius * 2;
    
    if (lastPoint.current) {
      // Linha contínua
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      // Primeiro ponto
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.beginPath();
      ctx.arc(x, y, scratchRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    lastPoint.current = { x, y };
    needsProgressCalc.current = true;
    startProgressLoop();
  };

  // Event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!attemptStatus?.canAttempt || isRevealed) return;
    setIsScratching(true);
    lastPoint.current = null;
    handleScratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isScratching) {
      handleScratch(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    setIsScratching(false);
    lastPoint.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!attemptStatus?.canAttempt || isRevealed) return;
    setIsScratching(true);
    lastPoint.current = null;
    const touch = e.touches[0];
    handleScratch(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isScratching) {
      const touch = e.touches[0];
      handleScratch(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsScratching(false);
    lastPoint.current = null;
  };

  // Calcular próxima tentativa
  const getNextAttemptTime = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Carregando...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="relative overflow-hidden border-2 border-gradient-to-r from-yellow-400 to-orange-500">
        <div className="absolute top-4 left-4 z-10">
          <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold">
            <Calendar className="w-4 h-4 mr-1" />
            DIÁRIA
          </Badge>
        </div>
        
        <div className="absolute top-4 right-4 z-10">
          <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
            <Clock className="w-4 h-4 mr-1" />
            {attemptStatus?.canAttempt ? "Disponível" : `${getNextAttemptTime()}`}
          </Badge>
        </div>

        <CardContent className="p-0 relative">
          {!attemptStatus?.canAttempt ? (
            // Já tentou hoje
            <div className="h-80 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600">
              <div className="text-center space-y-4">
                <div className="text-6xl mb-4">
                  {attemptStatus?.hasWon ? "🎉" : "😔"}
                </div>
                <h3 className="text-xl font-bold">
                  {attemptStatus?.hasWon ? "Você ganhou hoje!" : "Já tentou hoje!"}
                </h3>
                <p className="text-gray-500 max-w-xs">
                  {attemptStatus?.hasWon 
                    ? `Prêmio: ${attemptStatus.prizeWon?.name || 'Desconto especial'}`
                    : "Volte amanhã para uma nova chance de ganhar prêmios incríveis!"
                  }
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Próxima tentativa em {getNextAttemptTime()}</span>
                </div>
              </div>
            </div>
          ) : (
            // Pode tentar hoje
            <div className="relative h-80">
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full cursor-crosshair touch-none select-none ${
                  isFading ? 'animate-fade-out' : ''
                }`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                data-testid="daily-scratch-canvas"
              />
              
              {isRevealed && scratchAttemptMutation.isPending && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Processando resultado...</p>
                  </div>
                </div>
              )}
              
              {/* Indicador de progresso */}
              {scratchProgress > 0 && scratchProgress < 0.6 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {Math.round(scratchProgress * 100)}%
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Header informativo */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-bold text-gray-800">Raspadinha Diária</h2>
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-center text-sm text-gray-600 mt-2">
              {attemptStatus?.canAttempt 
                ? "Raspe para revelar seu prêmio diário!" 
                : "Uma nova chance te aguarda amanhã!"
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modal de resultado */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {scratchResult?.won ? (
                <>
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  Parabéns! Você ganhou!
                </>
              ) : (
                <>
                  <Star className="w-6 h-6 text-gray-500" />
                  Que pena!
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center space-y-4">
            <div className="text-8xl">
              {scratchResult?.won ? "🎉" : "😔"}
            </div>
            
            <div>
              <p className="text-lg font-semibold">
                {scratchResult?.message}
              </p>
              
              {scratchResult?.won && scratchResult?.prize && (
                <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                  <h4 className="font-bold text-green-800 mb-2">🎁 Seu Prêmio:</h4>
                  <p className="text-lg font-bold text-green-700">{scratchResult.prize.name}</p>
                  {scratchResult.prize.description && (
                    <p className="text-sm text-gray-600 mt-1">{scratchResult.prize.description}</p>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Próxima tentativa em {scratchResult?.nextAttemptIn || "24h"}</span>
            </div>
            
            <Button 
              onClick={() => setShowResultModal(false)}
              className="w-full"
            >
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}