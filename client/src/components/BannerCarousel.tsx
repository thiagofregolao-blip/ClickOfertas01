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
 * Carrossel de Banners - Clone do código HTML fornecido
 * Implementação exata da lógica do código anexado
 */
export function BannerCarousel({ banners, autoPlayInterval = 4000 }: BannerCarouselProps) {
  if (!banners || banners.length === 0) {
    return null;
  }

  // Construção dos slides com clones: clone do último no início, slides reais, clone do primeiro no final
  const extendedBanners = useMemo(() => {
    if (banners.length <= 1) return banners;
    return [
      { ...banners[banners.length - 1], id: `clone-last-${banners[banners.length - 1].id}` },
      ...banners,
      { ...banners[0], id: `clone-first-${banners[0].id}` }
    ];
  }, [banners]);

  const realSlidesCount = banners.length;
  let [currentIndex, setCurrentIndex] = useState(banners.length > 1 ? 1 : 0); // iniciamos no primeiro slide real
  const [isHover, setIsHover] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

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

  // Registrar visualização quando banner for exibido
  useEffect(() => {
    if (banners.length > 0) {
      const realIndex = currentIndex - 1;
      const currentBanner = banners[realIndex >= 0 && realIndex < banners.length ? realIndex : 0];
      
      if (currentBanner) {
        fetch('/api/banners/view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bannerId: currentBanner.id,
          }),
        }).catch(error => {
          console.error('Erro ao registrar visualização:', error);
        });
      }
    }
  }, [currentIndex, banners]);

  // Atualiza a posição do track e pontos ativos
  function updateDots() {
    const realIndex = currentIndex - 1;
    return realIndex;
  }

  function updatePosition(track: HTMLElement, withTransition: boolean) {
    // Ativa ou desativa a animação
    track.style.transition = withTransition ? 
      `transform var(--transition-duration) ease-in-out` : 
      'none';
    // Cada slide com gap ocupa 100% (largura + margens), então deslocamos 100% por índice
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
  }

  // Avança para o próximo slide
  function nextSlide() {
    setCurrentIndex(prev => prev + 1);
  }

  // Auto-play: troca a cada 4 segundos
  useEffect(() => {
    if (banners.length <= 1) return;
    
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    
    if (!isHover) {
      autoPlayRef.current = setInterval(nextSlide, autoPlayInterval);
    }

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isHover, banners.length, autoPlayInterval]);

  // Trata o loop infinito: quando um clone é alcançado, reposiciona para o slide real correspondente
  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (banners.length <= 1) return;
    
    const track = e.currentTarget;
    
    if (currentIndex === 0) {
      setCurrentIndex(realSlidesCount);
      updatePosition(track, false);
    } else if (currentIndex === extendedBanners.length - 1) {
      setCurrentIndex(1);
      updatePosition(track, false);
    }
  };

  const next = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const prev = () => {
    setCurrentIndex(prev => prev - 1);
  };

  const goTo = (realIndex: number) => {
    const extendedIndex = realIndex + 1; // +1 por causa do clone inicial
    setCurrentIndex(extendedIndex);
  };

  const currentRealIndex = updateDots();

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
      {/* Layout Mobile */}
      <div 
        className="xl:hidden relative w-full overflow-hidden box-border"
        style={{ 
          height: "clamp(80px, 15vw, 220px)",
          paddingLeft: 'var(--stage-padding-mobile)',
          paddingRight: 'var(--stage-padding-mobile)'
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
                />
                
                {/* Controles apenas no slide ativo real */}
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

      {/* Layout Desktop */}
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
              <div className="relative h-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
                <div className="relative h-full w-full rounded-xl overflow-hidden">
                  <img
                    src={banner.imageUrl}
                    alt={banner.title || "banner"}
                    className="w-full h-full object-cover block"
                    loading="lazy"
                    decoding="async"
                    draggable="false"
                  />
                  
                  {/* Controles apenas no slide ativo real */}
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