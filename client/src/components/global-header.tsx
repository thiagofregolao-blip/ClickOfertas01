import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BarChart3 } from "lucide-react";
import { useTypewriter } from "@/hooks/use-typewriter";

interface GlobalHeaderProps {
  onSearch?: (query: string) => void;
  searchValue?: string;
  showPriceComparison?: boolean;
}

export default function GlobalHeader({ 
  onSearch, 
  searchValue = "", 
  showPriceComparison = true 
}: GlobalHeaderProps) {
  const [searchInput, setSearchInput] = useState(searchValue);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [, setLocation] = useLocation();
  
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      if (onSearch) {
        onSearch(searchInput);
      } else {
        // Redirecionar para a página cards com o termo de busca
        setLocation(`/cards?search=${encodeURIComponent(searchInput.trim())}`);
      }
    }
  };

  const handlePriceComparison = () => {
    setLocation('/price-comparison');
  };

  return (
    <header className="bg-gradient-to-r from-red-500 to-orange-500 shadow-md">
      <div className="max-w-7xl mx-auto px-3 py-3">
        <div className="flex items-center gap-4">
          {/* Logo/Nome do App */}
          <Link href="/cards">
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
                onBlur={() => setIsSearchFocused(false)}
                placeholder={searchInput || isSearchFocused ? "Buscar produtos..." : currentText}
                className="pl-10 pr-4 py-2 w-full bg-white border-0 rounded-lg shadow-sm focus:ring-2 focus:ring-white/20 text-gray-700 placeholder-gray-400"
                data-testid="global-search-input"
              />
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
  );
}