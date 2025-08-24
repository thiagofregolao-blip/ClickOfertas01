import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Bookmark, BookmarkPlus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEngagement } from "@/hooks/use-engagement";
import type { StoreWithProducts, Product } from "@shared/schema";

interface InstagramStoriesProps {
  store: StoreWithProducts;
  allStores: StoreWithProducts[];
  onClose: () => void;
}

export function InstagramStories({ store, allStores, onClose }: InstagramStoriesProps) {
  const [, setLocation] = useLocation();
  const storiesProducts = store.products.filter(p => p.isActive && p.showInStories);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(true);
  const [originPosition, setOriginPosition] = useState({ x: 50, y: 50 });
  const [savedProducts, setSavedProducts] = useState<Set<string>>(new Set());
  const [lastTap, setLastTap] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef(0);
  const STORY_DURATION = 8000; // 8 segundos por produto
  const DOUBLE_TAP_DELAY = 300; // ms para detectar double tap

  const currentProduct = storiesProducts[currentIndex];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hearts, handleDoubleTap, isProductLiked, toggleLike } = useEngagement();

  // Mutations para engajamento
  const likeMutation = useMutation({
    mutationFn: (productId: string) => apiRequest('POST', `/api/products/${productId}/like`)
  });

  const saveProductMutation = useMutation({
    mutationFn: (productId: string) => apiRequest('POST', `/api/products/${productId}/save`),
    onSuccess: () => {
      toast({
        title: "Produto salvo!",
        description: "Você pode ver seus produtos salvos no menu principal.",
      });
    }
  });

  const storyViewMutation = useMutation({
    mutationFn: (data: { storeId: string; productId?: string }) => 
      apiRequest('POST', '/api/stories/view', data)
  });

  // Limpa timer ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Inicialização da animação de abertura
  useEffect(() => {
    // Inicia stories instantaneamente sem delays
    setIsOpening(false);
    setIsPaused(false);
  }, []);

  // Registrar visualização quando produto muda
  useEffect(() => {
    if (currentProduct && !isOpening && !isClosing) {
      storyViewMutation.mutate({
        storeId: store.id,
        productId: currentProduct.id
      });
    }
  }, [currentProduct?.id, isOpening, isClosing]);

  // Timer principal - resetado a cada mudança de produto
  useEffect(() => {
    if (isPaused || storiesProducts.length === 0 || isOpening || isClosing) return;

    // Reset progress
    setProgress(0);
    progressRef.current = 0;

    // Limpa timer anterior
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Inicia novo timer
    timerRef.current = setInterval(() => {
      progressRef.current += (100 / (STORY_DURATION / 50)); // Mais suave
      setProgress(progressRef.current);
      
      if (progressRef.current >= 100) {
        // Limpa timer imediatamente
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        if (currentIndex < storiesProducts.length - 1) {
          // Próximo produto da mesma loja
          setCurrentIndex(prev => prev + 1);
        } else {
          // Acabaram os produtos - próxima loja
          goToNextStore();
        }
      }
    }, 50);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentIndex, isPaused, storiesProducts.length, isOpening, isClosing]);

  const handleClose = () => {
    setIsClosing(true);
    setIsPaused(true);
    
    setLocation('/cards');
  };

  const goToNextStore = () => {
    // Para todos os timers imediatamente
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsPaused(true);
    
    // Encontra próxima loja com stories
    const storesWithStories = allStores.filter(s => 
      s.products.some(p => p.isActive && p.showInStories)
    );
    const currentStoreIndex = storesWithStories.findIndex(s => s.id === store.id);
    const nextStoreIndex = currentStoreIndex + 1;
    
    if (nextStoreIndex < storesWithStories.length) {
      const nextStore = storesWithStories[nextStoreIndex];
      
      // Transição imediata
      setIsClosing(true);
      window.location.href = `/stores/${nextStore.slug}`;
    } else {
      // Não há mais lojas, volta para galeria
      handleClose();
    }
  };

  const nextStory = () => {
    if (currentIndex < storiesProducts.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      goToNextStore();
    }
  };

  const prevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Handle double tap para curtir no stories
  const handleStoryDoubleTap = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      // Double tap detectado - usar hook de engagement
      handleDoubleTap(currentProduct.id, e);
      e.stopPropagation();
      return;
    }
    setLastTap(now);
  };

  const handleTap = (e: React.MouseEvent) => {
    handleStoryDoubleTap(e);
    
    // Aguarda para ver se é double tap
    setTimeout(() => {
      if (Date.now() - lastTap >= DOUBLE_TAP_DELAY) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        
        if (x < width / 2) {
          prevStory();
        } else {
          nextStory();
        }
      }
    }, DOUBLE_TAP_DELAY);
  };

  const handleSaveProduct = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!savedProducts.has(currentProduct.id)) {
      setSavedProducts(prev => new Set(prev.add(currentProduct.id)));
      saveProductMutation.mutate(currentProduct.id);
    }
  };

  if (storiesProducts.length === 0) {
    return null;
  }

  return (
    <div 
      className={`fixed inset-0 bg-gray-800 z-50 flex items-center justify-center ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: isOpening ? 'transparent' : `linear-gradient(135deg, ${store.themeColor || '#E11D48'} 0%, ${store.themeColor || '#E11D48'}CC 100%)`
      }}
    >
      {/* Stories Container */}
      <div 
        className={`relative w-full max-w-sm mx-auto h-full ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          background: `linear-gradient(to bottom, ${store.themeColor || '#E11D48'}E6, ${store.themeColor || '#E11D48'}F2)`
        }}
        onClick={handleTap}
      >
        {/* Progress Bars */}
        <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
          {storiesProducts.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{
                  width: `${
                    index < currentIndex 
                      ? 100 
                      : index === currentIndex 
                      ? progress 
                      : 0
                  }%`
                }}
              />
            </div>
          ))}
        </div>

        {/* Animação de corações */}
        {hearts.map(heart => (
          <div
            key={heart.id}
            className="absolute z-30 pointer-events-none"
            style={{
              left: heart.x - 20,
              top: heart.y - 20,
              animation: 'heartPop 2s ease-out forwards'
            }}
          >
            <Heart 
              className="w-10 h-10 text-red-500 fill-red-500" 
              style={{
                filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.8))'
              }}
            />
          </div>
        ))}

        {/* Store Header */}
        <div className="absolute top-12 left-4 right-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            {/* Logo com efeito de iluminação */}
            <div className="relative group">
              {/* Borda flutuante ao redor do logo */}
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-400 via-purple-500 to-orange-500 rounded-full blur opacity-40 group-hover:opacity-60 animate-pulse"></div>
              
              {/* Container do logo */}
              <div className="relative w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 p-0.5 shadow-xl">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  {store.logoUrl ? (
                    <img 
                      src={store.logoUrl}
                      alt={store.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-gray-800">
                      {store.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Pequenos pontos de luz flutuantes */}
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-50"></div>
              <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-300 opacity-60"></div>
            </div>
            
            <div>
              <h3 className="text-white font-semibold text-sm drop-shadow-lg">{store.name}</h3>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Botão Curtir Produto */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLike(currentProduct.id, e);
              }}
              className={`p-2 rounded-full transition-all duration-200 ${
                isProductLiked(currentProduct.id)
                  ? 'bg-red-500 text-white'
                  : 'bg-black/30 text-white hover:bg-black/50'
              }`}
              title={isProductLiked(currentProduct.id) ? "Descurtir produto" : "Curtir produto"}
            >
              <Heart className={`w-5 h-5 ${isProductLiked(currentProduct.id) ? 'fill-current' : ''}`} />
            </button>
            
            {/* Botão Salvar Produto */}
            <button
              onClick={handleSaveProduct}
              className={`p-2 rounded-full transition-all duration-200 ${
                savedProducts.has(currentProduct.id)
                  ? 'bg-yellow-500 text-white'
                  : 'bg-black/30 text-white hover:bg-black/50'
              }`}
              title="Salvar produto"
            >
              {savedProducts.has(currentProduct.id) ? (
                <Bookmark className="w-5 h-5 fill-current" />
              ) : (
                <BookmarkPlus className="w-5 h-5" />
              )}
            </button>
            
            {/* Botão Fechar */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="text-white p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Product Content */}
        <div className="relative w-full h-full flex flex-col">
          {/* Product Image com elementos flutuantes */}
          <div 
            className="flex-1 flex items-center justify-center p-4 pt-24 relative overflow-hidden"
            style={{
              background: `linear-gradient(to bottom right, ${store.themeColor || '#E11D48'}CC, ${store.themeColor || '#E11D48'}E6)`
            }}
          >
            {/* Elementos flutuantes decorativos */}
            <div className="absolute top-20 left-8 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-32 right-8 w-16 h-16 bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-lg animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-4 w-12 h-12 bg-gradient-to-br from-green-400/15 to-cyan-400/15 rounded-full blur-md animate-pulse delay-500"></div>
            
            {/* Container da imagem com destaque */}
            <div className="relative group">
              {/* Borda flutuante ao redor da imagem */}
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-xl blur opacity-30 group-hover:opacity-50 animate-pulse"></div>
              
              {/* Imagem principal */}
              <div className="relative bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/20">
                <img
                  src={currentProduct.imageUrl || ''}
                  alt={currentProduct.name}
                  className="w-full h-full max-h-96 object-contain rounded-lg shadow-2xl"
                  loading="eager"
                  decoding="async"
                />
                
                {/* Reflexo sutil */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/10 rounded-lg pointer-events-none"></div>
              </div>
            </div>
          </div>

          {/* Product Info - Layout Moderno */}
          {/* Nome do produto - ACIMA DA FOTO (com espaçamento do header) */}
          <div className="absolute top-28 left-4 right-4 bg-gray-900/70 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-xl">
            <h2 className="text-white text-xl font-bold text-center drop-shadow-lg">
              {currentProduct.name}
            </h2>
          </div>

          {/* Descrição e preço - EMBAIXO */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900/95 via-gray-800/80 to-transparent p-6 pb-8">
            {currentProduct.description && (
              <p className="text-white/90 text-sm mb-4 line-clamp-3 text-center">
                {currentProduct.description}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <div className="text-white flex items-center gap-3">
                <span className="text-2xl font-bold">
                  {store.currency || "Gs."} {Number(currentProduct.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                {isProductLiked(currentProduct.id) && (
                  <Heart className="w-6 h-6 text-red-500 fill-red-500 animate-pulse" />
                )}
              </div>
              
              {/* Botão WhatsApp */}
              {store.whatsapp && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const message = encodeURIComponent(
                      `🛍️ Olá! Vi esse produto nos seus stories:\n\n*${currentProduct.name}*\n\nPreço: ${store.currency || "Gs."} ${Number(currentProduct.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nPoderia me dar mais informações?`
                    );
                    const whatsappNumber = store.whatsapp!.replace(/\D/g, '');
                    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full font-medium transition-colors flex items-center gap-2"
                  title="Perguntar no WhatsApp"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                  <span className="text-xs">WhatsApp</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Invisible navigation zones */}
        <button 
          className="absolute top-0 left-0 w-1/2 h-full opacity-0 z-10 bg-transparent border-0 outline-none"
          onClick={(e) => {
            e.stopPropagation();
            prevStory();
          }}
          style={{ 
            background: 'none',
            boxShadow: 'none',
            padding: 0,
            margin: 0
          }}
          aria-label="Previous story"
        />
        <button 
          className="absolute top-0 right-0 w-1/2 h-full opacity-0 z-10 bg-transparent border-0 outline-none"
          onClick={(e) => {
            e.stopPropagation();
            nextStory();
          }}
          style={{ 
            background: 'none',
            boxShadow: 'none',
            padding: 0,
            margin: 0
          }}
          aria-label="Next story"
        />

        {/* Pause overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="text-white text-sm bg-black/50 px-3 py-1 rounded">
              Pausado
            </div>
          </div>
        )}
      </div>
    </div>
  );
}