import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MiniMapProps {
  latitude: number | string;
  longitude: number | string;
  storeName?: string;
  onClick?: () => void;
  className?: string;
}

export function MiniMap({ 
  latitude, 
  longitude, 
  storeName = 'Loja', 
  onClick,
  className = ''
}: MiniMapProps) {
  const [hasValidCoordinates, setHasValidCoordinates] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  // Parse and validate coordinates
  const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
  const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;

  useEffect(() => {
    const isValidLat = lat !== null && lat !== undefined && !isNaN(lat) && lat >= -90 && lat <= 90;
    const isValidLng = lng !== null && lng !== undefined && !isNaN(lng) && lng >= -180 && lng <= 180;
    setHasValidCoordinates(Boolean(isValidLat && isValidLng));
    
    // Force map re-render when coordinates change
    setMapKey(prev => prev + 1);
  }, [lat, lng]);

  const handleClick = () => {
    if (onClick && hasValidCoordinates) {
      onClick();
    }
  };

  if (!hasValidCoordinates) {
    return (
      <div 
        className={`
          w-16 h-10 sm:w-20 sm:h-12 
          rounded-lg 
          bg-gray-100 dark:bg-gray-800 
          border border-gray-200 dark:border-gray-700
          shadow-sm
          flex items-center justify-center
          transition-all duration-200
          ${onClick ? 'cursor-pointer hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-750' : ''}
          ${className}
        `}
        onClick={handleClick}
        title={hasValidCoordinates ? "Ver no mapa" : "Localização não disponível"}
        data-testid="minimap-placeholder"
      >
        <MapPin className="h-4 w-4 text-gray-400" />
      </div>
    );
  }

  return (
    <div 
      className={`
        relative
        w-16 h-10 sm:w-20 sm:h-12 
        rounded-lg 
        overflow-hidden 
        border border-gray-200 dark:border-gray-700
        shadow-sm
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''}
        ${className}
      `}
      onClick={handleClick}
      title={onClick ? "Ver no mapa" : storeName}
      data-testid="minimap-container"
    >
      <MapContainer
        key={mapKey}
        center={[lat!, lng!]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        className="minimap-leaflet"
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        dragging={false}
        attributionControl={false}
        data-testid="minimap-leaflet-container"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution=""
        />
        <Marker 
          position={[lat!, lng!]} 
          data-testid="minimap-marker"
        />
      </MapContainer>
      
      {/* Overlay for click handling when onClick is provided */}
      {onClick && (
        <div 
          className="absolute inset-0 bg-transparent z-[1000]"
          data-testid="minimap-click-overlay"
        />
      )}
    </div>
  );
}