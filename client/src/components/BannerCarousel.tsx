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

export function BannerCarousel({ banners, autoPlayInterval = 4000 }: BannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pauseTimeoutRef = useRef<number | null>(null);

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

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, banners.length, autoPlayInterval]);

  // Pausar autoplay temporariamente
  const pauseAutoplay = () => {
    setIsAutoPlaying(false);
    
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
    
    pauseTimeoutRef.current = window.setTimeout(() => {
      setIsAutoPlaying(true);
    }, 3000);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, []);

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

  // Carousel rotativo estilo Buscapé
  return (
    <div className="w-full h-48 md:h-64 lg:h-72 relative overflow-hidden">
      <div 
        ref={containerRef}
        className="flex transition-transform duration-700 ease-in-out h-full"
        style={{
          transform: `translateX(-${currentIndex * 85}%)`, // Move 85% para mostrar partes do próximo
          width: `${banners.length * 100}%`
        }}
        onMouseEnter={pauseAutoplay}
        onTouchStart={pauseAutoplay}
      >
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className="w-full h-full flex-shrink-0 px-1"
            style={{ width: `${100 / banners.length}%` }}
          >
            <div
              className="w-full h-full cursor-pointer relative group overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => handleBannerClick(banner)}
              data-testid={`banner-carousel-${banner.id}`}
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
                
                <div className="relative z-10 w-full h-full flex items-center justify-center px-4 md:px-8">
                  <div className="text-center">
                    <h2 
                      className="text-lg md:text-2xl lg:text-3xl font-bold leading-tight"
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
                setCurrentIndex(index);
                pauseAutoplay();
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
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