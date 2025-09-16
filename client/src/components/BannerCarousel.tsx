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
      className="relative w-full mx-auto select-none"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      aria-roledescription="carousel"
      data-testid="banner-carousel"
    >
      {/* Altura responsiva unificada - otimizada */}
      <motion.div className="relative overflow-hidden" style={{ height: "clamp(100px, 17.59vw, 299px)" }}>
        <motion.div
          className="relative flex items-stretch"
          style={{ gap: "24px", willChange: "transform" }}
          initial={false}
          animate={{ x: isAnimating ? (dir === 1 ? "-15%" : "15%") : "0%" }}
          transition={snap ? { duration: 0 } : { duration: 0.6, ease: "easeInOut" }}
          onAnimationComplete={() => {
            if (isAnimating) {
              setCenter((c) => i(c + dir));
              setIsAnimating(false);
              // reseta trilho instantaneamente em x:0 para não "voltar"
              setSnap(true);
              requestAnimationFrame(() => setSnap(false));
            }
          }}
        >
          {/* esquerda (20%) */}
          <Slide item={items[left]} startBasis="20%" onPrev={prev} onNext={next} onBannerClick={handleBannerClick} />
          {/* centro (70%) */}
          <Slide item={items[center]} startBasis="70%" onPrev={prev} onNext={next} onBannerClick={handleBannerClick} />
          {/* direita (20%) */}
          <Slide item={items[right]} startBasis="20%" onPrev={prev} onNext={next} onBannerClick={handleBannerClick} />
          {/* buffer (fora da viewport) */}
          <Slide item={items[nextRight]} startBasis="20%" onPrev={prev} onNext={next} onBannerClick={handleBannerClick} />
        </motion.div>
      </motion.div>

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

// Slide: largura fixa por posição; setas visíveis quando no centro visual (70%)
function Slide({
  item,
  startBasis,
  onPrev,
  onNext,
  onBannerClick,
}: {
  item: { id: string; image: string; banner: Banner };
  startBasis: string;
  onPrev: () => void;
  onNext: () => void;
  onBannerClick: (banner: Banner) => void;
}) {
  const isCenterVisual = startBasis === "70%";

  return (
    <div style={{ flexBasis: startBasis }} className="shrink-0 group">
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

        {isCenterVisual && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2 sm:px-3 md:px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
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
                onNext();
              }}
              aria-label="Próximo"
              className="pointer-events-auto rounded-full bg-black/45 hover:bg-black/65 text-white w-9 h-9 flex items-center justify-center"
              data-testid="banner-next-btn"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}