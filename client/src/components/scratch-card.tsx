import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, Clock, Gift, Sparkles } from 'lucide-react';
import QRCode from 'qrcode';
import { useToast } from '@/hooks/use-toast';

interface ScratchCardProps {
  product: any;
  currency: string;
  themeColor: string;
  onRevealed?: (coupon: any) => void;
  onClick?: () => void;
}

interface ScratchArea {
  x: number;
  y: number;
  radius: number;
}

export default function ScratchCard({ product, currency, themeColor, onRevealed, onClick }: ScratchCardProps) {
  console.log(`🎨 SCRATCHCARD INICIADO para: ${product.name}`);
  
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [coupon, setCoupon] = useState<any>(null);
  const [couponGenerated, setCouponGenerated] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const scratchedAreas = useRef<ScratchArea[]>([]);
  const { toast } = useToast();

  // Query para verificar elegibilidade
  const { data: eligibility, refetch: checkEligibility, isLoading, error } = useQuery({
    queryKey: ['/api/scratch/offers', product.id, 'eligibility'],
    queryFn: () => apiRequest("GET", `/api/scratch/offers/${product.id}/eligibility`),
    enabled: !!product?.id,
    staleTime: 15_000,
    retry: false,
  });

  console.log(`🔍 ELIGIBILITY DEBUG para ${product.name}:`, {
    isLoading,
    error: error?.message,
    eligibility,
    enabled: !!product?.id
  });

  // Estado otimizado
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastSoundTime = useRef<number>(0);
  const SOUND_COOLDOWN = 120; // ms
  
  const rafId = useRef<number | null>(null);
  const needsProgressCalc = useRef<boolean>(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const lastScratchTime = useRef<number>(0);
  const SCRATCH_THROTTLE = 16; // ~60fps

  console.log(`🖼️ CANVAS DEBUG para ${product.name}:`, {
    canvasRef: !!canvasRef.current,
    isScratching,
    scratchProgress,
    isRevealed
  });

  // Mutation para marcar produto como "raspado"
  const scratchMutation = useMutation({
    mutationFn: async (productId: string) => {
      return await apiRequest("POST", `/api/scratch/offers/${productId}/scratch`);
    },
    onSuccess: (data) => {
      console.log("🎉 Raspagem bem-sucedida! Cupom:", data);
      setCoupon(data);
      setCouponGenerated(true);
      setShowCouponModal(true);
      onRevealed?.(data);
      qc.invalidateQueries({ queryKey: ['/api/scratch/offers', product.id, 'eligibility'] });
    },
    onError: (error: any) => {
      console.log("❌ Erro na raspagem:", error.message);
      if (error.message.includes('401')) {
        console.log("🔐 Usuário não autenticado - redirecionando para login");
        toast({
          title: "🔐 Acesso necessário",
          description: "Você precisa estar logado para resgatar cupons. Redirecionando...",
          variant: "destructive",
          duration: 4000,
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 3000);
      } else if (error.message.includes('400')) {
        console.log("⏰ Usuário já resgatou ou está em cooldown - atualizando estado visual");
        setShowModal(false);
        checkEligibility();
        toast({
          title: "⏰ Calma aí!",
          description: "Você já pegou este cupom ou precisa aguardar 24h para raspar novamente!",
          variant: "destructive",
          duration: 3000,
        });
      } else {
        toast({
          title: "😅 Ops, algo deu errado",
          description: "Tente novamente em alguns segundos",
          variant: "destructive",
          duration: 3000,
        });
        qc.invalidateQueries({ queryKey: ['/api/scratch/offers', product.id, 'eligibility'] });
      }
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

  // Cleanup
  useEffect(() => {
    if (isRevealed && rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      try { 
        audioCtxRef.current?.close?.(); 
      } catch {}
    };
  }, [isRevealed]);

  // Inicializar canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    scratchedAreas.current = [];
    setScratchProgress(0);
    setIsRevealed(false);
    setIsFading(false);
    lastPoint.current = null;
    needsProgressCalc.current = false;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.scale(dpr, dpr);
    
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
    
    const lines = product.scratchMessage?.split(' ') || ['Você', 'ganhou', 'um', 'super', 'desconto!', 'Raspe', 'aqui', 'e', 'confira'];
    const lineHeight = 20;
    const startY = cssHeight / 2 - (lines.length * lineHeight) / 2;
    
    lines.forEach((line, index) => {
      ctx.fillText(line, cssWidth / 2, startY + (index * lineHeight));
    });
  }, [product.id, product.scratchMessage]);
  
  // Função para medir progresso
  const measureRealProgress = () => {
    if (!canvasRef.current || !needsProgressCalc.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    try {
      needsProgressCalc.current = false;
      const step = 6;
      
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
      
      if (progress >= 0.7 && !isRevealed && !isFading) {
        setIsFading(true);
        setTimeout(() => {
          setIsRevealed(true);
          scratchMutation.mutate(product.id);
        }, 220);
      }
    } catch (e) {
      // Fallback silencioso
    }
  };
  
  // Loop de RAF
  const startProgressLoop = () => {
    if (rafId.current || isRevealed) return;
    
    const loop = () => {
      if (isRevealed) {
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
        return;
      }
      measureRealProgress();
      rafId.current = requestAnimationFrame(loop);
    };
    
    rafId.current = requestAnimationFrame(loop);
  };
  
  // Cleanup do RAF
  useEffect(() => {
    if (isRevealed && rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, [isRevealed]);

  // Função de scratch
  const handleScratch = (clientX: number, clientY: number) => {
    console.log(`✋ SCRATCH EVENT: x=${clientX}, y=${clientY}, revealed=${isRevealed}`);
    if (!canvasRef.current || isRevealed) return;

    const now = Date.now();
    if (now - lastScratchTime.current < SCRATCH_THROTTLE) return;
    lastScratchTime.current = now;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const scratchRadius = 25;

    // Som
    const soundNow = Date.now();
    if (soundNow - lastSoundTime.current >= SOUND_COOLDOWN) {
      try {
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

    // Desenhar
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = scratchRadius * 2;
    
    if (lastPoint.current) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
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
    console.log(`🖱️ MOUSE DOWN em ${product.name}`);
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
    console.log(`👆 TOUCH START em ${product.name}`);
    e.preventDefault();
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

  // Loading state
  if (isLoading) {
    return (
      <div className="relative isolate z-10 bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 overflow-hidden group text-center flex flex-col min-h-[200px] sm:min-h-[220px] select-none">
        <div className="p-4 relative h-full w-full flex flex-col justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500 mb-2"></div>
          <p className="text-sm text-gray-500">Verificando disponibilidade...</p>
        </div>
      </div>
    );
  }

  // Error state ou elegível
  if (error || !eligibility || ('eligible' in eligibility && eligibility.eligible)) {
    return (
      <div className="relative isolate z-10 bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-300 overflow-hidden group text-center flex flex-col min-h-[200px] sm:min-h-[220px] select-none">
        
        {/* Badge raspadinha */}
        <div className="absolute top-2 right-2 z-20">
          <Badge className="bg-orange-500 text-white text-xs animate-pulse">
            <Sparkles className="w-3 h-3 mr-1" />
            RASPE E GANHE
          </Badge>
        </div>

        {/* Conteúdo revelado atrás do canvas */}
        <div className="p-4 relative h-full w-full flex flex-col justify-center items-center">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-16 h-16 md:w-20 md:h-20 object-cover rounded mb-3"
            />
          ) : (
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 flex items-center justify-center rounded mb-3">
              <div className="w-6 h-6 bg-gray-300 rounded"></div>
            </div>
          )}
          
          <h3 className="text-xs sm:text-sm font-bold text-gray-700 text-center line-clamp-2 mb-2">{product.name}</h3>
          
          <div className="text-green-600 font-bold text-lg mb-2">
            {currency} {product.scratchPrice}
          </div>
          
          <p className="text-xs text-gray-600 text-center">
            🎉 Oferta especial por tempo limitado!
          </p>
        </div>

        {/* Canvas de scratch */}
        <canvas
          ref={canvasRef}
          width={300}
          height={200}
          className={`absolute inset-0 w-full h-full cursor-pointer transition-all duration-200 ease-out ${
            isFading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
          } ${isRevealed ? 'pointer-events-none' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            touchAction: 'none', 
            display: 'block',
            pointerEvents: isRevealed ? 'none' : 'auto',
            zIndex: 10
          }}
        />

        {/* Modal de cupom */}
        {showCouponModal && coupon && (
          <Dialog open={showCouponModal} onOpenChange={setShowCouponModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center text-green-600">
                  🎉 Parabéns! Cupom Gerado!
                </DialogTitle>
              </DialogHeader>
              <div className="text-center space-y-4">
                <p>Seu cupom de desconto:</p>
                <div className="bg-green-50 p-4 rounded border-2 border-green-200">
                  <p className="font-bold text-lg">{coupon.code}</p>
                  <p>Desconto: {currency} {coupon.discountAmount}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // Outros estados (já resgatado, cooldown, etc.)
  return (
    <div className="relative isolate z-10 bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 overflow-hidden group text-center flex flex-col min-h-[200px] sm:min-h-[220px] select-none">
      <div className="p-4 relative h-full w-full flex flex-col justify-center items-center">
        <p className="text-sm text-gray-500">Estado não elegível</p>
      </div>
    </div>
  );
}