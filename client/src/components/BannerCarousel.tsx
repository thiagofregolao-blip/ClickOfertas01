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

  // Função para obter banner por índice (com loop infinito)
  const getBanner = (index: number) => {
    const adjustedIndex = ((index % banners.length) + banners.length) % banners.length;
    return banners[adjustedIndex];
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
  
  // Carousel rotativo estilo Buscapé - loop contínuo
  return (
    <div className="w-full h-48 md:h-64 lg:h-72 relative overflow-hidden rounded-lg">
      <div 
        ref={containerRef}
        className="flex h-full"
        style={{
          transform: `translateX(-33.33%)`, // Sempre centralizar o banner do meio
          transition: 'transform 700ms ease-in-out',
          width: '300%' // 3 banners visíveis
        }}
        onMouseEnter={pauseAutoplay}
        onTouchStart={pauseAutoplay}
      >
        {/* Banner anterior (parcialmente visível à esquerda) */}
        <div className="w-1/3 h-full flex-shrink-0 px-1">
          <div
            className="w-full h-full cursor-pointer relative group overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 opacity-75"
            onClick={() => handleBannerClick(getBanner(currentIndex - 1))}
            data-testid={`banner-prev-${getBanner(currentIndex - 1).id}`}
          >
            <div 
              className="w-full h-full flex items-center relative"
              style={{ 
                background: getBanner(currentIndex - 1).backgroundColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundImage: getBanner(currentIndex - 1).imageUrl ? `url(${getBanner(currentIndex - 1).imageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="absolute inset-0 bg-black/20" />
              
              <div className="relative z-10 w-full h-full flex items-center justify-center px-2 md:px-4">
                <div className="text-center">
                  <h2 
                    className="text-sm md:text-lg lg:text-xl font-bold leading-tight"
                    style={{ 
                      color: getBanner(currentIndex - 1).textColor || '#FFFFFF',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                    }}
                  >
                    {getBanner(currentIndex - 1).title}
                  </h2>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Banner atual (central, totalmente visível) */}
        <div className="w-1/3 h-full flex-shrink-0 px-1">
          <div
            className="w-full h-full cursor-pointer relative group overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => handleBannerClick(getBanner(currentIndex))}
            data-testid={`banner-current-${getBanner(currentIndex).id}`}
          >
            <div 
              className="w-full h-full flex items-center relative"
              style={{ 
                background: getBanner(currentIndex).backgroundColor || 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)',
                backgroundImage: getBanner(currentIndex).imageUrl ? `url(${getBanner(currentIndex).imageUrl})` : undefined,
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
                      color: getBanner(currentIndex).textColor || '#FFFFFF',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                    }}
                  >
                    {getBanner(currentIndex).title}
                  </h2>
                </div>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
            </div>
          </div>
        </div>

        {/* Banner próximo (parcialmente visível à direita) */}
        <div className="w-1/3 h-full flex-shrink-0 px-1">
          <div
            className="w-full h-full cursor-pointer relative group overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 opacity-75"
            onClick={() => handleBannerClick(getBanner(currentIndex + 1))}
            data-testid={`banner-next-${getBanner(currentIndex + 1).id}`}
          >
            <div 
              className="w-full h-full flex items-center relative"
              style={{ 
                background: getBanner(currentIndex + 1).backgroundColor || 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                backgroundImage: getBanner(currentIndex + 1).imageUrl ? `url(${getBanner(currentIndex + 1).imageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="absolute inset-0 bg-black/20" />
              
              <div className="relative z-10 w-full h-full flex items-center justify-center px-2 md:px-4">
                <div className="text-center">
                  <h2 
                    className="text-sm md:text-lg lg:text-xl font-bold leading-tight"
                    style={{ 
                      color: getBanner(currentIndex + 1).textColor || '#FFFFFF',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                    }}
                  >
                    {getBanner(currentIndex + 1).title}
                  </h2>
                </div>
              </div>
            </div>
          </div>
        </div>
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
                index === (currentIndex % banners.length)
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