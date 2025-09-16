import { useState, useEffect, useRef } from 'react';
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

interface FunnyMessage {
  id: string;
  message: string;
  emoji: string;
  category: string;
}

interface RectangularScratchCardProps {
  card: DailyScratchCard;
  onScratch: (cardId: string) => void;
  processingCardId?: string;
  funnyMessage?: FunnyMessage;
}

export function RectangularScratchCard({ card, onScratch, processingCardId, funnyMessage }: RectangularScratchCardProps) {
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

  // Inicializar canvas retangular com mascote
  useEffect(() => {
    if (card.isScratched || revelationStarted.current) return;
    
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      const width = 64; // Largura retangular (w-16 = 64px)
      const height = 80; // Altura retangular (h-20 = 80px)
      
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.scale(dpr, dpr);
      
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      
      // Desenhar fundo retangular com mascote
      const img = new Image();
      img.onload = () => {
        // Desenhar mascote redimensionado
        ctx.drawImage(img, 0, 0, width, height);
        
        // Overlay semi-transparente para melhor contraste
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, width, height);
        
        // Texto "RASPE" com contorno para contraste
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        
        // Contorno preto para destacar sobre o mascote
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.strokeText('RASPE', width / 2, height / 2 - 3);
        ctx.strokeText('AQUI', width / 2, height / 2 + 10);
        
        // Texto branco por cima
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('RASPE', width / 2, height / 2 - 3);
        ctx.fillText('AQUI', width / 2, height / 2 + 10);
      };
      img.src = mascoteImage;
      
      startProgressLoop();
    }, 100);
  }, [card.id, card.isScratched]);

  // Medir progresso real por alpha
  const measureRealProgress = () => {
    if (!canvasRef.current || !needsProgressCalc.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    try {
      needsProgressCalc.current = false;
      const step = 10;
      
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
      
      // Revelar quando raspou 60%
      if (progress >= 0.6 && !card.isScratched && !isRevealing && !revelationStarted.current) {
        revelationStarted.current = true;
        setIsRevealing(true);
        setIsScratching(false);
        
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
        
        setTimeout(() => {
          onScratch(card.id);
          setIsRevealing(false);
        }, 500);
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

  // Função de scratch retangular
  const handleScratch = (x: number, y: number) => {
    if (!canvasRef.current || card.isScratched || isProcessing || revelationStarted.current) return;
    
    if (!isScratching) {
      setIsScratching(true);
    }

    const now = Date.now();
    if (now - lastScratchTime.current < SCRATCH_THROTTLE) return;
    lastScratchTime.current = now;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scratchRadius = 10; // Raio de raspagem

    // Som de raspagem
    const soundNow = Date.now();
    if (soundNow - lastSoundTime.current >= SOUND_COOLDOWN) {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const audioCtx = audioCtxRef.current;
        const bufferSize = audioCtx.sampleRate * 0.1;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        
        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        const highPassFilter = audioCtx.createBiquadFilter();
        highPassFilter.type = 'highpass';
        highPassFilter.frequency.setValueAtTime(2000, audioCtx.currentTime);
        
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        noiseSource.connect(highPassFilter);
        highPassFilter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        noiseSource.start();
        noiseSource.stop(audioCtx.currentTime + 0.1);
        
        lastSoundTime.current = soundNow;
      } catch (e) {
        // Fallback silencioso para erros de audio
      }
    }

    // Aplicar efeito de raspagem
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = scratchRadius * 2;
    
    // Desenhar linha conectando pontos para evitar lacunas
    if (lastPoint.current) {
      const lastRect = canvas.getBoundingClientRect();
      const lastX = lastPoint.current.x - lastRect.left;
      const lastY = lastPoint.current.y - lastRect.top;
      
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    
    // Desenhar círculo no ponto atual
    ctx.beginPath();
    ctx.arc(x, y, scratchRadius, 0, 2 * Math.PI);
    ctx.fill();
    
    needsProgressCalc.current = true;
  };

  // Event handlers para mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastPoint.current = null; // Reset para não desenhar linha no primeiro ponto
    handleScratch(x, y);
    lastPoint.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!lastPoint.current) return;
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleScratch(x, y);
    lastPoint.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    lastPoint.current = null;
  };

  // Event handlers para touch
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    lastPoint.current = null; // Reset para não desenhar linha no primeiro ponto
    handleScratch(x, y);
    lastPoint.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!lastPoint.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    handleScratch(x, y);
    lastPoint.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    lastPoint.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div className="relative w-16 h-20 rounded-lg overflow-hidden">
        {/* Fundo do resultado */}
        <div className="absolute inset-0 w-full h-full rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
          {card.isScratched ? (
            card.won ? (
              <div className="text-center text-white">
                <Gift className="w-4 h-4 mx-auto mb-1" />
                <div className="text-xs font-bold">WIN!</div>
              </div>
            ) : (
              <div className="text-center text-white px-1">
                <div className="text-sm">{funnyMessage?.emoji || '😔'}</div>
                <div className="text-xs leading-tight truncate">{funnyMessage?.message || 'Tente!'}</div>
              </div>
            )
          ) : (
            <div className="text-center text-white">
              <Star className="w-4 h-4 mx-auto mb-1" />
              <div className="text-xs">#{card.cardNumber}</div>
            </div>
          )}
        </div>

        {/* Loading overlay para processamento */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Overlay de revelação */}
        {isRevealing && (
          <div className="absolute inset-0 bg-yellow-400/30 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Animação de confete para prêmios ganhos */}
        {card.isScratched && card.won && !isRevealing && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 rounded-full animate-bounce"
                style={{
                  left: `${20 + (i * 15)}%`,
                  top: `${15 + (i % 2) * 20}%`,
                  backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'][i % 4],
                  animationDelay: `${i * 100}ms`,
                  animationDuration: '1.5s'
                }}
              />
            ))}
          </div>
        )}

        {/* Canvas de raspadinha APENAS para cartas não raspadas */}
        {card.isScratched !== true && isRevealing !== true && isProcessing !== true && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full rounded-lg cursor-pointer z-50"
            style={{ touchAction: 'none', pointerEvents: 'auto' }}
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
        {card.isScratched !== true && isRevealing !== true && isProcessing !== true && (
          <Sparkles className="absolute top-0.5 right-0.5 w-2 h-2 text-purple-400 animate-pulse pointer-events-none z-20" />
        )}
      </div>

    </div>
  );
}