import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
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
  const viewedRef = useRef(new Set<string>());
  
  const { data: banners = [] } = useQuery<Banner[]>({
    queryKey: ['/api/banners/active'],
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

  // Registrar views quando os banners carregarem (apenas uma vez por banner por sessão)
  useEffect(() => {
    if (banners.length > 0) {
      const newBannerIds = banners
        .filter(banner => banner.isActive && !viewedRef.current.has(banner.id))
        .map(banner => banner.id);
      
      if (newBannerIds.length > 0) {
        // Marcar como visualizado imediatamente para evitar duplicação
        newBannerIds.forEach(id => viewedRef.current.add(id));
        
        // Registrar views de forma assíncrona
        registerBannerViews(newBannerIds).catch(error => {
          // Em caso de erro, remover da lista de visualizados para retry
          newBannerIds.forEach(id => viewedRef.current.delete(id));
          console.error('Erro ao registrar views:', error);
        });
      }
    }
  }, [banners.length, banners.map(b => b.id).join(',')]);

  // Se não há banners ativos, não renderizar nada
  if (banners.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-8 mb-12" data-testid="banner-section">
      {/* Banner ocupando toda a largura da tela */}
      {rotatingBanners.length > 0 && (
        <BannerCarousel banners={rotatingBanners} />
      )}
    </div>
  );
}