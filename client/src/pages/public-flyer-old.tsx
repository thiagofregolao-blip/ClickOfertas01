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
    retry: false,
  });

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Promoções ${store?.name}`,
          text: `Confira as ofertas imperdíveis do ${store?.name}!`,
          url: window.location.href
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copiado!",
        description: "Link copiado para a área de transferência",
      });
    }
  };

  const handleDownloadPNG = async () => {
    if (!store) return;
    
    setIsDownloading(true);
    try {
      await downloadFlyerAsPNG('flyer-content', `${store.name}-panfleto`);
      toast({
        title: "Download concluído!",
        description: "Panfleto baixado como imagem PNG",
      });
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar a imagem",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleContactWhatsApp = () => {
    if (!store?.whatsapp) return;
    
    const message = `Olá! Vi as promoções do ${store.name} e gostaria de mais informações.`;
    const whatsappNumber = store.whatsapp.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleContactInstagram = () => {
    if (!store?.instagram) return;
    
    const username = store.instagram.replace('@', '');
    const instagramUrl = `https://instagram.com/${username}`;
    window.open(instagramUrl, '_blank');
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
        
        <div className="p-8">
          {activeProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                Em breve novas ofertas!
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Featured Products */}
              {featuredProducts.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center" style={{ color: store.themeColor || "#E11D48" }}>
                    ⭐ PRODUTOS EM DESTAQUE ⭐
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {featuredProducts.map((product) => (
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

              {/* Regular Products */}
              {regularProducts.length > 0 && (
                <div>
                  {featuredProducts.length > 0 && (
                    <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
                      MAIS OFERTAS
                    </h2>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {regularProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        currency={store.currency || "Gs."}
                        themeColor={store.themeColor || "#E11D48"}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <FlyerFooter 
          store={store} 
          onWhatsAppClick={handleContactWhatsApp}
          onInstagramClick={handleContactInstagram}
        />
      </div>

      {/* Bottom padding for mobile action bar */}
      <div className="lg:hidden h-20 no-print"></div>
    </div>
  );
}
