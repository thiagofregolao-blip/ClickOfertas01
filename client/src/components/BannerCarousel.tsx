import { useEffect, useState, useRef, useMemo } from "react";

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

  // Clone-based infinite loop: [clone of last, ...real banners, clone of first]
  const extendedBanners = useMemo(() => {
    if (banners.length <= 1) return banners;
    return [
      { ...banners[banners.length - 1], id: `clone-last-${banners[banners.length - 1].id}` },
      ...banners,
      { ...banners[0], id: `clone-first-${banners[0].id}` }
    ];
  }, [banners]);

  // Start at index 1 (first real banner)
  const [currentIndex, setCurrentIndex] = useState(banners.length > 1 ? 1 : 0);
  const [isHover, setIsHover] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Refs
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

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

  // Handle transitionend for seamless clone jumps
  const handleTransitionEnd = () => {
    if (banners.length <= 1) return;
    
    // Jump from clone to real slide without animation
    if (currentIndex === 0) {
      // At clone of last banner, jump to real last
      setIsTransitioning(true);
      setCurrentIndex(banners.length);
      if (trackRef.current) {
        trackRef.current.style.transition = 'none';
        setTimeout(() => {
          if (trackRef.current) {
            trackRef.current.style.transition = '';
          }
          setIsTransitioning(false);
        }, 10);
      }
    } else if (currentIndex === extendedBanners.length - 1) {
      // At clone of first banner, jump to real first
      setIsTransitioning(true);
      setCurrentIndex(1);
      if (trackRef.current) {
        trackRef.current.style.transition = 'none';
        setTimeout(() => {
          if (trackRef.current) {
            trackRef.current.style.transition = '';
          }
          setIsTransitioning(false);
        }, 10);
      }
    }
  };

  // Auto-play with clone support
  useEffect(() => {
    if (banners.length <= 1 || isTransitioning) return;
    
    const startAutoPlay = () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      if (!isHover) {
        autoPlayRef.current = setInterval(() => {
          setCurrentIndex(prev => prev + 1);
        }, autoPlayInterval);
      }
    };
    
    startAutoPlay();
    
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isHover, banners.length, autoPlayInterval, isTransitioning]);

  const next = () => {
    if (isTransitioning) return;
    setCurrentIndex(prev => prev + 1);
  };

  const prev = () => {
    if (isTransitioning) return;
    setCurrentIndex(prev => prev - 1);
  };

  const goTo = (realIndex: number) => {
    if (isTransitioning) return;
    // Convert real banner index to extended array index
    const extendedIndex = realIndex + 1; // +1 because of clone at start
    if (extendedIndex === currentIndex) return;
    setCurrentIndex(extendedIndex);
  };

  // Get real banner index for indicators (0-based for original banners array)
  const getRealIndex = (extendedIndex: number) => {
    if (banners.length <= 1) return 0;
    if (extendedIndex === 0) return banners.length - 1; // clone of last
    if (extendedIndex === extendedBanners.length - 1) return 0; // clone of first
    return extendedIndex - 1; // real banners are offset by 1
  };

  const currentRealIndex = getRealIndex(currentIndex);

  return (
    <div
      className="relative w-full select-none min-w-0"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      aria-roledescription="carousel"
      data-testid="banner-carousel"
      style={{
        '--stage-padding-desktop': '10%',
        '--stage-padding-mobile': '5%',
        '--slide-gap-desktop': '2%',
        '--slide-gap-mobile': '1%',
        '--transition-duration': '0.8s'
      } as React.CSSProperties}
    >
      {/* Layout Mobile - Sistema Peek com Clones */}
      <div 
        className="xl:hidden relative w-full overflow-hidden box-border"
        style={{ 
          height: "clamp(80px, 15vw, 220px)",
          paddingLeft: 'var(--stage-padding-mobile)',
          paddingRight: 'var(--stage-padding-mobile)'
        }}
      >
        <div 
          ref={trackRef}
          className="flex h-full transition-transform ease-in-out"
          style={{ 
            transform: `translateX(-${currentIndex * 100}%)`,
            transitionDuration: 'var(--transition-duration)'
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extendedBanners.map((banner, index) => (
            <div 
              key={banner.id}
              className="h-full cursor-pointer group box-border"
              style={{ 
                flex: '0 0 calc(100% - 2 * var(--slide-gap-mobile))',
                marginLeft: 'var(--slide-gap-mobile)',
                marginRight: 'var(--slide-gap-mobile)'
              }}
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
                {/* Controles apenas no slide ativo (não em clones) */}
                {index === currentIndex && index > 0 && index < extendedBanners.length - 1 && (
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

      {/* Layout Desktop - Sistema Peek com Clones */}
      <div 
        className="hidden xl:block relative w-screen overflow-hidden box-border"
        style={{ 
          height: "clamp(100px, 16vw, 260px)",
          marginLeft: "calc(50% - 50vw)",
          paddingLeft: 'var(--stage-padding-desktop)',
          paddingRight: 'var(--stage-padding-desktop)'
        }}
      >
        <div 
          className="flex h-full transition-transform ease-in-out"
          style={{ 
            transform: `translateX(-${currentIndex * 100}%)`,
            transitionDuration: 'var(--transition-duration)'
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extendedBanners.map((banner, index) => (
            <div 
              key={banner.id}
              className="h-full relative cursor-pointer group box-border"
              style={{ 
                flex: '0 0 calc(100% - 2 * var(--slide-gap-desktop))',
                marginLeft: 'var(--slide-gap-desktop)',
                marginRight: 'var(--slide-gap-desktop)'
              }}
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
                  
                  {/* Controles apenas no slide ativo (não em clones) */}
                  {index === currentIndex && index > 0 && index < extendedBanners.length - 1 && (
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

      {/* Indicadores - apenas para banners reais */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30">
          {banners.map((_, realIndex) => (
            <button
              key={realIndex}
              aria-label={`Ir para banner ${realIndex + 1}`}
              onClick={() => goTo(realIndex)}
              className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${
                currentRealIndex === realIndex 
                  ? "scale-125 bg-white" 
                  : "bg-white/50 hover:bg-white/70"
              }`}
              data-testid={`banner-indicator-${realIndex}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}