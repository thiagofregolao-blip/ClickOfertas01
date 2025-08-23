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
    // Recupera posição do logo do sessionStorage
    const stored = sessionStorage.getItem('storiesOrigin');
    if (stored) {
      const origin = JSON.parse(stored);
      setOriginPosition({
        x: (origin.x / window.innerWidth) * 100,
        y: (origin.y / window.innerHeight) * 100
      });
      sessionStorage.removeItem('storiesOrigin');
    }

    // Pausa inicial durante a animação de abertura
    setIsPaused(true);
    
    // Inicia stories após animação de abertura
    setTimeout(() => {
      setIsOpening(false);
      setIsPaused(false);
    }, 200);
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
      progressRef.current += (100 / (STORY_DURATION / 100));
      setProgress(progressRef.current);
      
      if (progressRef.current >= 100) {
        if (currentIndex < storiesProducts.length - 1) {
          // Próximo produto da mesma loja
          setCurrentIndex(prev => prev + 1);
        } else {
          // Acabaram os produtos - próxima loja
          goToNextStore();
        }
      }
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentIndex, isPaused, storiesProducts.length, isOpening, isClosing]);

  const handleClose = () => {
    setIsClosing(true);
    setIsPaused(true);
    
    setTimeout(() => {
      setLocation('/stores');
    }, 200);
  };

  const goToNextStore = () => {
    // Encontra próxima loja com stories
    const storesWithStories = allStores.filter(s => 
      s.products.some(p => p.isActive && p.showInStories)
    );
    const currentStoreIndex = storesWithStories.findIndex(s => s.id === store.id);
    const nextStoreIndex = currentStoreIndex + 1;
    
    if (nextStoreIndex < storesWithStories.length) {
      const nextStore = storesWithStories[nextStoreIndex];
      // Navega para próxima loja
      setIsClosing(true);
      setIsPaused(true);
      setTimeout(() => {
        window.location.href = `/stores/${nextStore.slug}`;
      }, 200);
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
      className={`fixed inset-0 bg-black z-50 flex items-center justify-center transition-all duration-200 ${
        isClosing ? 'opacity-0' : isOpening ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: isOpening ? 'transparent' : 'black'
      }}
    >
      {/* Stories Container */}
      <div 
        className={`relative w-full max-w-sm mx-auto h-full bg-black transition-all duration-200 transform ${
          isClosing 
            ? 'opacity-0' 
            : isOpening 
            ? 'opacity-100'
            : 'scale-100 translate-x-0 translate-y-0 opacity-100'
        }`}
        style={{
          transformOrigin: isClosing ? `${originPosition.x}% ${originPosition.y}%` : isOpening ? `${originPosition.x}% ${originPosition.y}%` : 'center center',
          transform: isClosing 
            ? `scale(0) translate(${50 - originPosition.x}vw, ${50 - originPosition.y}vh)`
            : isOpening 
            ? `scale(1.5) translate(${50 - originPosition.x}vw, ${50 - originPosition.y}vh)`
            : 'scale(1) translate(0, 0)'
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
              <p className="text-white/70 text-xs">Há 2h</p>
            </div>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Product Content */}
        <div className="relative w-full h-full flex flex-col">
          {/* Product Image */}
          <div className="flex-1 flex items-center justify-center bg-black p-4 pt-24">
            <img
              src={currentProduct.imageUrl}
              alt={currentProduct.name}
              className="w-full h-full max-h-96 object-contain rounded-lg"
              loading="eager"
            />
          </div>

          {/* Product Info */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pb-8">
            <h2 className="text-white text-xl font-bold mb-2">
              {currentProduct.name}
            </h2>
            
            {currentProduct.description && (
              <p className="text-white/90 text-sm mb-3 line-clamp-3">
                {currentProduct.description}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <div className="text-white">
                <span className="text-2xl font-bold">
                  R$ {currentProduct.price.toFixed(2)}
                </span>
                {currentProduct.originalPrice && currentProduct.originalPrice > currentProduct.price && (
                  <span className="text-white/60 text-sm line-through ml-2">
                    R$ {currentProduct.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <Heart size={24} />
                </button>
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <MessageCircle size={24} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Areas */}
        <div className="absolute inset-0 flex">
          <div 
            className="w-1/2 h-full flex items-center justify-start pl-4"
            onClick={(e) => {
              e.stopPropagation();
              prevStory();
            }}
          >
            {currentIndex > 0 && (
              <ChevronLeft className="text-white/50" size={32} />
            )}
          </div>
          <div 
            className="w-1/2 h-full flex items-center justify-end pr-4"
            onClick={(e) => {
              e.stopPropagation();
              nextStory();
            }}
          >
            <ChevronRight className="text-white/50" size={32} />
          </div>
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