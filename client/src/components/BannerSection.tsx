import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BannerCarousel } from './BannerCarousel';
import { StaticBanner } from './StaticBanner';

interface Banner {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  backgroundColor: string;
  textColor: string;
  bannerType: 'rotating' | 'static_left' | 'static_right';
  isActive: boolean;
  priority: string;
}

export function BannerSection() {
  const { data: banners = [] } = useQuery<Banner[]>({
    queryKey: ['/api/banners/active'],
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Registrar visualização dos banners
  const registerBannerViews = async (bannerIds: string[]) => {
    try {
      await Promise.all(
        bannerIds.map(bannerId =>
          fetch('/api/banners/view', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bannerId,
            }),
          })
        )
      );
    } catch (error) {
      console.error('Erro ao registrar views:', error);
    }
  };

  // Separar banners por tipo
  const rotatingBanners = banners.filter(banner => 
    banner.bannerType === 'rotating' && banner.isActive
  ).sort((a, b) => parseInt(a.priority) - parseInt(b.priority));

  const staticLeftBanners = banners.filter(banner => 
    banner.bannerType === 'static_left' && banner.isActive
  ).sort((a, b) => parseInt(a.priority) - parseInt(b.priority));

  const staticRightBanners = banners.filter(banner => 
    banner.bannerType === 'static_right' && banner.isActive
  ).sort((a, b) => parseInt(a.priority) - parseInt(b.priority));

  // Registrar views quando os banners carregarem
  useEffect(() => {
    if (banners.length > 0) {
      const visibleBannerIds = banners
        .filter(banner => banner.isActive)
        .map(banner => banner.id);
      
      if (visibleBannerIds.length > 0) {
        registerBannerViews(visibleBannerIds);
      }
    }
  }, [banners]);

  // Se não há banners ativos, não renderizar nada
  if (banners.length === 0) {
    return null;
  }

  return (
    <div className="w-full px-4 mb-6" data-testid="banner-section">
      <div className="max-w-6xl mx-auto">
        {/* Layout desktop: carousel + banners estáticos lado a lado */}
        <div className="hidden md:flex gap-3">
          {/* Banner rotativo (ocupa mais espaço) */}
          {rotatingBanners.length > 0 && (
            <div className="flex-1">
              <BannerCarousel banners={rotatingBanners} />
            </div>
          )}

          {/* Banners estáticos (lado direito) - proporção exata da imagem */}
          <div className="w-64 space-y-2">
            {/* Banner estático esquerdo (topo direito) */}
            {staticLeftBanners[0] && (
              <StaticBanner 
                banner={staticLeftBanners[0]} 
                className="h-[calc(50%-0.25rem)]" 
              />
            )}
            
            {/* Banner estático direito (base direita) */}
            {staticRightBanners[0] && (
              <StaticBanner 
                banner={staticRightBanners[0]} 
                className="h-[calc(50%-0.25rem)]" 
              />
            )}
          </div>
        </div>

        {/* Layout mobile: banners empilhados */}
        <div className="md:hidden space-y-4">
          {/* Banner rotativo */}
          {rotatingBanners.length > 0 && (
            <BannerCarousel banners={rotatingBanners} />
          )}

          {/* Banners estáticos em grid 2x1 */}
          {(staticLeftBanners[0] || staticRightBanners[0]) && (
            <div className="grid grid-cols-2 gap-4">
              {staticLeftBanners[0] && (
                <StaticBanner banner={staticLeftBanners[0]} />
              )}
              {staticRightBanners[0] && (
                <StaticBanner banner={staticRightBanners[0]} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}