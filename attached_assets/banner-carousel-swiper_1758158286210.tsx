import React from 'react';
// Import Swiper React components and required modules
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

// Import Swiper styles.  These CSS files are required for proper styling of
// the carousel, including navigation arrows and pagination dots.
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

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
}

/**
 * BannerCarouselSwiper – A simple wrapper around the Swiper component
 * configured to mimic the behaviour of the Buscapé banner carousel.  It
 * supports infinite looping, partial visibility of the adjacent banners and
 * automatic playback.  Navigation arrows and pagination dots are enabled
 * out of the box.
 *
 * Key features implemented:
 *  - Continuous loop (`loop=true`) so the carousel cycles endlessly【232212359592295†L910-L918】.
 *  - Active slide is centred by setting `centeredSlides=true`, which causes
 *    the next and previous slides to peek in on either side【232212359592295†L358-L366】.
 *  - `slidesPerView` uses fractional values (e.g. 1.2) along with
 *    `centeredSlides=true` so that a portion of the neighbouring slides is
 *    visible.  This approach is recommended for creating a “stage padding”
 *    effect similar to Buscapé.  Responsive breakpoints adjust these values
 *    on smaller screens.
 *  - Automatic playback with configurable delay and the `Autoplay` module.
 *  - Navigation arrows and clickable pagination dots via the `Navigation` and
 *    `Pagination` modules.
 *
 * For more details on these options see the Swiper documentation for
 * `loop`【232212359592295†L910-L918】 and `centeredSlides`【232212359592295†L358-L366】.
 */
export const BannerCarouselSwiper: React.FC<BannerCarouselSwiperProps> = ({
  banners,
  autoPlayInterval = 4000,
}) => {
  if (!banners || banners.length === 0) {
    return null;
  }

  // Swiper breakpoints control how many slides are visible at different
  // viewport widths.  Using fractional values for `slidesPerView` allows
  // portions of the neighbouring slides to appear on either side of the
  // centre slide.  The `spaceBetween` property adds a small gap between
  // slides to enhance the peek effect.
  const breakpoints = {
    // screens >= 1280px
    1280: {
      slidesPerView: 1.5,
      spaceBetween: 30,
    },
    // screens >= 768px and < 1280px
    768: {
      slidesPerView: 1.3,
      spaceBetween: 24,
    },
    // screens >= 0px and < 768px
    0: {
      slidesPerView: 1.1,
      spaceBetween: 16,
    },
  };

  return (
    <Swiper
      // Enable required modules
      modules={[Navigation, Pagination, Autoplay]}
      // Ensure continuous looping of slides【232212359592295†L910-L918】
      loop={true}
      // Add extra duplicated slides to ensure there are enough slides in the
      // loop when using fractional `slidesPerView`.  Without this, Swiper may
      // occasionally hide the next slide on the right when there are few
      // banners.  See Swiper documentation for `loopAdditionalSlides`【232212359592295†L910-L918】.
      loopAdditionalSlides={banners.length}
      // Center the active slide so adjacent slides peek from both sides【232212359592295†L358-L366】
      centeredSlides={true}
      // Use breakpoints to control the size of visible slides and gaps
      breakpoints={breakpoints}
      // Enable autoplay only if autoPlayInterval is provided
      autoplay={
        autoPlayInterval
          ? { delay: autoPlayInterval, disableOnInteraction: false }
          : false
      }
      // Enable navigation arrows.  Swiper automatically renders arrow buttons
      // if this property is true and the navigation module is loaded.
      navigation={true}
      // Enable clickable pagination dots
      pagination={{ clickable: true }}
      // Optional: Provide a custom class name for the container if you wish
      // to style it externally.  Not strictly necessary.
      className="banner-carousel-swiper"
    >
      {banners.map((banner) => (
        <SwiperSlide key={banner.id}>
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
              borderRadius: '8px',
            }}
          >
            <img
              src={banner.imageUrl}
              alt={banner.title ?? 'banner'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                borderRadius: '8px',
              }}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            {/* Optional overlay with title/description.  Uncomment and style as needed.
            {banner.title && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16,
                  right: 16,
                  backgroundColor: banner.backgroundColor || 'rgba(0,0,0,0.5)',
                  color: banner.textColor || '#fff',
                  padding: '8px 12px',
                  borderRadius: '4px',
                }}
              >
                <h3 style={{ margin: 0 }}>{banner.title}</h3>
                {banner.description && <p style={{ margin: 0 }}>{banner.description}</p>}
              </div>
            )}
            */}
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default BannerCarouselSwiper;