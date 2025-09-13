import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";

interface TotemContent {
  id: string;
  title: string;
  description?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  displayDuration: string;
  sortOrder: string;
  isActive: boolean;
  scheduleStart?: string;
  scheduleEnd?: string;
}

interface TotemSettings {
  backgroundColor?: string;
  transitionEffect?: string;
  transitionDuration?: string;
  autoRotate?: boolean;
  rotationInterval?: string;
  isActive?: boolean;
}

export default function TotemDisplay() {
  const [, params] = useRoute("/totem/:storeId");
  const storeId = params?.storeId;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Buscar conteúdo do totem
  const { data: contentData, isLoading, error } = useQuery({
    queryKey: [`/api/totem/${storeId}/content`],
    enabled: !!storeId,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    retry: 3,
    retryDelay: 5000,
  });

  // Buscar configurações do totem
  const { data: settingsData } = useQuery({
    queryKey: [`/api/totem/${storeId}/settings`],
    enabled: !!storeId,
    refetchInterval: 60000, // Atualiza a cada 1 minuto
  });

  const content = contentData?.content || [];
  const settings: TotemSettings = settingsData?.settings || {};

  // Sincronizar com o servidor que o totem está ativo
  useEffect(() => {
    if (!storeId) return;

    const syncInterval = setInterval(async () => {
      try {
        await fetch(`/api/totem/${storeId}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Erro ao sincronizar:', error);
      }
    }, 60000); // Sync a cada 1 minuto

    // Sync inicial
    fetch(`/api/totem/${storeId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(console.error);

    return () => clearInterval(syncInterval);
  }, [storeId]);

  // Função para avançar para o próximo conteúdo
  const nextContent = useCallback(() => {
    if (content.length <= 1) return;

    setIsTransitioning(true);
    
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % content.length);
      setIsTransitioning(false);
    }, parseInt(settings.transitionDuration || '500', 10));
  }, [content.length, settings.transitionDuration]);

  // Auto-rotação
  useEffect(() => {
    // Usar configurações padrão se não houver configurações definidas
    const autoRotate = settings?.autoRotate !== false; // Default true
    const defaultInterval = '10'; // 10 segundos padrão
    
    if (!autoRotate || content.length <= 1) {
      console.log('🔄 Auto-rotação desabilitada:', { autoRotate, contentLength: content.length });
      return;
    }

    const currentContent = content[currentIndex];
    const interval = parseInt(
      currentContent?.displayDuration || 
      settings?.rotationInterval || 
      defaultInterval, 
      10
    ) * 1000;

    console.log('⏰ Configurando timer para próximo conteúdo:', { 
      interval: interval / 1000 + 's', 
      currentIndex, 
      totalContent: content.length,
      currentContentDuration: currentContent?.displayDuration,
      settingsInterval: settings?.rotationInterval
    });

    const timer = setTimeout(() => {
      console.log('🔄 Mudando para próximo conteúdo...');
      nextContent();
    }, interval);

    return () => {
      console.log('🧹 Limpando timer anterior');
      clearTimeout(timer);
    };
  }, [currentIndex, content, settings, nextContent]);

  // Controles de teclado para navegação manual
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextContent();
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev - 1 + content.length) % content.length);
      } else if (e.key === 'f' || e.key === 'F11') {
        e.preventDefault();
        // Alternar fullscreen
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(err => {
            console.log('❌ Erro ao sair da tela cheia:', err);
          });
        } else {
          document.documentElement.requestFullscreen().catch(err => {
            console.log('❌ Erro ao entrar em tela cheia:', err);
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [nextContent, content.length]);

  // Estados de carregamento e erro
  if (isLoading) {
    return (
      <div 
        className="w-screen h-screen flex items-center justify-center"
        style={{ backgroundColor: settings.backgroundColor || '#000000' }}
      >
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-light">Carregando conteúdo...</h1>
          <p className="text-lg opacity-75 mt-2">Conectando com {storeId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="w-screen h-screen flex items-center justify-center"
        style={{ backgroundColor: settings.backgroundColor || '#000000' }}
      >
        <div className="text-center text-white">
          <h1 className="text-3xl font-light mb-4">❌ Erro de Conexão</h1>
          <p className="text-xl opacity-75">Não foi possível carregar o conteúdo</p>
          <p className="text-lg opacity-50 mt-2">Verifique a conexão com a internet</p>
          <div className="mt-8">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              🔄 Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div 
        className="w-screen h-screen flex items-center justify-center"
        style={{ backgroundColor: settings.backgroundColor || '#000000' }}
      >
        <div className="text-center text-white">
          <h1 className="text-4xl font-light mb-4">📺 Totem Digital</h1>
          <p className="text-xl opacity-75">Nenhum conteúdo configurado</p>
          <p className="text-lg opacity-50 mt-2">Entre no painel administrativo para adicionar conteúdo</p>
        </div>
      </div>
    );
  }

  const currentContent = content[currentIndex];
  
  if (!currentContent) {
    console.log('❌ Nenhum conteúdo atual disponível');
    return null;
  }

  console.log('📺 Renderizando conteúdo:', {
    title: currentContent.title,
    mediaType: currentContent.mediaType,
    currentIndex: currentIndex + 1,
    totalContent: content.length,
    autoRotate: settings?.autoRotate !== false
  });

  const getTransitionClass = () => {
    const effect = settings.transitionEffect || 'fade';
    const duration = settings.transitionDuration || '500';
    
    switch (effect) {
      case 'slide':
        return `transition-transform duration-${duration}`;
      case 'zoom':
        return `transition-all duration-${duration}`;
      default:
        return `transition-opacity duration-${duration}`;
    }
  };

  const getTransitionStyle = () => {
    if (!isTransitioning) return {};
    
    const effect = settings.transitionEffect || 'fade';
    
    switch (effect) {
      case 'slide':
        return { transform: 'translateX(-100%)' };
      case 'zoom':
        return { transform: 'scale(0.8)', opacity: 0.5 };
      default:
        return { opacity: 0 };
    }
  };

  return (
    <div 
      className="w-screen h-screen overflow-hidden relative"
      style={{ backgroundColor: settings.backgroundColor || '#000000' }}
    >
      {/* Conteúdo principal */}
      <div
        className={`w-full h-full flex items-center justify-center ${getTransitionClass()}`}
        style={getTransitionStyle()}
      >
        {currentContent.mediaType === 'image' ? (
          <img
            src={currentContent.mediaUrl}
            alt={currentContent.title}
            className="w-full h-full"
            style={{ 
              objectFit: 'cover',
              objectPosition: 'center',
              imageRendering: 'optimizeQuality'
            }}
            onLoad={(e) => {
              const img = e.target as HTMLImageElement;
              
              console.log('📸 Imagem carregada:', { 
                src: currentContent.mediaUrl,
                width: img.naturalWidth, 
                height: img.naturalHeight,
                aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(2)
              });

              // Para imagens do totem: garantir exibição horizontal (landscape)
              // As imagens são geradas em 1920x1080 e devem aparecer horizontalmente
              img.style.objectFit = 'cover';
              img.style.objectPosition = 'center';
              img.style.width = '100%';
              img.style.height = '100%';
            }}
            onError={(e) => {
              console.error('❌ Erro ao carregar imagem:', currentContent.mediaUrl);
              // Tentar novamente após 5 segundos
              setTimeout(() => {
                const target = e.target as HTMLImageElement;
                target.src = currentContent.mediaUrl + '?retry=' + Date.now();
              }, 5000);
            }}
          />
        ) : (
          <video
            src={currentContent.mediaUrl}
            className="w-full h-full"
            style={{ 
              objectFit: 'contain',
              objectPosition: 'center'
            }}
            autoPlay
            loop
            muted
            playsInline
            onLoadedMetadata={(e) => {
              const video = e.target as HTMLVideoElement;
              const isVertical = video.videoHeight > video.videoWidth;
              
              console.log('🎥 Vídeo carregado:', { 
                src: currentContent.mediaUrl,
                width: video.videoWidth, 
                height: video.videoHeight,
                isVertical,
                aspectRatio: (video.videoWidth / video.videoHeight).toFixed(2)
              });

              // Para vídeos verticais em TV horizontal, aplicar apenas rotação
              if (isVertical) {
                console.log('🔄 Aplicando rotação para vídeo vertical');
                video.style.transform = 'rotate(90deg)';
                video.style.transformOrigin = 'center center';
                video.style.objectFit = 'cover';
                video.style.width = '100vh';
                video.style.height = '100vw';
              } else {
                // Para vídeos horizontais, usar object-cover normal
                video.style.objectFit = 'cover';
              }
            }}
            onError={(e) => {
              console.error('❌ Erro ao carregar vídeo:', currentContent.mediaUrl);
            }}
          />
        )}
      </div>


      {/* Indicadores de progresso (apenas se houver múltiplo conteúdo) */}
      {content.length > 1 && (
        <div className="absolute top-8 right-8 flex space-x-2">
          {content.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentIndex 
                  ? 'bg-white' 
                  : 'bg-white bg-opacity-30'
              }`}
            />
          ))}
        </div>
      )}

      {/* Controles discretos no canto inferior direito */}
      <div className="absolute bottom-4 right-4 text-white opacity-20 text-sm">
        <div className="flex items-center space-x-4">
          <span>Use ←→ ou ESPAÇO para navegar</span>
          <span>F11 para tela cheia</span>
          {content.length > 1 && (
            <span>{currentIndex + 1}/{content.length}</span>
          )}
        </div>
      </div>

      {/* Status de conexão */}
      <div className="absolute top-4 left-4 text-white opacity-30 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Online • {storeId}</span>
        </div>
      </div>
    </div>
  );
}