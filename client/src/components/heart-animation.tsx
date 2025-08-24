import { useEffect, useState } from "react";

interface Heart {
  id: string;
  x: number;
  y: number;
}

interface HeartAnimationProps {
  hearts: Heart[];
}

export function HeartAnimation({ hearts }: HeartAnimationProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute text-red-500 text-2xl animate-[heartPop_1.5s_ease-out_forwards] z-50"
          style={{
            left: `${heart.x}px`,
            top: `${heart.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          ❤️
        </div>
      ))}
    </div>
  );
}

interface LikeableProps {
  children: React.ReactNode;
  onDoubleTap: (event: React.TouchEvent | React.MouseEvent) => void;
  hearts: Heart[];
  className?: string;
}

export function Likeable({ children, onDoubleTap, hearts, className = "" }: LikeableProps) {
  const [lastTap, setLastTap] = useState(0);

  const handleClick = (event: React.MouseEvent) => {
    const now = Date.now();
    const timeDiff = now - lastTap;
    
    if (timeDiff < 300 && timeDiff > 0) {
      // Double click detected
      onDoubleTap(event);
    }
    
    setLastTap(now);
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const now = Date.now();
    const timeDiff = now - lastTap;
    
    if (timeDiff < 300 && timeDiff > 0) {
      // Double tap detected
      onDoubleTap(event);
    }
    
    setLastTap(now);
  };

  return (
    <div 
      className={`relative ${className}`}
      onClick={handleClick}
      onTouchEnd={handleTouchEnd}
    >
      {children}
      <HeartAnimation hearts={hearts} />
    </div>
  );
}