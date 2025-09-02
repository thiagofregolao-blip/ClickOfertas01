import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, MapPin, Star, Grid, List, User, Settings, LogOut, ShoppingCart, X, Camera, Heart, Share, BarChart3 } from "lucide-react";
import ProductCard from "@/components/product-card";
import { ProductDetailModal } from "@/components/product-detail-modal";
import LoginPage from "@/components/login-page";
import PWAInstallButton from "@/components/pwa-install-button";
import { useAppVersion, type AppVersionType } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/use-debounce";
import { useTypewriter } from "@/hooks/use-typewriter";
import { LazyImage } from "@/components/lazy-image";
import { SearchResultItem } from "@/components/search-result-item";
import { StoreResultItem } from "@/components/store-result-item";
import { BannerSection } from "@/components/BannerSection";
import type { StoreWithProducts, Product, InstagramStoryWithDetails } from "@shared/schema";
import logoUrl from '../assets/logo.jpg';

// Função para limitar nome a duas palavras no mobile
function limitStoreName(name: string, isMobile: boolean): string {
  if (!isMobile) return name;
  const words = name.split(' ');
  return words.slice(0, 2).join(' ');
}

export default function StoresGallery() {
  const [searchInput, setSearchInput] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchQuery = useDebounce(searchInput, 500); // Debounce de 500ms
  
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  // Instagram Stories state
  const [viewingStory, setViewingStory] = useState<InstagramStoryWithDetails | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [likedStories, setLikedStories] = useState<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef(0);
  
  const STORY_DURATION = 5000; // 5 segundos

  // Carregar todas as lojas primeiro
  const { data: stores, isLoading } = useQuery({
    queryKey: ['/api/public/stores'],
  });

  // Carregar stories apenas quando há lojas
  const { data: instagramStories } = useQuery({
    queryKey: ['/api/instagram-stories'], 
    enabled: !!stores
  });

  // Função de busca que funciona tanto para lojas quanto produtos
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !stores) return [];
    
    const query = searchQuery.toLowerCase();
    const results: any[] = [];
    
    // Buscar em todas as lojas
    stores.forEach((store: StoreWithProducts) => {
      // Verificar se o nome da loja corresponde
      if (store.name.toLowerCase().includes(query) || 
          store.description?.toLowerCase().includes(query)) {
        results.push({ type: 'store', data: store, store });
      }
      
      // Verificar produtos ativos desta loja
      const activeProducts = store.products.filter(p => p.isActive);
      activeProducts.forEach((product: Product) => {
        if (product.name.toLowerCase().includes(query) ||
            product.description?.toLowerCase().includes(query) ||
            product.category?.toLowerCase().includes(query)) {
          results.push({ type: 'product', data: product, store });
        }
      });
    });
    
    return results;
  }, [searchQuery, stores]);

  // Instagram Stories agrupados por loja
  const instagramStoriesGrouped = useMemo(() => {
    if (!instagramStories || !stores) return {};
    
    return instagramStories.reduce((acc: any, story: InstagramStoryWithDetails) => {
      const storeId = story.storeId;
      const store = stores.find((s: StoreWithProducts) => s.id === storeId);
      
      if (store) {
        if (!acc[storeId]) {
          acc[storeId] = { store, stories: [] };
        }
        acc[storeId].stories.push(story);
      }
      
      return acc;
    }, {});
  }, [instagramStories, stores]);

  // Stories da loja atual no viewer
  const currentStoreStories = useMemo(() => {
    if (!viewingStory) return [];
    return instagramStoriesGrouped[viewingStory.storeId]?.stories || [viewingStory];
  }, [viewingStory, instagramStoriesGrouped]);

  // Função para abrir story modal
  const openStoryModal = useCallback((story: InstagramStoryWithDetails, index = 0) => {
    setViewingStory(story);
    setCurrentStoryIndex(index);
    setProgress(0);
    setIsPaused(false);
    progressRef.current = 0;
  }, []);

  // Função para fechar story modal
  const closeStoryModal = useCallback(() => {
    setViewingStory(null);
    setCurrentStoryIndex(0);
    setProgress(0);
    setIsPaused(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    progressRef.current = 0;
  }, []);

  // Função para próximo story
  const nextStory = useCallback(() => {
    if (currentStoryIndex < currentStoreStories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
      progressRef.current = 0;
    } else {
      closeStoryModal();
    }
  }, [currentStoryIndex, currentStoreStories.length, closeStoryModal]);

  // Função para story anterior
  const prevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setProgress(0);
      progressRef.current = 0;
    }
  }, [currentStoryIndex]);

  // Timer para progresso do story
  useEffect(() => {
    if (viewingStory && !isPaused) {
      timerRef.current = setInterval(() => {
        progressRef.current += 20; // 20ms increments
        const newProgress = (progressRef.current / STORY_DURATION) * 100;
        
        if (newProgress >= 100) {
          nextStory();
        } else {
          setProgress(newProgress);
        }
      }, 20);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [viewingStory, isPaused, nextStory]);

  // Pausar/retomar story quando usuário interage
  useEffect(() => {
    const handleUserInteraction = () => {
      if (viewingStory && !isPaused) {
        setIsPaused(true);
        setTimeout(() => setIsPaused(false), 300); // Pause por 300ms
      }
    };

    if (viewingStory) {
      document.addEventListener('mousedown', handleUserInteraction);
      document.addEventListener('touchstart', handleUserInteraction);
      
      return () => {
        document.removeEventListener('mousedown', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      };
    }
  }, [viewingStory, isPaused]);

  // Atualizar viewMode baseado na detecção de dispositivo
  useEffect(() => {
    setViewMode(isMobile ? 'mobile' : 'desktop');
  }, [isMobile]);

  // Fechar dropdown quando clica fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isUserMenuOpen) {
        const dropdown = document.querySelector('.user-dropdown-menu');
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setIsUserMenuOpen(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  // Filtrar lojas com products ativos e limitar a 6 products por loja
  const filteredStores = useMemo(() => {
    if (!stores) return [];
    
    return stores
      .map((store: StoreWithProducts) => ({
        ...store,
        products: store.products.filter(p => p.isActive).slice(0, 6) // Máximo 6 produtos por loja
      }))
      .filter((store: StoreWithProducts) => store.products.length > 0);
  }, [stores]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto py-4 px-2 max-w-6xl">
          <Skeleton className="h-16 w-full mb-6" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border rounded-lg shadow-sm mb-6 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
              <Skeleton className="h-10 w-full" />
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
      {/* Mobile: Banner rotativo no topo + Search bar sobreposta */}
      {isMobile ? (
        <div className="relative -mx-1">
          {/* Banners rotativos ocupando todo o topo */}
          <div className="w-full">
            <BannerSection />
          </div>
          
          {/* Barra de busca sobreposta aos banners */}
          <div className="absolute top-4 left-4 right-4 z-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={isSearchFocused || searchInput ? "Buscar produtos ou lojas..." : currentText}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="pl-10 pr-10 py-2 w-full bg-white/90 backdrop-blur-sm border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-blue-200 shadow-lg"
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
        </div>
      ) : (
        /* Desktop: Header tradicional */
        <div className="border-b sticky top-0 z-50 backdrop-blur-md bg-opacity-95" style={{background: 'linear-gradient(to bottom right, #F04940, #FA7D22)'}}>
          <div className="mx-auto py-4 px-2 max-w-6xl">
            {/* Menu de Navegação - PRIMEIRO */}
            <div className="flex items-center justify-between gap-3 mb-6">
              
              {/* Botão temporário de acesso Super Admin - Desktop apenas */}
              <button
                onClick={() => {
                  const email = 'admin@clickofertas.py';
                  const password = 'super123admin';
                  // Fazer login do super admin
                  fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                  }).then(res => res.json()).then(data => {
                    if (data.message === 'Login realizado com sucesso') {
                      window.location.href = '/super-admin';
                    }
                  });
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
                // Usuário não logado - Desktop apenas
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
              {/* Logo e Título */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <img 
                  src="/attached_assets/logo certo 01_1756774388368.png"
                  alt="Click Ofertas PY Logo"
                  className="w-20 h-20 object-contain"
                />
                <div className="flex items-center gap-1">
                  <span className="text-white font-bold text-xl tracking-normal" style={{textShadow: '0 1px 2px rgba(0,0,0,0.1)', fontWeight: '700'}}>Click</span>
                  <span className="font-bold text-xl tracking-normal">
                    <span className="text-white">Ofertas.</span>
                    <span style={{color: '#FFE600'}}>PY</span>
                  </span>
                </div>
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

              {/* Botão de Comparação de Preços - Desktop apenas */}
              <div className="flex items-center gap-3">
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

      {/* SEÇÃO DE BANNERS + STORIES LADO A LADO - Apenas Desktop */}
      {!isMobile && !searchQuery.trim() && (
        <div className="bg-white border-b -mt-4">
          <div className="mx-auto px-2 max-w-6xl">
            <div className="flex gap-4">
              {/* Banner à esquerda */}
              <div className="flex-shrink-0">
                <BannerSection />
              </div>
              
              {/* Stories à direita */}
              <div className="flex-1 min-w-0 pl-4">
                {/* Texto e botão criar story na mesma linha */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isAuthenticated && (
                      <button
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-lg transition-all shadow-lg font-medium text-sm"
                        onClick={() => setLocation('/create-story')}
                        data-testid="button-create-story"
                      >
                        <Camera className="w-3 h-3 mr-1 inline" />
                        Criar Story
                      </button>
                    )}
                    <p className="text-sm text-gray-600">📱 Story de ofertas exclusivas</p>
                  </div>
                </div>
                
                {/* Grid 2 linhas x 4 colunas para 8 stories aleatórios */}
                <div className="grid grid-cols-4 grid-rows-2 gap-4 max-h-44">
              
                  {/* Stories das Lojas - limitado a 8 aleatórios no desktop com rotação horária */}
                  {Object.values(instagramStoriesGrouped).sort(() => {
                    const hourSeed = Math.floor(Date.now() / (60 * 60 * 1000));
                    let x = Math.sin(hourSeed) * 10000;
                    return (x - Math.floor(x)) - 0.5;
                  }).slice(0, 8).map(({ store: storyStore, stories }) => (
                    <div 
                      key={storyStore.id} 
                      className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
                      onClick={() => openStoryModal(stories[0], 0)} // Abrir primeiro story da loja
                      data-testid={`story-circle-${storyStore.slug}`}
                    >
                      {/* Círculo da loja */}
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 p-0.5 hover:scale-105 transition-transform">
                          <div className="w-full h-full rounded-full overflow-hidden">
                            <Avatar className="w-full h-full">
                              <AvatarImage 
                                src={storyStore.logoUrl} 
                                alt={storyStore.name}
                                className="w-full h-full object-cover"
                              />
                              <AvatarFallback className="text-sm font-bold bg-white">
                                {storyStore.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                        
                        {/* Contador de stories */}
                        <Badge 
                          variant="secondary" 
                          className="absolute -top-1 -right-1 bg-green-500 text-white border-2 border-white text-xs px-1"
                        >
                          {stories.length}
                        </Badge>
                      </div>
                      
                      {/* Nome da loja */}
                      <div className="text-xs text-gray-600 max-w-[64px] text-center leading-tight truncate">
                        {storyStore.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Stories horizontais logo após os banners */}
      {isMobile && !searchQuery.trim() && (
        <div className="bg-white border-b p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isAuthenticated && (
                <button
                  className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-lg transition-all shadow-lg font-medium text-sm"
                  onClick={() => setLocation('/create-story')}
                  data-testid="button-create-story"
                >
                  <Camera className="w-3 h-3 mr-1 inline" />
                  Criar Story
                </button>
              )}
              <p className="text-sm text-gray-600">📱 Story de ofertas exclusivas</p>
            </div>
          </div>
          
          {/* Stories móveis horizontais */}
          <div className="flex items-start gap-2 overflow-x-auto scrollbar-hide">
            {Object.values(instagramStoriesGrouped).map(({ store: storyStore, stories }) => (
              <div 
                key={storyStore.id} 
                className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
                onClick={() => openStoryModal(stories[0], 0)}
                data-testid={`story-circle-${storyStore.slug}`}
              >
                {/* Círculo da loja */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 p-0.5 hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-full overflow-hidden">
                      <Avatar className="w-full h-full">
                        <AvatarImage 
                          src={storyStore.logoUrl} 
                          alt={storyStore.name}
                          className="w-full h-full object-cover"
                        />
                        <AvatarFallback className="text-sm font-bold bg-white">
                          {storyStore.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  
                  {/* Contador de stories */}
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-1 -right-1 bg-green-500 text-white border-2 border-white text-xs px-1"
                  >
                    {stories.length}
                  </Badge>
                </div>
                
                {/* Nome da loja */}
                <div className="text-xs text-gray-600 max-w-[64px] text-center leading-tight truncate">
                  {storyStore.name}
                </div>
              </div>
            ))}
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
                      onClick={() => onProductSelect(result.data, result.store)}
                      isMobile={isMobile}
                    />
                  )
                ))}
              </div>
            </div>
          )
        ) : (
          // Layout de Feed Normal
          stores.map((store) => (
            <StorePost 
              key={store.id} 
              store={store} 
              searchQuery={searchQuery} 
              isMobile={isMobile}
              onProductClick={(product) => onProductSelect(product, store)}
            />
          ))
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
  
  return (
    <Card className="w-full mb-6 shadow-sm border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        {/* Header da Loja */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-gray-200">
              <AvatarImage src={store.logoUrl} alt={store.name} />
              <AvatarFallback className="text-lg font-bold">
                {store.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 leading-tight">
                {limitStoreName(store.name, isMobile)}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-3 h-3" />
                <span>{store.address || 'Paraguay'}</span>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>4.8</span>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            ✅ Ativo
          </Badge>
        </div>

        {/* Grid de Produtos */}
        {filteredProducts.length > 0 ? (
          <>
            <div className={`grid gap-3 mb-4 ${
              isMobile 
                ? 'grid-cols-2' 
                : 'grid-cols-3 lg:grid-cols-6'
            }`}>
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  store={store}
                  onClick={() => onProductClick?.(product)}
                  isMobile={isMobile}
                />
              ))}
            </div>
            
            {/* Footer da Loja */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-600">
                {filteredProducts.length} produto{filteredProducts.length > 1 ? 's' : ''} disponível{filteredProducts.length > 1 ? 'eis' : ''}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  Curtir
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Share className="w-3 h-3" />
                  Compartilhar
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhum produto encontrado para "{searchQuery}"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}