import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Gift, Sparkles } from "lucide-react";
import type { Product } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ScratchCardProps {
  product: Product;
  currency: string;
  themeColor: string;
  onRevealed?: (product: Product) => void;
  onClick?: (product: Product) => void;
}

interface ScratchArea {
  x: number;
  y: number;
  radius: number;
}

export default function ScratchCard({ product, currency, themeColor, onRevealed, onClick }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const scratchedAreas = useRef<ScratchArea[]>([]);
  
  // FASE 1: AudioContext otimizado
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastSoundTime = useRef<number>(0);
  const SOUND_COOLDOWN = 120; // ms
  
  // FASE 2: Progresso por alpha real e traçado contínuo
  const rafId = useRef<number | null>(null);
  const needsProgressCalc = useRef<boolean>(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Mutation para marcar produto como "raspado"
  const scratchMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await apiRequest(`/api/products/${productId}/scratch`, 'POST');
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data?.expiresAt) {
        const expirationTime = new Date(data.expiresAt).getTime();
        const now = Date.now();
        setTimeLeft(Math.max(0, Math.floor((expirationTime - now) / 1000)));
      }
      if (onRevealed) onRevealed(product);
    }
  });

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // FASE 1: Inicializar canvas com DPI correto
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset estado ao mudar produto
    scratchedAreas.current = [];
    setScratchProgress(0);
    setIsRevealed(false);
    setIsFading(false);
    lastPoint.current = null;
    needsProgressCalc.current = false;

    // FASE 1: Configurar DPI correto para telas retina
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.scale(dpr, dpr);
    
    // Usar dimensões CSS para cálculos
    const cssWidth = rect.width;
    const cssHeight = rect.height;

    // Desenhar camada de "scratch"
    const gradient = ctx.createLinearGradient(0, 0, cssWidth, cssHeight);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(0.5, '#FFA500');
    gradient.addColorStop(1, '#FF6347');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    // Adicionar texto
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 2;
    
    const lines = product.scratchMessage?.split(' ') || ['Raspe', 'aqui!'];
    const lineHeight = 20;
    const startY = cssHeight / 2 - (lines.length * lineHeight) / 2;
    
    lines.forEach((line, index) => {
      ctx.fillText(line, cssWidth / 2, startY + (index * lineHeight));
    });
  }, [product.id, product.scratchMessage]);

  // Throttle reduzido para mais fluidez
  const lastScratchTime = useRef<number>(0);
  const SCRATCH_THROTTLE = 16; // ~60fps para maior fluidez
  
  // FASE 2: Função para medir progresso real por alpha
  const measureRealProgress = () => {
    if (!canvasRef.current || !needsProgressCalc.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    try {
      needsProgressCalc.current = false;
      const step = 6; // Amostragem a cada 6 pixels para performance
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let transparent = 0;
      let total = 0;
      
      // Amostragem inteligente
      for (let i = 3; i < data.length; i += 4 * step) {
        total++;
        if (data[i] === 0) transparent++; // Canal alpha = 0 (transparente)
      }
      
      const progress = total > 0 ? transparent / total : 0;
      setScratchProgress(progress);
      
      // Revelar com threshold
      if (progress >= 0.7 && !isRevealed && !isFading) {
        setIsFading(true);
        setTimeout(() => {
          setIsRevealed(true);
          scratchMutation.mutate(product.id);
        }, 220);
      }
    } catch (e) {
      // Fallback silencioso se getImageData falhar
    }
  };
  
  // Loop de RAF para medição otimizada
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

  // Função de scratch melhorada
  const handleScratch = (clientX: number, clientY: number) => {
    if (!canvasRef.current || isRevealed) return;

    // Throttle scratches
    const now = Date.now();
    if (now - lastScratchTime.current < SCRATCH_THROTTLE) return;
    lastScratchTime.current = now;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Raio maior para raspagem mais natural
    const scratchRadius = 25;

    // FASE 1: Som otimizado com AudioContext reutilizável
    const soundNow = Date.now();
    if (soundNow - lastSoundTime.current >= SOUND_COOLDOWN) {
      try {
        // Criar AudioContext apenas uma vez
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const audioCtx = audioCtxRef.current;
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.frequency.setValueAtTime(150 + Math.random() * 50, audioCtx.currentTime);
        oscillator.type = 'sawtooth';
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.1);
        
        lastSoundTime.current = soundNow;
      } catch (e) {
        // Som não disponível
      }
    }

    // FASE 2: Traçado contínuo com lineTo
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = scratchRadius * 2;
    
    if (lastPoint.current) {
      // Desenhar linha contínua do ponto anterior
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
    
    // Atualizar último ponto
    lastPoint.current = { x, y };
    
    // FASE 2: Marcar para recálculo de progresso real
    needsProgressCalc.current = true;
    startProgressLoop();
  };

  // Event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsScratching(true);
    lastPoint.current = null; // Reset traçado
    handleScratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isScratching) {
      handleScratch(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    setIsScratching(false);
    lastPoint.current = null; // Finalizar traçado
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsScratching(true);
    lastPoint.current = null; // Reset traçado
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
    lastPoint.current = null; // Finalizar traçado
  };

  // Formatar tempo restante
  const formatTimeLeft = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  // Render do produto revelado
  if (isRevealed) {
    return (
      <Card className="relative border-4 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-lg">
        <CardContent className="p-3 h-48 overflow-hidden flex flex-col">
          {/* Badge de oferta especial */}
          <div className="absolute -top-2 -right-2 z-10">
            <Badge className="bg-red-500 text-white animate-pulse">
              SUPER OFERTA!
            </Badge>
          </div>

          {/* Timer */}
          {timeLeft !== null && timeLeft > 0 && (
            <div className="absolute top-2 left-2 z-10">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeLeft(timeLeft)}
              </Badge>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-between space-y-2">
            {/* Imagem do produto - reduzida */}
            {product.imageUrl && (
              <div className="relative flex-shrink-0">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-20 object-cover rounded border-2 border-yellow-200"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/20 to-transparent rounded"></div>
              </div>
            )}

            {/* Nome do produto - compacto */}
            <h3 className="font-bold text-gray-800 text-center text-sm leading-tight">{product.name}</h3>

            {/* Preços - compactos */}
            <div className="text-center space-y-1">
              <div className="text-xs text-gray-500 line-through">
                De: {currency} {product.price}
              </div>
              <div className="text-lg font-bold text-red-600 flex items-center justify-center gap-1">
                <Sparkles className="w-4 h-4" />
                Por: {currency} {product.scratchPrice}
              </div>
              {product.scratchPrice && product.price && (
                <div className="text-xs text-green-600 font-semibold">
                  Economia: {currency} {(parseFloat(product.price) - parseFloat(product.scratchPrice)).toFixed(2)}
                </div>
              )}
            </div>

            {/* Botão de ação - compacto */}
            <Button 
              onClick={() => onClick?.(product)}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-2 text-sm flex-shrink-0"
              disabled={timeLeft === 0}
            >
              {timeLeft === 0 ? (
                "Oferta Expirada"
              ) : (
                <>
                  <Gift className="w-3 h-3 mr-1" />
                  Ver Produto
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render do card para raspar
  return (
    <Card className="relative isolate z-10 border-2 border-yellow-400 bg-gradient-to-br from-yellow-100 to-orange-100 shadow-lg cursor-pointer select-none h-48">
      <CardContent className="p-0 relative h-full w-full overflow-hidden">
        {/* Badge indicativo */}
        <div className="absolute -top-2 -right-2 z-20">
          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white animate-bounce">
            <Sparkles className="w-3 h-3 mr-1" />
            RASPE!
          </Badge>
        </div>

        {/* Produto por trás (parcialmente visível) */}
        <div className="absolute inset-0 p-4 flex flex-col items-center justify-center bg-white">
          {product.imageUrl && (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-20 h-20 object-cover rounded mb-2 opacity-30"
            />
          )}
          <h3 className="font-bold text-gray-600 text-center text-sm opacity-40">{product.name}</h3>
          <div className="text-lg font-bold text-red-600 opacity-40">
            {currency} {product.scratchPrice}
          </div>
        </div>

        {/* Canvas de scratch com transição suave - cobertura total */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full cursor-pointer transition-all duration-200 ease-out ${
            isFading ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none', display: 'block' }}
        />

        {/* Efeito gradual do desconto - aparece conforme raspa */}
        {scratchProgress > 0.3 && !isRevealed && (
          <div className="absolute top-2 right-2 z-0 pointer-events-none">
            <div 
              className={`bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold transition-all duration-700 ${
                scratchProgress > 0.6 ? 'animate-pulse opacity-100 scale-100' : 'opacity-70 scale-90'
              }`}
            >
              {scratchProgress > 0.7 ? (
                `-${currency}${(parseFloat(product.price!) - parseFloat(product.scratchPrice!)).toFixed(2)}`
              ) : scratchProgress > 0.5 ? '????' : '??'}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}