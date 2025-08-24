import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Share, Download, Printer, MoreVertical, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import ProductCard from "@/components/product-card";
import { ProductDetailModal } from "@/components/product-detail-modal";
import FlyerHeader from "@/components/flyer-header";
import FlyerFooter from "@/components/flyer-footer";
import { downloadFlyerAsPNG } from "@/lib/flyer-utils";
import type { StoreWithProducts, Product } from "@shared/schema";
import { InstagramStories } from "@/components/instagram-stories";
import { useEngagement } from "@/hooks/use-engagement";
import { useAppVersion } from "@/hooks/use-mobile";

/**
 * Página Pública dos Panfletos - Suporta duas versões:
 * 
 * VERSÃO MOBILE (Panfleto Rápido Mobile):
 * - Layout Instagram Stories para /stores/:slug
 * - Cards compactos e otimizados para touch
 * - Navegação por swipe e toque
 * 
 * VERSÃO DESKTOP (Panfleto Rápido Desktop):
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
    const handleOpenProductModal = (event: CustomEvent) => {
      const { product, store } = event.detail;
      setSelectedProduct(product);
      setSelectedStore(store);
    };
    
    window.addEventListener('openProductModal', handleOpenProductModal);
    return () => window.removeEventListener('openProductModal', handleOpenProductModal);
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
  const activeProducts = isStoriesView 
    ? store.products.filter(p => p.isActive && p.showInStories) // Só produtos dos stories
    : store.products.filter(p => p.isActive); // Todos produtos ativos
  
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

  // Show Instagram Stories if accessed via stories and has stories products
  if (showInstagramStories && store?.products.some(p => p.isActive && p.showInStories)) {
    return (
      <InstagramStories 
        store={store}
        allStores={allStores || []}
        onClose={() => setShowInstagramStories(false)}
      />
    );
  }

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
            
            {/* Stories Badge */}
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
          {filteredProducts.length > 0 ? (
            storeParams ? (
              // Layout moderno para páginas de loja individual (/stores/:slug)
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 group">
                    {/* Engagement Buttons */}
                    <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const isCurrentlyLiked = likedProducts.has(product.id);
                          
                          // Alternar like/unlike
                          setLikedProducts(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(product.id)) {
                              newSet.delete(product.id); // Descurtir
                            } else {
                              newSet.add(product.id); // Curtir
                            }
                            return newSet;
                          });
                          
                          // Criar animação de coração apenas quando curtir
                          if (!isCurrentlyLiked) {
                            // Simular createHeart aqui - você pode importar createHeart do hook se precisar
                            const rect = e.currentTarget.getBoundingClientRect();
                            const heartElement = document.createElement('div');
                            heartElement.innerHTML = '❤️';
                            heartElement.style.position = 'fixed';
                            heartElement.style.left = (e.clientX - 10) + 'px';
                            heartElement.style.top = (e.clientY - 10) + 'px';
                            heartElement.style.fontSize = '20px';
                            heartElement.style.pointerEvents = 'none';
                            heartElement.style.zIndex = '9999';
                            heartElement.style.animation = 'heartFloat 1.5s ease-out forwards';
                            document.body.appendChild(heartElement);
                            
                            setTimeout(() => {
                              document.body.removeChild(heartElement);
                            }, 1500);
                          }
                          
                          fetch(`/api/products/${product.id}/like`, { method: 'POST' });
                        }}
                        className="bg-white/90 hover:bg-white backdrop-blur-sm p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                        title={likedProducts.has(product.id) ? "Descurtir produto" : "Curtir produto"}
                      >
                        <svg className={`w-4 h-4 ${likedProducts.has(product.id) ? 'text-red-500 fill-red-500' : 'text-red-500'}`} fill={likedProducts.has(product.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fetch(`/api/products/${product.id}/save`, { method: 'POST' })
                            .then(res => res.ok ? alert('Produto salvo!') : alert('Faça login para salvar'));
                        }}
                        className="bg-white/90 hover:bg-white backdrop-blur-sm p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                        title="Salvar produto"
                      >
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    </div>
                    {/* Nome do produto - TOPO */}
                    <div className="p-4 pt-12 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                      <h3 className="font-bold text-lg text-gray-800 text-center line-clamp-2 min-h-[3.5rem] flex items-center justify-center">
                        {product.name}
                      </h3>
                      {product.isFeatured && (
                        <div className="flex justify-center mt-2">
                          <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs px-3 py-1 rounded-full shadow-md">
                            ⭐ Produto em Destaque
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Imagem do produto - CENTRO */}
                    <div className="relative h-56 bg-gray-100">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="text-6xl">📦</span>
                        </div>
                      )}
                      {product.category && (
                        <div className="absolute top-3 left-3">
                          <span className="bg-white/95 backdrop-blur-sm text-sm px-3 py-1 rounded-full text-gray-700 shadow-md border">
                            {product.category}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Descrição e preço - PARTE INFERIOR */}
                    <div className="p-6 bg-white">
                      {product.description && (
                        <p className="text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                      
                      {/* Preço e botão WhatsApp */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-gray-900">
                            {store.currency || "Gs."} {Number(product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        {/* Botão WhatsApp */}
                        {store.whatsapp && (
                          <button
                            onClick={() => {
                              const message = encodeURIComponent(
                                `🛍️ Olá! Tenho interesse no produto:\n\n*${product.name}*\n\nPreço: ${store.currency || "Gs."} ${Number(product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nPoderia me dar mais informações?`
                              );
                              const whatsappNumber = store.whatsapp!.replace(/\D/g, '');
                              const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
                              window.open(whatsappUrl, '_blank');
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                            title="Perguntar no WhatsApp"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                            </svg>
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Layout original para flyers normais (/flyer/:slug)
              <div className={`grid gap-${isStoriesView ? '6' : '3'} ${
                isStoriesView 
                  ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
                  : 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
              }`}>
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    currency={store.currency || "Gs."}
                    themeColor={store.themeColor || "#E11D48"}
                    showFeaturedBadge={product.isFeatured || false}
                    enableEngagement={true}
                    onClick={(product) => setSelectedProduct(product)}
                  />
                ))}
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
                    href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-600 transition-colors cursor-pointer"
                  >
                    <span>📱</span>
                    <span>{store.whatsapp}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {!isStoriesView && <FlyerFooter store={store} />}
      </div>
      
      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        store={store}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}