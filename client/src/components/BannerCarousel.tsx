import { useEffect, useRef, useState } from "react";
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
 * - Proporção 70% | 15% | 15%
 * - Deslizamento contínuo (sem rebote)
 * - Setas aparecem sobre o banner central no hover
 * - Imagem sem fundo, preenchendo toda a altura (object-cover)
 */

export function BannerCarousel({ banners, autoPlayInterval = 5000 }: BannerCarouselProps) {
  if (!banners || banners.length === 0) {
    return null;
  }

  // Test: Return simple div to verify component is not the issue
  return (
    <div className="w-full h-40 md:h-52 lg:h-60 bg-blue-500 flex items-center justify-center text-white">
      <p>Banner carousel working - {banners.length} banners found</p>
    </div>
  );
}

interface BannerCarouselCoreProps {
  banners: Banner[];
  interval: number;
  onBannerClick: (banner: Banner) => void;
}

function BannerCarouselCore({ banners, interval, onBannerClick }: BannerCarouselCoreProps) {
  const n = banners.length;
  const [center, setCenter] = useState(0);
  const [dir, setDir] = useState(1); // 1 = direita->centro (vai para a esquerda); -1 = esquerda->centro
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [snap, setSnap] = useState(false); // transição instantânea para resetar trilho após animar

  const i = (k: number) => (k + n) % n;

  // autoplay
  useEffect(() => {
    if (!isHover) {
      const id = setInterval(() => next(), interval);
      return () => clearInterval(id);
    }
  }, [center, isHover, interval]);

  // teclas ← →
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [center]);

  const next = () => {
    if (isAnimating) return;
    setDir(1);
    setIsAnimating(true);
  };
  const prev = () => {
    if (isAnimating) return;
    setDir(-1);
    setIsAnimating(true);
  };

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

  // Índices auxiliares
  const prevLeft = i(center - 2);
  const left = i(center - 1);
  const right = i(center + 1);
  const nextRight = i(center + 2);

  // 4 cartões: 3 visíveis + 1 fora da viewport para continuidade
  const slides = dir === 1
    ? [
        { idx: left, start: "15%", end: "15%" },
        { idx: center, start: "70%", end: "15%" },
        { idx: right, start: "15%", end: "70%" },
        { idx: nextRight, start: "15%", end: "15%" },
      ]
    : [
        { idx: prevLeft, start: "15%", end: "15%" },
        { idx: left, start: "15%", end: "70%" },
        { idx: center, start: "70%", end: "15%" },
        { idx: right, start: "15%", end: "15%" },
      ];

  const duration = 0.6;

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
      {/* Altura responsiva unificada para os três banners */}
      <motion.div className="relative overflow-hidden" style={{ height: "clamp(160px, 28vw, 480px)" }}>
        <motion.div
          className="relative flex items-stretch"
          style={{ gap: "24px", willChange: "transform" }}
          initial={false}
          animate={{ x: isAnimating ? (dir === 1 ? "-15%" : "15%") : "0%" }}
          transition={snap ? { duration: 0 } : { duration, ease: "easeInOut" }}
          onAnimationComplete={() => {
            if (isAnimating) {
              setCenter((c) => i(c + dir));
              setIsAnimating(false);
              setSnap(true);
              requestAnimationFrame(() => setSnap(false));
            }
          }}
        >
          {slides.map((s, k) => (
            <Slide
              key={`${s.idx}-${k}`}
              banner={banners[s.idx]}
              startBasis={s.start}
              endBasis={s.end}
              animateWidth={isAnimating}
              duration={duration}
              onPrev={prev}
              onNext={next}
              onBannerClick={onBannerClick}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Indicadores */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30">
        {banners.map((_, iDot) => (
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

// Slide: controla a largura (flex-basis) de cada cartão e as setas quando está no centro visual
function Slide({
  banner,
  startBasis,
  endBasis,
  animateWidth,
  duration,
  onPrev,
  onNext,
  onBannerClick,
}: {
  banner: Banner;
  startBasis: string;
  endBasis: string;
  animateWidth: boolean;
  duration: number;
  onPrev: () => void;
  onNext: () => void;
  onBannerClick: (banner: Banner) => void;
}) {
  const isCenterVisual = animateWidth ? endBasis === "70%" : startBasis === "70%";

  return (
    <motion.div
      initial={false}
      animate={{ flexBasis: animateWidth ? endBasis : startBasis }}
      transition={{ duration, ease: "easeInOut" }}
      className="shrink-0 group"
    >
      <div 
        className="relative w-full h-full rounded-xl overflow-hidden cursor-pointer"
        onClick={() => onBannerClick(banner)}
        data-testid={`banner-slide-${banner.id}`}
      >
        <img
          src={banner.imageUrl}
          alt={banner.title || "Banner"}
          className="w-full h-full object-cover block"
          loading="lazy"
          decoding="async"
          draggable="false"
        />

        {/* Overlay hover effect */}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all duration-300" />
        
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

        {/* Setas de navegação apenas no banner central */}
        {isCenterVisual && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2 sm:px-3 md:px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              aria-label="Anterior"
              className="pointer-events-auto rounded-full bg-black/45 hover:bg-black/65 text-white w-9 h-9 flex items-center justify-center transition-colors"
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
              className="pointer-events-auto rounded-full bg-black/45 hover:bg-black/65 text-white w-9 h-9 flex items-center justify-center transition-colors"
              data-testid="banner-next-btn"
            >
              →
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}