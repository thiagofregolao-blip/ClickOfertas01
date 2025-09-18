import type { Store } from "@shared/schema";

interface FlyerHeaderProps {
  store: Store;
}

export default function FlyerHeader({ store }: FlyerHeaderProps) {
  
  const gradientStyle = {
    background: `linear-gradient(135deg, ${store.themeColor} 0%, ${store.themeColor}dd 100%)`
  };
  

  return (
    <div className="text-white p-8 rounded-t-2xl" style={gradientStyle}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            {store.logoUrl ? (
              <img 
                src={store.logoUrl} 
                alt={`Logo ${store.name}`}
                className="w-16 h-16 rounded-full object-cover border-3 border-white shadow-lg"
                data-testid="img-store-logo"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div 
                className="w-16 h-16 rounded-full bg-white/20 border-3 border-white shadow-lg flex items-center justify-center"
                data-testid="div-store-logo-placeholder"
              >
                <span className="text-2xl font-bold text-white">
                  {store.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 
                className="text-2xl md:text-3xl font-bold flex-shrink-0" 
                data-testid="text-store-name"
              >
                {store.name}
              </h1>
            </div>
            <p className="text-white/90 mt-1">Ofertas imperdíveis para você!</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex flex-col items-end space-y-2">
            <div>
              <p className="text-lg font-semibold">Promoções Válidas</p>
              <p className="text-white/90">Até acabar o estoque</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
