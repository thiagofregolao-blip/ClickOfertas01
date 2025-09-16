import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BannerCarousel } from './BannerCarousel';
import { StaticBanner } from './StaticBanner';
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

interface BannerSectionProps {
  isSearchActive?: boolean;
}

export function BannerSection({ isSearchActive = false }: BannerSectionProps) {
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
    <div className="w-full mb-6 mt-4 md:mt-8 md:px-4" data-testid="banner-section">
      <div className="max-w-6xl mx-auto">
        {/* Layout desktop: carousel + banners estáticos lado a lado */}
        <div className="hidden md:flex gap-[5px]">
          {/* Banner rotativo (790x230px) */}
          {rotatingBanners.length > 0 && (
            <div>
              <BannerCarousel banners={rotatingBanners} />
            </div>
          )}

        </div>

        {/* Layout mobile: banner de tela cheia com padding lateral */}
        <div className="md:hidden">
          {/* Banner rotativo - ocultar quando busca ativa */}
          {!isSearchActive && rotatingBanners.length > 0 && (
            <div className="px-4">
              <BannerCarousel banners={rotatingBanners} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}