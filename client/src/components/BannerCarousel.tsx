import { useEffect, useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHover, setIsHover] = useState(false);
  
  // Container track control - sistema baseado no Buscapé
  const trackControls = useAnimation();
  const [translateX, setTranslateX] = useState(0);

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

  // Esteira contínua - sistema baseado no Buscapé
  useEffect(() => {
    if (isHover || banners.length <= 1) return;
    
    let timeoutId: NodeJS.Timeout;
    
    const runConveyorBelt = () => {
      setIsAnimating(true);
      
      // Próximo banner
      const nextIndex = (currentIndex + 1) % banners.length;
      const newTranslateX = -nextIndex * 100;
      
      // Animar o track (como no Buscapé)
      trackControls.start({
        x: `${newTranslateX}%`,
        transition: { duration: 2, ease: 'easeInOut' }
      }).then(() => {
        // Atualizar estado após animação
        setCurrentIndex(nextIndex);
        setTranslateX(newTranslateX);
        setIsAnimating(false);
        
        // Agendar próximo movimento (5s pausa + 2s animação = 7s total)
        timeoutId = setTimeout(runConveyorBelt, 5000);
      });
    };
    
    // Iniciar primeira animação após 5 segundos
    timeoutId = setTimeout(runConveyorBelt, 5000);
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentIndex, isHover, banners.length, trackControls]);

  // Função manual para avançar (quando usuário clica)
  const next = () => {
    if (isAnimating) return;
    const newIndex = (currentIndex + 1) % banners.length;
    setCurrentIndex(newIndex);
    // Atualizar posição do track
    const newTranslateX = -newIndex * 100;
    setTranslateX(newTranslateX);
    trackControls.start({ x: `${newTranslateX}%`, transition: { duration: 0.5 } });
  };

  // Função manual para voltar (quando usuário clica)
  const prev = () => {
    if (isAnimating) return;
    const newIndex = (currentIndex - 1 + banners.length) % banners.length;
    setCurrentIndex(newIndex);
    // Atualizar posição do track
    const newTranslateX = -newIndex * 100;
    setTranslateX(newTranslateX);
    trackControls.start({ x: `${newTranslateX}%`, transition: { duration: 0.5 } });
  };

  // Função para ir para banner específico (indicadores)
  const goTo = (index: number) => {
    if (isAnimating || index === currentIndex) return;
    setCurrentIndex(index);
    // Atualizar posição do track
    const newTranslateX = -index * 100;
    setTranslateX(newTranslateX);
    trackControls.start({ x: `${newTranslateX}%`, transition: { duration: 0.5 } });
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
      {/* Layout Mobile/Tablet - Carrossel com deslizamento contínuo */}
      <div className="xl:hidden relative w-full overflow-hidden" style={{ height: "clamp(80px, 15vw, 220px)" }}>
        <div className="relative h-full max-w-4xl mx-auto px-4">
          {/* Container dos banners deslizantes */}
          <div className="relative h-full w-full overflow-hidden">
            <motion.div
              className="flex h-full"
              style={{ width: '300%' }}
              animate={trackControls}
              initial={{ x: '-33.333%' }}
            >
              {/* Banner Anterior */}
              <div 
                className="w-1/3 h-full px-2 cursor-pointer flex-shrink-0"
                onClick={() => handleBannerClick(banners[prevIndex])}
              >
                <div className="relative h-full w-full rounded-xl overflow-hidden">
                  <img
                    src={banners[prevIndex].imageUrl}
                    alt={banners[prevIndex].title || "banner"}
                    className="w-full h-full object-cover block"
                    loading="lazy"
                    decoding="async"
                    draggable="false"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 70vw"
                  />
                </div>
              </div>
              
              {/* Banner Atual */}
              <div 
                className="w-1/3 h-full px-2 cursor-pointer group flex-shrink-0"
                onClick={() => handleBannerClick(banners[currentIndex])}
                data-testid={`banner-main-mobile-${banners[currentIndex].id}`}
              >
                <div className="relative h-full w-full rounded-xl overflow-hidden">
                  <img
                    src={banners[currentIndex].imageUrl}
                    alt={banners[currentIndex].title || "banner"}
                    className="w-full h-full object-cover block"
                    loading="lazy"
                    decoding="async"
                    draggable="false"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 70vw"
                  />
                  {/* Setas de navegação mobile */}
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
                </div>
              </div>
              
              {/* Banner Próximo */}
              <div 
                className="w-1/3 h-full px-2 cursor-pointer flex-shrink-0"
                onClick={() => handleBannerClick(banners[nextIndex])}
              >
                <div className="relative h-full w-full rounded-xl overflow-hidden">
                  <img
                    src={banners[nextIndex].imageUrl}
                    alt={banners[nextIndex].title || "banner"}
                    className="w-full h-full object-cover block"
                    loading="lazy"
                    decoding="async"
                    draggable="false"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 70vw"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Layout Desktop - Banner central + laterais */}
      <div 
        className="hidden xl:block relative w-screen overflow-hidden"
        style={{ 
          height: "clamp(100px, 16vw, 260px)",
          marginLeft: "calc(50% - 50vw)"
        }}
      >
        {/* Banners laterais atrás com animação coordenada */}
        {banners.length > 1 && (
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {/* Preview Esquerdo - Cortado pela margem */}
            <motion.div 
              className="absolute left-0 top-0 h-full w-1/3 overflow-hidden cursor-pointer z-10 pointer-events-auto"
              onClick={() => handleBannerClick(banners[prevIndex])}
              style={{ 
                filter: "brightness(0.7)"
              }}
              animate={trackControls}
              initial={{ x: '-47%' }}
            >
              <div className="relative h-full w-full rounded-xl overflow-hidden">
                <img
                  src={banners[prevIndex].imageUrl}
                  alt={banners[prevIndex].title || "banner"}
                  className="w-full h-full object-cover block transition-transform duration-300"
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 70vw"
                />
              </div>
            </motion.div>

            {/* Preview Direito - Cortado pela margem */}
            <motion.div 
              className="absolute right-0 top-0 h-full w-1/3 overflow-hidden cursor-pointer z-10 pointer-events-auto"
              onClick={() => handleBannerClick(banners[nextIndex])}
              style={{ 
                filter: "brightness(0.7)"
              }}
              animate={trackControls}
              initial={{ x: '47%' }}
            >
              <div className="relative h-full w-full rounded-xl overflow-hidden">
                <img
                  src={banners[nextIndex].imageUrl}
                  alt={banners[nextIndex].title || "banner"}
                  className="w-full h-full object-cover block transition-transform duration-300"
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 70vw"
                />
              </div>
            </motion.div>
          </div>
        )}

        {/* Layout do Buscapé: Banner central */}
        <div className="relative h-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 z-20">
          {/* Banner Central com animação coordenada */}
          <motion.div
            className="relative h-full w-full rounded-xl overflow-hidden cursor-pointer group z-20"
            onClick={() => handleBannerClick(banners[currentIndex])}
            data-testid={`banner-main-${banners[currentIndex].id}`}
            animate={trackControls}
            initial={{ x: '0%' }}
          >
            <img
              src={banners[currentIndex].imageUrl}
              alt={banners[currentIndex].title || "banner"}
              className="w-full h-full object-cover block transition-transform duration-300"
              loading="lazy"
              decoding="async"
              draggable="false"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 70vw"
              style={{ transform: "scale(1)" }}
            />

            {/* Setas de navegação */}
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
          </motion.div>
        </div>
      </div>

      {/* Indicadores */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30">
          {banners.map((_, index) => (
            <button
              key={index}
              aria-label={`Ir para banner ${index + 1}`}
              onClick={() => goTo(index)}
              className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${
                currentIndex === index 
                  ? "scale-125 bg-white" 
                  : "bg-white/50 hover:bg-white/70"
              }`}
              data-testid={`banner-indicator-${index}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}