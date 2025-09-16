import { useEffect, useState } from "react";
import { motion } from "framer-motion";

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
 * Carrossel de Banners – MODELO BUSCAPÉ (3 visíveis com imagens)
 * Efeito solicitado: PAUSA (~4s) no banner central e depois desliza para a esquerda,
 * trazendo o banner da direita para o centro. Sem rebote, sem morph de largura.
 * Proporção fixa: 70% (centro) | 15% (esq) | 15% (dir)
 */

export function BannerCarousel({ banners, autoPlayInterval = 4000 }: BannerCarouselProps) {
  if (!banners || banners.length === 0) {
    return null;
  }

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

    // Abrir link se existir
    if (banner.linkUrl) {
      window.open(banner.linkUrl, '_blank');
    }
  };

  // Converter banners para formato do carrossel
  const items = banners.map(banner => ({
    id: banner.id,
    image: banner.imageUrl,
    banner: banner
  }));

  const n = items.length;
  const [center, setCenter] = useState(0); // índice do item central
  const [dir, setDir] = useState(1); // 1 = direita->centro (move trilho para a esquerda); -1 = esquerda->centro
  const [isAnimating, setIsAnimating] = useState(false);
  const [snap, setSnap] = useState(false); // transição 0 para resetar trilho após animar
  const [isHover, setIsHover] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const i = (k: number) => (k + n) % n;

  // índices para compor as 3 posições visíveis + 1 buffer
  const left = i(center - 1);
  const right = i(center + 1);
  const nextRight = i(center + 2);

  // autoplay com PAUSA: espera dwellMs e então dispara uma animação de 15%
  useEffect(() => {
    if (isHover || isAnimating) return;
    const id = setTimeout(() => startSlide(1), autoPlayInterval);
    return () => clearTimeout(id);
  }, [isHover, isAnimating, center, autoPlayInterval]);

  function startSlide(direction: 1 | -1) {
    if (isAnimating) return;
    setDir(direction);
    setIsAnimating(true);
  }

  // Controles manuais
  const next = () => startSlide(1);
  const prev = () => startSlide(-1);

  // Touch
  const onTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX == null) return;
    const dx = e.touches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      dx < 0 ? next() : prev();
      setTouchStartX(null);
    }
  };

  return (
    <div
      className="relative w-full select-none"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      aria-roledescription="carousel"
      data-testid="banner-carousel"
    >
      {/* Container full-bleed com grid de 3 colunas */}
      <div 
        className="relative w-screen grid h-full overflow-visible"
        style={{ 
          height: "clamp(100px, 17.59vw, 299px)",
          marginLeft: "calc(50% - 50vw)",
          gridTemplateColumns: "1fr min(100%, 80rem) 1fr"
        }}
      >
        {/* Preview esquerdo - Coluna 1 */}
        <motion.div 
          className="flex items-stretch justify-end h-full overflow-hidden"
          animate={{ x: isAnimating ? (dir === 1 ? "-100%" : "100%") : "0%" }}
          transition={snap ? { duration: 0 } : { duration: 0.6, ease: "easeInOut" }}
        >
          <div 
            className="relative h-full w-full rounded-xl overflow-hidden cursor-pointer"
            onClick={() => handleBannerClick(items[left].banner)}
          >
            <img
              src={items[left]?.image}
              alt={items[left].banner.title || "banner"}
              className="w-full h-full object-cover block"
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          </div>
        </motion.div>

        {/* Banner central - Coluna 2 (limitado pelo container principal) */}
        <div className="relative h-full overflow-hidden px-4 sm:px-6 lg:px-8">
          <motion.div
            className="relative flex items-stretch h-full group"
            style={{ willChange: "transform" }}
            initial={false}
            animate={{ x: isAnimating ? (dir === 1 ? "-100%" : "100%") : "0%" }}
            transition={snap ? { duration: 0 } : { duration: 0.6, ease: "easeInOut" }}
            onAnimationComplete={() => {
              if (isAnimating) {
                setCenter((c) => i(c + dir));
                setIsAnimating(false);
                setSnap(true);
                requestAnimationFrame(() => setSnap(false));
              }
            }}
          >
            {/* esquerda (off-screen) */}
            <Slide item={items[left]} startBasis="100%" onBannerClick={handleBannerClick} />
            {/* centro (main container width) */}
            <Slide item={items[center]} startBasis="100%" onBannerClick={handleBannerClick} />
            {/* direita (off-screen) */}
            <Slide item={items[right]} startBasis="100%" onBannerClick={handleBannerClick} />
            {/* buffer */}
            <Slide item={items[nextRight]} startBasis="100%" onBannerClick={handleBannerClick} />
          </motion.div>
          
          {/* Setas de navegação no banner central */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2 sm:px-3 md:px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Anterior"
              className="pointer-events-auto rounded-full bg-black/45 hover:bg-black/65 text-white w-9 h-9 flex items-center justify-center"
              data-testid="banner-prev-btn"
            >
              ←
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Próximo"
              className="pointer-events-auto rounded-full bg-black/45 hover:bg-black/65 text-white w-9 h-9 flex items-center justify-center"
              data-testid="banner-next-btn"
            >
              →
            </button>
          </div>
        </div>

        {/* Preview direito - Coluna 3 */}
        <motion.div 
          className="flex items-stretch justify-start h-full overflow-hidden"
          animate={{ x: isAnimating ? (dir === 1 ? "-100%" : "100%") : "0%" }}
          transition={snap ? { duration: 0 } : { duration: 0.6, ease: "easeInOut" }}
        >
          <div 
            className="relative h-full w-full rounded-xl overflow-hidden cursor-pointer"
            onClick={() => handleBannerClick(items[right].banner)}
          >
            <img
              src={items[right]?.image}
              alt={items[right].banner.title || "banner"}
              className="w-full h-full object-cover block"
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          </div>
        </motion.div>
      </div>

      {/* Indicadores */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30">
        {items.map((_, iDot) => (
          <button
            key={iDot}
            aria-label={`Ir para o banner ${iDot + 1}`}
            onClick={() => !isAnimating && setCenter(iDot)}
            className={`h-2.5 w-2.5 rounded-full transition-all ${
              center === iDot ? "scale-125 bg-white" : "bg-white/50 hover:bg-white/70"
            }`}
            data-testid={`banner-indicator-${iDot}`}
          />
        ))}
      </div>
    </div>
  );
}

// Slide: componente simplificado para o novo layout
function Slide({
  item,
  startBasis,
  onBannerClick,
}: {
  item: { id: string; image: string; banner: Banner };
  startBasis: string;
  onBannerClick: (banner: Banner) => void;
}) {
  return (
    <div style={{ flexBasis: startBasis }} className="shrink-0">
      <div 
        className="relative w-full h-full rounded-xl overflow-hidden cursor-pointer"
        onClick={() => onBannerClick(item.banner)}
        data-testid={`banner-slide-${item.id}`}
      >
        <img
          src={item?.image}
          alt={item.banner.title || "banner"}
          className="w-full h-full object-cover block"
          style={{ transform: "scale(0.84)" }}
          loading="lazy"
          decoding="async"
          draggable="false"
        />
      </div>
    </div>
  );
}