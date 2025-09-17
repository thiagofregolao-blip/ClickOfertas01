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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHover, setIsHover] = useState(false);
  
  // Ref para o auto-play interval
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

  // Auto-play simples baseado no código anexado
  useEffect(() => {
    if (banners.length <= 1) return;
    
    const startAutoPlay = () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      if (!isHover) {
        autoPlayRef.current = setInterval(() => {
          setCurrentIndex((prev) => (prev + 1) % banners.length);
        }, autoPlayInterval);
      }
    };
    
    startAutoPlay();
    
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isHover, banners.length, autoPlayInterval]);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goTo = (index: number) => {
    if (index === currentIndex) return;
    setCurrentIndex(index);
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
      {/* Layout Mobile - Sistema Peek Simples */}
      <div className="xl:hidden relative w-full overflow-hidden" style={{ height: "clamp(80px, 15vw, 220px)" }}>
        <div className="relative h-full max-w-4xl mx-auto">
          {/* Container com slides 90% + margens 5% para peek automático */}
          <div 
            className="flex h-full transition-transform duration-500 ease-in-out"
            style={{ 
              transform: `translateX(-${currentIndex * 100}%)`
            }}
          >
            {banners.map((banner, index) => (
              <div 
                key={banner.id}
                className="h-full cursor-pointer group"
                style={{ 
                  flex: '0 0 90%',
                  margin: '0 5%'
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

      {/* Layout Desktop - Sistema Peek Simples */}
      <div 
        className="hidden xl:block relative w-screen overflow-hidden"
        style={{ 
          height: "clamp(100px, 16vw, 260px)",
          marginLeft: "calc(50% - 50vw)"
        }}
      >
        {/* Container com slides 90% + margens 5% para peek automático */}
        <div 
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ 
            transform: `translateX(-${currentIndex * 100}%)`
          }}
        >
          {banners.map((banner, index) => (
            <div 
              key={banner.id}
              className="h-full relative cursor-pointer group"
              style={{ 
                flex: '0 0 90%',
                margin: '0 5%'
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