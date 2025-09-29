import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import AdminConsolidatedLayout from "@/components/admin-consolidated-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Box, Star, Eye, Clock, Plus, Link, ExternalLink, DollarSign, Camera, Settings, Users, Store, Image, BarChart3 } from "lucide-react";
import { Link as RouterLink } from "wouter";
import type { Store as StoreType, Product } from "@shared/schema";

export default function AdminConsolidatedDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
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

  const { data: store, isLoading: storeLoading, error: storeError } = useQuery<StoreType>({
    queryKey: ["/api/stores/me"],
    staleTime: 2 * 60 * 1000, // 2 minutos para dados da loja
    retry: false,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/stores", store?.id, "products"],
    enabled: !!store?.id,
    staleTime: 30 * 1000, // 30 segundos para produtos (mais dinâmicos)
    retry: false,
  });

  // Buscar cotação do dólar em paralelo (não depende da loja)
  const { data: dollarRate, isLoading: dollarLoading } = useQuery<{
    rate: number;
    lastUpdate: string;
    source: string;
  }>({
    queryKey: ['/api/currency/usd-brl'],
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // Revalida a cada 10 minutos
  });

  // Super admin stats (only for super admins)
  const { data: globalStats } = useQuery({
    queryKey: ['/api/super-admin/analytics/global-overview'],
    enabled: user?.isSuperAdmin,
    staleTime: 2 * 60 * 1000, // 2 minutos
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
          title: "Não autorizado",
          description: "Faça login novamente para continuar",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível copiar o link",
          variant: "destructive",
        });
      }
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const renderQuickActions = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <RouterLink href="/super-admin/products">
        <Button variant="outline" className="h-auto py-4 flex flex-col items-center space-y-2">
          <Box className="w-6 h-6" />
          <span className="text-sm">Produtos</span>
        </Button>
      </RouterLink>
      
      <RouterLink href="/super-admin/promotions">
        <Button variant="outline" className="h-auto py-4 flex flex-col items-center space-y-2">
          <Star className="w-6 h-6" />
          <span className="text-sm">Promoções</span>
        </Button>
      </RouterLink>
      
      <RouterLink href="/super-admin/stories">
        <Button variant="outline" className="h-auto py-4 flex flex-col items-center space-y-2">
          <Camera className="w-6 h-6" />
          <span className="text-sm">Stories</span>
        </Button>
      </RouterLink>
      
      <RouterLink href="/super-admin/config">
        <Button variant="outline" className="h-auto py-4 flex flex-col items-center space-y-2">
          <Settings className="w-6 h-6" />
          <span className="text-sm">Configurações</span>
        </Button>
      </RouterLink>
    </div>
  );

  const renderSuperAdminActions = () => (
    user?.isSuperAdmin && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <RouterLink href="/super-admin/banners">
          <Button variant="outline" className="h-auto py-4 flex flex-col items-center space-y-2 border-red-200 text-red-600 hover:bg-red-50">
            <Image className="w-6 h-6" />
            <span className="text-sm">Banners</span>
          </Button>
        </RouterLink>
        
        <RouterLink href="/super-admin/users">
          <Button variant="outline" className="h-auto py-4 flex flex-col items-center space-y-2 border-red-200 text-red-600 hover:bg-red-50">
            <Users className="w-6 h-6" />
            <span className="text-sm">Usuários</span>
          </Button>
        </RouterLink>
        
        <RouterLink href="/super-admin/stores">
          <Button variant="outline" className="h-auto py-4 flex flex-col items-center space-y-2 border-red-200 text-red-600 hover:bg-red-50">
            <Store className="w-6 h-6" />
            <span className="text-sm">Lojas</span>
          </Button>
        </RouterLink>
        
        <RouterLink href="/super-admin/analytics">
          <Button variant="outline" className="h-auto py-4 flex flex-col items-center space-y-2 border-red-200 text-red-600 hover:bg-red-50">
            <BarChart3 className="w-6 h-6" />
            <span className="text-sm">Analytics</span>
          </Button>
        </RouterLink>
      </div>
    )
  );

  if (isLoading || storeLoading) {
    return (
      <AdminConsolidatedLayout>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </AdminConsolidatedLayout>
    );
  }

  return (
    <AdminConsolidatedLayout>
      <div className="space-y-6">
        {/* Header with Store Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.isSuperAdmin ? "Painel Super Admin" : "Dashboard"}
              </h1>
              {store && (
                <p className="text-gray-600 mt-1">
                  {store.name} • {store.status === 'active' ? 'Ativo' : 'Inativo'}
                </p>
              )}
            </div>
            
            {store?.slug && (
              <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-2">
                <RouterLink href={`/flyer/${store.slug}`}>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Público
                  </Button>
                </RouterLink>
                
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => copyLinkMutation.mutate()}
                  disabled={copyLinkMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <Link className="w-4 h-4 mr-2" />
                  {copyLinkMutation.isPending ? 'Copiando...' : 'Copiar Link'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Produtos</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="text-total-products">
                    {productsLoading ? "..." : products.length}
                  </p>
                </div>
                <Box className="text-secondary text-2xl" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Produtos Ativos</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="text-active-products">
                    {productsLoading ? "..." : products.filter(p => p.isActive).length}
                  </p>
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
                    {dollarLoading ? "..." : dollarRate ? `R$ ${dollarRate.rate.toFixed(2)}` : "N/A"}
                  </p>
                  {dollarRate && (
                    <p className="text-xs text-gray-500">{dollarRate.source}</p>
                  )}
                </div>
                <DollarSign className="text-secondary text-2xl" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Super Admin Global Stats */}
        {user?.isSuperAdmin && globalStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-600">Total de Lojas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-700">{globalStats.totalStores || 0}</p>
              </CardContent>
            </Card>
            
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-600">Usuários Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-700">{globalStats.activeUsers || 0}</p>
              </CardContent>
            </Card>
            
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-600">Sessões Hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-700">{globalStats.sessionsToday || 0}</p>
              </CardContent>
            </Card>
            
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-600">Buscas Hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-700">{globalStats.searchesToday || 0}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
          {renderQuickActions()}
          {renderSuperAdminActions()}
        </div>

        {/* Recent Products */}
        {products.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Produtos Recentes</h2>
              <RouterLink href="/super-admin/products">
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Ver Todos
                </Button>
              </RouterLink>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.slice(0, 8).map((product) => (
                <div key={product.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  {product.imageUrl && (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <div className="p-3">
                    <h3 className="font-medium text-sm mb-1 line-clamp-2">{product.name}</h3>
                    {product.price && (
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(parseFloat(product.price.toString()))}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>{product.isActive ? "Ativo" : "Inativo"}</span>
                      {product.category && <span>{product.category}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminConsolidatedLayout>
  );
}