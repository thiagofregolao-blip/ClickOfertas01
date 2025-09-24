import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './use-debounce';

interface SuggestionsResponse {
  suggestions: string[];
}

interface UseSuggestionsOptions {
  enabled?: boolean;
  minLength?: number;
  debounceDelay?: number;
}

export function useSuggestions(
  query: string, 
  options: UseSuggestionsOptions = {}
) {
  const { 
    enabled = true, 
    minLength = 2, 
    debounceDelay = 300 
  } = options;

  // Debounce the query to avoid too many requests
  const debouncedQuery = useDebounce(query, debounceDelay);

  // Use TanStack Query to fetch suggestions with default fetcher
  const {
    data,
    isLoading,
    error,
    isFetching
  } = useQuery<SuggestionsResponse>({
    queryKey: ['/api/search/suggestions', debouncedQuery],
    enabled: enabled && !!debouncedQuery && debouncedQuery.trim().length >= minLength,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: false, // Don't retry on error
  });

  return {
    suggestions: data?.suggestions || [],
    isLoading: isLoading || isFetching,
    error,
    hasResults: (data?.suggestions?.length || 0) > 0,
  };
}