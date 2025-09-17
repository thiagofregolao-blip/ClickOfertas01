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
 * Carrossel de Banners - Versão corrigida baseada no HTML original
 */
export function BannerCarousel({ banners, autoPlayInterval = 4000 }: BannerCarouselProps) {
  if (!banners || banners.length === 0) {
    return null;
  }

  // Proporções exatas do HTML original
  const visibleRatio = 0.9;
  const gapRatio = 0.04;

  const carouselRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

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

  // Separar dimensões para evitar loops infinitos
  const [slideWidth, setSlideWidth] = useState(0);
  const [slideMargin, setSlideMargin] = useState(0);

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

  // Calcula dimensões e aplica a largura/margens via JS - EXATAMENTE como no HTML original
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

    // Aplica estilos diretamente no DOM
    if (trackRef.current) {
      const slides = trackRef.current.children;
      Array.from(slides).forEach((slide) => {
        const htmlSlide = slide as HTMLElement;
        htmlSlide.style.width = `${newSlideWidth}px`;
        htmlSlide.style.marginLeft = `${marginHalf}px`;
        htmlSlide.style.marginRight = `${marginHalf}px`;
      });
    }
  };

  // Posiciona o track de forma que o slide atual fique centralizado - EXATAMENTE como no HTML original
  const updatePosition = (withTransition: boolean) => {
    if (!trackRef.current || !carouselRef.current || !slideWidth) return;

    const track = trackRef.current;
    const carousel = carouselRef.current;

    track.style.transition = withTransition
      ? `transform 0.8s ease-in-out`
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
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    if (banners.length > 1) {
      autoplayRef.current = setInterval(nextSlide, autoPlayInterval);
    }
  };

  const stopAutoPlay = () => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  };

  // Ajusta índices quando chegamos aos clones - EXATAMENTE como no HTML original
  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform') return;
    if (extendedBanners[currentIndex]?.id.includes('clone') && currentIndex === totalSlides - 1) {
      setCurrentIndex(1);
      setTimeout(() => updatePosition(false), 0);
    }
    if (extendedBanners[currentIndex]?.id.includes('clone') && currentIndex === 0) {
      setCurrentIndex(realSlidesCount);
      setTimeout(() => updatePosition(false), 0);
    }
  };

  const goTo = (realIndex: number) => {
    setCurrentIndex(realIndex + 1);
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

  // Inicializa após carregar - EXATAMENTE como no HTML original
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateDimensions();
      updatePosition(false);
      startAutoPlay();
    }, 100);

    return () => {
      clearTimeout(timer);
      stopAutoPlay();
    };
  }, [banners]);

  // Atualiza posição quando currentIndex muda
  useEffect(() => {
    if (slideWidth > 0) {
      updatePosition(true);
    }
  }, [currentIndex]);

  // Recalcula quando dimensões mudam
  useEffect(() => {
    if (slideWidth > 0) {
      updatePosition(false);
    }
  }, [slideWidth, slideMargin]);

  const currentRealIndex = currentIndex - 1;

  return (
    <div
      ref={carouselRef}
      className="relative w-full overflow-hidden box-border"
      onMouseEnter={stopAutoPlay}
      onMouseLeave={startAutoPlay}
      data-testid="banner-carousel"
      style={{
        paddingLeft: '10%',
        paddingRight: '10%',
        height: "clamp(100px, 16vw, 260px)"
      }}
    >
      <div 
        ref={trackRef}
        className="flex"
        style={{ willChange: 'transform', height: '100%' }}
        onTransitionEnd={handleTransitionEnd}
      >
        {extendedBanners.map((banner, index) => (
          <div 
            key={banner.id}
            className="box-border cursor-pointer group h-full"
            style={{ 
              flex: '0 0 auto'
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
                style={{ borderRadius: '8px' }}
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

      {/* Indicadores - pontos de navegação apenas para banners reais */}
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