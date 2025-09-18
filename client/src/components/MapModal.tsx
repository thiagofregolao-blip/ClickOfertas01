import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MapPin, Navigation, Expand } from 'lucide-react';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeName: string;
  address: string;
  latitude?: number | string;
  longitude?: number | string;
}

export function MapModal({ 
  isOpen, 
  onClose, 
  storeName, 
  address, 
  latitude, 
  longitude 
}: MapModalProps) {
  const [mapKey, setMapKey] = useState(0);
  const [hasValidCoordinates, setHasValidCoordinates] = useState(false);

  // Parse and validate coordinates
  const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
  const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;

  useEffect(() => {
    const isValidLat = lat && !isNaN(lat) && lat >= -90 && lat <= 90;
    const isValidLng = lng && !isNaN(lng) && lng >= -180 && lng <= 180;
    setHasValidCoordinates(Boolean(isValidLat && isValidLng));
  }, [lat, lng]);

  useEffect(() => {
    if (isOpen) {
      // Force map re-render when modal opens
      setMapKey(prev => prev + 1);
    }
  }, [isOpen]);

  const handleOpenInGoogleMaps = () => {
    if (hasValidCoordinates && lat && lng) {
      const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  const handleGetDirections = () => {
    if (hasValidCoordinates && lat && lng) {
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(directionsUrl, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="w-full h-full max-w-none max-h-none m-0 p-0 bg-white dark:bg-gray-900 
                   md:w-[95vw] md:h-[90vh] md:max-w-6xl md:rounded-lg md:m-auto"
        data-testid="map-modal-content"
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between p-4 border-b bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <DialogTitle 
                className="text-lg font-semibold text-gray-900 dark:text-white"
                data-testid="map-modal-title"
              >
                {storeName}
              </DialogTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              Localização
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            data-testid="button-close-map"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </DialogHeader>

        {/* Store Information */}
        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b">
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p 
                className="text-sm font-medium text-gray-900 dark:text-white mb-1"
                data-testid="text-store-name"
              >
                {storeName}
              </p>
              <p 
                className="text-sm text-gray-600 dark:text-gray-300 break-words"
                data-testid="text-store-address"
              >
                {address || 'Endereço não informado'}
              </p>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {hasValidCoordinates && lat && lng ? (
            <MapContainer
              key={mapKey}
              center={[lat, lng]}
              zoom={16}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
              data-testid="leaflet-map-container"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[lat, lng]} data-testid="map-marker-store">
                <Popup>
                  <div className="text-center p-2">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {storeName}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {address}
                    </p>
                    <Button
                      size="sm"
                      onClick={handleGetDirections}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="button-get-directions"
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      Como chegar
                    </Button>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div 
              className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800"
              data-testid="map-error-container"
            >
              <div className="text-center p-8">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Localização não disponível
                </h3>
                <p className="text-gray-600 dark:text-gray-300 max-w-sm">
                  As coordenadas desta loja não estão disponíveis no momento.
                </p>
                {address && (
                  <div className="mt-4 p-3 bg-white dark:bg-gray-700 rounded-lg border">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      {address}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {hasValidCoordinates && (
          <div className="flex items-center justify-between p-4 border-t bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <MapPin className="h-4 w-4" />
              Coordenadas: {lat?.toFixed(6)}, {lng?.toFixed(6)}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInGoogleMaps}
                className="flex items-center gap-2"
                data-testid="button-open-google-maps"
              >
                <Expand className="h-4 w-4" />
                Abrir no Google Maps
              </Button>
              
              <Button
                size="sm"
                onClick={handleGetDirections}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                data-testid="button-directions"
              >
                <Navigation className="h-4 w-4" />
                Como chegar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}