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
          {store.logoUrl ? (
            <img 
              src={store.logoUrl} 
              alt={`Logo ${store.name}`}
              className="w-16 h-16 rounded-full object-cover border-3 border-white shadow-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/20 border-3 border-white shadow-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {store.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          <div>
            <h1 className="text-3xl font-bold">{store.name}</h1>
            <p className="text-white/90">Ofertas imperdíveis para você!</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-lg font-semibold">Promoções Válidas</p>
          <p className="text-white/90">Até acabar o estoque</p>
        </div>
      </div>
    </div>
  );
}
