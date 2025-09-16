import { useState, useEffect, useRef, useCallback } from 'react';

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

export function BannerCarousel({ banners, autoPlayInterval = 4000 }: BannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(1); // Start at 1 because of clones
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [withTransition, setWithTransition] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pauseTimeoutRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

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

  // Se só tem um banner, mostrar como antes
  if (banners.length === 1) {
    const banner = banners[0];
    return (
      <div className="w-full h-48 md:h-64 lg:h-72">
        <div
          className="w-full h-full cursor-pointer relative group overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
          onClick={() => handleBannerClick(banner)}
          data-testid={`banner-single-${banner.id}`}
        >
          <div 
            className="w-full h-full flex items-center relative"
            style={{ 
              background: banner.backgroundColor || 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)',
              backgroundImage: banner.imageUrl ? `url(${banner.imageUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all duration-300" />
            
            <div className="relative z-10 w-full h-full flex items-center justify-center px-6 md:px-8 lg:px-12">
              <div className="text-center">
                <h2 
                  className="text-xl md:text-3xl lg:text-4xl font-bold leading-tight"
                  style={{ 
                    color: banner.textColor || '#FFFFFF',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                  }}
                >
                  {banner.title}
                </h2>
              </div>
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
          </div>
        </div>
      </div>
    );
  }

  // Configuração da esteira: peek responsivo - mais em desktop, menos em mobile
  const getResponsivePeek = () => {
    if (containerWidth <= 640) return 0.15; // sm: 15% peek
    if (containerWidth <= 768) return 0.18; // md: 18% peek  
    if (containerWidth <= 1024) return 0.2; // lg: 20% peek
    return 0.22; // xl+: 22% peek
  };
  
  const peek = getResponsivePeek();
  const slideWidth = containerWidth > 0 ? containerWidth / (1 + 2 * peek) : 0;
  const offset = (currentIndex - peek) * slideWidth;

  // Criar slides com clones para loop infinito: [último, ...originais, primeiro]
  const extendedBanners = [
    banners[banners.length - 1], // Clone do último
    ...banners,                   // Banners originais
    banners[0]                    // Clone do primeiro
  ];

  // ResizeObserver para medir largura do container
  useEffect(() => {
    if (!containerRef.current) return;

    resizeObserverRef.current = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setContainerWidth(width);
    });

    resizeObserverRef.current.observe(containerRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // Auto-play functionality com reset infinito
  useEffect(() => {
    if (!isAutoPlaying || banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => prevIndex + 1);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, banners.length, autoPlayInterval]);

  // Pausar autoplay temporariamente
  const pauseAutoplay = useCallback(() => {
    setIsAutoPlaying(false);
    
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
    
    pauseTimeoutRef.current = window.setTimeout(() => {
      setIsAutoPlaying(true);
    }, 3000);
  }, []);

  // Handle transition end para loop infinito
  const handleTransitionEnd = useCallback(() => {
    if (currentIndex === banners.length + 1) {
      // Chegou ao clone do primeiro, resetar para o primeiro real
      setWithTransition(false);
      setCurrentIndex(1);
      requestAnimationFrame(() => {
        setWithTransition(true);
      });
    } else if (currentIndex === 0) {
      // Chegou ao clone do último, resetar para o último real
      setWithTransition(false);
      setCurrentIndex(banners.length);
      requestAnimationFrame(() => {
        setWithTransition(true);
      });
    }
  }, [currentIndex, banners.length]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // Gap responsivo entre banners
  const getResponsiveGap = () => {
    if (containerWidth <= 640) return 8; // sm: 8px gap
    if (containerWidth <= 768) return 12; // md: 12px gap  
    if (containerWidth <= 1024) return 16; // lg: 16px gap
    return 20; // xl+: 20px gap
  };

  // Carousel rotativo estilo Buscapé - loop contínuo
  return (
    <div 
      ref={containerRef}
      className="w-full h-48 md:h-64 lg:h-72 relative overflow-hidden"
      onMouseEnter={pauseAutoplay}
      onTouchStart={pauseAutoplay}
    >
      <div 
        ref={trackRef}
        className="flex h-full"
        style={{
          transform: `translate3d(-${offset}px, 0, 0)`,
          transition: withTransition ? 'transform 700ms ease' : 'none',
          gap: `${getResponsiveGap()}px`
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {extendedBanners.map((banner, index) => (
          <div
            key={`${banner.id}-${index}`}
            className="h-full flex-shrink-0"
            style={{ 
              width: `${slideWidth}px`
            }}
          >
            <div
              className="w-full h-full cursor-pointer relative group overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => handleBannerClick(banner)}
              data-testid={`banner-slide-${banner.id}-${index}`}
            >
              <div 
                className="w-full h-full flex items-center relative"
                style={{ 
                  background: banner.backgroundColor || (
                    index % 3 === 0 ? 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)' :
                    index % 3 === 1 ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' :
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  ),
                  backgroundImage: banner.imageUrl ? `url(${banner.imageUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all duration-300" />
                
                <div className="relative z-10 w-full h-full flex items-center justify-center px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8">
                  <div className="text-center max-w-full">
                    <h2 
                      className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl font-bold leading-tight break-words"
                      style={{ 
                        color: banner.textColor || '#FFFFFF',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                      }}
                    >
                      {banner.title}
                    </h2>
                  </div>
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Indicadores */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index + 1); // +1 because of clone at beginning
                pauseAutoplay();
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === ((currentIndex - 1 + banners.length) % banners.length)
                  ? 'bg-white scale-110'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              data-testid={`banner-indicator-${index}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}