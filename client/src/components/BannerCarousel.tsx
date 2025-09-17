import { useState, useRef, useEffect } from 'react';

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

export function BannerCarousel({ banners }: BannerCarouselProps) {
  if (!banners || banners.length === 0) {
    return null;
  }

  // Ajuste o banner e o espaço visível
  const visibleRatio = 0.96;  // o slide (com margens) ocupa 96% do espaço útil
  const gapRatio     = 0.02;  // 2% do espaço útil reservado às margens (1% de cada lado)

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

  // Cria slides com clones (último no início e primeiro no final)
  const slides = [
    { ...banners[banners.length - 1], clone: true, id: `clone-last-${banners[banners.length - 1].id}` },
    ...banners.map((b) => ({ ...b, clone: false })),
    { ...banners[0], clone: true, id: `clone-first-${banners[0].id}` },
  ];

  const carouselRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [dims, setDims] = useState({
    slideWidth: 0,
    slideMargin: 0,
    slideTotal: 0,
    leftover: 0,
  });

  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

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

  // Calcula tamanhos e aplica margens/larguras
  const calculateDimensions = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const style = window.getComputedStyle(carousel);
    const paddingLeft  = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const availableWidth = carousel.clientWidth - paddingLeft - paddingRight;

    const marginHalf  = availableWidth * (gapRatio / 2);
    const slideMargin = marginHalf * 2;
    const slideTotal  = availableWidth * visibleRatio;
    const slideWidth  = slideTotal - slideMargin;
    const leftover    = availableWidth - slideTotal;

    // Salva e aplica margens/larguras
    setDims({ slideWidth, slideMargin, slideTotal, leftover });

    if (trackRef.current) {
      Array.from(trackRef.current.children).forEach((child: HTMLElement) => {
        child.style.width = `${slideWidth}px`;
        child.style.marginLeft  = `${marginHalf}px`;
        child.style.marginRight = `${marginHalf}px`;
      });
    }
  };

  // Atualiza a posição do carrossel com ou sem transição
  const updatePosition = (withTransition = true) => {
    const { slideTotal, leftover } = dims;
    if (!trackRef.current || !slideTotal) return;

    trackRef.current.style.transition = withTransition
      ? `transform 0.8s ease-in-out`
      : 'none';

    const offset = currentIndex * slideTotal - leftover / 2;
    trackRef.current.style.transform = `translateX(-${offset}px)`;
  };

  // Avança slides no autoplay
  const nextSlide = () => setCurrentIndex((i) => i + 1);

  // Inicia e pausa o autoplay
  const startAutoPlay = () => {
    stopAutoPlay();
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(nextSlide, 4000);
  };
  const stopAutoPlay = () => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  };

  // Lida com o término da transição para pular para o slide real quando cai em um clone
  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== 'transform') return;
    // Se estamos no clone final, volta ao primeiro real
    if (slides[currentIndex].clone && currentIndex === slides.length - 1) {
      setCurrentIndex(1);
      requestAnimationFrame(() => updatePosition(false));
    }
    // Se estamos no clone inicial, volta ao último real
    if (slides[currentIndex].clone && currentIndex === 0) {
      setCurrentIndex(banners.length);
      requestAnimationFrame(() => updatePosition(false));
    }
  };

  // Efeito para calcular dimensões no carregamento e em resize
  useEffect(() => {
    calculateDimensions();
    window.addEventListener('resize', calculateDimensions);
    return () => window.removeEventListener('resize', calculateDimensions);
  }, []);

  // Atualiza a posição quando índice ou dimensões mudam
  useEffect(() => {
    updatePosition();
  }, [currentIndex, dims]);

  // Configura o autoplay e o listener de transição
  useEffect(() => {
    const track = trackRef.current;
    if (track) {
      track.addEventListener('transitionend', handleTransitionEnd as any);
    }
    startAutoPlay();
    return () => {
      stopAutoPlay();
      if (track) {
        track.removeEventListener('transitionend', handleTransitionEnd as any);
      }
    };
  }, [slides.length]);

  return (
    <div
      className="carousel"
      ref={carouselRef}
      onMouseEnter={stopAutoPlay}
      onMouseLeave={startAutoPlay}
      data-testid="banner-carousel"
    >
      {/* CSS incorporado: ajuste stage padding conforme necessário */}
      <style>{`
        :root {
          --stage-padding-desktop: 5%;
          --stage-padding-mobile: 2%;
        }
        .carousel {
          position: relative;
          width: 100%;
          overflow: hidden;
          padding-left: var(--stage-padding-desktop);
          padding-right: var(--stage-padding-desktop);
          box-sizing: border-box;
          height: clamp(100px, 16vw, 260px);
        }
        @media (max-width: 768px) {
          .carousel {
            padding-left: var(--stage-padding-mobile);
            padding-right: var(--stage-padding-mobile);
          }
        }
        .carousel-track {
          display: flex;
          will-change: transform;
          height: 100%;
        }
        .carousel-item {
          height: 100%;
          cursor: pointer;
          position: relative;
        }
        .carousel-item img {
          width: 100%;
          height: 100%;
          display: block;
          border-radius: 8px;
          object-fit: cover;
        }
        .dots {
          display: flex;
          justify-content: center;
          margin-top: 10px;
          gap: 6px;
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: all 0.2s;
        }
        .dot.active {
          background: white;
          transform: scale(1.25);
        }
        .dot:hover {
          background: rgba(255, 255, 255, 0.7);
        }
      `}</style>

      <div className="carousel-track" ref={trackRef} onTransitionEnd={handleTransitionEnd}>
        {slides.map((slide, idx) => (
          <div 
            className="carousel-item" 
            key={slide.id}
            onClick={() => handleBannerClick(slide)}
            data-testid={`banner-${slide.id}`}
          >
            <img src={slide.imageUrl} alt={slide.title} />
          </div>
        ))}
      </div>

      <div className="dots">
        {banners.map((_, idx) => (
          <span
            key={idx}
            className={currentIndex - 1 === idx ? 'dot active' : 'dot'}
            onClick={() => setCurrentIndex(idx + 1)}
            data-testid={`banner-indicator-${idx}`}
          />
        ))}
      </div>
    </div>
  );
}