import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ModernAdminLayout from "@/components/modern-admin-layout";

// Importar componentes funcionais existentes
import AdminStoreConfig from "@/pages/admin-store-config";
import AdminProducts from "@/pages/admin-products";
import AdminPromotions from "@/pages/admin-promotions";
import AdminStories from "@/pages/admin-stories";
import AdminTotem from "@/pages/admin-totem";
import AdminAnalytics from "@/pages/admin-analytics";
import AdminWiFi from "@/pages/admin-wifi";
import AdminPremiumStores from "@/pages/admin-premium-stores";

// Importar componentes específicos do admin
import BannersManager from "@/components/admin-sections/banners-manager";
import CategoriesManager from "@/components/admin-sections/categories-manager";
import UsersManager from "@/components/admin-sections/users-manager";
import AITestManager from "@/components/admin-sections/ai-test-manager";

// Dashboard components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Box, Eye, DollarSign, Camera, Settings, Users, Store, Image, 
  BarChart3, Package, Gift, Monitor, Database, Brain, Plus
} from "lucide-react";
import type { Store as StoreType, Product } from "@shared/schema";

export default function FunctionalAdminDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");

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

  const { data: store, isLoading: storeLoading } = useQuery<StoreType>({
    queryKey: ["/api/stores/me"],
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/stores", store?.id, "products"],
    enabled: !!store?.id,
    staleTime: 30 * 1000,
    retry: false,
  });

  const { data: dollarRate, isLoading: dollarLoading } = useQuery<{
    rate: number;
    lastUpdate: string;
    source: string;
  }>({
    queryKey: ['/api/currency/usd-brl'],
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header de boas-vindas */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl shadow-lg text-white p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Painel Administrativo Unificado! 🚀
            </h1>
            <p className="text-red-100">
              {store?.name ? `Gerenciando ${store.name}` : 'Carregando informações da loja...'}
            </p>
          </div>
          
          {store?.slug && (
            <div className="mt-4 md:mt-0">
              <Button 
                variant="secondary" 
                size="lg"
                onClick={() => window.open(`/flyer/${store.slug}`, '_blank')}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Eye className="w-5 h-5 mr-2" />
                Visualizar Loja
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total de Produtos</p>
                <p className="text-3xl font-bold text-blue-700" data-testid="text-total-products">
                  {productsLoading ? "..." : products.length}
                </p>
              </div>
              <Box className="text-blue-500 text-3xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Produtos Ativos</p>
                <p className="text-3xl font-bold text-green-700" data-testid="text-active-products">
                  {productsLoading ? "..." : products.filter(p => p.isActive).length}
                </p>
              </div>
              <Eye className="text-green-500 text-3xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Cotação USD/BRL</p>
                <p className="text-2xl font-bold text-purple-700" data-testid="text-dollar-rate">
                  {dollarLoading ? "..." : dollarRate ? `R$ ${dollarRate.rate.toFixed(2)}` : "N/A"}
                </p>
                {dollarRate && (
                  <p className="text-xs text-purple-500">{dollarRate.source}</p>
                )}
              </div>
              <DollarSign className="text-purple-500 text-3xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Status da Loja</p>
                <p className="text-lg font-bold text-orange-700">
                  {store?.isActive ? '🟢 Ativa' : '🔴 Inativa'}
                </p>
              </div>
              <Store className="text-orange-500 text-3xl" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações rápidas organizadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loja */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-600" />
              Gerenciar Loja
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center space-y-2"
                onClick={() => setActiveSection("config")}
              >
                <Settings className="w-6 h-6 text-gray-600" />
                <span className="text-sm">Configurações</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center space-y-2"
                onClick={() => setActiveSection("products")}
              >
                <Package className="w-6 h-6 text-gray-600" />
                <span className="text-sm">Produtos</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center space-y-2"
                onClick={() => setActiveSection("promotions")}
              >
                <Gift className="w-6 h-6 text-gray-600" />
                <span className="text-sm">Promoções</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center space-y-2"
                onClick={() => setActiveSection("stories")}
              >
                <Camera className="w-6 h-6 text-gray-600" />
                <span className="text-sm">Stories</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Marketing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              Marketing & Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center space-y-2"
                onClick={() => setActiveSection("banners")}
              >
                <Image className="w-6 h-6 text-gray-600" />
                <span className="text-sm">Banners</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center space-y-2"
                onClick={() => setActiveSection("analytics")}
              >
                <BarChart3 className="w-6 h-6 text-gray-600" />
                <span className="text-sm">Analytics</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center space-y-2"
                onClick={() => setActiveSection("stats")}
              >
                <BarChart3 className="w-6 h-6 text-gray-600" />
                <span className="text-sm">Estatísticas</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center space-y-2"
                onClick={() => setActiveSection("totem")}
              >
                <Monitor className="w-6 h-6 text-gray-600" />
                <span className="text-sm">Totem</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Produtos recentes */}
      {products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Produtos Recentes
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveSection("products")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ver Todos
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.slice(0, 8).map((product) => (
                <div key={product.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white">
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
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                      {product.category && <span>{product.category}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderSectionContent = () => {
    // Renderizar componentes funcionais reais baseado na seção ativa
    switch (activeSection) {
      case "dashboard":
        return renderDashboard();
        
      // === LOJA ===
      case "config":
        return <AdminStoreConfig />;
      case "products":
        return <AdminProducts />;
      case "promotions":
        return <AdminPromotions />;
      case "stories":
        return <AdminStories />;
      case "totem":
        return <AdminTotem />;
        
      // === MARKETING ===
      case "banners":
        return <BannersManager />;
      case "analytics":
        return <AdminAnalytics />;
      case "stats":
        return <AdminAnalytics />;
        
      // === SISTEMA ===
      case "users":
        return <UsersManager />;
      case "stores":
        return <AdminPremiumStores />;
      case "wifi":
        return <AdminWiFi />;
      case "categories":
        return <CategoriesManager />;
      case "product-banks":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Database className="w-7 h-7 text-green-600" />
                Banco de Produtos
              </h2>
              <p className="text-gray-500 mt-1">
                Funcionalidade em desenvolvimento - gerencie o banco de produtos global
              </p>
            </div>
          </div>
        );
      case "system":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-7 h-7 text-gray-600" />
                Configurações do Sistema
              </h2>
              <p className="text-gray-500 mt-1">
                Funcionalidade em desenvolvimento - configurações avançadas do sistema
              </p>
            </div>
          </div>
        );
        
      // === IA ===
      case "ai-test":
        return <AITestManager />;
      case "ai-arts":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Brain className="w-7 h-7 text-purple-600" />
                Gestão de Artes IA
              </h2>
              <p className="text-gray-500 mt-1">
                Funcionalidade em desenvolvimento - gerencie todas as artes geradas pela IA
              </p>
            </div>
          </div>
        );
        
      default:
        return renderDashboard();
    }
  };

  if (isLoading || storeLoading) {
    return (
      <ModernAdminLayout activeSection={activeSection} onSectionChange={setActiveSection}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando painel funcional...</p>
        </div>
      </ModernAdminLayout>
    );
  }

  return (
    <ModernAdminLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderSectionContent()}
    </ModernAdminLayout>
  );
}