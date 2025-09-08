import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTypewriter } from '@/hooks/use-typewriter';
import { useDebounce } from '@/hooks/use-debounce';
import type { Store, Product } from '@shared/schema';

export default function SearchHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<{product: Product, store: Store} | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch stores and products
  const { data: stores = [], isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ['/api/public/stores'],
  });

  const { data: allProducts = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/public/products'],
  });

  // Frases para animação da barra de busca (igual à landing page)
  const typewriterPhrases = [
    "Produtos em promoção...",
    "Eletrônicos importados...", 
    "Perfumes originais...",
    "Ofertas imperdíveis...",
    "Lojas do Paraguay...",
    "Preços especiais..."
  ];
  
  const { currentText } = useTypewriter({ 
    phrases: isSearchFocused || searchQuery ? [] : typewriterPhrases,
    speed: 80,
    pauseTime: 2500,
    backspaceSpeed: 40
  });

  // Search results
  const searchResults = useMemo(() => {
    if (!debouncedSearch.trim() || !allProducts.length || !stores.length) return [];
    
    const query = debouncedSearch.toLowerCase();
    const results: Array<{product: Product, store: Store}> = [];
    
    allProducts
      .filter(product => 
        product.isActive && (
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query)
        )
      )
      .forEach(product => {
        const store = stores.find(s => s.id === product.storeId);
        if (store) {
          results.push({ product, store });
        }
      });
    
    return results.slice(0, 10); // Limitar a 10 resultados
  }, [debouncedSearch, allProducts, stores]);

  const handleProductSelect = (product: Product, store: Store) => {
    setSelectedProduct({ product, store });
  };

  const handleBackToSearch = () => {
    setSelectedProduct(null);
    setSearchQuery('');
  };

  const isLoading = storesLoading || productsLoading;

  // Se produto selecionado, mostrar página do flyer
  if (selectedProduct) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header com barra de busca no canto */}
        <header className="bg-white border-b border-gray-200 py-3 px-4 sm:px-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={handleBackToSearch}
                className="p-2"
                data-testid="back-button"
              >
                <X className="h-5 w-5" />
              </Button>
              
              {/* Barra de busca compacta no canto */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 rounded-full border-gray-300"
                  data-testid="compact-search-input"
                />
              </div>
            </div>
            
            <h1 className="text-xl font-bold text-gray-900">
              Click Ofertas <span className="text-orange-500">PY</span>
            </h1>
          </div>
        </header>

        {/* Conteúdo do flyer da loja */}
        <div className="container mx-auto px-4 py-8" data-testid="flyer-content">
          <div className="max-w-4xl mx-auto">
            {/* Header da loja */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {selectedProduct.store.name}
              </h2>
              <p className="text-gray-600">
                {selectedProduct.store.description}
              </p>
            </div>

            {/* Produto selecionado em destaque */}
            <Card className="mb-8 shadow-lg">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {selectedProduct.product.imageUrl && (
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img 
                        src={selectedProduct.product.imageUrl} 
                        alt={selectedProduct.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedProduct.product.name}
                    </h3>
                    <p className="text-gray-600">
                      {selectedProduct.product.description}
                    </p>
                    <div className="flex items-center gap-4">
                      <span className="text-3xl font-bold text-orange-500">
                        R$ {parseFloat(selectedProduct.product.price).toFixed(2)}
                      </span>
                      {selectedProduct.product.category && (
                        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                          {selectedProduct.product.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Outros produtos da loja */}
            <div>
              <h4 className="text-xl font-semibold mb-4">
                Outros produtos de {selectedProduct.store.name}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allProducts
                  .filter(p => p.storeId === selectedProduct.store.id && p.id !== selectedProduct.product.id && p.isActive)
                  .slice(0, 6)
                  .map((product) => (
                    <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        {product.imageUrl && (
                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-3">
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <h5 className="font-semibold text-sm mb-2 line-clamp-2">
                          {product.name}
                        </h5>
                        <p className="text-lg font-bold text-orange-500">
                          R$ {parseFloat(product.price).toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Página principal de busca (estilo landing page)
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Branco Superior (igual à landing page) */}
      <header className="bg-white border-b border-gray-200 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">
              Click Ofertas <span className="text-orange-500">PY</span>
            </h1>
          </div>
          
          <div>
            <a 
              href="#" 
              className="text-base text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              Precisa de Ajuda?
            </a>
          </div>
        </div>
      </header>

      {/* Área Principal com fundo gradiente (igual à landing page) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#F04940] to-[#FA7D22] min-h-[85vh]">
        <div className="absolute inset-0 bg-black/20"></div>
        
        <div className="relative z-10 w-full h-full">
          <div className="flex flex-col min-h-[85vh]">
            
            {/* Espaço no topo */}
            <div className="pt-16"></div>

            {/* Barra de busca centralizada */}
            <div className="flex-1 flex flex-col justify-center px-6 max-w-2xl mx-auto w-full">
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-white mb-2">
                  Busque Ofertas
                </h2>
                <p className="text-white/90 text-lg">
                  Encontre os melhores produtos do Paraguai
                </p>
              </div>

              {/* Barra de Busca Principal */}
              <div className="relative mb-8">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                  <Input
                    type="text"
                    placeholder={isSearchFocused || searchQuery ? "Digite o produto..." : currentText}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className="pl-12 pr-4 py-4 w-full rounded-full text-lg bg-white border-0 shadow-lg focus:ring-2 focus:ring-white/50"
                    data-testid="main-search-input"
                  />
                </div>
                
                {/* Resultados da busca */}
                {searchResults.length > 0 && (
                  <Card className="absolute top-full left-0 right-0 mt-2 shadow-xl z-20 max-h-96 overflow-y-auto">
                    <CardContent className="p-0">
                      {searchResults.map((result, index) => (
                        <div
                          key={`${result.product.id}-${index}`}
                          className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => handleProductSelect(result.product, result.store)}
                          data-testid={`search-result-${index}`}
                        >
                          <div className="flex items-center gap-4">
                            {result.product.imageUrl && (
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                <img 
                                  src={result.product.imageUrl} 
                                  alt={result.product.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {result.product.name}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {result.store.name}
                              </p>
                              <p className="text-lg font-bold text-orange-500">
                                R$ {parseFloat(result.product.price).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Logos das lojas cadastradas */}
              {!isLoading && stores.length > 0 && (
                <div className="text-center">
                  <p className="text-white/90 mb-6 text-lg">
                    Lojas cadastradas
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    {stores.map((store) => (
                      <div 
                        key={store.id}
                        className="bg-white/90 backdrop-blur-sm rounded-lg p-4 hover:bg-white transition-colors cursor-pointer shadow-lg"
                        data-testid={`store-logo-${store.id}`}
                      >
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-xl mb-2 mx-auto">
                            {store.name.substring(0, 2).toUpperCase()}
                          </div>
                          <p className="text-sm font-medium text-gray-700">
                            {store.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading state */}
              {isLoading && (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-white/90">Carregando lojas...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}