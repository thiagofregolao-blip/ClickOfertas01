import { useEffect, useState, useRef } from "react";

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

/**
 * Carrossel de Banners - Modelo Buscapé
 * Banner central alinhado com container principal
 * Banners laterais parcialmente visíveis (cortados pelas margens)
 */
export function BannerCarousel({ banners, autoPlayInterval = 4000 }: BannerCarouselProps) {
  if (!banners || banners.length === 0) {
    return null;
  }

  const [currentIndex, setCurrentIndex] = useState(1); // Começa no primeiro banner real (depois do clone)
  const [isHover, setIsHover] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(true);
  
  // Ref para o auto-play interval e container
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  
  // Criar banners estendidos com clones para efeito infinito
  const extendedBanners = [
    banners[banners.length - 1], // Clone do último banner no início
    ...banners, // Banners originais
    banners[0] // Clone do primeiro banner no final
  ];

  // Analytics - Registrar clique no banner
  const handleBannerClick = async (banner: Banner) => {
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

    if (banner.linkUrl) {
      window.open(banner.linkUrl, '_blank');
    }
  };

  // Efeito para gerenciar saltos invisíveis nos clones
  useEffect(() => {
    if (!isTransitioning) return;
    
    const handleTransitionEnd = () => {
      setIsTransitioning(false);
      
      // Se estamos no clone do final, saltar para o início real
      if (currentIndex === extendedBanners.length - 1) {
        setCurrentIndex(1);
      }
      // Se estamos no clone do início, saltar para o final real
      else if (currentIndex === 0) {
        setCurrentIndex(banners.length);
      }
    };

    if (sliderRef.current) {
      const slider = sliderRef.current;
      slider.addEventListener('transitionend', handleTransitionEnd);
      
      return () => {
        slider.removeEventListener('transitionend', handleTransitionEnd);
      };
    }
  }, [currentIndex, isTransitioning, extendedBanners.length, banners.length]);

  // Auto-play para carrossel infinito
  useEffect(() => {
    if (banners.length <= 1) return;
    
    const startAutoPlay = () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      if (!isHover) {
        autoPlayRef.current = setInterval(() => {
          next();
        }, autoPlayInterval);
      }
    };
    
    startAutoPlay();
    
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isHover, banners.length, autoPlayInterval]);

  const next = () => {
    if (!isTransitioning) {
      setIsTransitioning(true);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prev = () => {
    if (!isTransitioning) {
      setIsTransitioning(true);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const goTo = (index: number) => {
    const realIndex = index + 1; // Ajustar para posição real (com clone)
    if (realIndex === currentIndex || !isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(realIndex);
  };

  // Índices dos banners
  const prevIndex = (currentIndex - 1 + banners.length) % banners.length;
  const nextIndex = (currentIndex + 1) % banners.length;

  return (
    <div
      className="relative w-full select-none min-w-0"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      aria-roledescription="carousel"
      data-testid="banner-carousel"
    >
      {/* Layout Mobile - Sistema Buscapé com Peek */}
      <div className="xl:hidden relative w-full" style={{ height: "clamp(80px, 15vw, 220px)" }}>
        <div className="relative h-full max-w-4xl mx-auto">
          <div className="relative h-full w-full overflow-hidden px-8">
            {/* Container Buscapé - slides com peek lateral infinitos */}
            <div
              ref={sliderRef}
              className={`flex h-full duration-500 ease-in-out ${isTransitioning ? 'transition-transform' : ''}`}
              style={{ 
                width: `${extendedBanners.length * 80}%`,
                transform: `translateX(-${currentIndex * (80 / extendedBanners.length)}%) translateX(10%)`
              }}
            >
              {extendedBanners.map((banner, index) => (
                <div 
                  key={`mobile-${banner.id}-${index}`}
                  className="h-full px-2 cursor-pointer group flex-shrink-0"
                  style={{ width: `${80 / extendedBanners.length}%` }}
                  onClick={() => handleBannerClick(banner)}
                  data-testid={`banner-mobile-${banner.id}`}
                >
                  <div className="relative h-full w-full rounded-xl overflow-hidden">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title || "banner"}
                      className="w-full h-full object-cover block"
                      loading="lazy"
                      decoding="async"
                      draggable="false"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 70vw"
                    />
                    {/* Controles apenas no slide ativo */}
                    {index === currentIndex && (
                      <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            prev();
                          }}
                          aria-label="Banner anterior"
                          className="rounded-full bg-black/50 hover:bg-black/70 text-white w-8 h-8 flex items-center justify-center transition-colors"
                          data-testid="banner-prev-btn-mobile"
                        >
                          ←
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            next();
                          }}
                          aria-label="Próximo banner"
                          className="rounded-full bg-black/50 hover:bg-black/70 text-white w-8 h-8 flex items-center justify-center transition-colors"
                          data-testid="banner-next-btn-mobile"
                        >
                          →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Layout Desktop - Sistema Buscapé com Peek */}
      <div 
        className="hidden xl:block relative w-screen"
        style={{ 
          height: "clamp(100px, 16vw, 260px)",
          marginLeft: "calc(50% - 50vw)"
        }}
      >
        {/* Container com peek lateral */}
        <div className="relative h-full overflow-hidden px-16">
          <div
            className={`flex h-full duration-500 ease-in-out ${isTransitioning ? 'transition-transform' : ''}`}
            style={{ 
              width: `${extendedBanners.length * 85}%`,
              transform: `translateX(-${currentIndex * (85 / extendedBanners.length)}%) translateX(7.5%)`
            }}
          >
            {extendedBanners.map((banner, index) => (
              <div 
                key={`desktop-${banner.id}-${index}`}
                className="h-full relative cursor-pointer group flex-shrink-0"
                style={{ width: `${85 / extendedBanners.length}%` }}
                onClick={() => handleBannerClick(banner)}
                data-testid={`banner-desktop-${banner.id}`}
              >
                {/* Container centralizado com margens laterais */}
                <div className="relative h-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
                  <div className="relative h-full w-full rounded-xl overflow-hidden">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title || "banner"}
                      className="w-full h-full object-cover block"
                      loading="lazy"
                      decoding="async"
                      draggable="false"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 70vw"
                    />
                    
                    {/* Controles apenas no slide ativo */}
                    {index === currentIndex && (
                      <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            prev();
                          }}
                          aria-label="Banner anterior"
                          className="rounded-full bg-black/50 hover:bg-black/70 text-white w-10 h-10 flex items-center justify-center transition-colors"
                          data-testid="banner-prev-btn"
                        >
                          ←
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            next();
                          }}
                          aria-label="Próximo banner"
                          className="rounded-full bg-black/50 hover:bg-black/70 text-white w-10 h-10 flex items-center justify-center transition-colors"
                          data-testid="banner-next-btn"
                        >
                          →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Indicadores */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30">
          {banners.map((_, index) => {
            // Calcular índice real do banner (sem contar clones)
            const realCurrentIndex = currentIndex === 0 ? banners.length - 1 : 
                                   currentIndex === extendedBanners.length - 1 ? 0 : 
                                   currentIndex - 1;
            return (
              <button
                key={index}
                aria-label={`Ir para banner ${index + 1}`}
                onClick={() => goTo(index)}
                className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${
                  realCurrentIndex === index 
                    ? "scale-125 bg-white" 
                    : "bg-white/50 hover:bg-white/70"
                }`}
                data-testid={`banner-indicator-${index}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}