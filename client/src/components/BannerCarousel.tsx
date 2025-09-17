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
 * Carrossel de Banners - Implementação exata do código HTML fornecido
 * Usa JavaScript para definir larguras e margens baseado na largura real do container
 */
export function BannerCarousel({ banners, autoPlayInterval = 4000 }: BannerCarouselProps) {
  if (!banners || banners.length === 0) {
    return null;
  }

  // Proporção do slide em relação à largura disponível (0 < visibleRatio < 1).
  const visibleRatio = 0.9;
  // Proporção do espaço reservado para o gap entre os slides em relação à largura disponível.
  const gapRatio = 0.04; // 4% do espaço disponível para margens (2% de cada lado)

  // Construção dos slides com clones
  const extendedBanners = useMemo(() => {
    if (banners.length <= 1) return banners;
    return [
      { ...banners[banners.length - 1], id: `clone-last-${banners[banners.length - 1].id}` }, // clone do último
      ...banners, // slides reais
      { ...banners[0], id: `clone-first-${banners[0].id}` } // clone do primeiro
    ];
  }, [banners]);

  const totalSlides = extendedBanners.length;
  const realSlidesCount = banners.length;
  
  const [currentIndex, setCurrentIndex] = useState(banners.length > 1 ? 1 : 0); // começa no primeiro real
  const [slideWidth, setSlideWidth] = useState(0);
  const [slideMargin, setSlideMargin] = useState(0);
  const [isHover, setIsHover] = useState(false);
  
  const carouselRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
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

  // Calcula dimensões e aplica a largura/margens
  const calculateDimensions = () => {
    if (!carouselRef.current) return;
    
    const carousel = carouselRef.current;
    const carouselStyles = getComputedStyle(carousel);
    const paddingLeft = parseFloat(carouselStyles.paddingLeft) || 0;
    const paddingRight = parseFloat(carouselStyles.paddingRight) || 0;
    const carouselWidth = carousel.clientWidth;
    const availableWidth = carouselWidth - paddingLeft - paddingRight;

    // Metade do gap para cada lado
    const marginHalf = availableWidth * (gapRatio / 2);
    const newSlideMargin = marginHalf * 2;

    // Largura total de cada slide (incluindo margens) = visibleRatio * availableWidth
    const slideTotal = availableWidth * visibleRatio;

    // Conteúdo interno do slide
    const newSlideWidth = slideTotal - newSlideMargin;

    setSlideWidth(newSlideWidth);
    setSlideMargin(newSlideMargin);
  };

  // Posiciona o track de forma que o slide atual fique centralizado
  const updatePosition = (withTransition: boolean) => {
    if (!trackRef.current || !carouselRef.current || !slideWidth) return;

    const track = trackRef.current;
    const carousel = carouselRef.current;

    track.style.transition = withTransition
      ? `transform var(--transition-duration) ease-in-out`
      : 'none';

    const slideTotal = slideWidth + slideMargin;

    // Largura disponível (mesma do cálculo acima)
    const carouselStyles = getComputedStyle(carousel);
    const paddingLeft = parseFloat(carouselStyles.paddingLeft) || 0;
    const paddingRight = parseFloat(carouselStyles.paddingRight) || 0;
    const availableWidth = carousel.clientWidth - paddingLeft - paddingRight;

    // Espaço restante (sobras) a ser dividido igualmente entre as laterais
    const leftover = availableWidth - slideTotal;

    // O deslocamento que centraliza o slide e mostra a mesma parte dos vizinhos
    const offset = (currentIndex * slideTotal) - (leftover / 2);

    track.style.transform = `translateX(-${offset}px)`;
  };

  const nextSlide = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const startAutoPlay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    if (!isHover && banners.length > 1) {
      autoPlayRef.current = setInterval(nextSlide, autoPlayInterval);
    }
  };

  const stopAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  };

  // Ajusta índices quando chegamos aos clones
  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform') return;
    
    const slides = extendedBanners;
    if (slides[currentIndex]?.id.includes('clone') && currentIndex === totalSlides - 1) {
      setCurrentIndex(1);
      setTimeout(() => updatePosition(false), 0);
    }
    if (slides[currentIndex]?.id.includes('clone') && currentIndex === 0) {
      setCurrentIndex(realSlidesCount);
      setTimeout(() => updatePosition(false), 0);
    }
  };

  const goTo = (realIndex: number) => {
    const extendedIndex = realIndex + 1; // +1 por causa do clone inicial
    setCurrentIndex(extendedIndex);
  };

  // Recalcula ao redimensionar a janela
  useEffect(() => {
    const handleResize = () => {
      calculateDimensions();
      setTimeout(() => updatePosition(false), 0);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [slideWidth, slideMargin, currentIndex]);

  // Auto-play
  useEffect(() => {
    if (isHover) {
      stopAutoPlay();
    } else {
      startAutoPlay();
    }

    return () => stopAutoPlay();
  }, [isHover, banners.length, autoPlayInterval]);

  // Inicializa após carregar
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateDimensions();
      setTimeout(() => updatePosition(false), 0);
    }, 100);

    return () => clearTimeout(timer);
  }, [banners]);

  // Atualiza posição quando currentIndex ou dimensões mudam
  useEffect(() => {
    if (slideWidth > 0) {
      updatePosition(true);
    }
  }, [currentIndex, slideWidth, slideMargin]);

  const currentRealIndex = currentIndex - 1;

  return (
    <div
      ref={carouselRef}
      className="relative w-full select-none min-w-0 overflow-hidden box-border"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      aria-roledescription="carousel"
      data-testid="banner-carousel"
      style={{
        '--stage-padding-desktop': '10%',
        '--stage-padding-mobile': '5%',
        '--transition-duration': '0.8s',
        paddingLeft: 'var(--stage-padding-desktop)',
        paddingRight: 'var(--stage-padding-desktop)',
        height: "clamp(100px, 16vw, 260px)"
      } as React.CSSProperties}
    >
      <div 
        ref={trackRef}
        className="flex h-full"
        style={{ willChange: 'transform' }}
        onTransitionEnd={handleTransitionEnd}
      >
        {extendedBanners.map((banner, index) => (
          <div 
            key={banner.id}
            className="h-full cursor-pointer group box-border flex-none"
            style={{ 
              width: `${slideWidth}px`,
              marginLeft: `${slideMargin / 2}px`,
              marginRight: `${slideMargin / 2}px`
            }}
            onClick={() => handleBannerClick(banner)}
            data-testid={`banner-${banner.id}`}
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
                      setCurrentIndex(prev => prev - 1);
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
                      setCurrentIndex(prev => prev + 1);
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
        ))}
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