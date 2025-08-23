import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef(0);
  const STORY_DURATION = 8000; // 8 segundos por produto

  const currentProduct = storiesProducts[currentIndex];

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
    
    setLocation('/stores');
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

  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    if (x < width / 2) {
      prevStory();
    } else {
      nextStory();
    }
  };

  if (storiesProducts.length === 0) {
    return null;
  }

  return (
    <div 
      className={`fixed inset-0 bg-black z-50 flex items-center justify-center ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: isOpening ? 'transparent' : 'black'
      }}
    >
      {/* Stories Container */}
      <div 
        className={`relative w-full max-w-sm mx-auto h-full bg-black ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
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

        {/* Store Header */}
        <div className="absolute top-12 left-4 right-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 p-0.5">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <span className="text-xs font-bold text-gray-800">
                  {store.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">{store.name}</h3>
            </div>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Product Content */}
        <div className="relative w-full h-full flex flex-col">
          {/* Product Image */}
          <div className="flex-1 flex items-center justify-center bg-black p-4 pt-24">
            <img
              src={currentProduct.imageUrl || ''}
              alt={currentProduct.name}
              className="w-full h-full max-h-96 object-contain rounded-lg"
              loading="eager"
              decoding="async"
            />
          </div>

          {/* Product Info - Layout Moderno */}
          {/* Nome do produto - TOPO */}
          <div className="absolute top-20 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-4">
            <h2 className="text-white text-xl font-bold text-center">
              {currentProduct.name}
            </h2>
          </div>

          {/* Descrição e preço - EMBAIXO */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 pb-8">
            {currentProduct.description && (
              <p className="text-white/90 text-sm mb-4 line-clamp-3 text-center">
                {currentProduct.description}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <div className="text-white">
                <span className="text-2xl font-bold">
                  {store.currency || "Gs."} {Number(currentProduct.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
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

        {/* Navigation Areas */}
        <div className="absolute inset-0 flex">
          <div 
            className="w-1/2 h-full"
            onClick={(e) => {
              e.stopPropagation();
              prevStory();
            }}
          />
          <div 
            className="w-1/2 h-full"
            onClick={(e) => {
              e.stopPropagation();
              nextStory();
            }}
          />
        </div>

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