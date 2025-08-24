import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Box, Star, Eye, Clock, Plus, Link, ExternalLink, DollarSign } from "lucide-react";
import { Link as RouterLink } from "wouter";
import type { Store, Product } from "@shared/schema";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

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

  const { data: store, isLoading: storeLoading, error: storeError } = useQuery<Store>({
    queryKey: ["/api/stores/me"],
    retry: false,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/stores", store?.id, "products"],
    enabled: !!store?.id,
    retry: false,
  });

  // Buscar cotação do dólar
  const { data: dollarRate, isLoading: dollarLoading } = useQuery<{
    rate: number;
    lastUpdate: string;
    source: string;
  }>({
    queryKey: ['/api/currency/usd-brl'],
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 minutos
  });

  const copyLinkMutation = useMutation({
    mutationFn: async () => {
      if (!store?.slug) throw new Error("Store not found");
      const link = `${window.location.origin}/flyer/${store.slug}`;
      await navigator.clipboard.writeText(link);
      return link;
    },
    onSuccess: () => {
      toast({
        title: "Link copiado!",
        description: "Link público copiado para a área de transferência",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Erro",
        description: "Falha ao copiar link",
        variant: "destructive",
      });
    },
  });

  if (isLoading || storeLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (storeError && !store) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Configure sua loja</h2>
          <p className="text-gray-600 mb-6">
            Para começar a criar panfletos, configure primeiro os dados da sua loja.
          </p>
          <RouterLink href="/admin/config">
            <Button className="bg-primary text-white hover:bg-blue-600" data-testid="button-configure-store">
              <Plus className="w-4 h-4 mr-2" />
              Configurar Loja
            </Button>
          </RouterLink>
        </div>
      </AdminLayout>
    );
  }

  const activeProducts = products.filter(p => p.isActive);
  const featuredProducts = products.filter(p => p.isFeatured && p.isActive);
  const publicLink = store?.slug ? `${window.location.origin}/flyer/${store.slug}` : '';

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Produtos Ativos</p>
                  <p className="text-3xl font-bold text-gray-900" data-testid="text-active-products">
                    {activeProducts.length}
                  </p>
                </div>
                <Box className="text-primary text-2xl" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Em Destaque</p>
                  <p className="text-3xl font-bold text-gray-900" data-testid="text-featured-products">
                    {featuredProducts.length}
                  </p>
                </div>
                <Star className="text-accent text-2xl" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Visualizações</p>
                  <p className="text-3xl font-bold text-gray-900">--</p>
                </div>
                <Eye className="text-secondary text-2xl" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cotação USD/BRL</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="text-dollar-rate">
                    {dollarLoading ? "..." : dollarRate ? `R$ ${Number(dollarRate.rate).toFixed(2)}` : "--"}
                  </p>
                  {dollarRate?.lastUpdate && (
                    <p className="text-xs text-gray-500">
                      Atualizado: {new Date(dollarRate.lastUpdate).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                <DollarSign className="text-green-600 text-2xl" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
              <div className="space-y-3">
                <RouterLink href="/admin/products">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between p-4 h-auto hover:bg-gray-100"
                    data-testid="button-add-product"
                  >
                    <div className="flex items-center space-x-3">
                      <Plus className="text-primary" />
                      <span className="font-medium">Adicionar Produto</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </Button>
                </RouterLink>

                <Button 
                  variant="ghost" 
                  className="w-full justify-between p-4 h-auto hover:bg-gray-100"
                  onClick={() => copyLinkMutation.mutate()}
                  disabled={copyLinkMutation.isPending || !store?.slug}
                  data-testid="button-copy-link"
                >
                  <div className="flex items-center space-x-3">
                    <Link className="text-secondary" />
                    <span className="font-medium">Copiar Link Público</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </Button>

                <RouterLink href="/admin/preview">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between p-4 h-auto hover:bg-gray-100"
                    data-testid="button-preview"
                  >
                    <div className="flex items-center space-x-3">
                      <Eye className="text-accent" />
                      <span className="font-medium">Visualizar Panfleto</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </Button>
                </RouterLink>
              </div>
            </CardContent>
          </Card>

          {/* Public Link */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Link Público</h3>
              {store?.slug ? (
                <>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-2">Compartilhe este link:</p>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        value={publicLink}
                        className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm" 
                        readOnly
                        data-testid="input-public-link"
                      />
                      <Button 
                        onClick={() => copyLinkMutation.mutate()} 
                        disabled={copyLinkMutation.isPending}
                        className="bg-primary text-white hover:bg-blue-600"
                        data-testid="button-copy-public-link"
                      >
                        <Link className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <Button 
                      className="flex-1 bg-green-500 text-white hover:bg-green-600"
                      onClick={() => {
                        const message = `Confira as ofertas imperdíveis! ${publicLink}`;
                        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                        window.open(whatsappUrl, '_blank');
                      }}
                      data-testid="button-share-whatsapp"
                    >
                      WhatsApp
                    </Button>
                    <Button 
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                      data-testid="button-share-instagram"
                    >
                      Instagram
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-4">Configure sua loja para gerar o link público</p>
                  <RouterLink href="/admin/config">
                    <Button className="bg-primary text-white hover:bg-blue-600" data-testid="button-configure-link">
                      Configurar Loja
                    </Button>
                  </RouterLink>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
