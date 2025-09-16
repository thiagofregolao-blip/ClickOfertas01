import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, MapPin, Star, Grid, List, User, Settings, LogOut, ShoppingCart, X, Camera, Heart, Share, BarChart3, Plus } from "lucide-react";
import ProductCard from "@/components/product-card";
import { ProductDetailModal } from "@/components/product-detail-modal";
import LoginPage from "@/components/login-page";
import PWAInstallButton from "@/components/pwa-install-button";
import { useAppVersion, type AppVersionType } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/use-debounce";
import { useTypewriter } from "@/hooks/use-typewriter";
import { useAnalytics } from "@/lib/analytics";
import { LazyImage } from "@/components/lazy-image";
import { SearchResultItem } from "@/components/search-result-item";
import { StoreResultItem } from "@/components/store-result-item";
import { BannerSection } from "@/components/BannerSection";
import { BannerCarousel } from "@/components/BannerCarousel";
import ThreeDailyScratchCards from "@/components/ThreeDailyScratchCards";
import { RectangularScratchCard } from "@/components/RectangularScratchCard";
import GlobalHeader from "@/components/global-header";
import type { StoreWithProducts, Product, InstagramStoryWithDetails } from "@shared/schema";
import logoUrl from '../assets/logo.jpg';

// Função para limitar nome a duas palavras no mobile
function limitStoreName(name: string, isMobile: boolean): string {
  if (!isMobile) return name;
  const words = name.split(' ');
  return words.slice(0, 2).join(' ');
}

export default function StoresGallery() {
  // Verificar se há um termo de busca na URL
  const urlParams = new URLSearchParams(window.location.search);
  const urlSearch = urlParams.get('search') || '';
  
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchQuery = useDebounce(searchInput, 500); // Debounce de 500ms
  
  // Remover parâmetro de busca da URL após aplicar
  useEffect(() => {
    if (urlSearch) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [urlSearch]);

  
  // Frases para efeito de digitação automática
  const typewriterPhrases = [
    "Encontre as melhores lojas...",
    "Produtos em promoção...", 
    "Eletrônicos importados...",
    "Perfumes originais...",
    "Ofertas imperdíveis...",
    "Lojas do Paraguay...",
    "Produtos de qualidade...",
    "Preços especiais..."
  ];
  
  const { currentText } = useTypewriter({ 
    phrases: isSearchFocused || searchInput ? [] : typewriterPhrases,
    speed: 80,
    pauseTime: 2500,
    backspaceSpeed: 40
  });
  const { isMobile, isDesktop, version, versionName } = useAppVersion();
  const [viewMode, setViewMode] = useState<AppVersionType>('mobile');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreWithProducts | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const analytics = useAnalytics();
  
  // Instagram Stories state
  const [viewingStory, setViewingStory] = useState<InstagramStoryWithDetails | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [likedStories, setLikedStories] = useState<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef(0);
  
  const STORY_DURATION = 5000; // 5 segundos

  // Timer para progresso do story
  useEffect(() => {
    if (!viewingStory || isPaused) return;

    // Reset progress
    setProgress(0);
    progressRef.current = 0;

    // Clear previous timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Start new timer
    timerRef.current = setInterval(() => {
      progressRef.current += (100 / (STORY_DURATION / 50));
      setProgress(progressRef.current);
      
      if (progressRef.current >= 100) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        nextStory();
      }
    }, 50);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentStoryIndex, viewingStory, isPaused]);

  const nextStory = () => {
    if (currentStoryIndex < currentStoreStories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else {
      // Acabaram os stories da loja atual, vamos para a próxima loja
      const storeIds = Object.keys(instagramStoriesGrouped);
      const currentStoreId = viewingStory?.storeId;
      const currentStoreIndex = storeIds.findIndex(id => id === currentStoreId);
      
      if (currentStoreIndex !== -1 && currentStoreIndex < storeIds.length - 1) {
        // Há próxima loja, ir para o primeiro story dela
        const nextStoreId = storeIds[currentStoreIndex + 1];
        const nextStoreFirstStory = instagramStoriesGrouped[nextStoreId]?.stories[0];
        
        if (nextStoreFirstStory) {
          setViewingStory(nextStoreFirstStory);
          setCurrentStoryIndex(0);
          setProgress(0);
        } else {
          closeStoryModal();
        }
      } else {
        // Não há mais lojas, fecha o modal
        closeStoryModal();
      }
    }
  };

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else {
      // Estamos no primeiro story da loja atual, vamos para a loja anterior
      const storeIds = Object.keys(instagramStoriesGrouped);
      const currentStoreId = viewingStory?.storeId;
      const currentStoreIndex = storeIds.findIndex(id => id === currentStoreId);
      
      if (currentStoreIndex > 0) {
        // Há loja anterior, ir para o último story dela
        const prevStoreId = storeIds[currentStoreIndex - 1];
        const prevStoreStories = instagramStoriesGrouped[prevStoreId]?.stories;
        
        if (prevStoreStories && prevStoreStories.length > 0) {
          const lastStoryOfPrevStore = prevStoreStories[prevStoreStories.length - 1];
          setViewingStory(lastStoryOfPrevStore);
          setCurrentStoryIndex(prevStoreStories.length - 1);
          setProgress(0);
        }
      }
      // Se não há loja anterior, fica no story atual (não faz nada)
    }
  };

  const closeStoryModal = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setViewingStory(null);
    setCurrentStoryIndex(0);
    setProgress(0);
    setIsPaused(false);
  };

  const openStoryModal = (story: InstagramStoryWithDetails, index: number = 0) => {
    setViewingStory(story);
    setCurrentStoryIndex(index);
    setProgress(0);
    setIsPaused(false);
  };


  // Sincronizar viewMode com a detecção automática
  useEffect(() => {
    setViewMode(version);
  }, [version]);

  // Performance: Remover logs em produção
  
  // Event listener para produtos similares
  useEffect(() => {
    const handleOpenProductModal = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { product, store } = customEvent.detail;
      setSelectedProduct(product);
      setSelectedStore(store);
    };

    const handleUpdateProductModal = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { product, store } = customEvent.detail;
      setSelectedProduct(product);
      setSelectedStore(store);
    };
    
    window.addEventListener('openProductModal', handleOpenProductModal as EventListener);
    window.addEventListener('updateProductModal', handleUpdateProductModal as EventListener);
    return () => {
      window.removeEventListener('openProductModal', handleOpenProductModal as EventListener);
      window.removeEventListener('updateProductModal', handleUpdateProductModal as EventListener);
    };
  }, []);
  
  const { data: stores, isLoading } = useQuery<StoreWithProducts[]>({
    queryKey: ['/api/public/stores'],
    staleTime: 0, // Sempre buscar dados frescos para refletir mudanças de destaque
    gcTime: 5 * 60 * 1000, // 5 minutos (cache mais curto)
    refetchOnWindowFocus: true, // Refetch quando usuário volta à janela
    refetchOnMount: true, // Sempre buscar dados atualizados
    refetchOnReconnect: true, // Refetch ao reconectar
  });

  // Instagram Stories data
  const { data: instagramStories = [], isLoading: storiesLoading } = useQuery<InstagramStoryWithDetails[]>({
    queryKey: ['/api/instagram-stories'],
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  // Scratch Cards data
  const { data: scratchCardsData } = useQuery<{ cards: any[] }>({
    queryKey: ['/api/daily-scratch/cards'],
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // 30 segundos
  });

  const scratchCards = scratchCardsData?.cards || [];
  const [funnyMessages, setFunnyMessages] = useState<{ [cardId: string]: any }>({});
  const [processingCardId, setProcessingCardId] = useState<string | null>(null);

  // Função para buscar mensagem engraçada aleatória
  const fetchFunnyMessage = async () => {
    const response = await fetch('/api/funny-messages/random');
    if (!response.ok) {
      throw new Error('Failed to fetch funny message');
    }
    return await response.json();
  };

  // Mutation para raspar uma carta
  const scratchMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const res = await apiRequest('POST', `/api/daily-scratch/cards/${cardId}/scratch`);
      const data = await res.json();
      return data;
    },
    onMutate: (cardId) => {
      setProcessingCardId(cardId);
    },
    onSuccess: async (data: any, cardId: string) => {
      setProcessingCardId(null);
      
      // Se perdeu, buscar uma mensagem engraçada
      if (!data.won) {
        try {
          const funnyMessage = await fetchFunnyMessage();
          setFunnyMessages(prev => ({
            ...prev,
            [cardId]: funnyMessage
          }));
        } catch (error) {
          console.error('Failed to fetch funny message:', error);
        }
      }
    },
    onError: () => {
      setProcessingCardId(null);
    },
  });

  const handleScratchCard = (cardId: string) => {
    scratchMutation.mutate(cardId);
  };
  
  // Banners data para usar o BannerCarousel separadamente
  const { data: banners = [] } = useQuery<any[]>({
    queryKey: ['/api/banners/active'],
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Agrupar stories por loja
  const instagramStoriesGrouped = useMemo(() => {
    const grouped: Record<string, { store: any; stories: InstagramStoryWithDetails[] }> = {};
    
    instagramStories.forEach((story) => {
      if (!grouped[story.storeId]) {
        grouped[story.storeId] = {
          store: story.store,
          stories: []
        };
      }
      grouped[story.storeId].stories.push(story);
    });
    
    return grouped;
  }, [instagramStories]);

  // Get all stories for current store
  const currentStoreStories = useMemo(() => {
    if (!viewingStory || !instagramStoriesGrouped) return [];
    return instagramStoriesGrouped[viewingStory.storeId]?.stories || [];
  }, [viewingStory, instagramStoriesGrouped]);

  // Função otimizada para verificar se a loja postou produtos hoje
  const hasProductsToday = useCallback((store: StoreWithProducts): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return store.products.some(product => {
      if (!product.updatedAt) return false;
      const productDate = new Date(product.updatedAt);
      productDate.setHours(0, 0, 0, 0);
      return productDate.getTime() === today.getTime() && product.isActive;
    });
  }, []);

  // Filtrar e ordenar lojas com memoização
  const filteredStores = useMemo(() => {
    if (!stores) return [];
    
    return stores.filter(store => {
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.toLowerCase();
      
      // Buscar no nome da loja
      if (store.name.toLowerCase().includes(query)) return true;
      
      // Buscar nos produtos
      return store.products.some(product => 
        product.isActive && (
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query)
        )
      );
    }).sort((a, b) => {
      // Priorizar lojas que postaram produtos hoje
      const aHasToday = hasProductsToday(a);
      const bHasToday = hasProductsToday(b);
      
      if (aHasToday && !bHasToday) return -1;
      if (!aHasToday && bHasToday) return 1;
      
      // Se ambas têm ou não têm produtos hoje, ordenar por mais recente
      const aLatest = Math.max(...a.products.map(p => p.updatedAt ? new Date(p.updatedAt).getTime() : 0));
      const bLatest = Math.max(...b.products.map(p => p.updatedAt ? new Date(p.updatedAt).getTime() : 0));
      
      return bLatest - aLatest;
    });
  }, [stores, searchQuery, hasProductsToday]);

  // Criar resultados de busca combinados com memoização
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

  // Capturar evento de busca no stores gallery (após declaração das variáveis)
  useEffect(() => {
    if (searchQuery && searchQuery.trim().length > 2) {
      // Determinar categoria mais comum nos resultados
      const searchResultsData = searchResults
        .filter(r => r.type === 'product')
        .map(r => r.data.category)
        .filter(Boolean);
      const mostCommonCategory = searchResultsData.length > 0 
        ? searchResultsData.reduce((a, b, i, arr) => 
            arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
          ) 
        : undefined;

      analytics.trackSearch({
        search: searchQuery.trim(),
        category: mostCommonCategory || 'Geral',
        resultCount: searchResults.length
      });
    }
  }, [searchQuery, searchResults, analytics]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
        
        {/* Loading Posts */}
        <div className="max-w-2xl mx-auto">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="bg-white mb-4 border-b">
              <div className="p-4">
                <Skeleton className="h-12 w-12 rounded-full mb-3" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-48 mb-4" />
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stores || stores.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Nenhuma loja encontrada</h2>
          <p className="text-gray-600">Ainda não há panfletos disponíveis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      
      {/* Mobile: Header com logo, busca e banner */}
      {isMobile && (
        <div className="bg-gradient-to-r from-red-500 to-orange-500">
          <div className="px-4 py-3">
            {/* Logo e Busca */}
            <div className="flex items-center gap-3 mb-3">
              {/* Logo - removido para mobile */}
              
              {/* Barra de Busca Mobile */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder={isSearchFocused || searchInput ? "Buscar produtos..." : currentText}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className="pl-10 pr-10 py-2 w-full bg-white border-0 rounded-lg shadow-sm text-gray-900 placeholder-gray-400"
                    data-testid="mobile-search-input"
                  />
                  {searchInput && (
                    <button
                      onClick={() => setSearchInput('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Limpar busca"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Botão Comparar Preços Mobile */}
              <Link href="/price-comparison">
                <Button
                  size="sm"
                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium px-2 py-2 rounded-lg shadow-sm"
                  data-testid="button-price-comparison-mobile"
                >
                  <BarChart3 className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile: Banner rotativo primeiro */}
      {isMobile && !searchQuery.trim() && (
        <div className="w-full mb-4">
          <div className="-mx-4 w-screen">
            <BannerCarousel banners={banners.filter(banner => banner.bannerType === 'rotating' && banner.isActive)} />
          </div>
        </div>
      )}
      
      {/* Mobile: Stories no meio */}
      {!searchQuery.trim() && isMobile && (
        <div className="bg-white border-b">
          <div className="mx-auto px-4 max-w-full">
            
            {/* Stories em scroll horizontal para mobile */}
            <div className="flex items-start gap-2 overflow-x-auto scrollbar-hide pb-4">
              {/* Botão Criar Story - Mobile */}
              <div 
                className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
                onClick={() => setLocation('/create-story')}
                data-testid="button-create-story-mobile"
              >
                {/* Círculo de criação - menor */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 p-0.5 hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                      <Plus className="w-6 h-6 text-gray-600" />
                    </div>
                  </div>
                </div>
                
                {/* Label - mobile */}
                <div className="text-xs text-gray-600 w-16 text-center leading-tight">
                  <span className="block truncate">Criar</span>
                </div>
              </div>

              {/* Raspadinhas retangulares - apenas para usuários autenticados */}
              {isAuthenticated && scratchCards.slice(0, 3).map((card: any) => (
                <RectangularScratchCard
                  key={card.id}
                  card={card}
                  onScratch={handleScratchCard}
                  processingCardId={processingCardId || undefined}
                  funnyMessage={funnyMessages[card.id]}
                />
              ))}

              {Object.values(instagramStoriesGrouped).map(({ store: storyStore, stories }) => (
                <div 
                  key={storyStore.id} 
                  className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
                  onClick={() => openStoryModal(stories[0], 0)}
                  data-testid={`story-circle-${storyStore.slug}`}
                >
                  {/* Círculo da loja - menor */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 p-0.5 hover:scale-105 transition-transform">
                      <div className="w-full h-full rounded-full overflow-hidden">
                        <Avatar className="w-full h-full">
                          <AvatarImage 
                            src={storyStore.logoUrl} 
                            alt={storyStore.name}
                            className="w-full h-full object-cover"
                          />
                          <AvatarFallback className="text-xs font-bold bg-white">
                            {storyStore.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    
                    {/* Contador de stories - menor */}
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-1 -right-1 bg-green-500 text-white border-2 border-white text-xs px-1"
                    >
                      {stories.length}
                    </Badge>
                  </div>
                  
                  {/* Nome da loja - mobile */}
                  <div className="text-xs text-gray-600 w-16 text-center leading-tight">
                    <span className="block truncate">{storyStore.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      
      {/* Desktop: Header completo */}
      {!isMobile && (
        <div className="sticky top-0 z-50" style={{background: 'linear-gradient(to bottom right, #F04940, #FA7D22)'}}>
          {/* Desktop: Layout original */}
          <div className={`mx-auto py-4 px-2 max-w-6xl`}>
            {/* Menu de Navegação - PRIMEIRO */}
            <div className="flex items-center justify-between gap-3 mb-6">
              
              {/* Botão temporário de acesso Super Admin */}
              <button
                onClick={() => {
                  window.location.href = '/super-admin-login';
                }}
                className="fixed bottom-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50"
              >
                🔧 Super Admin
              </button>
              
              {isAuthenticated ? (
                // Desktop - menu na mesma linha
                <div className="flex items-center gap-4">
                  {/* Saudação */}
                  <div className="text-white font-medium flex items-center gap-2">
                    <User className="w-5 h-5" />
                    <span className="text-sm">
                      Olá, {user?.firstName || user?.fullName || user?.email?.split('@')[0] || 'Usuário'}
                    </span>
                  </div>
                  
                  {/* Botões do menu */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setLocation('/settings')}
                      className="text-white hover:text-gray-200 font-medium flex items-center gap-1 text-sm"
                      data-testid="button-user-config"
                    >
                      <Settings className="w-4 h-4" />
                      Configurações
                    </button>
                    
                    <button
                      onClick={() => setLocation('/shopping-list')}
                      className="text-white hover:text-gray-200 font-medium flex items-center gap-1 text-sm"
                      data-testid="button-shopping-list"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Lista de Compras
                    </button>
                    
                    <button
                      onClick={() => setLocation('/my-coupons')}
                      className="text-white hover:text-gray-200 font-medium flex items-center gap-1 text-sm"
                      data-testid="button-my-coupons"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="18" rx="2" ry="2"/>
                        <line x1="8" y1="2" x2="8" y2="22"/>
                        <line x1="16" y1="2" x2="16" y2="22"/>
                      </svg>
                      Meus Cupons
                    </button>
                    
                    <button
                      onClick={() => window.location.href = '/api/auth/logout'}
                      className="text-red-300 hover:text-red-100 font-medium flex items-center gap-1 text-sm"
                      data-testid="button-user-logout"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </div>
                </div>
              ) : (
                // Usuário não logado - mostrar botão entrar
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="text-white hover:text-gray-200 font-medium flex items-center gap-1"
                  data-testid="button-user-login"
                >
                  <User className="w-4 h-4" />
                  Entrar
                </button>
              )}

            </div>

            {/* Logo e Barra de Busca - SEGUNDO */}
            <div className="flex items-center gap-4">
              {/* Título */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-white font-bold text-xl tracking-normal" style={{textShadow: '0 1px 2px rgba(0,0,0,0.1)', fontWeight: '700'}}>Click</span>
                <span className="font-bold text-xl tracking-normal">
                  <span className="text-white">Ofertas.</span>
                  <span style={{color: '#FFE600'}}>PY</span>
                </span>
              </div>
              
              {/* Barra de Busca */}
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder={isSearchFocused || searchInput ? "Buscar produtos ou lojas..." : currentText}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className="pl-10 pr-10 py-2 w-full bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-blue-200"
                  />
                  {searchInput && (
                    <button
                      onClick={() => setSearchInput('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Limpar busca"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sino de notificações e Botão de Comparação de Preços - Desktop */}
              <div className="flex items-center gap-3">
                {/* Sino de notificações desktop */}
                <button
                  className="bg-white/90 backdrop-blur-sm text-gray-600 hover:text-orange-500 p-2 rounded-lg shadow-sm transition-colors relative"
                  title="Notificações"
                  data-testid="button-notifications-desktop"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                  </svg>
                  {/* Badge de notificação */}
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    3
                  </span>
                </button>
                
                <Link href="/price-comparison">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-2 text-black font-semibold hover:opacity-90 backdrop-blur-sm"
                    style={{ backgroundColor: '#FFE600', borderColor: '#FFE600' }}
                    data-testid="button-price-comparison"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Comparar Preços
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO DE BANNERS - Desktop apenas */}
      {!searchQuery.trim() && !isMobile && (
        <div className="bg-white border-b -mt-4">
          {/* Banner ocupando toda a largura da tela */}
          <BannerSection isSearchActive={false} />
        </div>
      )}

      {/* SEÇÃO DE STORIES - Desktop apenas (abaixo do banner) */}
      {!searchQuery.trim() && !isMobile && (
        <div className="bg-white border-b">
          <div className="mx-auto px-4 max-w-6xl py-4">
            {/* Stories das Lojas - layout horizontal com scroll */}
            <div className="flex items-start gap-4 overflow-x-auto scrollbar-hide">
              {/* Botão Criar Story */}
              <div 
                className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
                onClick={() => setLocation('/create-story')}
                data-testid="button-create-story"
              >
                {/* Círculo de criação */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 p-0.5 hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                      <Plus className="w-8 h-8 text-gray-600" />
                    </div>
                  </div>
                </div>
                
                {/* Label */}
                <div className="text-xs text-gray-600 w-20 text-center leading-tight">
                  <span className="block truncate">Criar Story</span>
                </div>
              </div>

              {/* Raspadinhas retangulares - apenas para usuários autenticados */}
              {isAuthenticated && scratchCards.slice(0, 3).map((card: any) => (
                <RectangularScratchCard
                  key={card.id}
                  card={card}
                  onScratch={handleScratchCard}
                  processingCardId={processingCardId || undefined}
                  funnyMessage={funnyMessages[card.id]}
                />
              ))}

              {Object.values(instagramStoriesGrouped).map(({ store: storyStore, stories }) => (
                <div 
                  key={storyStore.id} 
                  className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
                  onClick={() => openStoryModal(stories[0], 0)}
                  data-testid={`story-circle-${storyStore.slug}`}
                >
                  {/* Círculo da loja */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 p-0.5 hover:scale-105 transition-transform">
                      <div className="w-full h-full rounded-full overflow-hidden">
                        <Avatar className="w-full h-full">
                          <AvatarImage 
                            src={storyStore.logoUrl} 
                            alt={storyStore.name}
                            className="w-full h-full object-cover"
                          />
                          <AvatarFallback className="text-xs font-bold bg-white">
                            {storyStore.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    
                    {/* Contador de stories */}
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-0.5 -right-0.5 bg-green-500 text-white border-2 border-white text-xs px-1 min-w-[18px] h-4 flex items-center justify-center"
                    >
                      {stories.length}
                    </Badge>
                  </div>
                  
                  {/* Nome da loja */}
                  <div className="text-xs text-gray-600 w-20 text-center leading-tight">
                    <span className="block truncate">{limitStoreName(storyStore.name, false)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* Feed Unificado */}
      <UnifiedFeedView 
        stores={searchQuery.trim() ? stores || [] : filteredStores} 
        searchQuery={searchQuery} 
        searchResults={searchResults} 
        isMobile={isMobile}
        onProductSelect={(product, store) => {
          setSelectedProduct(product);
          setSelectedStore(store);
        }}
      />
      
      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        store={selectedStore}
        isOpen={!!selectedProduct}
        onClose={() => {
          setSelectedProduct(null);
          setSelectedStore(null);
        }}
      />

      {/* Instagram Story Viewer Modal */}
      <Dialog open={!!viewingStory} onOpenChange={(open) => !open && closeStoryModal()}>
        <DialogContent className="p-0 max-w-sm mx-auto bg-black border-0 rounded-3xl overflow-hidden [&>button]:absolute [&>button]:right-4 [&>button]:top-4 [&>button]:z-50 [&>button]:text-white [&>button]:bg-black/30 [&>button]:backdrop-blur-sm [&>button]:rounded-full [&>button]:w-8 [&>button]:h-8 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:hover:bg-black/50 [&>button]:transition-all [&>button]:shadow-lg">
          {viewingStory && currentStoreStories[currentStoryIndex] && (
            <div className="relative aspect-[9/16] bg-black">
              {/* Barra de Progresso */}
              <div className="absolute top-2 left-2 right-2 z-30 flex gap-1">
                {currentStoreStories.map((_, index) => (
                  <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                      style={{
                        width: index < currentStoryIndex ? '100%' : 
                               index === currentStoryIndex ? `${progress}%` : '0%'
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Mídia do Story */}
              {currentStoreStories[currentStoryIndex].mediaType === 'image' ? (
                <img
                  src={currentStoreStories[currentStoryIndex].mediaUrl}
                  alt={currentStoreStories[currentStoryIndex].productName || 'Story'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><rect width="400" height="600" fill="%23666"/><text x="200" y="300" text-anchor="middle" fill="white" font-size="30">📷 Story</text></svg>';
                  }}
                />
              ) : (
                <video
                  src={currentStoreStories[currentStoryIndex].mediaUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                />
              )}
              
              {/* Overlay superior com info da loja */}
              <div className="absolute top-0 left-0 right-0 z-20">
                <div className="bg-black/15 backdrop-blur-sm pt-8 pb-3 px-3 flex items-center gap-3">
                  <Avatar className="w-8 h-8 border-2 border-white">
                    <AvatarImage src={currentStoreStories[currentStoryIndex].store?.logoUrl || ''} alt={currentStoreStories[currentStoryIndex].store?.name || ''} />
                    <AvatarFallback className="text-xs">
                      {currentStoreStories[currentStoryIndex].store?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{currentStoreStories[currentStoryIndex].store?.name}</p>
                    <p className="text-white/90 font-light text-xs">há {Math.round((Date.now() - new Date(currentStoreStories[currentStoryIndex].createdAt || Date.now()).getTime()) / 3600000)}h</p>
                  </div>
                </div>
              </div>
              
              {/* Info do produto no rodapé */}
              {currentStoreStories[currentStoryIndex].isProductPromo && (
                <div className="absolute bottom-0 left-0 right-0 z-20">
                  <div className="bg-black/60 backdrop-blur-sm p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-sm mb-1">
                        {currentStoreStories[currentStoryIndex].productName}
                      </h3>
                      {currentStoreStories[currentStoryIndex].productPrice && (
                        <div className="flex items-center gap-2">
                          {currentStoreStories[currentStoryIndex].productDiscountPrice && (
                            <span className="text-gray-300 line-through text-xs">
                              ${currentStoreStories[currentStoryIndex].productPrice?.replace('Gs.', '').replace('.', ',')}
                            </span>
                          )}
                          <span className="text-white font-bold text-base">
                            ${(currentStoreStories[currentStoryIndex].productDiscountPrice || currentStoreStories[currentStoryIndex].productPrice)?.replace('Gs.', '').replace('.', ',')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <button 
                        className="text-white/80 hover:text-red-400 transition-colors focus:outline-none focus:ring-0 active:outline-none"
                        onClick={() => {
                          const storyId = currentStoreStories[currentStoryIndex].id;
                          setLikedStories(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(storyId)) {
                              newSet.delete(storyId);
                            } else {
                              newSet.add(storyId);
                            }
                            return newSet;
                          });
                        }}
                      >
                        <Heart 
                          className={`w-5 h-5 transition-colors ${
                            likedStories.has(currentStoreStories[currentStoryIndex]?.id) 
                              ? 'fill-red-500 text-red-500' 
                              : ''
                          }`} 
                        />
                      </button>
                      <button 
                        className="text-white/80 hover:text-white transition-colors focus:outline-none focus:ring-0 active:outline-none"
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: currentStoreStories[currentStoryIndex].productName || 'Produto em oferta',
                              text: `Confira esta oferta: ${currentStoreStories[currentStoryIndex].productName}`,
                              url: window.location.href
                            });
                          }
                        }}
                      >
                        <Share className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de navegação invisíveis */}
              <button 
                className="absolute top-0 left-0 w-1/2 h-full opacity-0 z-10"
                onClick={prevStory}
                disabled={currentStoryIndex === 0}
                aria-label="Story anterior"
              />
              <button 
                className="absolute top-0 right-0 w-1/2 h-full opacity-0 z-10"
                onClick={nextStory}
                aria-label="Próximo story"
              />

              {/* Pause overlay */}
              {isPaused && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-30">
                  <div className="text-white text-sm bg-black/50 px-3 py-1 rounded">
                    Pausado
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Login Modal - Para Usuários */}
      <LoginPage 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        mode="user"
      />

      {/* Barra de Navegação Fixa - Mobile apenas */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="flex items-center justify-around py-2 px-4">
            {/* Configurações */}
            <button
              onClick={() => setLocation('/settings')}
              className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
              data-testid="button-mobile-settings"
            >
              <Settings className="w-5 h-5" />
              <span className="text-xs">Config</span>
            </button>
            
            {/* Lista de Compras */}
            <button
              onClick={() => setLocation('/shopping-list')}
              className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
              data-testid="button-mobile-shopping"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-xs">Lista</span>
            </button>
            
            {/* Comparar Preços */}
            <Link href="/price-comparison">
              <button
                className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
                data-testid="button-mobile-comparison"
              >
                <BarChart3 className="w-5 h-5" />
                <span className="text-xs">Comparar</span>
              </button>
            </Link>
            
            {/* Meus Cupons */}
            <button
              onClick={() => setLocation('/my-coupons')}
              className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
              data-testid="button-mobile-coupons"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="18" rx="2" ry="2"/>
                <line x1="8" y1="2" x2="8" y2="22"/>
                <line x1="16" y1="2" x2="16" y2="22"/>
              </svg>
              <span className="text-xs">Cupons</span>
            </button>
            
            {/* Sair - Só aparece para usuários autenticados */}
            {isAuthenticated && (
              <button
                onClick={() => {
                  window.location.href = '/api/logout';
                }}
                className="flex flex-col items-center gap-1 p-2 text-red-600 hover:text-red-700"
                data-testid="button-mobile-logout"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-xs">Sair</span>
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// Componente para visualização Unificada (Feed estilo Instagram)
function UnifiedFeedView({ stores, searchQuery, searchResults, isMobile, onProductSelect }: { 
  stores: StoreWithProducts[], 
  searchQuery: string, 
  searchResults: any[],
  isMobile: boolean,
  onProductSelect: (product: Product, store: StoreWithProducts) => void
}) {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className={`mx-auto ${isMobile ? 'px-1 max-w-full' : 'px-2 max-w-6xl'}`}>
        {searchQuery.trim() ? (
          // Layout de Busca Compacto
          searchResults.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                🔍 Nenhum resultado encontrado para "{searchQuery}"
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Tente buscar por outro produto ou loja
              </p>
            </div>
          ) : (
            <div className="bg-white">
              <div className="p-4 border-b bg-gray-50">
                <p className="text-sm text-gray-600">
                  {searchResults.length} resultado{searchResults.length > 1 ? 's' : ''} para "{searchQuery}" 
                  <span className="ml-2 text-xs text-gray-500">• Lojas e produtos</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  💡 Clique nos itens para ver detalhes
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {searchResults.map((result, index) => (
                  result.type === 'store' ? (
                    <StoreResultItem 
                      key={`store-${result.store.id}`} 
                      store={result.data}
                      searchQuery={searchQuery}
                      isMobile={isMobile}
                      onProductClick={(product) => onProductSelect(product, result.data)}
                    />
                  ) : (
                    <SearchResultItem 
                      key={`product-${result.store.id}-${result.data.id}`} 
                      product={result.data} 
                      store={result.store}
                      onClick={() => window.location.href = `/product/${result.data.id}/compare`}
                      isMobile={isMobile}
                      searchTerm={searchQuery}
                    />
                  )
                ))}
              </div>
            </div>
          )
        ) : (
          // Layout de Feed Normal
          <>
            
            {stores.map((store) => (
              <StorePost 
                key={store.id} 
                store={store} 
                searchQuery={searchQuery} 
                isMobile={isMobile}
                onProductClick={(product) => onProductSelect(product, store)}
              />
            ))}
          </>
        )}
        
        {/* Footer do Feed */}
        {!searchQuery.trim() && (
          <div className="bg-white border-b p-6 text-center">
            <p className="text-gray-500">
              {stores.length} {stores.length === 1 ? 'loja disponível' : 'lojas disponíveis'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Desenvolvido com ❤️ para pequenos comércios do Paraguai
            </p>
          </div>
        )}
      </div>
  );
}

function StorePost({ store, searchQuery = '', isMobile = true, onProductClick }: { 
  store: StoreWithProducts, 
  searchQuery?: string, 
  isMobile?: boolean,
  onProductClick?: (product: Product) => void
}) {
  const activeProducts = store.products.filter(p => p.isActive);
  
  // Se há busca ativa, filtrar apenas produtos que correspondem à busca
  const filteredProducts = searchQuery.trim() 
    ? activeProducts.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activeProducts;
  
  const featuredProducts = filteredProducts.filter(p => p.isFeatured);
  
  // Verificar se a loja postou produtos hoje
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const hasNewProductsToday = store.products.some(product => {
    if (!product.updatedAt) return false;
    const productDate = new Date(product.updatedAt);
    productDate.setHours(0, 0, 0, 0);
    return productDate.getTime() === today.getTime() && product.isActive;
  });
  
  // Agrupar por categoria para ordem consistente
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    const category = product.category || 'Geral';
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {} as Record<string, typeof filteredProducts>);

  // Ordenar categorias
  const categoryOrder = ['Perfumes', 'Eletrônicos', 'Pesca', 'Geral'];
  const sortedCategories = Object.keys(productsByCategory).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Produtos ordenados por categoria, priorizando destacados
  const categorySortedProducts = sortedCategories.flatMap(category => {
    const categoryProducts = productsByCategory[category];
    const featured = categoryProducts.filter(p => p.isFeatured);
    const regular = categoryProducts.filter(p => !p.isFeatured);
    return [...featured, ...regular];
  });
  
  // Priorizar produtos em destaque de diferentes categorias
  const featuredByCategory: Record<string, any> = {};
  const regularProducts: any[] = [];
  
  categorySortedProducts.forEach(product => {
    const category = product.category || 'Geral';
    if (product.isFeatured && !featuredByCategory[category]) {
      featuredByCategory[category] = product;
    } else {
      regularProducts.push(product);
    }
  });
  
  const featuredFromDifferentCategories = Object.values(featuredByCategory);
  
  // Sistema de rotação simples com timestamp
  const getCurrentRotationSeed = () => {
    // Muda a cada 1 minuto (60.000 ms)
    return Math.floor(Date.now() / (1 * 60 * 1000));
  };
  
  // Função de randomização com seed determinístico  
  const seededRandom = (seed: number) => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  // Randomizar produtos usando seed
  const getRandomProducts = (products: any[], count: number, seed: number) => {
    const shuffled = [...products];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(seededRandom(seed + i) * (i + 1));
      [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
    }
    return shuffled.slice(0, count);
  };
  
  // Criar displayProducts - 2 produtos em destaque + 3 produtos aleatórios
  const displayProducts = (() => {
    // Pegar exatamente 2 produtos em destaque
    const featuredProducts = filteredProducts.filter(p => p.isFeatured).slice(0, 2);
    
    // Pegar produtos regulares (não em destaque) 
    const nonFeaturedProducts = filteredProducts.filter(p => !p.isFeatured);
    
    // 4 produtos aleatórios do restante (com rotação a cada 1 minuto)
    const rotationSeed = getCurrentRotationSeed() + store.id.charCodeAt(0);
    const randomProducts = getRandomProducts(nonFeaturedProducts, 4, rotationSeed);
    
    // Combinar: 2 destaque + 4 regulares = 6 produtos total
    return [...featuredProducts, ...randomProducts].slice(0, 6);
  })();

  return (
    <div className="bg-white mb-3 border-b">
      {/* Post Header with Background Effect */}
      <div className="relative overflow-hidden">
        {/* Background Effect */}
        <div 
          className="absolute inset-0 opacity-8"
          style={{
            background: `linear-gradient(135deg, ${store.themeColor || '#E11D48'}15, transparent 70%)`
          }}
        />
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            background: `radial-gradient(circle at top right, ${store.themeColor || '#E11D48'}20, transparent 60%)`
          }}
        />
        
        {/* Content */}
        <div className="relative px-4 py-3 flex items-center backdrop-blur-[0.5px]">
          <Link href={`/flyer/${store.slug}`}>
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mr-3 shadow-lg cursor-pointer hover:scale-105 transition-transform"
              style={{ backgroundColor: store.themeColor || '#E11D48' }}
            >
              {store.logoUrl ? (
                <LazyImage
                  src={store.logoUrl} 
                  alt={store.name}
                  className="rounded-full object-cover"
                  style={{ 
                    width: '2.75rem', 
                    height: '2.75rem',
                    filter: 'brightness(1.1) contrast(1.3) saturate(1.1)'
                  }}
                  placeholder={store.name.charAt(0)}
                />
              ) : (
                <span className="text-lg drop-shadow-sm">{store.name.charAt(0)}</span>
              )}
            </div>
          </Link>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 drop-shadow-sm">{limitStoreName(store.name, isMobile)}</h3>
              
              <Link href={`/flyer/${store.slug}`}>
                <button 
                  className="text-xs font-semibold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg text-white"
                  style={{ 
                    backgroundColor: store.themeColor || '#E11D48',
                    boxShadow: `0 4px 12px ${store.themeColor || '#E11D48'}30`
                  }}
                >
                  💰 Ver {filteredProducts.length > 4 ? `+${filteredProducts.length - 4} ofertas` : 'panfleto'}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Products Horizontal Cards */}
      {displayProducts.length > 0 ? (
        <div className="px-4 pb-3">
          {isMobile ? (
            /* Layout Mobile - Carousel horizontal com scroll */
            <div className="relative">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {displayProducts.map((product) => (
                  <div key={product.id} className="flex-shrink-0 w-32 sm:w-36 md:w-40 h-64 sm:h-84">
                    <ProductCard
                      product={product}
                      currency={store.currency || 'Gs.'}
                      themeColor={store.themeColor || '#E11D48'}
                      showFeaturedBadge={true}
                      onClick={onProductClick}
                      customUsdBrlRate={store.customUsdBrlRate ? Number(store.customUsdBrlRate) : undefined}
                    />
                  </div>
                ))}
              </div>
              
              {/* Indicador de scroll para mobile */}
              {displayProducts.length > 3 && (
                <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white via-white/80 to-transparent flex items-center justify-center pointer-events-none">
                  <div className="bg-gray-400 rounded-full p-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Layout Desktop - Grid horizontal sem scroll */
            <div className="grid grid-cols-5 gap-3">
              {displayProducts.slice(0, 5).map((product) => (
                <div key={product.id} className="h-72 sm:h-88">
                  <ProductCard
                    product={product}
                    currency={store.currency || 'Gs.'}
                    themeColor={store.themeColor || '#E11D48'}
                    showFeaturedBadge={true}
                    onClick={onProductClick}
                    customUsdBrlRate={store.customUsdBrlRate ? Number(store.customUsdBrlRate) : undefined}
                  />
                </div>
              ))}
              
              {/* Preencher slots vazios se houver menos de 5 produtos */}
              {Array.from({ length: Math.max(0, 5 - displayProducts.length) }).map((_, index) => (
                <div key={`empty-${index}`} className="h-72 sm:h-88 bg-gray-100 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-xs">+</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-gray-500">
          <p>Esta loja ainda não tem produtos ativos</p>
        </div>
      )}

    </div>
  );
}