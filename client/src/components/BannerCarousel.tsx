import { useState, useEffect, useRef } from 'react';

interface Banner {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  backgroundColor: string;
  textColor: string;
}

interface BannerCarouselProps {
  banners: Banner[];
  autoPlayInterval?: number;
}

export function BannerCarousel({ banners, autoPlayInterval = 5000 }: BannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const resumeTimeoutRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Auto-play functionality baseado na posição real de scroll
  useEffect(() => {
    if (!isAutoPlaying || banners.length <= 1 || !containerRef.current) return;

    const interval = setInterval(() => {
      const container = containerRef.current;
      if (!container) return;

      // Basear no scroll real, não no estado
      const currentScrollIndex = Math.round(container.scrollLeft / container.clientWidth);
      const nextIndex = (currentScrollIndex + 1) % banners.length;
      const scrollLeft = nextIndex * container.clientWidth;
      
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, banners.length, autoPlayInterval]);

  // Detectar scroll para atualizar indicador com debounce
  const handleScroll = () => {
    if (!containerRef.current || !isMountedRef.current) return;
    
    const container = containerRef.current;
    const scrollLeft = container.scrollLeft;
    const slideWidth = container.clientWidth;
    const newIndex = Math.round(scrollLeft / slideWidth);
    
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }

    // Debounce: reagendar autoplay após scroll parar
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = window.setTimeout(() => {
      if (!isMountedRef.current) return;
      if (!isAutoPlaying) {
        setIsAutoPlaying(true);
      }
    }, 1500);
  };

  // Função para pausar autoplay temporariamente
  const pauseAutoplay = () => {
    if (!isMountedRef.current) return;
    setIsAutoPlaying(false);
    
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }
    
    resumeTimeoutRef.current = window.setTimeout(() => {
      if (!isMountedRef.current) return;
      setIsAutoPlaying(true);
    }, 2500);
  };

  // Clampar índice quando banners mudam
  useEffect(() => {
    if (banners.length > 0 && currentIndex >= banners.length) {
      const newIndex = Math.min(currentIndex, banners.length - 1);
      setCurrentIndex(newIndex);
      
      // Ajustar scroll sem animação
      if (containerRef.current) {
        const container = containerRef.current;
        const scrollLeft = newIndex * container.clientWidth;
        container.style.scrollBehavior = 'auto';
        container.scrollTo({ left: scrollLeft });
        setTimeout(() => {
          if (container) container.style.scrollBehavior = 'smooth';
        }, 100);
      }
    }
  }, [banners, currentIndex]);

  // Cleanup robusto dos timeouts e scroll
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Parar scroll suave antes do unmount
      if (containerRef.current) {
        const container = containerRef.current;
        container.style.scrollBehavior = 'auto';
        container.scrollTo({ left: container.scrollLeft });
      }
    };
  }, []);

  const goToSlide = (index: number) => {
    if (!containerRef.current) return;
    
    pauseAutoplay();
    const container = containerRef.current;
    const scrollLeft = index * container.clientWidth;
    container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    setCurrentIndex(index);
  };

  if (!banners || banners.length === 0) {
    return null;
  }

  const handleBannerClick = async (banner: Banner) => {
    // Registrar clique no banner
    try {
      await fetch('/api/banners/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bannerId: banner.id,
        }),
      });
    } catch (error) {
      console.error('Erro ao registrar clique:', error);
    }

    // Abrir link se existir
    if (banner.linkUrl) {
      window.open(banner.linkUrl, '_blank');
    }
  };

  return (
    <div className="relative w-full h-32 md:h-40 shadow-lg group rounded-lg overflow-hidden">
      {/* Container com scroll snap */}
      <div 
        ref={containerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth h-full scrollbar-none overscroll-x-contain"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
        onScroll={handleScroll}
        onTouchStart={pauseAutoplay}
        onMouseDown={pauseAutoplay}
      >
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className="min-w-full h-full shrink-0 snap-start cursor-pointer relative"
            onClick={() => handleBannerClick(banner)}
            data-testid={`banner-carousel-${banner.id}`}
          >
            <div 
              className="w-full h-full flex items-center relative rounded-lg"
              style={{ 
                background: banner.backgroundColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundImage: banner.imageUrl ? `url(${banner.imageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              {/* Overlay escuro para melhor contraste se tiver imagem */}
              {banner.imageUrl && (
                <div className="absolute inset-0 bg-black/30 rounded-lg" />
              )}
              
              {/* Conteúdo do banner - estilo Buscapé */}
              <div className="relative z-10 flex items-center justify-between w-full px-6">
                <div className="flex-1">
                  <h2 
                    className="text-lg md:text-xl font-bold mb-1 leading-tight"
                    style={{ 
                      color: banner.textColor || '#FFFFFF',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                    }}
                  >
                    {banner.title}
                  </h2>
                  
                  {banner.description && (
                    <p 
                      className="text-sm opacity-90"
                      style={{ 
                        color: banner.textColor || '#FFFFFF',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                      }}
                    >
                      {banner.description}
                    </p>
                  )}
                </div>
                
                {/* Botão ou call-to-action lado direito */}
                <div className="flex-shrink-0 ml-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 hover:bg-white/30 transition-all">
                    <span 
                      className="text-sm font-medium"
                      style={{ color: banner.textColor || '#FFFFFF' }}
                    >
                      Ver Ofertas
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Indicadores de pontos */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2">
          {banners.map((banner, index) => (
            <button
              key={banner.id}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-white scale-110'
                  : 'bg-white bg-opacity-50 hover:bg-opacity-75'
              }`}
              data-testid={`banner-indicator-${index}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}