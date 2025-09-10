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
    if (!containerRef.current) return;
    
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
      if (!isAutoPlaying) {
        setIsAutoPlaying(true);
      }
    }, 1500);
  };

  // Função para pausar autoplay temporariamente
  const pauseAutoplay = () => {
    setIsAutoPlaying(false);
    
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }
    
    resumeTimeoutRef.current = window.setTimeout(() => {
      setIsAutoPlaying(true);
    }, 2500);
  };

  // Cleanup dos timeouts
  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
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
    <div className="relative w-full aspect-[3/1] md:aspect-auto md:w-[790px] md:h-[230px] shadow-lg group md:rounded-lg overflow-hidden">
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
            className="min-w-full h-full shrink-0 snap-start snap-always cursor-pointer"
            style={{ backgroundColor: banner.backgroundColor }}
            onClick={() => handleBannerClick(banner)}
            data-testid={`banner-carousel-${banner.id}`}
          >
            <img
              src={banner.imageUrl}
              alt={banner.title}
              className="w-full h-full block select-none object-cover object-center md:object-contain md:object-center"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Indicadores de pontos */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2">
          {banners.map((_, index) => (
            <button
              key={index}
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