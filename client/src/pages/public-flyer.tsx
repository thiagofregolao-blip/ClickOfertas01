import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Share, Download, Printer, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProductCard from "@/components/product-card";
import FlyerHeader from "@/components/flyer-header";
import FlyerFooter from "@/components/flyer-footer";
import { downloadFlyerAsPNG } from "@/lib/flyer-utils";
import type { StoreWithProducts } from "@shared/schema";

export default function PublicFlyer() {
  const [, params] = useRoute("/flyer/:slug");
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [showActions, setShowActions] = useState(false);
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
    if (navigator.share && navigator.canShare) {
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
      await downloadFlyerAsPNG(store.name);
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

  const activeProducts = store.products.filter(p => p.isActive);
  
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

      {/* Flyer Content */}
      <div id="flyer-content" className="max-w-4xl mx-auto bg-white shadow-lg">
        <FlyerHeader store={store} />
        
        <div className="p-6">
          {/* Products Grid - Compact Layout */}
          {activeProducts.length > 0 ? (
            <div className="space-y-8">
              {/* Featured Products Section */}
              {activeProducts.some(p => p.isFeatured) && (
                <div>
                  <div 
                    className="text-white p-4 mb-6 text-center font-bold text-xl rounded-lg"
                    style={{ backgroundColor: store.themeColor || "#E11D48" }}
                  >
                    ⭐ OFERTAS EM DESTAQUE ⭐
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                    {activeProducts.filter(p => p.isFeatured).map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        currency={store.currency || "Gs."}
                        themeColor={store.themeColor || "#E11D48"}
                        showFeaturedBadge={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All Products by Category - Compact */}
              {sortedCategories.map((category) => {
                const categoryProducts = productsByCategory[category];
                
                // Emojis por categoria
                const categoryEmojis: { [key: string]: string } = {
                  'Perfumes': '🌸',
                  'Eletrônicos': '📱', 
                  'Pesca': '🎣',
                  'Geral': '🛒'
                };

                return (
                  <div key={category} className="mb-8">
                    {/* Category Title - Simple */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <span className="text-2xl">{categoryEmojis[category] || '🛒'}</span>
                      <h2 
                        className="text-2xl font-bold text-center"
                        style={{ color: store.themeColor || "#E11D48" }}
                      >
                        {category.toUpperCase()}
                      </h2>
                      <span 
                        className="text-white px-3 py-1 rounded-full text-sm font-medium"
                        style={{ backgroundColor: store.themeColor || "#E11D48" }}
                      >
                        {categoryProducts.length}
                      </span>
                    </div>

                    {/* Products Grid - 4 columns on large screens, 3 on medium, 2 on mobile */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {categoryProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          currency={store.currency || "Gs."}
                          themeColor={store.themeColor || "#E11D48"}
                          showFeaturedBadge={false}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Benefits Section */}
              <div 
                className="text-white p-6 rounded-lg mt-8"
                style={{ backgroundColor: store.themeColor || "#E11D48" }}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                      <span className="text-2xl">🚚</span>
                    </div>
                    <span className="text-sm font-medium">Entrega Rápida</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                      <span className="text-2xl">💳</span>
                    </div>
                    <span className="text-sm font-medium">Várias Formas de Pagamento</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                      <span className="text-2xl">✅</span>
                    </div>
                    <span className="text-sm font-medium">Qualidade Garantida</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                      <span className="text-2xl">💬</span>
                    </div>
                    <span className="text-sm font-medium">Atendimento 24h</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">Nenhum produto disponível no momento.</p>
            </div>
          )}
        </div>

        <FlyerFooter store={store} />
      </div>
    </div>
  );
}