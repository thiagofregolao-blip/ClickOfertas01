import React from 'react';
import Carousel from 'react-multi-carousel';
import 'react-multi-carousel/lib/styles.css';

/**
 * Types for an individual banner.  A banner can optionally have a title,
 * description and link URL in addition to its image.  Colours can be
 * specified for backgrounds and text if you wish to overlay content on the
 * image.
 */
export interface Banner {
  id: string;
  title?: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  backgroundColor?: string;
  textColor?: string;
}

/**
 * Props for the BannerCarouselSwiper component.  You can pass an array of
 * banners and optionally override the autoplay interval in milliseconds.
 */
export interface BannerCarouselSwiperProps {
  banners: Banner[];
  /**
   * Time between automatic transitions (in milliseconds).  If you set this
   * to undefined the carousel will not auto‑play.  Default is 4000ms.
   */
  autoPlayInterval?: number;
  showDots?: boolean;
  peekPx?: number; // quanto do slide da direita/esquerda fica visível
}

/**
 * BannerCarousel – versão com react-multi-carousel otimizada
 */
export const BannerCarouselSwiper: React.FC<BannerCarouselSwiperProps> = ({
  banners,
  autoPlayInterval = 4000,
  showDots = true,
  peekPx = 48,
}) => {
  if (!banners || banners.length === 0) {
    return null;
  }

  const responsive = {
    desktop: { breakpoint: { max: 3000, min: 1280 }, items: 1, partialVisibilityGutter: 64 },
    tablet:  { breakpoint: { max: 1280, min: 768 },  items: 1, partialVisibilityGutter: 48 },
    mobile:  { breakpoint: { max: 768,  min: 0 },    items: 1, partialVisibilityGutter: 24 },
  } as const;

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 1250, margin: '0 auto' }}>
      <Carousel
        responsive={responsive}
        infinite
        autoPlay
        autoPlaySpeed={autoPlayInterval}
        arrows
        showDots={showDots}
        keyBoardControl
        pauseOnHover
        partialVisible
        containerClass="banner-carousel-container"
        itemClass="banner-carousel-item"
        sliderClass="banner-carousel-slider"
        customTransition="transform 600ms ease"
        transitionDuration={600}
      >
        {banners.map((banner) => (
          <div key={banner.id} style={{ paddingRight: 0 }}>
            <div
              onClick={() => banner.linkUrl && window.open(banner.linkUrl, "_blank")}
              style={{
                width: '100%',
                height: 'clamp(160px, 22vw, 260px)',
                position: 'relative',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                cursor: banner.linkUrl ? 'pointer' : 'default',
                background: '#eee',
              }}
            >
              <img
                src={banner.imageUrl}
                alt={banner.title ?? "banner"}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                loading="lazy"
                decoding="async"
                draggable={false}
              />

              {/* Overlay opcional */}
              {/* {banner.title && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 16,
                    left: 16,
                    right: 16,
                    backgroundColor: banner.backgroundColor || "rgba(0,0,0,0.5)",
                    color: banner.textColor || "#fff",
                    padding: "8px 12px",
                    borderRadius: 8,
                  }}
                >
                  <h3 style={{ margin: 0 }}>{banner.title}</h3>
                  {banner.description && <p style={{ margin: 0 }}>{banner.description}</p>}
                </div>
              )} */}
            </div>
          </div>
        ))}
      </Carousel>

      <style>{`
        .banner-carousel-container { overflow: visible; max-width: 1250px; margin: 0 auto; padding-inline: 12px; }
        .banner-carousel-slider { overflow: visible; }
        .banner-carousel-item   { padding-right: 0; }
      `}</style>
    </div>
  );
};

export default BannerCarouselSwiper;