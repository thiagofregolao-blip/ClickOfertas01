
import React, { useState, useRef, useEffect } from 'react';
import { Search, X, TrendingUp, Clock } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  showHistory?: boolean;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  suggestions = [],
  onSuggestionClick,
  placeholder = "Buscar produtos...",
  isLoading = false,
  showHistory = true,
  className = ""
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Carregar histórico do localStorage
  useEffect(() => {
    if (showHistory) {
      const history = localStorage.getItem('vendor_search_history');
      if (history) {
        try {
          setSearchHistory(JSON.parse(history));
        } catch (error) {
          console.warn('Erro ao carregar histórico de busca:', error);
        }
      }
    }
  }, [showHistory]);

  // Salvar no histórico
  const saveToHistory = (query: string) => {
    if (!showHistory || !query.trim()) return;
    
    const newHistory = [query, ...searchHistory.filter(item => item !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('vendor_search_history', JSON.stringify(newHistory));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      saveToHistory(value.trim());
      onSubmit(value.trim());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    saveToHistory(suggestion);
    onSuggestionClick?.(suggestion);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (value.length >= 2 || searchHistory.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay para permitir clique nas sugestões
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    if (newValue.length >= 2 || (newValue.length === 0 && searchHistory.length > 0)) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const clearInput = () => {
    onChange('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('vendor_search_history');
  };

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displaySuggestions = showSuggestions && (suggestions.length > 0 || searchHistory.length > 0);
  const filteredHistory = searchHistory.filter(item => 
    item.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className={`relative w-full ${className}`}>
      {/* Input Principal */}
      <form onSubmit={handleSubmit} className="relative">
        <div className={`relative flex items-center bg-white dark:bg-gray-800 border-2 rounded-xl transition-all duration-200 ${
          isFocused 
            ? 'border-primary shadow-lg shadow-primary/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}>
          
          {/* Ícone de busca */}
          <div className="absolute left-4 flex items-center">
            <Search className={`h-5 w-5 transition-colors ${
              isFocused ? 'text-primary' : 'text-gray-400'
            }`} />
          </div>
          
          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="w-full pl-12 pr-20 py-3 bg-transparent border-0 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            disabled={isLoading}
          />
          
          {/* Botões direita */}
          <div className="absolute right-2 flex items-center space-x-1">
            {value && (
              <button
                type="button"
                onClick={clearInput}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
            <button
              type="submit"
              disabled={!value.trim() || isLoading}
              className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Buscar</span>
            </button>
          </div>
        </div>
      </form>

      {/* Dropdown de Sugestões */}
      {displaySuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto"
        >
          {/* Histórico de Busca */}
          {showHistory && filteredHistory.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Buscas recentes
                  </span>
                </div>
                <button
                  onClick={clearHistory}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  Limpar
                </button>
              </div>
              
              {filteredHistory.slice(0, 5).map((item, index) => (
                <button
                  key={`history-${index}`}
                  onClick={() => handleSuggestionClick(item)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center space-x-3"
                >
                  <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 truncate">{item}</span>
                </button>
              ))}
            </div>
          )}

          {/* Separador */}
          {showHistory && filteredHistory.length > 0 && suggestions.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700" />
          )}

          {/* Sugestões */}
          {suggestions.length > 0 && (
            <div className="p-2">
              <div className="flex items-center space-x-2 px-3 py-2">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Sugestões populares
                </span>
              </div>
              
              {suggestions.map((suggestion, index) => (
                <button
                  key={`suggestion-${index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center space-x-3"
                >
                  <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 truncate">{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          {/* Estado vazio */}
          {suggestions.length === 0 && filteredHistory.length === 0 && (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma sugestão disponível</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
