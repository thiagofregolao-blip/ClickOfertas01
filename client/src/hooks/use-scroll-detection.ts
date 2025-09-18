import { useState, useEffect } from "react";

interface UseScrollDetectionOptions {
  threshold?: number;
}

/**
 * Hook customizado para detectar direção do scroll e controlar visibilidade de elementos
 * Baseado na lógica extraída do stores-gallery.tsx
 */
export function useScrollDetection(options: UseScrollDetectionOptions = {}) {
  const { threshold = 100 } = options;
  
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollY) {
        // Rolando para cima - mostrar elemento
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > threshold) {
        // Rolando para baixo e passou do threshold - esconder elemento
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, threshold]);

  return {
    isVisible,
    scrollY: lastScrollY
  };
}