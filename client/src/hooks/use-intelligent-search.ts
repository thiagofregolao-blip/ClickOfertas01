import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

interface SearchResult {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  category: string | null;
  brand: string | null;
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  storeSlug: string;
  storeThemeColor: string | null;
  storePremium: boolean;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  searchTerm: string;
}

interface ClickProSuggestion {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
  brand?: string;
  score?: number;
  storeInfo?: {
    id: string;
    name: string;
    logoUrl?: string;
    slug: string;
    themeColor?: string;
    isPremium?: boolean;
  };
}

interface ClickProResponse {
  ok: boolean;
  suggestions?: ClickProSuggestion[];
  error?: string;
}

/**
 * Hook para busca inteligente usando Click Pro IA com fallback para busca tradicional
 */
export function useIntelligentSearch(searchQuery: string, enabled: boolean = true) {
  const [useFallback, setUseFallback] = useState(false);
  
  console.log('🔍 Hook executando - searchQuery:', searchQuery, 'enabled:', enabled);
  
  // Reset fallback quando mudamos o termo de busca
  useEffect(() => {
    setUseFallback(false);
  }, [searchQuery]);

  // Busca inteligente via Click Pro IA  
  const clickProQuery = useQuery<ClickProResponse>({
    queryKey: [`/api/click/suggest`, { q: searchQuery }],
    queryFn: async () => {
      console.log('🚀 Fazendo request para Click Pro IA com query:', searchQuery);
      const response = await fetch(`/api/click/suggest?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      console.log('📈 Resposta da Click Pro IA:', data);
      return data;
    },
    enabled: enabled && !!searchQuery && searchQuery.trim().length >= 2 && !useFallback,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    retry: false, // Não tentar novamente, ir direto para fallback
    throwOnError: false,
  });

  // Busca tradicional como fallback
  const traditionalQuery = useQuery<SearchResponse>({
    queryKey: [`/api/search?q=${encodeURIComponent(searchQuery)}`],
    enabled: enabled && !!searchQuery && searchQuery.trim().length >= 2 && useFallback,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });

  // Se Click Pro IA falhar, ativar fallback
  useEffect(() => {
    console.log('🔍 Debug Click Pro IA:', {
      isError: clickProQuery.isError,
      data: clickProQuery.data,
      isLoading: clickProQuery.isLoading,
      searchQuery,
      enabled: enabled && !!searchQuery && searchQuery.trim().length >= 2 && !useFallback
    });
    
    if (clickProQuery.isError || (clickProQuery.data && !clickProQuery.data.ok)) {
      console.log('🔄 Click Pro IA falhou, usando busca tradicional como fallback');
      setUseFallback(true);
    }
  }, [clickProQuery.isError, clickProQuery.data, clickProQuery.isLoading, searchQuery, enabled, useFallback]);

  // Adaptar resposta do Click Pro IA para o formato esperado
  const adaptClickProResponse = (data: ClickProResponse): SearchResponse => {
    if (!data.ok || !data.suggestions) {
      return { results: [], total: 0, searchTerm: searchQuery };
    }

    const results: SearchResult[] = data.suggestions.map(suggestion => ({
      id: suggestion.id,
      name: suggestion.name,
      price: suggestion.price,
      imageUrl: suggestion.imageUrl || null,
      category: suggestion.category || null,
      brand: suggestion.brand || null,
      storeId: suggestion.storeInfo?.id || '',
      storeName: suggestion.storeInfo?.name || 'Loja',
      storeLogoUrl: suggestion.storeInfo?.logoUrl || null,
      storeSlug: suggestion.storeInfo?.slug || '',
      storeThemeColor: suggestion.storeInfo?.themeColor || null,
      storePremium: suggestion.storeInfo?.isPremium || false,
    }));

    return {
      results,
      total: results.length,
      searchTerm: searchQuery
    };
  };

  // Decidir qual resultado usar
  if (useFallback) {
    return {
      data: traditionalQuery.data,
      isLoading: traditionalQuery.isLoading,
      isError: traditionalQuery.isError,
      error: traditionalQuery.error,
      searchMode: 'traditional' as const
    };
  }

  return {
    data: clickProQuery.data ? adaptClickProResponse(clickProQuery.data) : undefined,
    isLoading: clickProQuery.isLoading,
    isError: clickProQuery.isError && useFallback ? traditionalQuery.isError : false,
    error: clickProQuery.error,
    searchMode: 'intelligent' as const
  };
}