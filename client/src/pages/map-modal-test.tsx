import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapModal } from '@/components/MapModal';
import { MapPin } from 'lucide-react';

export function MapModalTestPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStore, setCurrentStore] = useState({
    name: 'Shopping China',
    address: 'Rua das Compras, 123 - Centro, Ciudad del Este',
    latitude: -25.5163,
    longitude: -54.6156
  });

  const testStores = [
    {
      name: 'Shopping China',
      address: 'Rua das Compras, 123 - Centro, Ciudad del Este',
      latitude: -25.5163,
      longitude: -54.6156
    },
    {
      name: 'Loja Tech',
      address: 'Av. Principal, 456 - Centro, Ciudad del Este',
      latitude: -25.5200,
      longitude: -54.6100
    },
    {
      name: 'Farmácia San Rafael',
      address: 'Rua da Saúde, 789 - Bairro Alto, Ciudad del Este',
      latitude: -25.5250,
      longitude: -54.6200
    },
    {
      name: 'Loja Sem Coordenadas',
      address: 'Endereço de exemplo sem coordenadas',
      latitude: undefined,
      longitude: undefined
    }
  ];

  const handleOpenModal = (store: typeof testStores[0]) => {
    setCurrentStore(store);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Teste do MapModal
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Teste o componente MapModal com diferentes lojas e cenários.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {testStores.map((store, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  {store.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {store.address}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {store.latitude && store.longitude ? (
                      <span className="text-green-600">✓ Com coordenadas</span>
                    ) : (
                      <span className="text-orange-600">⚠ Sem coordenadas</span>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => handleOpenModal(store)}
                    className="flex items-center gap-2"
                    data-testid={`button-open-map-${index}`}
                  >
                    <MapPin className="h-4 w-4" />
                    Ver no Mapa
                  </Button>
                </div>
                
                {store.latitude && store.longitude && (
                  <div className="mt-2 text-xs text-gray-400">
                    Lat: {store.latitude}, Lng: {store.longitude}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recursos Implementados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-green-600 mb-2">✓ Funcionalidades</h4>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
                  <li>• Modal fullscreen/responsivo</li>
                  <li>• Integração react-leaflet</li>
                  <li>• Marker com popup informativo</li>
                  <li>• Controles de zoom</li>
                  <li>• Botão de fechar</li>
                  <li>• Abertura no Google Maps</li>
                  <li>• Obter direções</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-600 mb-2">🛡️ Tratamento de Erros</h4>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
                  <li>• Validação de coordenadas</li>
                  <li>• Fallback para lojas sem localização</li>
                  <li>• Exibição de endereço alternativo</li>
                  <li>• CSS Leaflet incluído</li>
                  <li>• Ícones de marker corrigidos</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MapModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        storeName={currentStore.name}
        address={currentStore.address}
        latitude={currentStore.latitude}
        longitude={currentStore.longitude}
      />
    </div>
  );
}