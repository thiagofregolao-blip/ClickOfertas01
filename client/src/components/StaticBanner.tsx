interface Banner {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  backgroundColor: string;
  textColor: string;
}

interface StaticBannerProps {
  banner: Banner;
  className?: string;
}

export function StaticBanner({ banner, className = '' }: StaticBannerProps) {
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

  return (
    <div className={`h-12 md:h-16 rounded-lg overflow-hidden shadow-lg cursor-pointer transition-transform duration-300 hover:scale-105 ${className}`}>
      <div
        className="w-full h-full relative"
        style={{
          backgroundColor: banner.backgroundColor,
          backgroundImage: `url(${banner.imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        onClick={() => handleBannerClick(banner)}
        data-testid={`static-banner-${banner.id}`}
      >
        {/* Overlay para melhor legibilidade do texto */}
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        
        {/* Conteúdo do banner */}
        <div className="relative z-10 h-full flex flex-col justify-center px-4">
          <h3 
            className="text-sm md:text-lg font-bold mb-1 drop-shadow-md line-clamp-2"
            style={{ color: banner.textColor }}
          >
            {banner.title}
          </h3>
          {banner.description && (
            <p 
              className="text-xs md:text-sm opacity-90 drop-shadow-md line-clamp-2"
              style={{ color: banner.textColor }}
            >
              {banner.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}