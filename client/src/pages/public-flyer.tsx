import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Share, Download, Printer, MoreVertical, Filter, Gift, Camera, Heart, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import ProductCard from "@/components/product-card";
import ScratchCard from "@/components/scratch-card";
import { ProductDetailModal } from "@/components/product-detail-modal";
import FlyerHeader from "@/components/flyer-header";
import FlyerFooter from "@/components/flyer-footer";
import { downloadFlyerAsPNG } from "@/lib/flyer-utils";
import type { StoreWithProducts, Product, PromotionWithDetails } from "@shared/schema";
import { InstagramStories } from "@/components/instagram-stories";
import { useEngagement } from "@/hooks/use-engagement";
import { useAppVersion } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";

// Tipo para os novos Instagram Stories
interface InstagramStory {
  id: string;
  storeId: string;
  userId: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  caption?: string;
  productName?: string;
  productPrice?: string;
  productDiscountPrice?: string;
  productCategory?: string;
  isProductPromo: boolean;
  backgroundColor: string;
  textColor: string;
  isActive: boolean;
  viewsCount: string;
  likesCount: string;
  expiresAt: string;
  createdAt: string;
  store: {
    id: string;
    name: string;
    logoUrl?: string;
    slug: string;
  };
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
}

/**
 * Página Pública dos Panfletos - Suporta duas versões:
 * 
 * VERSÃO MOBILE (Click Ofertas Paraguai Mobile):
 * - Layout Instagram Stories para /stores/:slug
 * - Cards compactos e otimizados para touch
 * - Navegação por swipe e toque
 * 
 * VERSÃO DESKTOP (Click Ofertas Paraguai Desktop):
 * - Layout tradicional de panfleto para /flyer/:slug  
 * - Grid de produtos otimizado para mouse
 * - Mais informações visíveis simultaneamente
 */
export default function PublicFlyer() {
  const [, flyerParams] = useRoute("/flyer/:slug");
  const [, storeParams] = useRoute("/stores/:slug");
  const params = flyerParams || storeParams;
  const isStoriesView = !!storeParams; // Detecta se é acesso via stories
  const { isMobile, isDesktop, version, versionName } = useAppVersion();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showInstagramStories, setShowInstagramStories] = useState(isStoriesView);
  const menuRef = useRef<HTMLDivElement>(null);
  const { recordFlyerView } = useEngagement();
  const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreWithProducts | null>(null);
  const [viewingStory, setViewingStory] = useState<InstagramStory | null>(null);
  const { isAuthenticated } = useAuth();

  // Log da versão e modo de acesso (para desenvolvimento)
  useEffect(() => {
    const accessMode = isStoriesView ? 'Stories' : 'Panfleto';
    console.log(`📱 Executando: ${versionName} - Modo: ${accessMode}`);
  }, [versionName, isStoriesView]);

  // Fecha o menu quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: store, isLoading, error } = useQuery<StoreWithProducts>({
    queryKey: ["/api/public/stores", params?.slug],
    enabled: !!params?.slug,
    staleTime: 5 * 60 * 1000, // 5 minutos (aumentado)
    gcTime: 15 * 60 * 1000, // 15 minutos (aumentado)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false, // Evita refetch desnecessário
  });

  // Buscar todas as lojas para navegação entre stories (sempre executado no topo)
  const { data: allStores } = useQuery<StoreWithProducts[]>({
    queryKey: ['/api/public/stores'],
    staleTime: 10 * 60 * 1000, // 10 minutos (otimizado)
    gcTime: 30 * 60 * 1000, // 30 minutos (otimizado)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false, // Evita refetch desnecessário
    enabled: isStoriesView, // Só busca quando é stories
  });

  // Buscar os novos Instagram Stories
  const { data: instagramStories = [], isLoading: storiesLoading } = useQuery<InstagramStory[]>({
    queryKey: ['/api/instagram-stories'],
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    staleTime: 30 * 1000,
  });

  // Agrupar Instagram Stories por loja
  const instagramStoriesGrouped = instagramStories.reduce((acc, story) => {
    const storeId = story.store.id;
    if (!acc[storeId]) {
      acc[storeId] = {
        store: story.store,
        stories: [],
      };
    }
    acc[storeId].stories.push(story);
    return acc;
  }, {} as Record<string, { store: InstagramStory['store']; stories: InstagramStory[] }>);

  console.log('🔍 Instagram Stories Debug:', { 
    instagramStories, 
    storiesLoading, 
    storiesLength: instagramStories?.length,
    grouped: Object.keys(instagramStoriesGrouped)
  });

  // TEMPORARIAMENTE DESABILITADO - Buscar clones virtuais disponíveis para usuário autenticado
  /*
  const { data: virtualClonesResponse } = useQuery<{ clones: any[] }>({
    queryKey: ['/api/virtual-clones/user'],
    enabled: isAuthenticated, // Só busca se autenticado
    staleTime: 0, // SEM CACHE - sempre busca dados frescos
    gcTime: 0, // SEM CACHE
    refetchOnWindowFocus: true, // Refetch quando voltar para a aba
    refetchOnMount: true, // Refetch ao montar
    retry: false, // Não retry se não autenticado
  });
  const virtualClones = virtualClonesResponse?.clones || [];
  */
  const virtualClones: any[] = []; // Array vazio para desabilitar clones

  // NEW: Buscar promoções personalizadas para o usuário (ou todas se não autenticado)
  const { data: promotionsResponse, refetch: refetchPromotions } = useQuery<{promotions: any[], storeId?: string, userId?: string}>({
    queryKey: ['/api/stores', params?.slug, 'my-available-promotions'],
    queryFn: async () => {
      if (!params?.slug) return { promotions: [] };
      
      const response = await fetch(`/api/stores/${params.slug}/my-available-promotions`, {
        credentials: 'include' // Para enviar cookies de autenticação
      });
      
      if (!response.ok) {
        console.log('📝 Erro na busca de promoções personalizadas, usando fallback');
        return { promotions: [] };
      }
      
      const data = await response.json();
      console.log(`🎯 Promoções personalizadas recebidas:`, data);
      return data;
    },
    enabled: !!params?.slug,
    staleTime: 1 * 60 * 1000, // 1 minuto (mais fresco para mudanças de status)
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
  
  const activePromotions = promotionsResponse?.promotions || [];
  
  // REMOVIDO: Debug desnecessário
  

  // Registrar visualização do panfleto/loja quando carregado
  // CORREÇÃO: Removido recordFlyerView das dependências para evitar loop infinito
  useEffect(() => {
    if (store?.id && !isStoriesView) {
      console.log(`📊 Registrando view da loja: ${store.name}`);
      // Registro de visualização de panfleto (não stories)  
      recordFlyerView(store.id);
    }
  }, [store?.id, isStoriesView]); // Removido recordFlyerView das dependências
  
  // Event listener para produtos similares
  useEffect(() => {
    const handleOpenProductModal = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { product, store } = customEvent.detail;
      setSelectedProduct(product);
      setSelectedStore(store);
    };
    
    window.addEventListener('openProductModal', handleOpenProductModal as EventListener);
    return () => window.removeEventListener('openProductModal', handleOpenProductModal as EventListener);
  }, []);

  const handleShare = async () => {
    if (navigator.share && typeof navigator.canShare === 'function') {
      try {
        await navigator.share({
          title: `${store?.name} - Panfleto`,
          text: `Confira as promoções da ${store?.name}!`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copiado!",
          description: "O link do panfleto foi copiado para sua área de transferência.",
        });
      } catch (err) {
        toast({
          title: "Erro ao copiar",
          description: "Não foi possível copiar o link. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDownloadPNG = async () => {
    if (!store) return;
    
    setIsDownloading(true);
    try {
      await downloadFlyerAsPNG(store.name, 'flyer-content');
      toast({
        title: "Download concluído!",
        description: "O panfleto foi salvo como imagem PNG.",
      });
    } catch (err) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o panfleto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDirections = () => {
    if (store?.latitude && store?.longitude) {
      const googleMapsUrl = `https://www.google.com/maps?q=${store.latitude},${store.longitude}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  // Continuar com renderização normal
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando panfleto...</p>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Panfleto não encontrado</h1>
          <p className="text-gray-600 mb-6">
            O panfleto que você está procurando não existe ou foi removido.
          </p>
        </Card>
      </div>
    );
  }

  // Filtrar produtos conforme o tipo de visualização
  // Converter promoções para formato de produto
  const promotionsAsProducts: Product[] = activePromotions.map((promotion) => ({
    id: promotion.id,
    name: promotion.name,
    description: promotion.description || "",
    price: promotion.originalPrice,
    imageUrl: promotion.imageUrl || "",
    imageUrl2: undefined,
    imageUrl3: undefined,
    category: promotion.category,
    storeId: promotion.storeId,
    isActive: true,
    isFeatured: true, // Destaque para promoções
    showInStories: true,
    sortOrder: "0",
    isScratchCard: true,
    scratchMessage: promotion.scratchMessage || "Parabéns! Você ganhou um desconto especial!",
    scratchPrice: promotion.promotionalPrice,
    scratchExpiresAt: promotion.validUntil || new Date().toISOString(),
    scratchTimeLimitMinutes: undefined,
    scratchBackgroundColor: undefined,
    maxScratchRedemptions: undefined,
    currentScratchRedemptions: undefined,
    createdAt: new Date(promotion.createdAt),
    updatedAt: new Date(promotion.updatedAt)
  }));

  // Mesclar produtos normais com promoções
  const allProductsWithPromotions = [...(store?.products || []), ...promotionsAsProducts];

  const activeProducts = isStoriesView 
    ? allProductsWithPromotions.filter(p => p.isActive && p.showInStories) // Só produtos dos stories
    : allProductsWithPromotions.filter(p => p.isActive); // Todos produtos ativos
  
  // Agrupar produtos por categoria
  const productsByCategory = activeProducts.reduce((acc, product) => {
    const category = product.category || 'Geral';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, typeof activeProducts>);

  // Ordenar categorias por prioridade e alfabética
  const categoryOrder = ['Perfumes', 'Eletrônicos', 'Pesca', 'Geral'];
  const sortedCategories = Object.keys(productsByCategory).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Filtrar produtos por categoria selecionada
  const filteredProducts = selectedCategory === "all" 
    ? sortedCategories.flatMap(category => productsByCategory[category]) // Ordenar por categoria quando "all"
    : activeProducts.filter(product => (product.category || 'Geral') === selectedCategory);

  // DESABILITADO TEMPORARIAMENTE - Sistema antigo de stories baseado em produtos
  // Agora usando o novo sistema de Instagram Stories abaixo
  /*
  if (showInstagramStories && store?.products.some(p => p.isActive && p.showInStories)) {
    return (
      <InstagramStories 
        store={store}
        allStores={allStores || []}
        onClose={() => setShowInstagramStories(false)}
      />
    );
  }
  */

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Action Buttons - Hidden on print */}
      <div className="fixed top-4 right-4 z-50 no-print">
        <div className="relative" ref={menuRef}>
          {/* Botão Principal */}
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowActions(!showActions)}
            className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-lg"
            data-testid="button-actions-menu"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
          
          {/* Menu de Ações */}
          {showActions && (
            <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-1 space-y-1 min-w-[140px]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleShare();
                  setShowActions(false);
                }}
                className="w-full justify-start text-left"
                data-testid="button-share"
              >
                <Share className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleDownloadPNG();
                  setShowActions(false);
                }}
                disabled={isDownloading}
                className="w-full justify-start text-left"
                data-testid="button-download"
              >
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? "Baixando..." : "Baixar PNG"}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  handlePrint();
                  setShowActions(false);
                }}
                className="w-full justify-start text-left"
                data-testid="button-print"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir PDF
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Action Bar - Hidden on print */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 no-print">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex-1"
            data-testid="button-share-mobile"
          >
            <Share className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPNG}
            disabled={isDownloading}
            className="flex-1"
            data-testid="button-download-mobile"
          >
            <Download className="w-4 h-4 mr-2" />
            PNG
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex-1"
            data-testid="button-print-mobile"
          >
            <Printer className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>


      {/* Content */}
      <div id="flyer-content" className="max-w-4xl mx-auto bg-white shadow-lg">
        {isStoriesView ? (
          /* Stories Layout - Professional */
          <>
            {/* Professional Header for Stories */}
            <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 p-8 border-b">
              <div className="flex items-center gap-6">
                {/* Logo */}
                <div className="relative">
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold shadow-xl ring-4 ring-white"
                    style={{ backgroundColor: store.themeColor || '#E11D48' }}
                  >
                    {store.logoUrl ? (
                      <img 
                        src={store.logoUrl} 
                        alt={store.name}
                        className="w-22 h-22 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">{store.name.charAt(0)}</span>
                    )}
                  </div>
                  {/* Stories indicator */}
                  <div className="absolute -top-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white">
                    <span className="text-white text-sm font-bold">•</span>
                  </div>
                </div>
                
                {/* Store Info */}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{store.name}</h1>
                  
                  {/* Store Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                    {store.whatsapp && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">📱</span>
                        <span>{store.whatsapp}</span>
                      </div>
                    )}
                    {store.address && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">📍</span>
                        <span>{store.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* TEMPORARIAMENTE REMOVIDO - Barra horizontal será movida para o topo geral */}

            {/* Stories Badge - Atualizado */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="bg-white/20 rounded-full p-2">
                  <span className="text-lg">⭐</span>
                </div>
                <span className="font-bold text-xl">PRODUTOS EM DESTAQUE</span>
                <div className="bg-white/20 rounded-full p-2">
                  <span className="text-lg">⭐</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Traditional Flyer Layout */
          <>
            <FlyerHeader store={store} />
            
            {/* Promotional Banner */}
            <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 p-4 text-center">
              <div className="flex items-center justify-center gap-4">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-lg transform -rotate-3">
                  <span className="font-bold text-lg">PROMOÇÃO ESPECIAL</span>
                </div>
                <div className="text-black font-bold text-xl">
                  OS MELHORES PREÇOS VOCÊ ENCONTRA AQUI!
                </div>
              </div>
            </div>
          </>
        )}

        <div className={`${isStoriesView ? 'p-6' : 'p-4'}`}>
          {/* Category Filter - Only show for traditional flyer */}
          {!isStoriesView && sortedCategories.length > 1 && (
            <div className="mb-6 flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
              <Filter className="w-5 h-5 text-gray-600" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Filtrar por categoria:</span>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {sortedCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category} ({productsByCategory[category].length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {/* Stories Counter */}
          {isStoriesView && (
            <div className="text-center mb-6">
              <p className="text-gray-600">
                <span className="font-semibold">{activeProducts.length}</span> produtos em destaque
              </p>
            </div>
          )}


          {/* Products Grid */}
          {filteredProducts.length > 0 || virtualClones.length > 0 ? (
            storeParams ? (
              // Layout moderno para páginas de loja individual (/stores/:slug)
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* PRODUTOS ORIGINAIS + PROMOÇÕES COM RASPADINHA */}
                {filteredProducts.map((product) => {
                  // CORREÇÃO: Só renderizar como raspadinha se for promoção real (vem de activePromotions)
                  const isRealPromotion = activePromotions.some(promo => promo.id === product.id);
                  
                  console.log("🔍 PRODUTO MAPEADO (STORIES):", {
                    productId: product.id,
                    productName: product.name,
                    isScratchCard: product.isScratchCard,
                    isRealPromotion,
                    activePromotionsCount: activePromotions.length
                  });
                  
                  return isRealPromotion ? (
                    // PROMOÇÃO REAL: Renderizar como ScratchCard
                    <div key={product.id} className="relative">
                      <ScratchCard
                        product={product}
                        currency={store?.currency || "Gs."}
                        themeColor={store?.themeColor || "#E11D48"}
                        logoUrl={store?.logoUrl}
                        onClick={(product) => {
                          setSelectedProduct(product);
                          setSelectedStore(store || null);
                        }}
                      />
                    </div>
                  ) : (
                    // PRODUTO NORMAL: Sempre ProductCard (mesmo com isScratchCard=true)
                    <ProductCard
                      key={product.id}
                      product={product}
                      currency={store?.currency || "USD"}
                      themeColor={store?.themeColor || "#E11D48"}
                      showFeaturedBadge={true}
                      enableEngagement={true}
                      onClick={(product) => {
                        setSelectedProduct(product);
                        setSelectedStore(store || null);
                      }}
                    />
                  );
                })}
                


                {/* TEMPORARIAMENTE DESABILITADO - CLONES VIRTUAIS - aparecem como raspadinhas com badge */}
                {/*
                {virtualClones.map((clone) => (
                  <div key={`clone-${clone.id}`} className="relative">
                    <div className="absolute -top-2 -right-2 z-20 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                      Clone Virtual
                    </div>
                    <ScratchCard
                      isVirtualClone={true}
                      virtualCloneId={clone.id}
                      product={{
                        id: clone.productId,
                        name: clone.productName,
                        description: clone.productDescription,
                        price: clone.originalPrice,
                        imageUrl: clone.productImageUrl,
                        category: clone.productCategory,
                        storeId: clone.storeId,
                        isActive: true,
                        isFeatured: false,
                        showInStories: false,
                        isScratchCard: true,
                        scratchMessage: "Você ganhou um desconto especial!",
                        scratchPrice: clone.discountPrice,
                        scratchExpiresAt: clone.expiresAt,
                        scratchCouponCode: `CLONE-${clone.id}`,
                        createdAt: clone.createdAt,
                        updatedAt: clone.createdAt
                      }}
                      currency={store?.currency || "USD"}
                      themeColor={store?.themeColor || "#E11D48"}
                      onClick={(product) => {
                        setSelectedProduct(product);
                        setSelectedStore(store || null);
                      }}
                    />
                  </div>
                ))}
                */}
              </div>
            ) : (
              // Layout compacto para tela cheia (/flyer/:slug)
              <div className={`grid gap-${isStoriesView ? '6' : '3'} ${
                isStoriesView 
                  ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
                  : 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
              }`}>
                {/* PRODUTOS ORIGINAIS + PROMOÇÕES COM RASPADINHA */}
                {filteredProducts.map((product) => {
                  // CORREÇÃO: Só renderizar como raspadinha se for promoção real (vem de activePromotions)
                  const isRealPromotion = activePromotions.some(promo => promo.id === product.id);
                  
                  console.log("🔍 PRODUTO MAPEADO:", {
                    productId: product.id,
                    productName: product.name,
                    isScratchCard: product.isScratchCard,
                    isRealPromotion,
                    activePromotionsCount: activePromotions.length
                  });
                  
                  return isRealPromotion ? (
                    // PROMOÇÃO REAL: Renderizar como ScratchCard
                    <div key={product.id} className="relative">
                      <ScratchCard
                        product={product}
                        currency={store?.currency || "Gs."}
                        themeColor={store?.themeColor || "#E11D48"}
                        logoUrl={store?.logoUrl}
                        onClick={(product) => {
                          setSelectedProduct(product);
                          setSelectedStore(store || null);
                        }}
                      />
                    </div>
                  ) : (
                    // PRODUTO NORMAL: Sempre ProductCard (mesmo com isScratchCard=true)
                    <ProductCard
                      key={product.id}
                      product={product}
                      currency={store?.currency || "Gs."}
                      themeColor={store?.themeColor || "#E11D48"}
                      showFeaturedBadge={product.isFeatured || false}
                      enableEngagement={true}
                      onClick={(product) => {
                        setSelectedProduct(product);
                        setSelectedStore(store || null);
                      }}
                      customUsdBrlRate={store?.customUsdBrlRate ? Number(store.customUsdBrlRate) : undefined}
                    />
                  );
                })}
                


                {/* TEMPORARIAMENTE DESABILITADO - CLONES VIRTUAIS - aparecem como raspadinhas com badge */}
                {/*
                {virtualClones.map((clone) => (
                  <div key={`clone-${clone.id}`} className="relative">
                    <div className="absolute -top-2 -right-2 z-20 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                      Clone Virtual
                    </div>
                    <ScratchCard
                      isVirtualClone={true}
                      virtualCloneId={clone.id}
                      product={{
                        id: clone.productId,
                        name: clone.productName,
                        description: clone.productDescription,
                        price: clone.originalPrice,
                        imageUrl: clone.productImageUrl,
                        category: clone.productCategory,
                        storeId: clone.storeId,
                        isActive: true,
                        isFeatured: false,
                        showInStories: false,
                        isScratchCard: true,
                        scratchMessage: "Você ganhou um desconto especial!",
                        scratchPrice: clone.discountPrice,
                        scratchExpiresAt: clone.expiresAt,
                        scratchCouponCode: `CLONE-${clone.id}`,
                        createdAt: clone.createdAt,
                        updatedAt: clone.createdAt
                      }}
                      currency={store?.currency || "USD"}
                      themeColor={store?.themeColor || "#E11D48"}
                      onClick={(product) => {
                        setSelectedProduct(product);
                        setSelectedStore(store || null);
                      }}
                    />
                  </div>
                ))}
                */}
              </div>
            )
            
          ) : isStoriesView ? (
            <div className="text-center py-16">
              <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
                <div className="text-6xl mb-4">📱</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhum produto em destaque</h3>
                <p className="text-gray-600">Esta loja ainda não selecionou produtos para exibir nos stories.</p>
              </div>
            </div>
          ) : selectedCategory !== "all" ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">Nenhum produto encontrado na categoria "{selectedCategory}".</p>
              <button 
                onClick={() => setSelectedCategory("all")}
                className="text-blue-600 hover:text-blue-700 underline mt-2"
              >
                Mostrar todos os produtos
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">Nenhum produto disponível no momento.</p>
            </div>
          )}

          {/* Store Hours - Only for traditional flyer */}
          {!isStoriesView && (
            <div className="bg-gray-800 text-white p-4 mt-6 text-center">
              <h3 className="font-bold text-lg mb-2">HORÁRIO DE ATENDIMENTO</h3>
              <p className="text-sm">DE SEGUNDA A SÁBADO DAS 8:00 ÀS 18:00 HORAS</p>
            </div>
          )}
          
          {/* Stories CTA */}
          {isStoriesView && filteredProducts.length > 0 && (
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-2">💬 Entre em contato!</h3>
                <p className="text-gray-600 mb-4">Interessado em algum produto? Fale conosco!</p>
                {store.whatsapp && (
                  <a 
                    href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=Olá! Vi suas ofertas no Click Ofertas Paraguai e gostaria de mais informações.`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-600 transition-colors cursor-pointer relative z-10"
                    data-testid={`whatsapp-store-${store.slug}`}
                  >
                    <span>📱</span>
                    <span>{store.whatsapp}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {!isStoriesView && (
          <FlyerFooter 
            store={store} 
            onDirectionsClick={handleDirections}
          />
        )}
      </div>
      
      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        store={store}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Instagram Story Viewer Modal */}
      <Dialog open={!!viewingStory} onOpenChange={(open) => !open && setViewingStory(null)}>
        <DialogContent className="p-0 max-w-sm mx-auto bg-black/90 border-0 rounded-3xl overflow-hidden">
          {viewingStory && (
            <div className="relative aspect-[9/16] bg-black">
              {/* Mídia do Story */}
              {viewingStory.mediaType === 'image' ? (
                <img
                  src={viewingStory.mediaUrl}
                  alt={viewingStory.productName || 'Story'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback em caso de erro na imagem
                    e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><rect width="400" height="600" fill="%23666"/><text x="200" y="300" text-anchor="middle" fill="white" font-size="30">📷 Story</text></svg>';
                  }}
                />
              ) : (
                <video
                  src={viewingStory.mediaUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                />
              )}
              
              {/* Overlay superior com info da loja */}
              <div className="absolute top-4 left-4 right-4 flex items-center gap-3">
                <Avatar className="w-8 h-8 border-2 border-white" style={{filter: 'drop-shadow(1px 1px 3px rgba(0,0,0,0.7)) drop-shadow(-1px -1px 2px rgba(0,0,0,0.7))'}}>
                  <AvatarImage src={viewingStory.store.logoUrl} alt={viewingStory.store.name} />
                  <AvatarFallback className="text-xs">
                    {viewingStory.store.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>{viewingStory.store.name}</p>
                  <p className="text-white font-normal text-xs" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>há {Math.round((Date.now() - new Date(viewingStory.createdAt).getTime()) / 3600000)}h</p>
                </div>
              </div>
              
              {/* Info do produto no centro */}
              {viewingStory.isProductPromo && (
                <div className="absolute bottom-20 left-4 right-4">
                  <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-4">
                    <h3 className="text-white font-bold text-lg mb-1">
                      {viewingStory.productName}
                    </h3>
                    {viewingStory.productPrice && (
                      <div className="flex items-center gap-2">
                        {viewingStory.productDiscountPrice && (
                          <span className="text-gray-300 line-through text-sm">
                            {viewingStory.productPrice}
                          </span>
                        )}
                        <span className="text-yellow-400 font-bold text-xl">
                          {viewingStory.productDiscountPrice || viewingStory.productPrice}
                        </span>
                      </div>
                    )}
                    {viewingStory.caption && (
                      <p className="text-white/90 text-sm mt-2">{viewingStory.caption}</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Stats e ações no bottom */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-4 text-white">
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    <span className="text-sm">{viewingStory.likesCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">{viewingStory.viewsCount}</span>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewingStory(null)}
                  className="text-white hover:bg-white/10"
                >
                  ✕
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}