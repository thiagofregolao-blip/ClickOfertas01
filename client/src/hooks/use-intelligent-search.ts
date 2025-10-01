
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
  products?: any[]; // Formato atual da API
  topStores?: any[];
  category?: string;
  error?: string;
}

/**
 * Hook para busca inteligente usando Click Pro IA com fallback para busca tradicional
 */
export function useIntelligentSearch(searchQuery: string, enabled: boolean = true) {
  const [useFallback, setUseFallback] = useState(false);
  
  
  // Reset fallback quando mudamos o termo de busca
  useEffect(() => {
    setUseFallback(false);
  }, [searchQuery]);

  // Busca inteligente via Click Pro IA  
  const clickProQuery = useQuery<ClickProResponse>({
    queryKey: [`/api/click/suggest`, { q: searchQuery }],
    queryFn: async () => {
      const response = await fetch(`/api/click/suggest?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
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

  // 🎯 POINT 4: Corrigir condição de fallback para incluir products.length === 0
  useEffect(() => {
    if (
      clickProQuery.isError ||
      (clickProQuery.data && (!clickProQuery.data.ok || clickProQuery.data.products?.length === 0))
    ) {
      console.log('🔄 [Frontend] POINT 4: Ativando fallback - produtos vazios ou erro detectado');
      setUseFallback(true);
    }
  }, [clickProQuery.isError, clickProQuery.data, clickProQuery.isLoading, searchQuery, enabled, useFallback]);

  // Adaptar resposta do Click Pro IA para o formato esperado
  const adaptClickProResponse = (data: ClickProResponse): SearchResponse => {
    if (!data.ok) {
      return { results: [], total: 0, searchTerm: searchQuery };
    }

    // Verificar se temos produtos na resposta atual
    if (data.products && data.products.length > 0) {
      
      const results: SearchResult[] = data.products.map((product: any) => ({
        id: product.id || '',
        name: product.name || product.title || '',
        price: product.price || 0,
        imageUrl: product.imageUrl || product.image || null,
        category: product.category || data.category || null,
        brand: product.brand || null,
        storeId: product.store?.id || product.storeId || '',
        storeName: product.store?.name || product.storeName || 'Loja',
        storeLogoUrl: product.store?.logoUrl || product.storeLogoUrl || null,
        storeSlug: product.store?.slug || product.storeSlug || '',
        storeThemeColor: product.store?.themeColor || product.storeThemeColor || null,
        storePremium: product.store?.isPremium || product.storePremium || false,
      }));

      return {
        results,
        total: results.length,
        searchTerm: searchQuery
      };
    }

    // Formato antigo (suggestions) para compatibilidade
    if (data.suggestions && data.suggestions.length > 0) {
      
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
    }

    return { results: [], total: 0, searchTerm: searchQuery };
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
