import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Share, Download, Printer, MoreVertical, Filter, Gift, Camera, Heart, Eye, Bookmark, BarChart3 } from "lucide-react";
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
  const [, directSlugParams] = useRoute("/:slug");  // Nova rota para slugs diretos
  const params = flyerParams || storeParams || directSlugParams;
  
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
  const [likedStories, setLikedStories] = useState<Set<string>>(new Set());
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
    staleTime: 5 * 60 * 1000, // 5 minutos - otimizado para mobile
    gcTime: 15 * 60 * 1000, // 15 minutos - otimizado para mobile
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false, // Evita refetch desnecessário
    enabled: isStoriesView, // Só busca quando é stories
  });

  // Buscar os novos Instagram Stories
  const { data: instagramStories = [], isLoading: storiesLoading } = useQuery<InstagramStory[]>({
    queryKey: ['/api/instagram-stories'],
    refetchInterval: 60000, // Atualizar a cada 60 segundos - otimizado para mobile
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

  // Performance optimization: removed debug logs

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
      // Promotions received successfully
      return data;
    },
    enabled: !!params?.slug,
    staleTime: 30 * 1000, // 30 segundos - mais fresco para raspadinhas
    gcTime: 3 * 60 * 1000, // 3 minutos - otimizado para mobile
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
  
  // Estado para remoção local de promoções (UX imediata)
  const [removedPromotions, setRemovedPromotions] = useState<string[]>([]);
  
  // Filtrar promoções removidas localmente
  const activePromotions = (promotionsResponse?.promotions || []).filter(
    (promo: any) => !removedPromotions.includes(promo.id)
  );
  
  
  // Callback para remoção local imediata de promoções
  const handlePromotionRevealed = (product: any) => {
    console.log('🎯 Promoção removida localmente:', product.id);
    setRemovedPromotions(prev => [...prev, product.id]);
  };

  // Registrar visualização do panfleto/loja quando carregado
  // CORREÇÃO: Removido recordFlyerView das dependências para evitar loop infinito
  useEffect(() => {
    if (store?.id && !isStoriesView) {
      // Store view tracking
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
      await downloadFlyerAsPNG('flyer-content', store.name);
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
    imageUrl2: null,
    imageUrl3: null,
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
    scratchTimeLimitMinutes: null,
    scratchBackgroundColor: null,
    maxScratchRedemptions: null,
    currentScratchRedemptions: null,
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
      <div id="flyer-content" className="max-w-6xl mx-auto bg-white shadow-lg">
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
                    <span className="text-3xl">{store.name.charAt(0)}</span>
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
          /* YouTube-Style Channel Layout */
          <>
            {/* YouTube-Style Banner */}
            <div className="relative h-36 md:h-48 bg-gradient-to-br from-purple-600 via-pink-600 to-red-500 overflow-hidden">
              {/* Banner Background Image (if available) */}
              {store.bannerUrl && (
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
                  style={{ backgroundImage: `url(${store.bannerUrl})` }}
                />
              )}
              
              {/* Banner Content */}
              <div className="relative z-10 h-full flex items-start justify-center p-8 pt-16">
                <div className="text-center">
                  <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-2xl tracking-wider transform -rotate-2">
                    {store.bannerText || store.name.toUpperCase()}
                  </h1>
                  {store.bannerSubtext && (
                    <p className="text-lg md:text-xl text-white/90 mt-2 font-semibold drop-shadow-lg">
                      {store.bannerSubtext}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/30"></div>
            </div>

            {/* Channel Info Section */}
            <div className="bg-white border-b">
              <div className="px-3 py-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {store.logoUrl ? (
                      <img 
                        src={store.logoUrl} 
                        alt={store.name}
                        className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover shadow-xl ring-4 ring-white"
                      />
                    ) : (
                      <div 
                        className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white font-bold shadow-xl ring-4 ring-white"
                        style={{ backgroundColor: store.themeColor || '#E11D48' }}
                      >
                        <span className="text-2xl md:text-3xl">{store.name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Store Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{store.name}</h2>
                    
                    {/* Statistics */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                      <span className="flex items-center gap-1">
                        <span className="font-semibold">{filteredProducts.length}</span>
                        produto{filteredProducts.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="flex items-center gap-1">
                        <span className="font-semibold">{activePromotions.length}</span>
                        promoção{activePromotions.length !== 1 ? 'ões' : 'ão'}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="flex items-center gap-1">
                        <span className="font-semibold">1.2k</span>
                        visualizações
                      </span>
                    </div>
                    
                    {/* Description */}
                    <p className="text-gray-700 text-sm md:text-base leading-relaxed mb-4">
                      {store.address || "Sua loja de confiança com os melhores preços e atendimento especializado."}
                    </p>
                    
                    {/* Contact Links */}
                    <div className="flex flex-wrap items-center gap-4">
                      {store.whatsapp && (
                        <a 
                          href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=Olá! Vi suas ofertas no Click Ofertas Paraguai e gostaria de mais informações.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
                          data-testid={`whatsapp-link-${store.slug}`}
                        >
                          📱 WhatsApp
                        </a>
                      )}
                      {store.instagram && (
                        <a 
                          href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-600 hover:text-pink-700 transition-colors flex items-center gap-2 text-sm font-medium"
                          data-testid={`instagram-link-${store.slug}`}
                        >
                          📸 Instagram
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <div className="flex-shrink-0">
                    <Button 
                      variant="default" 
                      className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white px-6 py-2 rounded-full font-semibold shadow-lg"
                      onClick={() => {
                        if (store.whatsapp) {
                          window.open(`https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=Olá! Vi suas ofertas no Click Ofertas Paraguai e gostaria de mais informações.`, '_blank');
                        }
                      }}
                    >
                      Conectar
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white border-b">
              <div className="px-3">
                <div className="flex items-center gap-8">
                  <button className="py-4 px-2 text-sm font-medium text-gray-900 border-b-2 border-red-600">
                    Produtos
                  </button>
                  <button className="py-4 px-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                    Promoções
                  </button>
                  <button className="py-4 px-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                    Stories
                  </button>
                  <button className="py-4 px-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                    Sobre
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-gray-50 border-b">
              <div className="px-3 py-3">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Filtros:</span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="bg-gray-900 text-white hover:bg-gray-800">
                      Mais recentes
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-200">
                      Em alta
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-200">
                      Mais antigo
                    </Button>
                    {sortedCategories.length > 1 && (
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-48 h-8 text-sm">
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
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className={`${isStoriesView ? 'p-6' : 'p-6'}`}>
          
          {/* Stories Counter */}
          {isStoriesView && (
            <div className="text-center mb-6">
              <p className="text-gray-600">
                <span className="font-semibold">{activeProducts.length}</span> produtos em destaque
              </p>
            </div>
          )}


          {/* YouTube-Style Products Grid */}
          {filteredProducts.length > 0 || virtualClones.length > 0 ? (
            params ? (
              // YouTube-style grid layout
              <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {/* PRODUTOS ORIGINAIS + PROMOÇÕES COM RASPADINHA */}
                {filteredProducts.map((product) => {
                  
                  return product.isScratchCard ? (
                    // PROMOÇÃO REAL: Scratch Card com mesmo layout
                    <ScratchCard
                      key={product.id}
                      product={product}
                      currency={store?.currency || 'USD'}
                      themeColor={store?.themeColor || '#E11D48'}
                      logoUrl={store?.logoUrl || undefined}
                      onClick={(product) => {
                        setSelectedProduct(product);
                        setSelectedStore(store || null);
                      }}
                    />
                  ) : (
                    // PRODUTO NORMAL: YouTube-style Product Card
                    <div 
                      key={product.id} 
                      className={`group cursor-pointer pb-4 mb-4 rounded-lg overflow-hidden ${
                        product.isFeatured 
                          ? 'border border-gray-200' 
                          : 'border border-gray-200'
                      }`}
                      style={product.isFeatured ? {
                        boxShadow: 'inset 0 0 0 1px #ef4444'
                      } : {}}
                      onClick={() => {
                        setSelectedProduct(product);
                        setSelectedStore(store || null);
                      }}
                    >
                      <div className={`relative ${product.isFeatured ? 'bg-white rounded-md' : ''}`}>
                        {/* Thumbnail */}
                        <div className="relative aspect-[4/3] sm:aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                              <span className="text-gray-600 text-4xl">📦</span>
                            </div>
                          )}
                          
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all">
                            {/* Duration badge - Hidden on mobile */}
                            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded hidden sm:block">
                              {store?.currency || 'USD'} {parseFloat(product.price).toLocaleString()}
                            </div>
                            
                          </div>
                        </div>
                        
                        {/* Info estilo YouTube */}
                        <div className="mt-3 px-3">
                          <h3 className="font-medium text-sm text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors text-left mb-4 sm:mb-1">
                            {product.name}
                          </h3>
                          <div className="mb-4 sm:mb-1 text-left">
                            {/* Preço USD em vermelho - só no mobile */}
                            <p className="text-sm text-red-600 font-medium mb-1 sm:hidden">
                              {store?.currency || 'USD'} {parseFloat(product.price).toLocaleString()}
                            </p>
                            {/* Preço BRL */}
                            <p className="text-xs text-gray-500">
                              R$ {(parseFloat(product.price) * 5.47).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </p>
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex items-center justify-center gap-2 sm:gap-4 mt-auto pt-0 sm:pt-2 sm:border-t sm:border-gray-100 -mx-3 px-3 sm:mx-0">
                            <button className="hidden sm:flex flex-col items-center gap-0 sm:gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors">
                              <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="text-xs sm:text-xs">Curtir</span>
                            </button>
                            <button className="flex flex-col items-center gap-0 sm:gap-1 text-xs text-gray-500 hover:text-blue-500 transition-colors">
                              <Bookmark className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="text-xs sm:text-xs">Salvar</span>
                            </button>
                            <button className="flex flex-col items-center gap-0 sm:gap-1 text-xs text-gray-500 hover:text-green-500 transition-colors">
                              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="text-xs sm:text-xs">Comparar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
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
              // YouTube-style grid também para layout compacto
              <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredProducts.map((product) => {
                  const isRealPromotion = activePromotions.some(promo => promo.id === product.id);
                  
                  return isRealPromotion ? (
                    // PROMOÇÃO REAL: YouTube-style Scratch Card
                    <div key={product.id} className="group cursor-pointer">
                      <div className="relative">
                        {/* Thumbnail de promoção */}
                        <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                            <div className="text-white text-center">
                              <div className="text-4xl mb-2">🎁</div>
                              <div className="font-bold text-lg">RASPE E GANHE</div>
                              <div className="text-sm opacity-90">Desconto especial</div>
                            </div>
                          </div>
                          {/* Play button overlay */}
                          <div 
                            className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-all cursor-pointer"
                            onClick={() => {
                              setSelectedProduct(product);
                              setSelectedStore(store || null);
                            }}
                          >
                            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white">
                              <span className="text-xl">🎁</span>
                            </div>
                          </div>
                          {/* Badge de promoção */}
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                            PROMO
                          </div>
                        </div>
                        
                        {/* Video info */}
                        <div className="flex gap-3 mt-3 px-3">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <div 
                              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                              style={{ backgroundColor: store?.themeColor || '#E11D48' }}
                            >
                              {store.name.charAt(0)}
                            </div>
                          </div>
                          
                          {/* Title and details */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                              {product.name}
                            </h3>
                            <div className="mt-1">
                              <p className="text-xs font-semibold text-red-600">
                                ${parseFloat(product.scratchPrice || '0').toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                R$ {(parseFloat(product.scratchPrice || '0') * 5.47).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </p>
                            </div>
                            
                            {/* Action buttons for promotions */}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                              <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors">
                                <Heart className="w-3 h-3" />
                                <span>Curtir</span>
                              </button>
                              <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-500 transition-colors">
                                <Bookmark className="w-3 h-3" />
                                <span>Salvar</span>
                              </button>
                              <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-500 transition-colors">
                                <BarChart3 className="w-3 h-3" />
                                <span>Comparar</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // PRODUTO NORMAL: YouTube-style Product Card
                    <div 
                      key={product.id} 
                      className={`group cursor-pointer pb-4 mb-4 rounded-lg overflow-hidden ${
                        product.isFeatured 
                          ? 'border border-red-500' 
                          : 'border border-gray-200'
                      }`}
                      onClick={() => {
                        setSelectedProduct(product);
                        setSelectedStore(store || null);
                      }}
                    >
                      <div className="relative">
                        {/* Thumbnail */}
                        <div className="relative aspect-[4/3] sm:aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
                            {product.imageUrl ? (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                                <span className="text-gray-600 text-4xl">📦</span>
                              </div>
                            )}
                            
                            {/* Overlay com preço */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all">
                              {/* Preço */}
                              <div className="absolute bottom-2 right-2 bg-black/80 text-yellow-400 text-xs px-2 py-1 rounded font-semibold">
                                {store?.currency || 'USD'} {parseFloat(product.price).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </div>
                            </div>
                        </div>
                        
                        {/* Info estilo YouTube */}
                        <div className="mt-3 px-3">
                          <h3 className="font-medium text-sm text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors text-left mb-4 sm:mb-1">
                            {product.name}
                          </h3>
                          <div className="mb-4 sm:mb-1 text-left">
                            {/* Preço USD em vermelho - só no mobile */}
                            <p className="text-sm text-red-600 font-medium mb-1 sm:hidden">
                              {store?.currency || 'USD'} {parseFloat(product.price).toLocaleString()}
                            </p>
                            {/* Preço BRL */}
                            <p className="text-xs text-gray-500">
                              R$ {(parseFloat(product.price) * 5.47).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </p>
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex items-center justify-center gap-2 sm:gap-4 mt-auto pt-0 sm:pt-2 sm:border-t sm:border-gray-100 -mx-3 px-3 sm:mx-0">
                            <button className="hidden sm:flex flex-col items-center gap-0 sm:gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors">
                              <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="text-xs sm:text-xs">Curtir</span>
                            </button>
                            <button className="flex flex-col items-center gap-0 sm:gap-1 text-xs text-gray-500 hover:text-blue-500 transition-colors">
                              <Bookmark className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="text-xs sm:text-xs">Salvar</span>
                            </button>
                            <button className="flex flex-col items-center gap-0 sm:gap-1 text-xs text-gray-500 hover:text-green-500 transition-colors">
                              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="text-xs sm:text-xs">Comparar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
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
        <DialogContent className="p-0 max-w-sm mx-auto bg-black/90 border-0 rounded-3xl overflow-hidden [&>button]:absolute [&>button]:right-4 [&>button]:top-4 [&>button]:z-50 [&>button]:text-white [&>button]:bg-black/30 [&>button]:backdrop-blur-sm [&>button]:rounded-full [&>button]:w-8 [&>button]:h-8 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:hover:bg-black/50 [&>button]:transition-all [&>button]:shadow-lg">
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
              <div className="absolute top-0 left-0 right-0">
                <div className="bg-black/15 backdrop-blur-sm pt-8 pb-3 px-3 flex items-center gap-3">
                  <Avatar className="w-8 h-8 border-2 border-white">
                    <AvatarImage src="" alt={viewingStory.store.name} />
                    <AvatarFallback className="text-xs">
                      {viewingStory.store.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{viewingStory.store.name}</p>
                    <p className="text-white/90 font-light text-xs">há {Math.round((Date.now() - new Date(viewingStory.createdAt).getTime()) / 3600000)}h</p>
                  </div>
                </div>
              </div>
              
              {/* Info do produto no rodapé */}
              {viewingStory.isProductPromo && (
                <div className="absolute bottom-0 left-0 right-0">
                  <div className="bg-black/60 backdrop-blur-sm p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-sm mb-1">
                        {viewingStory.productName}
                      </h3>
                      {viewingStory.productPrice && (
                        <div className="flex items-center gap-2">
                          {viewingStory.productDiscountPrice && (
                            <span className="text-gray-300 line-through text-xs">
                              ${viewingStory.productPrice?.replace('Gs.', '').replace('.', ',')}
                            </span>
                          )}
                          <span className="text-white font-bold text-base">
                            ${(viewingStory.productDiscountPrice || viewingStory.productPrice)?.replace('Gs.', '').replace('.', ',')}
                          </span>
                        </div>
                      )}
                      {viewingStory.caption && (
                        <p className="text-white/90 text-xs mt-1">{viewingStory.caption}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <button 
                        className="text-white/80 hover:text-red-400 transition-colors focus:outline-none focus:ring-0 active:outline-none"
                        onClick={() => {
                          const storyId = viewingStory.id;
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
                            likedStories.has(viewingStory?.id) 
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
                              title: viewingStory.productName || 'Produto em oferta',
                              text: `Confira esta oferta: ${viewingStory.productName}`,
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}