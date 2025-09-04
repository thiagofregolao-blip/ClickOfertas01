import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BannerCarousel } from './BannerCarousel';
import { StaticBanner } from './StaticBanner';
import ThreeDailyScratchCards from './ThreeDailyScratchCards';
import { useAuth } from '@/hooks/useAuth';

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
  const { isAuthenticated } = useAuth();
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
    <div className="w-full px-4 mb-6 md:mt-8" data-testid="banner-section">
      <div className="max-w-6xl mx-auto">
        {/* Layout desktop: carousel + banners estáticos lado a lado */}
        <div className="hidden md:flex gap-[5px]">
          {/* Banner rotativo (790x230px) */}
          {rotatingBanners.length > 0 && (
            <div>
              <BannerCarousel banners={rotatingBanners} />
            </div>
          )}

          {/* Rapadinhas diárias (para usuários autenticados) ou Banners estáticos */}
          <div className="space-y-[5px]">
            {isAuthenticated ? (
              /* 3 Rapadinhas Diárias - Usuários Logados */
              <ThreeDailyScratchCards />
            ) : (
              /* Banners Estáticos - Usuários não logados */
              <>
                {staticLeftBanners[0] && (
                  <StaticBanner 
                    banner={staticLeftBanners[0]} 
                    className="" 
                  />
                )}
                
                {staticRightBanners[0] && (
                  <StaticBanner 
                    banner={staticRightBanners[0]} 
                    className="" 
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Layout mobile: banner de tela cheia sem bordas laterais */}
        <div className="md:hidden -mx-4 w-screen">
          {/* Banner rotativo */}
          {rotatingBanners.length > 0 && (
            <BannerCarousel banners={rotatingBanners} />
          )}

          {/* Banners estáticos em grid 2x1 */}
          {(staticLeftBanners[0] || staticRightBanners[0]) && (
            <div className="grid grid-cols-2 gap-4 px-4 mt-4">
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