import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download, Share } from "lucide-react";
import ProductCard from "@/components/product-card";
import FlyerHeader from "@/components/flyer-header";
import FlyerFooter from "@/components/flyer-footer";
import type { Store, Product } from "@shared/schema";

export default function AdminPreview() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: store } = useQuery<Store>({
    queryKey: ["/api/stores/me"],
    retry: false,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/stores", store?.id, "products"],
    enabled: !!store?.id,
    retry: false,
  });

  const activeProducts = products.filter(p => p.isActive);
  const publicUrl = store?.slug ? `/flyer/${store.slug}` : "";

  const handleViewPublic = () => {
    if (publicUrl) {
      window.open(publicUrl, '_blank');
    }
  };

  const handleShare = async () => {
    if (!store?.slug) return;
    
    const url = `${window.location.origin}/flyer/${store.slug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Promoções ${store.name}`,
          text: `Confira as ofertas imperdíveis do ${store.name}!`,
          url: url
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copiado!",
        description: "Link público copiado para a área de transferência",
      });
    }
  };

  const handleDownload = () => {
    toast({
      title: "Em desenvolvimento",
      description: "Funcionalidade de download será implementada em breve",
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!store) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Configure sua loja primeiro para visualizar o panfleto.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Pré-visualização do Panfleto</h2>
                <p className="text-gray-600">
                  Veja como seu panfleto aparecerá para os clientes. {activeProducts.length} produtos ativos.
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={handleShare}
                  disabled={!store.slug}
                  data-testid="button-share-preview"
                >
                  <Share className="w-4 h-4 mr-2" />
                  Compartilhar
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleDownload}
                  data-testid="button-download-preview"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PNG
                </Button>
                
                <Button 
                  onClick={handleViewPublic}
                  disabled={!store.slug}
                  className="bg-primary text-white hover:bg-blue-600"
                  data-testid="button-view-public"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Versão Pública
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flyer Preview */}
        <div id="flyer-preview" className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
          <FlyerHeader store={store} />
          
          <div className="p-8">
            {activeProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg mb-4">
                  Nenhum produto ativo para exibir no panfleto
                </p>
                <p className="text-gray-500">
                  Adicione produtos e marque-os como ativos para aparecerem aqui
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeProducts.map((product) => (
                  <ProductCard 
                    key={product.id}
                    product={product}
                    currency={store.currency || "Gs."}
                    themeColor={store.themeColor || "#E11D48"}
                  />
                ))}
              </div>
            )}
          </div>
          
          <FlyerFooter store={store} />
        </div>

        {/* Instructions */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Próximos passos:</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Clique em "Ver Versão Pública" para abrir o link que seus clientes verão</p>
              <p>• Use "Compartilhar" para enviar por WhatsApp, Instagram ou outras redes</p>
              <p>• "Baixar PNG" gera uma imagem para salvar ou imprimir</p>
              <p>• Volte para "Produtos" para adicionar mais itens ou fazer ajustes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
