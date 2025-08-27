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
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const scratchedAreas = useRef<ScratchArea[]>([]);

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

  // Inicializar canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar tamanho do canvas
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Desenhar camada de "scratch"
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(0.5, '#FFA500');
    gradient.addColorStop(1, '#FF6347');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
    const startY = canvas.height / 2 - (lines.length * lineHeight) / 2;
    
    lines.forEach((line, index) => {
      ctx.fillText(line, canvas.width / 2, startY + (index * lineHeight));
    });
  }, [product.scratchMessage]);

  // Throttle reduzido para mais fluidez
  const lastScratchTime = useRef<number>(0);
  const SCRATCH_THROTTLE = 16; // ~60fps para maior fluidez

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

    // Raio muito menor para ser mais difícil
    const scratchRadius = 8;

    // Verificar sobreposição com distância menor para mais fluidez
    const hasNearbyArea = scratchedAreas.current.some(area => {
      const distance = Math.sqrt(Math.pow(area.x - x, 2) + Math.pow(area.y - y, 2));
      return distance < scratchRadius * 0.5; // Permite mais sobreposição
    });

    if (!hasNearbyArea) {
      // Adicionar área raspada
      scratchedAreas.current.push({ x, y, radius: scratchRadius });
    }

    // Scratch mais suave com gradiente
    ctx.globalCompositeOperation = 'destination-out';
    
    // Criar gradiente radial para scratch mais suave
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, scratchRadius);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.7, 'rgba(0,0,0,0.8)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, scratchRadius, 0, Math.PI * 2);
    ctx.fill();

    // Calcular progresso mais preciso
    const totalPixels = canvas.width * canvas.height;
    const scratchedPixels = scratchedAreas.current.length * Math.PI * (scratchRadius * scratchRadius);
    const progress = Math.min(scratchedPixels / totalPixels, 1);
    setScratchProgress(progress);

    // Revelar apenas se passou de 95% (muito mais rígido)
    if (progress >= 0.95 && !isRevealed) {
      setIsRevealed(true);
      scratchMutation.mutate(product.id);
    }
  };

  // Event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsScratching(true);
    handleScratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isScratching) {
      handleScratch(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    setIsScratching(false);
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsScratching(true);
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
        <CardContent className="p-4">
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

          <div className="space-y-3">
            {/* Imagem do produto */}
            {product.imageUrl && (
              <div className="relative">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-32 object-cover rounded border-2 border-yellow-200"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/20 to-transparent rounded"></div>
              </div>
            )}

            {/* Nome do produto */}
            <h3 className="font-bold text-gray-800 text-center">{product.name}</h3>

            {/* Preços */}
            <div className="text-center space-y-1">
              <div className="text-sm text-gray-500 line-through">
                De: {currency} {product.price}
              </div>
              <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                Por: {currency} {product.scratchPrice}
              </div>
              {product.scratchPrice && product.price && (
                <div className="text-sm text-green-600 font-semibold">
                  Economia: {currency} {(parseFloat(product.price) - parseFloat(product.scratchPrice)).toFixed(2)}
                </div>
              )}
            </div>

            {/* Botão de ação */}
            <Button 
              onClick={() => onClick?.(product)}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3"
              disabled={timeLeft === 0}
            >
              {timeLeft === 0 ? (
                "Oferta Expirada"
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-2" />
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
    <Card className="relative border-2 border-yellow-400 bg-gradient-to-br from-yellow-100 to-orange-100 shadow-lg cursor-pointer select-none">
      <CardContent className="p-0 relative h-48">
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

        {/* Canvas de scratch */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full rounded cursor-pointer"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }}
        />

        {/* Efeito gradual do desconto - aparece conforme raspa */}
        {scratchProgress > 0.3 && !isRevealed && (
          <div className="absolute top-2 right-2 z-0">
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

        {/* Progress indicator - aparece gradualmente */}
        {scratchProgress > 0.1 && scratchProgress < 0.95 && (
          <div className="absolute bottom-2 left-2 right-2 z-0">
            <div className="bg-white/90 rounded-full h-3 overflow-hidden border border-yellow-400">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500"
                style={{ width: `${(scratchProgress / 0.95) * 100}%` }}
              />
            </div>
            <div className="text-center text-white text-xs mt-1 font-bold drop-shadow-lg">
              {Math.round((scratchProgress / 0.95) * 100)}% raspado
            </div>
            {scratchProgress > 0.8 && (
              <div className="text-center text-white text-[10px] mt-0.5 font-medium opacity-80">
                Continue raspando... Quase lá!
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}