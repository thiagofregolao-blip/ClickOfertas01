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

  // Layout estilo Buscapé: múltiplos banners lado a lado
  return (
    <div className="w-full h-32 md:h-40 gap-1 flex">
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`
            ${banners.length === 1 ? 'w-full' : 
              banners.length === 2 ? 'flex-1' :
              banners.length === 3 ? 'flex-1' :
              'flex-1 min-w-[200px]'
            }
            h-full cursor-pointer relative group overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300
          `}
          onClick={() => handleBannerClick(banner)}
          data-testid={`banner-grid-${banner.id}`}
        >
          <div 
            className="w-full h-full flex items-center relative"
            style={{ 
              background: banner.backgroundColor || (
                index === 0 ? 'linear-gradient(135deg, #000000 0%, #333333 100%)' :
                index === 1 ? 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)' :
                'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
              ),
              backgroundImage: banner.imageUrl ? `url(${banner.imageUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {/* Overlay para melhor contraste */}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all duration-300" />
            
            {/* Conteúdo estilo Buscapé */}
            <div className="relative z-10 w-full h-full flex items-center justify-between px-4 md:px-6">
              <div className="flex-1">
                <h2 
                  className="text-sm md:text-lg lg:text-xl font-bold mb-1 leading-tight"
                  style={{ 
                    color: banner.textColor || '#FFFFFF',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                  }}
                >
                  {banner.title}
                </h2>
                
                {banner.description && (
                  <p 
                    className="text-xs md:text-sm opacity-90 hidden md:block"
                    style={{ 
                      color: banner.textColor || '#FFFFFF',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                    }}
                  >
                    {banner.description}
                  </p>
                )}
              </div>
              
              {/* Call-to-action estilo Buscapé */}
              <div className="flex-shrink-0 ml-2 md:ml-4">
                <div className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-full md:rounded-lg px-2 md:px-4 py-1 md:py-2 transition-all duration-300 shadow-lg">
                  <span className="text-xs md:text-sm font-bold text-black">
                    {index === 0 ? 'Ver Tudo' : index === 1 ? 'Aproveite' : 'Comprar'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Efeito hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
          </div>
        </div>
      ))}
    </div>
  );
}