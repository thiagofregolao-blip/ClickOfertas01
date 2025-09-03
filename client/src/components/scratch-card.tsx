import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Gift, Sparkles, Download, Share2, QrCode, CheckCircle } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import type { Product } from "@shared/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatBrazilianPrice, formatPriceWithCurrency } from "@/lib/priceUtils";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import mascoteImage from '@/assets/mascote-click.png';

interface ScratchCardProps {
  product: Product;
  currency: string;
  themeColor: string;
  logoUrl?: string;
  onRevealed?: (product: Product) => void;
  onClick?: (product: Product) => void;
  // REMOVIDO: Props desnecessários
}

interface ScratchArea {
  x: number;
  y: number;
  radius: number;
}

export default function ScratchCard({ product, currency, themeColor, logoUrl, onRevealed, onClick }: ScratchCardProps) {
  const queryClient = useQueryClient(); // NEW: Para invalidação de cache
  
  // Performance optimization: removed debug logs
  
  // SISTEMA SIMPLIFICADO
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [coupon, setCoupon] = useState<any>(null);
  const [couponGenerated, setCouponGenerated] = useState(false);
  const [generatingCoupon, setGeneratingCoupon] = useState(false); // 🚫 FLAG ANTI-DUPLICAÇÃO
  const [revelationStarted, setRevelationStarted] = useState(false); // 🚫 FLAG REVELAÇÃO ÚNICA
  const [showCouponModal, setShowCouponModal] = useState(false);
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

  // REMOVIDO: Clone virtual não existe mais

  // REMOVIDO: Query de promoção não é mais necessária

  // REMOVIDO: Debug desnecessário

  // SISTEMA UNIFICADO: Apenas clones virtuais

  // REMOVIDO: UseEffect de promoção não é mais necessário

  // REMOVIDO: Clone virtual não existe mais

  // REMOVIDO: Não precisamos mais de mutation específica para promoção

  // REMOVIDO: Mutation tradicional - usamos apenas clones virtuais e promoções

  // Mutation para gerar cupom
  const generateCouponMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await fetch(`/api/products/${productId}/generate-coupon`, {
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
    onSuccess: (data: any) => {
      console.log('🎯 RESPONSE onSuccess data:', data);
      // 🧹 LIMPAR FLAG GLOBAL NO SUCESSO
      const globalKey = `coupon-generated-${product.id}`;
      sessionStorage.removeItem(globalKey);
      
      setGeneratingCoupon(false); // ✅ Resetar flag
      if (data?.success && data?.coupon) {
        // ✅ APENAS ABRIR O MODAL - SEM invalidação aqui!
        // A invalidação será feita quando o usuário FECHAR o modal
        setCoupon(data.coupon);
        setCouponGenerated(true);
        setShowModal(false);
        setShowCouponModal(true);
        
        // ✅ REMOÇÃO REMOVIDA DO onSuccess - agora só quando fechar o modal
        
        toast({
          title: "🎉 Cupom gerado!",
          description: "Veja os detalhes do seu cupom!",
        });
      }
    },
    onError: (error: any) => {
      // 🧹 LIMPAR FLAG GLOBAL NO ERRO
      const globalKey = `coupon-generated-${product.id}`;
      sessionStorage.removeItem(globalKey);
      
      setGeneratingCoupon(false); // ✅ Resetar flag
      toast({
        title: "Erro ao gerar cupom",
        description: `Erro: ${error.message}`,
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

  // 🚀 FORÇAR INICIALIZAÇÃO DIRETA DO CANVAS
  useEffect(() => {
    // Performance optimization: removed debug logs
    // Canvas initialization
    
    // FORÇA INICIALIZAÇÃO MESMO SE CONDIÇÕES NÃO ESTIVEREM PERFEITAS
    if (isRevealed) {
      // Skip if already revealed
      return;
    }
    if (!product.isScratchCard) {
      // Skip if not scratch card
      return;
    }
    
    // TIMEOUT PARA GARANTIR QUE O CANVAS EXISTE
    setTimeout(() => {
      if (!canvasRef.current) {
        // Canvas not available after timeout
        return;
      }
      
      // Canvas initializing
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // No 2D context available
        return;
      }

    // Reset estado ao mudar produto (sem setIsRevealed(false) - controlado pelo servidor)
    scratchedAreas.current = [];
    setScratchProgress(0);
    setIsFading(false);
    lastPoint.current = null;
    needsProgressCalc.current = false;

    // FASE 1: Configurar DPI correto para telas retina
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Canvas dimensions setup
    
    // AJUSTAR DIMENSÕES: usar TODA a área disponível do container
    const actualHeight = rect.height || 200; // Usar altura TOTAL do container
    const actualWidth = rect.width || 200; // Usar largura TOTAL do container
    
    canvas.width = Math.round(actualWidth * dpr);
    canvas.height = Math.round(actualHeight * dpr);
    ctx.scale(dpr, dpr);
    
    // Forçar dimensões CSS também
    canvas.style.width = actualWidth + 'px';
    canvas.style.height = actualHeight + 'px';
    
    // Canvas dimensions corrected
    
    // Usar dimensões corrigidas para cálculos
    const cssWidth = actualWidth;
    const cssHeight = actualHeight;

    // 🎯 RECREANDO EXATAMENTE COMO SUA IMAGEM DE REFERÊNCIA
    // Drawing scratch texture
    
    // 🌈 GRADIENTE LARANJA → VERMELHO: Muito mais vibrante!  
    const gradient = ctx.createLinearGradient(0, 0, 0, cssHeight);
    gradient.addColorStop(0, '#FF8C00');    // Laranja brilhante topo
    gradient.addColorStop(0.4, '#FF6347');  // Laranja-vermelho 
    gradient.addColorStop(0.7, '#FF4500');  // Laranja-vermelho mais intenso
    gradient.addColorStop(1, '#DC143C');    // Vermelho puro na base

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    
    // ✅ LINHAS REMOVIDAS - visual mais limpo!
    
    // Confetes removidos para visual mais limpo
    
    // ◆ DIAMANTE GRANDE NO CANTO (exatamente como na imagem)
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText('◆', cssWidth * 0.92, cssHeight * 0.92);
    
    // Gradient applied

    // Símbolos $ do canvas removidos - mantidos apenas na chuva

    // ✨ TEXTO PRINCIPAL COM DESTAQUE ESPECIAL
    // Adding scratch text
    ctx.font = 'bold 18px Arial'; // Aumentado para melhor legibilidade
    ctx.textAlign = 'center';
    
    // Preparar para texto com múltiplas camadas de destaque
    
    const lines = product.scratchMessage?.split(' ') || ['Você', 'ganhou', 'um', 'super', 'desconto!', 'Raspe', 'aqui', 'e', 'confira'];
    const lineHeight = 24;
    const startY = cssHeight / 2 - (lines.length * lineHeight) / 2;
    
    // 📦 FUNDO MAIS TRANSPARENTE PARA O TEXTO
    // Desenhar fundo suave cobrindo toda a área
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 2;
    ctx.fillStyle = 'rgba(40, 40, 40, 0.05)'; // Muito mais transparente
    
    // Retângulo cobrindo todo o canvas
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    
    // ✨ TEXTO SOBRE O FUNDO
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 2;
    
    lines.forEach((line, index) => {
      const x = cssWidth / 2;
      const y = startY + (index * lineHeight);
      
      // 🖤 CONTORNO PRETO PRIMEIRO
      ctx.strokeStyle = '#000000'; // Preto sólido
      ctx.lineWidth = 3; // Contorno espesso
      ctx.lineJoin = 'round'; // Cantos arredondados
      ctx.miterLimit = 2;
      ctx.strokeText(line, x, y);
      
      // ✨ TEXTO BRANCO POR CIMA
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(line, x, y);
    });
    
      // Texture complete
    }, 100); // 100ms timeout
    
    startProgressLoop();
  }, [product.id, isRevealed]);

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
      
      // Revelar com threshold - PROTEÇÃO MÁXIMA ANTI-DUPLICAÇÃO GLOBAL
      const globalKey = `coupon-generated-${product.id}`;
      const alreadyProcessing = sessionStorage.getItem(globalKey);
      
      if (progress >= 0.7 && !isRevealed && !isFading && !revelationStarted && !alreadyProcessing) {
        console.log("🎯 INICIANDO REVELAÇÃO ÚNICA!");
        
        // 🛑 BLOQUEAR GLOBALMENTE IMEDIATAMENTE
        sessionStorage.setItem(globalKey, Date.now().toString());
        setRevelationStarted(true); 
        setIsFading(true);
        
        // 🛑 PARAR RAF LOOP IMEDIATAMENTE
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
        
        setTimeout(() => {
          setIsRevealed(true);
          
          // SISTEMA SIMPLIFICADO: Baseado apenas no tipo
          // PRODUTO NORMAL: Sempre gera cupom (com proteção anti-duplicação)
          if (!generatingCoupon && !couponGenerated) {
            setGeneratingCoupon(true);
            generateCouponMutation.mutate(product.id);
          }
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

  // Sistema de bloqueio simplificado
  const blocked = () => {
    const isBlocked = isRevealed;
    console.log("🚫 BLOCKED() chamado:", {
      productId: product.id,
      isRevealed,
      isBlocked,
      resultado: isBlocked ? "BLOQUEADO" : "LIBERADO"
    });
    return isBlocked;
  };

  // Função de scratch melhorada
  const handleScratch = (clientX: number, clientY: number) => {
    console.log(`%c🎨 HANDLE SCRATCH CHAMADO! 🎨`, 
      'background: purple; color: white; padding: 5px; font-size: 16px; font-weight: bold;');
    console.log("🎨 handleScratch dados:", { clientX, clientY, productId: product.id });
    
    if (!canvasRef.current || blocked()) {
      console.log("❌ handleScratch PAROU: canvas ou blocked");
      return;
    }

    // Throttle scratches
    const now = Date.now();
    if (now - lastScratchTime.current < SCRATCH_THROTTLE) {
      console.log("⏳ handleScratch THROTTLED");
      return;
    }
    lastScratchTime.current = now;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log("❌ handleScratch: Sem contexto 2D!");
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    console.log("✏️ handleScratch posições:", { x, y, rectLeft: rect.left, rectTop: rect.top });

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
    console.log("🖌️ Iniciando desenho no canvas!");
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = scratchRadius * 2;
    
    console.log("🎯 Configurações de desenho:", {
      operation: ctx.globalCompositeOperation,
      lineWidth: ctx.lineWidth,
      lastPoint: lastPoint.current
    });
    
    if (lastPoint.current) {
      // Desenhar linha contínua do ponto anterior
      console.log("📏 Desenhando LINHA de", lastPoint.current, "até", {x, y});
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      // Primeiro ponto - desenhar círculo
      console.log("⭕ Desenhando CÍRCULO em", {x, y}, "raio:", scratchRadius);
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.beginPath();
      ctx.arc(x, y, scratchRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    console.log("✅ Desenho concluído!");
    
    // Atualizar último ponto
    lastPoint.current = { x, y };
    
    // FASE 2: Marcar para recálculo de progresso real
    needsProgressCalc.current = true;
    startProgressLoop();
  };

  // Event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Mouse down event
    console.log("🖱️ MOUSE DOWN chamado:", {
      productId: product.id,
      blocked: blocked(),
      clientX: e.clientX,
      clientY: e.clientY
    });
    if (blocked()) return;
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
    lastPoint.current = null; // Finalizar traçado
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    // Touch start event
    console.log("👆 TOUCH START chamado:", {
      productId: product.id,
      blocked: blocked(),
      touchCount: e.touches.length
    });
    e.preventDefault();
    if (blocked()) return;
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
                  const globalKey = `coupon-generated-${product.id}`;
                  const alreadyProcessing = sessionStorage.getItem(globalKey);
                  
                  if (!generatingCoupon && !couponGenerated && !revelationStarted && !alreadyProcessing) {
                    // 🛑 BLOQUEAR GLOBALMENTE IMEDIATAMENTE
                    sessionStorage.setItem(globalKey, Date.now().toString());
                    setGeneratingCoupon(true);
                    setRevelationStarted(true); 
                    generateCouponMutation.mutate(product.id);
                  }
                }}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-4 rounded-lg transition-all"
                disabled={generateCouponMutation.isPending || generatingCoupon || revelationStarted}
              >
                {generateCouponMutation.isPending ? (
                  "Gerando cupom..."
                ) : couponGenerated ? (
                  <>✅ Cupom Gerado!</>
                ) : (
                  <>🎫 Aproveitar Oferta</>
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
  
  // Loading para promoções
  // REMOVIDO: Loading state desnecessário
  
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
          {/* Badges: Timer e Tipo de Clone */}
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
            {/* REMOVIDO: Clone Virtual */}
            
            {/* Timer */}
            {timeLeft !== null && timeLeft > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 flex items-center gap-1 text-xs">
                <Clock className="w-3 h-3" />
                {formatTimeLeft(timeLeft)}
              </Badge>
            )}
          </div>

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
        </div>
        <ProductModal />
        {showCouponModal && coupon && (
          <Dialog 
            open={showCouponModal} 
            onOpenChange={(open) => {
              setShowCouponModal(open);
              if (!open) {
                // 🎯 AGORA SIM: remover o card da lista quando fechar o modal
                onRevealed?.(product);
                
                // 🚀 USUÁRIO FECHOU O MODAL → AGORA SIM ATUALIZA A LISTA
                console.log('🎯 Modal fechado - invalidando cache amplo para capturar todas as queries');
                queryClient.invalidateQueries({
                  predicate: (query) => {
                    const keys = Array.isArray(query.queryKey) ? query.queryKey : [query.queryKey];
                    return keys.some(k =>
                      typeof k === 'string' &&
                      /(my-available-promotions|products|store-products|store:|grid|promotions)/i.test(k)
                    );
                  }
                });
              }
            }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-center">🎫 Seu Cupom de Desconto</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Produto */}
                <div className="text-center">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-32 h-32 object-cover rounded-lg mx-auto mb-4 border-4 border-green-200"
                    />
                  )}
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{product.name}</h3>
                </div>

                {/* Desconto destacado */}
                <div className="text-center bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-lg">
                  <div className="text-4xl font-bold text-red-600 mb-2">
                    🔥 {coupon.discountPercentage}% OFF
                  </div>
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    Por apenas: {formatPriceWithCurrency(coupon.discountPrice, currency)}
                  </div>
                  <div className="text-lg text-gray-500 line-through">
                    De: {formatPriceWithCurrency(coupon.originalPrice, currency)}
                  </div>
                </div>

                {/* QR Code e Código */}
                <div className="text-center bg-white border-2 border-dashed border-gray-300 p-6 rounded-lg">
                  {coupon.qrCode && (
                    <div className="mb-4">
                      <img
                        src={coupon.qrCode}
                        alt="QR Code do cupom"
                        className="w-48 h-48 mx-auto border border-gray-200 rounded"
                      />
                    </div>
                  )}
                  
                  <div className="bg-gray-100 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Código do cupom:</p>
                    <p className="text-2xl font-mono font-bold text-gray-800">{coupon.couponCode}</p>
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="flex gap-3">
                  <Button 
                    onClick={downloadPDF}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                  <Button 
                    onClick={shareOnWhatsApp}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Compartilhar
                  </Button>
                </div>

                {/* Instruções */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">📍 Como usar este cupom:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Apresente este cupom na loja</li>
                    <li>• Mostre o QR Code ou o código</li>
                    <li>• Aproveite seu desconto!</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  }



  // Render do card para raspar
  return (
    <>
      <div className="scratch-card relative isolate z-10 overflow-hidden group text-center flex flex-col h-full min-h-[200px] sm:min-h-[220px] cursor-pointer select-none rounded-xl" style={{
        backgroundImage: `url(${mascoteImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="h-full flex flex-col relative w-full isolate p-0 m-0" style={{
          backgroundImage: `url(${mascoteImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}>
          {/* DEBUG REMOVIDO ✅ */}
          
          {/* Chuva suave de cifrões e logos da empresa */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1000]">
            {/* Cifrões dourados */}
            <div className="rain-element text-yellow-400 text-xl font-bold drop-shadow-lg">💰</div>
            <div className="rain-element text-yellow-500 text-lg drop-shadow-lg">$</div>
            <div className="rain-element text-amber-400 text-xl drop-shadow-lg">💴</div>
            
            {/* Mini logos da empresa (redondos) */}
            <div className="rain-element w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">C</div>
            <div className="rain-element w-5 h-5 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center text-white text-xs shadow-lg">O</div>
            <div className="rain-element w-6 h-6 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">P</div>
            <div className="rain-element w-5 h-5 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center text-white text-xs shadow-lg">!</div>
            
            {/* Logo real da empresa na chuva */}
            {logoUrl && (
              <>
                <div className="rain-element w-8 h-8 rounded-full overflow-hidden shadow-lg bg-white">
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
                <div className="rain-element w-7 h-7 rounded-full overflow-hidden shadow-lg bg-white">
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Badge indicativo - CORREÇÃO: pointer-events-none para não bloquear canvas */}
          <div className="absolute top-2 right-2 z-[1001] pointer-events-none">
            <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white animate-heartbeat text-xs shadow-lg">
              <Gift className="w-3 h-3 mr-1" />
              RASPE AQUI
            </Badge>
          </div>

          {/* Produto por trás (aparece quando raspa) */}
          <div className="absolute inset-0 z-0 p-3 flex flex-col justify-center items-center pointer-events-none">
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

          {/* REMOVIDO: Clone Virtual */}

          {/* 🔥 CANVAS COM ALINHAMENTO PERFEITO */}
          {product.isScratchCard && !isRevealed && (
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="absolute inset-0 cursor-crosshair"
              style={{ 
                width: '100%',
                height: '100%',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999,  // Z-index MÁXIMO para ficar acima do conteúdo
                pointerEvents: 'auto',
                touchAction: 'none' // Previne scroll no mobile
              }}
            />
          )}
          {/* 🔍 DEBUG: Log visual do canvas - REMOVIDO PARA CORRIGIR ERRO */}

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