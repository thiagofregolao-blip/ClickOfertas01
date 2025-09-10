import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, BarChart3, X } from "lucide-react";
import { useTypewriter } from "@/hooks/use-typewriter";
import { useDebounce } from "@/hooks/use-debounce";
import { useAnalytics } from "@/hooks/useAnalytics";
import { SearchResultItem } from "@/components/search-result-item";
import { StoreResultItem } from "@/components/store-result-item";
import type { StoreWithProducts } from "@shared/schema";

interface GlobalHeaderProps {
  onSearch?: (query: string) => void;
  searchValue?: string;
  showPriceComparison?: boolean;
  showFullResults?: boolean;
}

export default function GlobalHeader({ 
  onSearch, 
  searchValue = "", 
  showPriceComparison = true,
  showFullResults = true
}: GlobalHeaderProps) {
  const [searchInput, setSearchInput] = useState(searchValue);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [, setLocation] = useLocation();
  
  const searchQuery = useDebounce(searchInput, 500);
  const { trackEvent, sessionToken } = useAnalytics();
  
  // Buscar stores para funcionalidade de busca
  const { data: stores } = useQuery<StoreWithProducts[]>({
    queryKey: ["/api/public/stores"],
    staleTime: 5 * 60 * 1000,
  });
  
  // Frases para placeholder dinâmico
  const typewriterPhrases = [
    "Produtos em promoção...",
    "Eletrônicos importados...",
    "Perfumes originais...",
    "Ofertas imperdíveis...",
    "Lojas do Paraguay...",
    "Preços especiais..."
  ];
  
  const { currentText } = useTypewriter({ 
    phrases: isSearchFocused || searchInput ? [] : typewriterPhrases,
    speed: 80,
    pauseTime: 2500,
    backspaceSpeed: 40
  });

  // Criar resultados de busca
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !stores) return [];
    
    const query = searchQuery.toLowerCase();
    const results: Array<{ type: 'store' | 'product', data: any, store: any }> = [];
    
    stores.forEach(store => {
      // Buscar lojas por nome
      if (store.name.toLowerCase().includes(query)) {
        results.push({ type: 'store', data: store, store });
      }
      
      // Buscar produtos
      store.products
        .filter(product => 
          product.isActive && (
            product.name.toLowerCase().includes(query) ||
            product.description?.toLowerCase().includes(query) ||
            product.category?.toLowerCase().includes(query)
          )
        )
        .forEach(product => {
          results.push({ type: 'product', data: { ...product, store }, store });
        });
    });
    
    // Ordenar: lojas primeiro, depois produtos por preço
    return results.sort((a, b) => {
      if (a.type === 'store' && b.type === 'product') return -1;
      if (a.type === 'product' && b.type === 'store') return 1;
      if (a.type === 'product' && b.type === 'product') {
        return Number(a.data.price || 0) - Number(b.data.price || 0);
      }
      return 0;
    });
  }, [searchQuery, stores]);

  // Capturar evento de busca
  useEffect(() => {
    if (searchQuery && searchQuery.trim().length > 2 && sessionToken) {
      // Determinar categoria mais comum nos resultados
      const categories = searchResults
        .filter(r => r.type === 'product')
        .map(r => r.data.category)
        .filter(Boolean);
      const mostCommonCategory = categories.length > 0 
        ? categories.reduce((a, b, i, arr) => 
            arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
          ) 
        : undefined;

      trackEvent('search', {
        sessionToken,
        searchTerm: searchQuery,
        category: mostCommonCategory,
        resultsCount: searchResults.length
      });
    }
  }, [searchQuery, searchResults, sessionToken, trackEvent]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Não fazer nada no submit, a busca já funciona em tempo real
  };

  const handlePriceComparison = () => {
    setLocation('/price-comparison');
  };

  // Se houver busca ativa e showFullResults for true, mostrar em tela cheia
  if (showFullResults && searchQuery && searchResults.length > 0) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header fixo */}
        <header className="bg-gradient-to-r from-red-500 to-orange-500 shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-3 py-3">
            <div className="flex items-center gap-4">
              {/* Logo/Nome do App - Oculto no mobile */}
              <Link href="/cards" className="hidden sm:block">
                <div className="flex-shrink-0 cursor-pointer">
                  <h1 className="text-white font-bold text-lg md:text-xl whitespace-nowrap">
                    Click Ofertas.PY
                  </h1>
                </div>
              </Link>

              {/* Barra de Busca */}
              <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md mx-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    placeholder="Buscar produtos..."
                    className="pl-10 pr-10 py-2 w-full bg-white border-0 rounded-lg shadow-sm focus:ring-2 focus:ring-white/20 text-gray-700 placeholder-gray-400"
                    data-testid="global-search-input"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>

              {/* Botão Comparar Preços */}
              {showPriceComparison && (
                <Button
                  onClick={handlePriceComparison}
                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-3 py-2 rounded-lg shadow-sm flex-shrink-0 hidden sm:flex items-center gap-2"
                  data-testid="button-price-comparison"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden md:inline">Comparar Preços</span>
                </Button>
              )}

              {/* Mobile: Apenas ícone de comparação */}
              {showPriceComparison && (
                <Button
                  onClick={handlePriceComparison}
                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 p-2 rounded-lg shadow-sm sm:hidden"
                  data-testid="button-price-comparison-mobile"
                >
                  <BarChart3 className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Resultados em tela cheia */}
        <div className="max-w-4xl mx-auto p-4">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Resultados da busca: "{searchQuery}"
            </h2>
            <p className="text-gray-600">
              {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-4">
            {searchResults.map((result, index) => (
              <Card key={`${result.type}-${result.data.id || index}`} className="hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  {result.type === 'store' ? (
                    <div 
                      onClick={() => {
                        setLocation(`/flyer/${result.data.slug}`);
                        setSearchInput('');
                        setIsSearchFocused(false);
                      }}
                      className="cursor-pointer"
                    >
                      <StoreResultItem
                        store={result.data}
                        searchQuery={searchQuery}
                      />
                    </div>
                  ) : (
                    <SearchResultItem
                      product={result.data}
                      store={result.store}
                      searchTerm={searchQuery}
                      onClick={() => {
                        setLocation(`/flyer/${result.store.slug}`);
                        setSearchInput('');
                        setIsSearchFocused(false);
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {searchResults.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum resultado encontrado
              </h3>
              <p className="text-gray-600">
                Tente pesquisar por outros termos
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <header className="bg-gradient-to-r from-red-500 to-orange-500 shadow-md fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-3 py-3">
          <div className="flex items-center gap-4">
            {/* Logo/Nome do App - Oculto no mobile */}
            <Link href="/cards" className="hidden sm:block">
              <div className="flex-shrink-0 cursor-pointer">
                <h1 className="text-white font-bold text-lg md:text-xl whitespace-nowrap">
                  Click Ofertas.PY
                </h1>
              </div>
            </Link>

            {/* Barra de Busca */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md mx-4 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  placeholder={searchInput || isSearchFocused ? "Buscar produtos..." : currentText}
                  className="pl-10 pr-10 py-2 w-full bg-white border-0 rounded-lg shadow-sm focus:ring-2 focus:ring-white/20 text-gray-700 placeholder-gray-400"
                  data-testid="global-search-input"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Resultados compactos quando showFullResults = false */}
              {!showFullResults && (isSearchFocused || searchInput) && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border z-50 max-h-96 overflow-y-auto">
                  <div className="p-2">
                    <div className="text-sm text-gray-600 mb-2 px-2">
                      {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}
                    </div>
                    {searchResults.slice(0, 8).map((result, index) => (
                      <div key={`${result.type}-${result.data.id || index}`} className="mb-1">
                        {result.type === 'store' ? (
                          <div 
                            onClick={() => {
                              setLocation(`/flyer/${result.data.slug}`);
                              setSearchInput('');
                              setIsSearchFocused(false);
                            }}
                          >
                            <StoreResultItem
                              store={result.data}
                              searchQuery={searchQuery}
                            />
                          </div>
                        ) : (
                          <SearchResultItem
                            product={result.data}
                            store={result.store}
                            searchTerm={searchQuery}
                            onClick={() => {
                              setLocation(`/flyer/${result.store.slug}`);
                              setSearchInput('');
                              setIsSearchFocused(false);
                            }}
                          />
                        )}
                      </div>
                    ))}
                    {searchResults.length > 8 && (
                      <div className="text-center py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setLocation(`/cards?search=${encodeURIComponent(searchInput)}`);
                            setSearchInput('');
                            setIsSearchFocused(false);
                          }}
                        >
                          Ver todos os {searchResults.length} resultados
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Sem resultados */}
              {!showFullResults && (isSearchFocused || searchInput) && searchQuery && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border z-50">
                  <div className="p-4 text-center text-gray-500">
                    <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>Nenhum resultado encontrado para "{searchQuery}"</p>
                    <p className="text-sm mt-1">Tente pesquisar por outros termos</p>
                  </div>
                </div>
              )}
            </form>

            {/* Botão Comparar Preços */}
            {showPriceComparison && (
              <Button
                onClick={handlePriceComparison}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-3 py-2 rounded-lg shadow-sm flex-shrink-0 hidden sm:flex items-center gap-2"
                data-testid="button-price-comparison"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden md:inline">Comparar Preços</span>
              </Button>
            )}

            {/* Mobile: Apenas ícone de comparação */}
            {showPriceComparison && (
              <Button
                onClick={handlePriceComparison}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 p-2 rounded-lg shadow-sm sm:hidden"
                data-testid="button-price-comparison-mobile"
              >
                <BarChart3 className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}