import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import type { StoreWithProducts, Product } from "@shared/schema";

interface InstagramStoriesProps {
  store: StoreWithProducts;
  onClose: () => void;
}

export function InstagramStories({ store, onClose }: InstagramStoriesProps) {
  const storiesProducts = store.products.filter(p => p.isActive && p.showInStories);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const STORY_DURATION = 5000; // 5 segundos por produto

  const currentProduct = storiesProducts[currentIndex];

  // Auto-advance stories
  useEffect(() => {
    if (isPaused || storiesProducts.length === 0) return;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < storiesProducts.length - 1) {
            setCurrentIndex(currentIndex + 1);
            return 0;
          } else {
            onClose(); // Fecha quando termina
            return prev;
          }
        }
        return prev + (100 / (STORY_DURATION / 100));
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isPaused, storiesProducts.length, onClose]);

  // Reset progress when changing stories
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  const nextStory = () => {
    if (currentIndex < storiesProducts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const prevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
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
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Stories Container */}
      <div className="relative w-full max-w-sm mx-auto h-full bg-black">
        {/* Progress bars */}
        <div className="absolute top-4 left-4 right-4 z-20 flex gap-1">
          {storiesProducts.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white rounded-full transition-all duration-100"
                style={{
                  width: 
                    index < currentIndex ? '100%' :
                    index === currentIndex ? `${progress}%` :
                    '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-12 left-4 right-4 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Store Avatar */}
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-white"
              style={{ backgroundColor: store.themeColor || '#E11D48' }}
            >
              {store.logoUrl ? (
                <img 
                  src={store.logoUrl} 
                  alt={store.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                store.name.charAt(0)
              )}
            </div>
            
            <div>
              <h3 className="text-white text-sm font-semibold">{store.name}</h3>
              <p className="text-white/70 text-xs">agora</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-white/90 hover:text-white p-2"
            data-testid="button-close-stories"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Content */}
        <div 
          className="relative w-full h-full cursor-pointer select-none"
          onClick={handleTap}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          data-testid="story-content"
        >
          {/* Product Image */}
          <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
            {currentProduct.imageUrl ? (
              <img
                src={currentProduct.imageUrl}
                alt={currentProduct.name}
                className="max-w-full max-h-full object-contain"
                style={{ maxHeight: '70vh' }}
              />
            ) : (
              <div className="w-64 h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500 text-6xl">📦</span>
              </div>
            )}
          </div>

          {/* Product Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-12">
            <div className="text-white">
              <h2 className="text-xl font-bold mb-2">{currentProduct.name}</h2>
              
              {currentProduct.description && (
                <p className="text-white/90 text-sm mb-3 line-clamp-2">
                  {currentProduct.description}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl font-bold" style={{ color: store.themeColor || '#E11D48' }}>
                      {store.currency || 'Gs.'} {currentProduct.price?.toLocaleString()}
                    </span>
                  </div>
                  
                  {currentProduct.category && (
                    <span className="text-white/70 text-xs bg-white/20 px-2 py-1 rounded-full">
                      {currentProduct.category}
                    </span>
                  )}
                </div>

                <div className="flex gap-3">
                  <button className="text-white/80 hover:text-white">
                    <Heart className="w-6 h-6" />
                  </button>
                  <button className="text-white/80 hover:text-white">
                    <MessageCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                  <div className="text-center">
                    <p className="text-white/90 text-sm mb-2">Interessado? Entre em contato!</p>
                    {store.whatsapp && (
                      <a 
                        href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                        className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-green-600 transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="button-contact-whatsapp"
                      >
                        <span>📱</span>
                        <span>{store.whatsapp}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation arrows (desktop) */}
        <div className="hidden md:block">
          {currentIndex > 0 && (
            <button
              onClick={prevStory}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-2 rounded-full bg-black/20 backdrop-blur-sm"
              data-testid="button-prev-story"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          
          {currentIndex < storiesProducts.length - 1 && (
            <button
              onClick={nextStory}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-2 rounded-full bg-black/20 backdrop-blur-sm"
              data-testid="button-next-story"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Story counter */}
        <div className="absolute bottom-6 right-6 bg-black/40 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
          {currentIndex + 1} de {storiesProducts.length}
        </div>
      </div>
    </div>
  );
}