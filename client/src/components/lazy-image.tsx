import { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function LazyImage({ src, alt, className = '', placeholder, style }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: '50px', // Carrega 50px antes de ficar visível
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  if (!isInView) {
    return (
      <div 
        ref={imgRef} 
        className={`bg-gray-200 animate-pulse flex items-center justify-center ${className}`}
        style={style}
      >
        {placeholder && <span className="text-gray-400 text-xs">{placeholder}</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={style}
      onLoad={() => setIsLoaded(true)}
      loading="lazy"
    />
  );
}