import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Gift, Sparkles, Download, Share2, QrCode, CheckCircle } from "lucide-react";
import type { Product } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatBrazilianPrice, formatPriceWithCurrency } from "@/lib/priceUtils";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";

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
  const [showModal, setShowModal] = useState(false);
  const [coupon, setCoupon] = useState<any>(null);
  const [couponGenerated, setCouponGenerated] = useState(false);
  const scratchedAreas = useRef<ScratchArea[]>([]);
  const { toast } = useToast();
  
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

  // Mutation para gerar cupom
  const generateCouponMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await apiRequest(`/api/products/${productId}/generate-coupon`, 'POST');
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data?.success && data?.coupon) {
        setCoupon(data.coupon);
        setCouponGenerated(true);
        toast({
          title: "🎉 Cupom gerado!",
          description: "Seu cupom de desconto foi criado com sucesso!",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao gerar cupom",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
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
    
    const lines = product.scratchMessage?.split(' ') || ['Você', 'ganhou', 'um', 'super', 'desconto!', 'Raspe', 'aqui', 'e', 'confira'];
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

  // Função para baixar PDF do cupom
  const downloadPDF = () => {
    if (!coupon) return;
    
    const originalPrice = parseFloat(product.price || '0');
    const discountPrice = parseFloat(product.scratchPrice || '0');
    const discountPercentage = originalPrice > 0 ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100) : 0;
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('🎉 CUPOM DE DESCONTO', 20, 30);
    
    // Informações da loja (você pode buscar da store)
    doc.setFontSize(14);
    doc.text('Loja: CellShop Importados Paraguay', 20, 50);
    
    // Produto
    doc.setFontSize(12);
    doc.text(`Produto: ${product.name}`, 20, 70);
    
    // Desconto
    doc.setFontSize(16);
    doc.text(`🔥 ${discountPercentage}% DE DESCONTO!`, 20, 90);
    
    // Preços
    doc.setFontSize(12);
    doc.text(`De: ${formatPriceWithCurrency(product.price || '0', currency)}`, 20, 110);
    doc.text(`Por: ${formatPriceWithCurrency(product.scratchPrice || '0', currency)}`, 20, 125);
    
    // Código do cupom
    doc.setFontSize(14);
    doc.text(`Código: ${coupon.couponCode}`, 20, 150);
    
    // Validade
    const expirationDate = new Date(coupon.expiresAt).toLocaleString('pt-BR');
    doc.text(`Válido até: ${expirationDate}`, 20, 170);
    
    // QR Code (como imagem)
    if (coupon.qrCode) {
      doc.addImage(coupon.qrCode, 'PNG', 120, 80, 60, 60);
    }
    
    // Instruções
    doc.setFontSize(10);
    doc.text('Apresente este cupom na loja para resgatar o desconto', 20, 200);
    
    doc.save(`cupom-${coupon.couponCode}.pdf`);
  };
  
  // Função para compartilhar no WhatsApp
  const shareOnWhatsApp = () => {
    if (!coupon) return;
    
    const originalPrice = parseFloat(product.price || '0');
    const discountPrice = parseFloat(product.scratchPrice || '0');
    const discountPercentage = originalPrice > 0 ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100) : 0;
    
    const message = `🎉 *CUPOM DE DESCONTO*\n\n` +
      `📱 *${product.name}*\n` +
      `🏪 *CellShop Importados Paraguay*\n\n` +
      `🔥 *${discountPercentage}% DE DESCONTO!*\n\n` +
      `💰 De: ${formatPriceWithCurrency(product.price || '0', currency)}\n` +
      `💸 Por: ${formatPriceWithCurrency(product.scratchPrice || '0', currency)}\n\n` +
      `🎫 *Código:* ${coupon.couponCode}\n` +
      `⏰ *Válido até:* ${new Date(coupon.expiresAt).toLocaleString('pt-BR')}\n\n` +
      `📍 Apresente este cupom na loja para resgatar!`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Modal de produto detalhado
  const ProductModal = () => {
    if (!showModal) return null;
    
    // Calcular porcentagem de desconto
    const originalPrice = parseFloat(product.price || '0');
    const discountPrice = parseFloat(product.scratchPrice || '0');
    const discountPercentage = originalPrice > 0 ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100) : 0;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header do modal */}
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-800">🎉 Oferta Revelada!</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            {/* Imagem do produto */}
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-64 object-contain rounded-lg mb-4 bg-gray-50"
              />
            )}
            
            {/* Nome do produto */}
            <h3 className="text-lg font-bold text-gray-800 mb-2">{product.name}</h3>
            
            {/* Descrição */}
            {product.description && (
              <p className="text-gray-600 mb-4">{product.description}</p>
            )}
            
            {/* Preços destacados */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-lg mb-4">
              <div className="text-center space-y-2">
                <div className="text-sm text-gray-500 line-through">
                  Preço normal: {formatPriceWithCurrency(product.price || '0', currency)}
                </div>
                <div className="text-3xl font-bold text-red-600 flex items-center justify-center gap-2">
                  <Sparkles className="w-6 h-6" />
                  {formatPriceWithCurrency(product.scratchPrice || '0', currency)}
                </div>
                
                {/* NOVA: Porcentagem de desconto */}
                <div className="bg-green-100 border border-green-300 rounded-lg p-3 my-3">
                  <div className="text-2xl font-bold text-green-700 flex items-center justify-center gap-2">
                    🔥 {discountPercentage}% DE DESCONTO!
                  </div>
                  <div className="text-sm text-green-600 mt-1">
                    Você economiza: {formatPriceWithCurrency((originalPrice - discountPrice), currency)}
                  </div>
                </div>
                
                {/* Timer de expiração */}
                {timeLeft !== null && timeLeft > 0 && (
                  <div className="bg-orange-100 text-orange-800 px-3 py-2 rounded-full inline-flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-semibold">Válido por: {formatTimeLeft(timeLeft)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Seção de Cupom - Mostrar apenas se cupom foi gerado */}
            {couponGenerated && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h4 className="font-bold text-green-800">Cupom Gerado!</h4>
                  </div>
                  
                  {/* QR Code */}
                  {coupon?.qrCode && (
                    <div className="mb-3">
                      <img 
                        src={coupon.qrCode} 
                        alt="QR Code do cupom" 
                        className="mx-auto w-32 h-32 border border-gray-300 rounded"
                      />
                    </div>
                  )}
                  
                  {/* Código do cupom */}
                  <div className="bg-white border border-dashed border-gray-400 rounded p-2 mb-3">
                    <p className="text-xs text-gray-600">Código do cupom:</p>
                    <p className="font-mono font-bold text-lg">{coupon?.couponCode}</p>
                  </div>
                  
                  {/* Botões de ação do cupom */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={downloadPDF}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                    <Button 
                      onClick={shareOnWhatsApp}
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Botões de ação */}
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  // Gerar cupom se ainda não foi gerado
                  if (timeLeft && timeLeft > 0 && !couponGenerated) {
                    generateCouponMutation.mutate(product.id);
                    // NÃO fechar modal nem redirecionar - deixar o usuário ver o cupom
                  } else if (couponGenerated) {
                    // Se cupom já foi gerado, pode prosseguir
                    setShowModal(false);
                    onClick?.(product);
                  }
                }}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-4 rounded-lg transition-all"
                disabled={timeLeft === 0 || generateCouponMutation.isPending}
              >
                {timeLeft === 0 ? (
                  "Oferta Expirada"
                ) : generateCouponMutation.isPending ? (
                  "Gerando cupom..."
                ) : !couponGenerated ? (
                  <>🎫 Gerar Cupom</>
                ) : (
                  <>🛒 Aproveitar Oferta</>
                )}
              </button>
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render do produto revelado
  if (isRevealed) {
    // Calcular porcentagem de desconto
    const originalPrice = parseFloat(product.price || '0');
    const discountPrice = parseFloat(product.scratchPrice || '0');
    const discountPercentage = originalPrice > 0 ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100) : 0;
    
    return (
      <>
        <div 
          className="relative bg-gradient-to-br from-yellow-50 to-orange-50 border-4 border-yellow-400 overflow-hidden group text-center flex flex-col min-h-[200px] sm:min-h-[220px] cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
          onClick={() => setShowModal(true)}
          data-testid={`card-product-revealed-${product.id}`}
        >
          {/* Timer */}
          {timeLeft !== null && timeLeft > 0 && (
            <div className="absolute top-2 left-2 z-10">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 flex items-center gap-1 text-xs">
                <Clock className="w-3 h-3" />
                {formatTimeLeft(timeLeft)}
              </Badge>
            </div>
          )}

          <div className="h-full flex flex-col p-3">
            {/* Imagem do produto */}
            <div className="relative mb-2">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-20 md:h-24 lg:h-28 object-cover rounded border-2 border-yellow-200"
                />
              ) : (
                <div className="w-full h-20 md:h-24 lg:h-28 bg-gray-100 flex items-center justify-center rounded border-2 border-yellow-200">
                  <div className="w-8 h-8 bg-gray-300 rounded opacity-30"></div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/20 to-transparent rounded"></div>
            </div>

            <div className="flex flex-col h-full">
              {/* Nome do produto */}
              <h3 className="text-xs sm:text-sm font-bold text-blue-600 mb-1 line-clamp-2 text-center">{product.name}</h3>
              
              {/* Preços */}
              <div className="flex flex-col items-center justify-center mt-auto space-y-1">
                <div className="text-xs text-gray-500 line-through">
                  De: {formatPriceWithCurrency(product.price || '0', currency)}
                </div>
                <div className="text-lg sm:text-xl font-bold text-red-600 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  {formatPriceWithCurrency(product.scratchPrice || '0', currency)}
                </div>
                {product.scratchPrice && product.price && (
                  <>
                    <div className="text-xs text-green-600 font-semibold">
                      Economize: {formatPriceWithCurrency((parseFloat(product.price) - parseFloat(product.scratchPrice || '0')), currency)}
                    </div>
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      {discountPercentage}% OFF
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Badge horizontal no final do card */}
          <div className="w-full bg-blue-500 text-white py-2 px-3 text-xs font-medium">
            👆 Toque para mais detalhes
          </div>
        </div>
        <ProductModal />
      </>
    );
  }

  // Render do card para raspar
  return (
    <>
      <div className="relative isolate z-10 bg-gradient-to-br from-yellow-100 to-orange-100 border-2 border-yellow-400 overflow-hidden group text-center flex flex-col min-h-[200px] sm:min-h-[220px] cursor-pointer select-none">
        <div className="p-0 relative h-full w-full overflow-hidden">
          {/* Badge indicativo */}
          <div className="absolute top-2 right-2 z-20">
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white animate-bounce text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              RASPE!
            </Badge>
          </div>

          {/* Produto por trás (parcialmente visível) */}
          <div className="absolute inset-0 p-3 flex flex-col justify-center items-center bg-white">
            {/* Imagem */}
            <div className="relative mb-2">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-16 h-16 md:w-20 md:h-20 object-cover rounded opacity-30"
                />
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 flex items-center justify-center rounded opacity-30">
                  <div className="w-6 h-6 bg-gray-300 rounded opacity-50"></div>
                </div>
              )}
            </div>
            
            {/* Nome */}
            <h3 className="text-xs sm:text-sm font-bold text-gray-600 text-center opacity-40 line-clamp-2 mb-2">{product.name}</h3>
            
            {/* Preço de oferta */}
            <div className="text-lg font-bold text-red-600 opacity-40">
              {formatPriceWithCurrency(product.scratchPrice || '0', currency)}
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
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-0 pointer-events-none">
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

        </div>
      </div>
    </>
  );
}