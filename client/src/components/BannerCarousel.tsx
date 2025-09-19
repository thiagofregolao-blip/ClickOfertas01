// BannerCarousel.tsx - Versão corrigida com loop infinito suave e sincronizado

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
 * Carrossel de Banners com loop infinito robusto.
 *
 * Principais características:
 * - Usa clones do primeiro e último banners para criar a ilusão de loop infinito.
 * - Mantém um estado `isTransitioning` para pausar o autoplay durante animações.
 * - Utiliza um `skipTransitionRef` para suprimir a transição na próxima
 *   atualização de posição quando voltamos de um clone para um slide real.
 * - Navegação manual para frente e para trás com tratamento de clones.
 */
export function BannerCarousel({ banners, autoPlayInterval = 4000 }: BannerCarouselProps) {
  if (!banners || banners.length === 0) {
    return null;
  }

  // Proporções para dimensionamento dos slides
  const visibleRatio = 0.9;
  const gapRatio = 0.04;

  const carouselRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Constrói a lista de slides incluindo clones
  const extendedBanners = useMemo(() => {
    if (banners.length <= 1) return banners;
    return [
      { ...banners[banners.length - 1], id: `clone-last-${banners[banners.length - 1].id}` },
      ...banners,
      { ...banners[0], id: `clone-first-${banners[0].id}` }
    ];
  }, [banners]);

  const totalSlides = extendedBanners.length;
  const realSlidesCount = banners.length;

  // Estados: índice atual, dimensões do slide e status de transição
  const [currentIndex, setCurrentIndex] = useState(banners.length > 1 ? 1 : 0);
  const [slideWidth, setSlideWidth] = useState(0);
  const [slideMargin, setSlideMargin] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Flag para pular a animação na próxima atualização de posição
  const skipTransitionRef = useRef(false);

  // 📊 Batch de eventos para otimizar performance
  const eventBatch = useRef<{type: string, bannerId: string, timestamp: number}[]>([]);
  const batchTimer = useRef<NodeJS.Timeout>();

  const sendEventBatch = () => {
    if (eventBatch.current.length === 0) return;
    
    // Usar sendBeacon para garantia de entrega mesmo se página fechar
    const events = [...eventBatch.current];
    eventBatch.current = [];
    
    // Enviar para novo endpoint unificado de analytics
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'banner_batch',
        events: events
      })
    }).catch(error => {
      console.debug('📊 Banner batch failed:', error);
      // Re-adicionar eventos falhos para retry
      eventBatch.current.unshift(...events);
    });
  };

  const addToBatch = (type: string, bannerId: string) => {
    eventBatch.current.push({ type, bannerId, timestamp: Date.now() });
    
    // Batch timer: enviar a cada 5 segundos ou quando atingir 10 eventos
    if (eventBatch.current.length >= 10) {
      if (batchTimer.current) clearTimeout(batchTimer.current);
      sendEventBatch();
    } else if (!batchTimer.current) {
      batchTimer.current = setTimeout(() => {
        sendEventBatch();
        batchTimer.current = undefined;
      }, 5000);
    }
  };

  // Registra clique no banner e abre o link em nova aba se houver
  const handleBannerClick = async (banner: Banner) => {
    // 📊 Usar sistema de batch em vez de chamada individual
    addToBatch('banner_click', banner.id.replace(/^clone-(first|last)-/, ''));
    
    if (banner.linkUrl) {
      window.open(banner.linkUrl, '_blank');
    }
  };

  // 📊 Registra visualização do banner real quando exibido (com batch)
  useEffect(() => {
    if (!banners || banners.length === 0) return;
    const realIndex = currentIndex - 1;
    const currentBanner =
      banners[realIndex >= 0 && realIndex < banners.length ? realIndex : 0];
    if (currentBanner) {
      // Usar sistema de batch para views também
      addToBatch('banner_view', currentBanner.id);
      console.debug('📊 Banner view:', currentBanner.title);
    }

    // Cleanup: enviar batch restante quando componente desmontar
    return () => {
      if (batchTimer.current) {
        clearTimeout(batchTimer.current);
        batchTimer.current = undefined;
      }
      sendEventBatch();
    };
  }, [currentIndex, banners]);

  // Calcula dimensões e aplica largura/margens via DOM
  const calculateDimensions = () => {
    if (!carouselRef.current) return;
    const carousel = carouselRef.current;
    const styles = getComputedStyle(carousel);
    const paddingLeft = parseFloat(styles.paddingLeft) || 0;
    const paddingRight = parseFloat(styles.paddingRight) || 0;
    const carouselWidth = carousel.clientWidth;
    const availableWidth = carouselWidth - paddingLeft - paddingRight;
    const marginHalf = availableWidth * (gapRatio / 2);
    const newSlideMargin = marginHalf * 2;
    const slideTotal = availableWidth * visibleRatio;
    const newSlideWidth = slideTotal - newSlideMargin;
    setSlideWidth(newSlideWidth);
    setSlideMargin(newSlideMargin);
    if (trackRef.current) {
      const slides = trackRef.current.children;
      Array.from(slides).forEach((node) => {
        const el = node as HTMLElement;
        el.style.width = `${newSlideWidth}px`;
        el.style.marginLeft = `${marginHalf}px`;
        el.style.marginRight = `${marginHalf}px`;
      });
    }
  };

  // Atualiza a posição do track. Não modifica `isTransitioning` aqui; isso é
  // decidido fora de acordo com a lógica de controle de transições.
  const updatePosition = (withTransition: boolean) => {
    if (!trackRef.current || !carouselRef.current || !slideWidth) return;
    const track = trackRef.current;
    const carousel = carouselRef.current;
    track.style.transition = withTransition ? `transform 0.8s ease-in-out` : 'none';
    const slideTotal = slideWidth + slideMargin;
    const styles = getComputedStyle(carousel);
    const paddingLeft = parseFloat(styles.paddingLeft) || 0;
    const paddingRight = parseFloat(styles.paddingRight) || 0;
    const availableWidth = carousel.clientWidth - paddingLeft - paddingRight;
    const leftover = availableWidth - slideTotal;
    const offset = (currentIndex * slideTotal) - (leftover / 2);
    track.style.transform = `translateX(-${offset}px)`;
  };

  // Avança um slide (para autoplay e botão "próximo")
  const nextSlide = () => {
    setCurrentIndex((prev) => prev + 1);
  };

  // Retrocede um slide (para botão "anterior"). Tratamos clones ao entrar no
  // clone inicial para voltar ao último slide real.
  const prevSlide = () => {
    setCurrentIndex((prev) => {
      // Próximo índice após decrementar
      const newIndex = prev - 1;
      if (newIndex <= 0) {
        // Estamos no clone inicial ou antes: ir para o último slide real
        skipTransitionRef.current = true;
        return realSlidesCount;
      }
      return newIndex;
    });
  };

  // Handler de fim de transição: ajusta índices quando chegamos aos clones
  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform') return;
    // Clone final (último item da lista estendida)
    if (currentIndex === totalSlides - 1) {
      skipTransitionRef.current = true;
      setCurrentIndex(1);
      setIsTransitioning(false);
      return;
    }
    // Clone inicial (posição 0)
    if (currentIndex === 0) {
      skipTransitionRef.current = true;
      setCurrentIndex(realSlidesCount);
      setIsTransitioning(false);
      return;
    }
    // Se não estamos em clones, fim da transição normal
    setIsTransitioning(false);
  };

  // Navegação direta pelos pontos
  const goTo = (realIndex: number) => {
    setCurrentIndex(realIndex + 1);
  };

  // Recalcula dimensões no redimensionamento da janela
  useEffect(() => {
    const onResize = () => {
      calculateDimensions();
      // Reposiciona instantaneamente sem animação após o redimensionamento
      updatePosition(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Inicializa dimensões e posição
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateDimensions();
      updatePosition(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [banners]);

  // Autoplay: agenda o próximo slide somente quando não estamos em transição
  useEffect(() => {
    if (banners.length <= 1 || isTransitioning) return;
    const timer = setTimeout(() => {
      nextSlide();
    }, autoPlayInterval);
    return () => clearTimeout(timer);
  }, [currentIndex, autoPlayInterval, banners.length, isTransitioning]);

  // Move o carrossel quando currentIndex muda
  useEffect(() => {
    if (slideWidth === 0) return;
    // Determina se a próxima movimentação deve ser animada
    const animate = !skipTransitionRef.current;
    updatePosition(animate);
    setIsTransitioning(animate);
    // Limpa o flag após aplicá-lo
    skipTransitionRef.current = false;
  }, [currentIndex, slideWidth, slideMargin]);

  // Reposiciona instantaneamente se slideWidth ou slideMargin mudarem
  useEffect(() => {
    if (slideWidth > 0) {
      updatePosition(false);
    }
  }, [slideWidth, slideMargin]);

  // Calcula índice real (ignora clones) para os indicadores
  const currentRealIndex = currentIndex - 1;

  return (
    <div
      ref={carouselRef}
      className="relative w-full overflow-hidden box-border"
      data-testid="banner-carousel"
      style={{
        paddingLeft: '10%',
        paddingRight: '10%',
        height: 'clamp(100px, 16vw, 260px)'
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
            style={{ flex: '0 0 auto' }}
            onClick={() => handleBannerClick(banner)}
            data-testid={`banner-${banner.id}`}
          >
            <div className="relative h-full w-full rounded-xl overflow-hidden">
              <img
                src={banner.imageUrl}
                alt={banner.title || 'banner'}
                className="w-full h-full object-cover block"
                loading="lazy"
                decoding="async"
                draggable="false"
                style={{ borderRadius: '8px' }}
              />
              {/* Controles visíveis apenas no slide real ativo */}
              {index === currentIndex && index > 0 && index < extendedBanners.length - 1 && (
                <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prevSlide();
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
                      nextSlide();
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
      {/* Indicadores para navegação direta */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30">
          {banners.map((_, realIndex) => (
            <button
              key={realIndex}
              aria-label={`Ir para banner ${realIndex + 1}`}
              onClick={() => goTo(realIndex)}
              className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${
                currentRealIndex === realIndex
                  ? 'scale-125 bg-white'
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              data-testid={`banner-indicator-${realIndex}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}