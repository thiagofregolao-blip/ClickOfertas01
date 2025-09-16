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
}

export function BannerCarousel({ banners }: BannerCarouselProps) {
  if (!banners || banners.length === 0) {
    return null;
  }

  const handleBannerClick = async (banner: Banner) => {
    // Registrar clique no banner
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

  // Banner único ocupando toda a largura
  const banner = banners[0]; // Apenas o primeiro banner
  
  return (
    <div className="w-full h-32 md:h-40">
      <div
        className="w-full h-full cursor-pointer relative group overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
        onClick={() => handleBannerClick(banner)}
        data-testid={`banner-single-${banner.id}`}
      >
        <div 
          className="w-full h-full flex items-center relative"
          style={{ 
            background: banner.backgroundColor || 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)',
            backgroundImage: banner.imageUrl ? `url(${banner.imageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Overlay para melhor contraste */}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all duration-300" />
          
          {/* Conteúdo centralizado */}
          <div className="relative z-10 w-full h-full flex items-center justify-between px-6 md:px-8">
            <div className="flex-1">
              <h2 
                className="text-lg md:text-2xl lg:text-3xl font-bold mb-2 leading-tight"
                style={{ 
                  color: banner.textColor || '#FFFFFF',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.7)'
                }}
              >
                {banner.title}
              </h2>
              
              {banner.description && (
                <p 
                  className="text-sm md:text-base opacity-90"
                  style={{ 
                    color: banner.textColor || '#FFFFFF',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                  }}
                >
                  {banner.description}
                </p>
              )}
            </div>
            
            {/* Call-to-action */}
            <div className="flex-shrink-0 ml-4 md:ml-6">
              <div className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-lg px-4 md:px-6 py-2 md:py-3 transition-all duration-300 shadow-lg">
                <span className="text-sm md:text-base font-bold text-black">
                  Ver Ofertas
                </span>
              </div>
            </div>
          </div>
          
          {/* Efeito hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
        </div>
      </div>
    </div>
  );
}