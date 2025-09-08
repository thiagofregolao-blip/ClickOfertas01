import { useState, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTypewriter } from '@/hooks/use-typewriter';
import { useDebounce } from '@/hooks/use-debounce';
import type { Store, Product } from '@shared/schema';

export default function SearchHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<{product: Product, store: Store} | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  
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
    
    return results.slice(0, 50); // Limitar a 50 resultados
  }, [debouncedSearch, allProducts, stores]);

  // Controlar estado da busca ativa
  useEffect(() => {
    setIsSearchActive(debouncedSearch.trim().length > 0);
  }, [debouncedSearch]);

  const handleProductSelect = (product: Product, store: Store) => {
    setSelectedProduct({ product, store });
  };

  const handleBackToSearch = () => {
    setSelectedProduct(null);
    setSearchQuery('');
    setIsSearchActive(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
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

  // Se busca ativa, mostrar layout com header laranja
  if (isSearchActive && searchResults.length > 0) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header laranja fixo com busca ativa */}
        <header className="bg-gradient-to-r from-[#F04940] to-[#FA7D22] shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="flex-shrink-0">
                <h1 className="text-white font-bold text-lg whitespace-nowrap">
                  Click Ofertas.PY
                </h1>
              </div>

              {/* Barra de Busca no Header */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Buscar produtos..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full rounded-full bg-white border-0 text-sm shadow-lg"
                    data-testid="header-search-input"
                  />
                </div>
              </div>

              {/* Botão voltar */}
              <Button 
                variant="ghost" 
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchActive(false);
                }}
                className="text-white hover:bg-white/20 p-2"
                data-testid="back-to-search"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Lista de produtos */}
        <div className="bg-gray-50 min-h-screen">
          <div className="container mx-auto px-4 py-6">
            
            {/* Contador de resultados */}
            <div className="mb-4">
              <p className="text-gray-600">
                <strong>{searchResults.length}</strong> resultados para "<strong>{searchQuery}</strong>"
              </p>
              <p className="text-sm text-blue-600 cursor-pointer hover:underline">
                💡 Clique nos itens para ver detalhes
              </p>
            </div>

            {/* Lista de produtos (vertical como na imagem) */}
            <div className="space-y-4">
              {searchResults.map((result, index) => (
                <Card 
                  key={`${result.product.id}-${index}`}
                  className="cursor-pointer hover:shadow-md transition-shadow bg-white"
                  onClick={() => handleProductSelect(result.product, result.store)}
                  data-testid={`product-item-${index}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Miniatura do produto */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {result.product.imageUrl ? (
                          <img 
                            src={result.product.imageUrl} 
                            alt={result.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">IMG</span>
                          </div>
                        )}
                      </div>

                      {/* Informações do produto */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 pr-4">
                            <h4 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                              {result.product.name}
                            </h4>
                            
                            {/* Badge destaque */}
                            <Badge className="bg-orange-500 text-white text-xs mb-2">
                              Destaque
                            </Badge>
                            
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <span className="text-sm font-medium text-gray-700">
                                {result.store.name}
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-500 line-clamp-1">
                              {result.product.description || "Produto em destaque com ótima qualidade"}
                            </p>
                          </div>

                          {/* Preço e ações */}
                          <div className="text-right flex-shrink-0">
                            <p className="text-2xl font-bold text-blue-500 mb-1">
                              ${parseFloat(result.product.price).toFixed(0)}
                              <span className="text-sm text-gray-500">.00</span>
                            </p>
                            <p className="text-xs text-gray-500 mb-2">+ Eletrônicos</p>
                            <Button 
                              size="sm"
                              className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded-full"
                            >
                              Ver loja
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Sem resultados */}
            {searchResults.length === 0 && debouncedSearch && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Nenhum resultado encontrado
                </h3>
                <p className="text-gray-600 mb-6">
                  Não encontramos produtos para "{searchQuery}"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Página principal de busca (estilo landing page com header BRANCO)
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header BRANCO (igual à landing page) */}
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
              
              {/* Texto promocional */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white whitespace-nowrap">
                  Os melhores produtos do Paraguai você encontra aqui!
                </h2>
              </div>

              {/* Barra de Busca Principal */}
              <div className="relative mb-8">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                  <Input
                    type="text"
                    placeholder={isSearchFocused || searchQuery ? "Digite o produto..." : currentText}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className="pl-12 pr-4 py-4 w-full rounded-full text-lg bg-white border-0 shadow-lg focus:ring-2 focus:ring-white/50"
                    data-testid="main-search-input"
                  />
                </div>
              </div>

              {/* Logos das lojas cadastradas */}
              {!isLoading && stores.length > 0 && (
                <div className="text-center">
                  <p className="text-white/90 mb-6 text-lg">
                    Lojas cadastradas
                  </p>
                  <div className="flex justify-center items-center gap-8">
                    {stores.map((store) => (
                      <div 
                        key={store.id}
                        className="flex-shrink-0 cursor-pointer transition-transform hover:scale-110"
                        data-testid={`store-logo-${store.id}`}
                      >
                        <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden">
                          {store.logoUrl ? (
                            <img 
                              src={store.logoUrl} 
                              alt={store.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-orange-500 font-bold text-xl">
                              {store.name.substring(0, 2).toUpperCase()}
                            </span>
                          )}
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