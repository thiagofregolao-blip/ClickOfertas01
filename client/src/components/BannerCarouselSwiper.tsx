import React from 'react';
// Importa os módulos principais e os módulos de navegação, paginação e autoplay
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

// Importa os estilos do Swiper (obrigatório)
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export interface Banner {
  id: string;
  title?: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  isActive?: boolean;
  bannerType?: string;
}

export interface BannerCarouselSwiperProps {
  banners: Banner[];
  autoPlayInterval?: number; // milissegundos entre cada slide (padrão 4000)
  height?: string; // altura do carrossel
  className?: string;
}

export const BannerCarouselSwiper: React.FC<BannerCarouselSwiperProps> = ({
  banners,
  autoPlayInterval = 4000,
  height = '300px',
  className = '',
}) => {
  if (!banners || banners.length === 0) {
    return null;
  }

  // Filtrar apenas banners ativos
  const activeBanners = banners.filter(banner => banner.isActive !== false);
  
  if (activeBanners.length === 0) {
    return null;
  }

  // Definição de breakpoints para ajuste responsivo: a fração de slide visível
  // (slidesPerView) e o espaço entre slides (spaceBetween) mudam conforme a largura.
  // Valores ajustados para evitar corte do banner da direita
  const breakpoints = {
    1280: { slidesPerView: 1.2, spaceBetween: 24, centeredSlides: false },
    768:  { slidesPerView: 1.15, spaceBetween: 20, centeredSlides: false },
    0:    { slidesPerView: 1.05, spaceBetween: 16, centeredSlides: true },
  };

  return (
    <div className={className} style={{ height, width: '100%' }}>
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        loop={activeBanners.length > 1} // loop infinito apenas se há mais de 1 banner
        breakpoints={breakpoints}
        autoplay={
          autoPlayInterval && activeBanners.length > 1
            ? { 
                delay: autoPlayInterval, 
                disableOnInteraction: false,
                pauseOnMouseEnter: true // pausa no hover desktop
              }
            : false
        }
        navigation={true}              // mostra as setas padrão
        pagination={{ clickable: true, dynamicBullets: true }} // pontos clicáveis com bullets dinâmicos
        className="banner-carousel-swiper h-full"
        style={{ height: '100%' }}
      >
        {activeBanners.map((banner) => (
          <SwiperSlide key={banner.id} className="h-full">
            <div
              onClick={() => {
                if (banner.linkUrl) {
                  window.open(banner.linkUrl, '_blank');
                }
              }}
              style={{
                cursor: banner.linkUrl ? 'pointer' : 'default',
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '12px',
                backgroundColor: banner.backgroundColor || '#f3f4f6',
              }}
              className="banner-slide"
            >
              <img
                src={banner.imageUrl}
                alt={banner.title ?? 'Banner promocional'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  borderRadius: '12px',
                }}
                className="select-none"
                loading="lazy"
                decoding="async"
                draggable={false}
              />
              
              {/* Overlay com título e descrição se existirem */}
              {(banner.title || banner.description) && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                    color: banner.textColor || '#fff',
                    padding: '24px 16px 16px',
                    borderBottomLeftRadius: '12px',
                    borderBottomRightRadius: '12px',
                  }}
                >
                  {banner.title && (
                    <h3 
                      style={{ 
                        margin: 0, 
                        fontSize: '1.125rem', 
                        fontWeight: '600',
                        marginBottom: banner.description ? '4px' : 0
                      }}
                    >
                      {banner.title}
                    </h3>
                  )}
                  {banner.description && (
                    <p 
                      style={{ 
                        margin: 0, 
                        fontSize: '0.875rem', 
                        opacity: 0.9,
                        lineHeight: '1.4'
                      }}
                    >
                      {banner.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default BannerCarouselSwiper;