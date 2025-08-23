import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Share, Download, Printer, MoreVertical, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import ProductCard from "@/components/product-card";
import FlyerHeader from "@/components/flyer-header";
import FlyerFooter from "@/components/flyer-footer";
import { downloadFlyerAsPNG } from "@/lib/flyer-utils";
import type { StoreWithProducts } from "@shared/schema";
import { InstagramStories } from "@/components/instagram-stories";

export default function PublicFlyer() {
  const [, flyerParams] = useRoute("/flyer/:slug");
  const [, storeParams] = useRoute("/stores/:slug");
  const params = flyerParams || storeParams;
  const isStoriesView = !!storeParams; // Detecta se é acesso via stories
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showInstagramStories, setShowInstagramStories] = useState(isStoriesView);
  const menuRef = useRef<HTMLDivElement>(null);

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
  });

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

  // Buscar todas as lojas para navegação entre stories
  const { data: allStores } = useQuery({
    queryKey: ['/api/public/stores'],
  });

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
                />
              ))}
            </div>
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
    </div>
  );
}