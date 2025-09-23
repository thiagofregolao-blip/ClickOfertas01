import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import Landing from "@/pages/landing";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminStoreConfig from "@/pages/admin-store-config";
import AdminProducts from "@/pages/admin-products";
import AdminPromotions from "@/pages/admin-promotions";
import AdminPremiumStores from "@/pages/admin-premium-stores";
import AdminTotem from "@/pages/admin-totem";
import AdminStories from "@/pages/admin-stories";
import Analytics from "@/pages/analytics";
import AdminAnalytics from "@/pages/admin-analytics";
import TotemDisplay from "@/pages/totem-display";
import PublicFlyer from "@/pages/public-flyer";
import StoresGallery from "@/pages/stores-gallery";
import UserSettingsPage from "@/pages/user-settings";
import ShoppingList from "@/pages/shopping-list";
import MyCoupons from "@/pages/my-coupons";
import CouponDetails from "@/pages/coupon-details";
import StoriesFeed from "@/pages/stories-feed";
import CreateStory from "@/pages/create-story";
import PriceComparison from "@/pages/price-comparison";
import ProductCompare from "@/pages/product-compare";
import SignupPage from "@/pages/signup";
import SuperAdmin from "@/pages/super-admin";
import SuperAdminLogin from "@/pages/super-admin-login";
import DailyScratchPage from "@/pages/daily-scratch";
import ApifyDemo from "@/pages/apify-demo";
import MaintenancePage from "@/pages/maintenance";
import NotFound from "@/pages/not-found";
import { MapModalTestPage } from "@/pages/map-modal-test";
import TestInlineAssistant from "@/pages/test-inline-assistant";
import ClickEnvironment from "@/pages/ClickEnvironment";

function MaintenanceWrapper({ children }: { children: React.ReactNode }) {
  const [bypassMaintenance, setBypassMaintenance] = useState(() => {
    return localStorage.getItem('maintenance_bypass') === 'true';
  });

  // Hook para verificar status de manutenção
  const { data: maintenanceStatus, isLoading: isLoadingMaintenance } = useQuery({
    queryKey: ['/api/maintenance/status'],
    refetchInterval: 30000, // Verifica a cada 30 segundos
    staleTime: 0, // Sem cache para forçar nova consulta
    gcTime: 0, // Não manter em cache (v5 usa gcTime ao invés de cacheTime)
  });

  const { user } = useAuth();

  // Se está carregando, mostra um loading simples
  if (isLoadingMaintenance) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Verificar se há um parâmetro de força de teste na URL
  const forceMaintenanceTest = new URLSearchParams(window.location.search).get('test-maintenance') === 'true';
  
  // Se modo manutenção está ativo E usuário não tem bypass E (não é super admin OU está forçando teste)
  if ((maintenanceStatus as any)?.isActive && !bypassMaintenance && (!user?.isSuperAdmin || forceMaintenanceTest)) {
    return (
      <MaintenancePage 
        onAccessGranted={() => {
          setBypassMaintenance(true);
        }}
      />
    );
  }

  return <>{children}</>;
}

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Durante carregamento, registrar todas as rotas mas mostrar loading
    const LoadingComponent = () => (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );

    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/cards" component={LoadingComponent} />
        <Route path="/click-environment" component={LoadingComponent} />
        <Route path="/click-environment/:productId" component={LoadingComponent} />
        <Route path="/stories-feed" component={LoadingComponent} />
        <Route path="/create-story" component={LoadingComponent} />
        <Route path="/price-comparison" component={LoadingComponent} />
        <Route path="/product/:id/compare" component={LoadingComponent} />
        <Route path="/daily-scratch" component={LoadingComponent} />
        <Route path="/apify-demo" component={LoadingComponent} />
        <Route path="/map-test" component={LoadingComponent} />
        <Route path="/flyer/:slug" component={PublicFlyer} />
        <Route path="/stores/:slug" component={PublicFlyer} />
        <Route path="/super-admin" component={SuperAdminLogin} />
        <Route path="/super-admin-login" component={SuperAdminLogin} />
        <Route path="/admin-panel" component={SuperAdmin} />
        <Route path="/admin" component={LoadingComponent} />
        <Route path="/admin/:rest*" component={LoadingComponent} />
        <Route path="/settings" component={LoadingComponent} />
        <Route path="/shopping-list" component={LoadingComponent} />
        <Route path="/my-coupons" component={LoadingComponent} />
        <Route path="/coupon" component={LoadingComponent} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        // Usuário não logado - acesso público
        <>
          <Route path="/" component={Landing} />
          <Route path="/signup" component={SignupPage} />
          <Route path="/cards" component={StoresGallery} />
          <Route path="/click-environment" component={ClickEnvironment} />
          <Route path="/click-environment/:productId" component={ClickEnvironment} />
          <Route path="/click-environment/category/:category" component={ClickEnvironment} />

          <Route path="/stories-feed" component={StoriesFeed} />
          <Route path="/create-story" component={CreateStory} />
          <Route path="/price-comparison" component={PriceComparison} />
          <Route path="/product/:id/compare" component={ProductCompare} />
          <Route path="/daily-scratch" component={DailyScratchPage} />
          <Route path="/apify-demo" component={ApifyDemo} />
          <Route path="/test-inline-assistant" component={TestInlineAssistant} />
          <Route path="/super-admin-login" component={SuperAdminLogin} />
          <Route path="/super-admin" component={SuperAdminLogin} />
          <Route path="/admin-panel" component={SuperAdmin} />
          <Route path="/totem/:storeId" component={TotemDisplay} />
          {/* Admin routes fallback during auth loading - show loading instead of 404 */}
          <Route path="/admin" component={() => (
            <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Verificando acesso...</p>
              </div>
            </div>
          )} />
          <Route path="/admin/:rest*" component={() => (
            <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Verificando acesso...</p>
              </div>
            </div>
          )} />
          <Route path="/flyer/:slug" component={PublicFlyer} />
          <Route path="/stores/:slug" component={PublicFlyer} />
          <Route path="/:slug" component={PublicFlyer} />
        </>
      ) : user?.hasStore || user?.isSuperAdmin ? (
        // Lojista logado ou Super Admin - painel admin completo
        <>
          <Route path="/" component={Landing} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/config" component={AdminStoreConfig} />
          <Route path="/admin/products" component={AdminProducts} />
          <Route path="/admin/premium-stores" component={AdminPremiumStores} />
          <Route path="/admin/promotions" component={AdminPromotions} />
          <Route path="/admin/totem" component={AdminTotem} />
          <Route path="/admin/stories" component={AdminStories} />
          <Route path="/admin/analytics" component={AdminAnalytics} />
          <Route path="/test-inline-assistant" component={TestInlineAssistant} />
          <Route path="/super-admin" component={SuperAdminLogin} />
          <Route path="/super-admin-login" component={SuperAdminLogin} />
          <Route path="/admin-panel" component={SuperAdmin} />
          <Route path="/totem/:storeId" component={TotemDisplay} />
          <Route path="/cards" component={StoresGallery} />
          <Route path="/click-environment" component={ClickEnvironment} />
          <Route path="/click-environment/:productId" component={ClickEnvironment} />
          <Route path="/click-environment/category/:category" component={ClickEnvironment} />

          <Route path="/stories-feed" component={StoriesFeed} />
          <Route path="/create-story" component={CreateStory} />
          <Route path="/price-comparison" component={PriceComparison} />
          <Route path="/product/:id/compare" component={ProductCompare} />
          <Route path="/daily-scratch" component={DailyScratchPage} />
          <Route path="/test-inline-assistant" component={TestInlineAssistant} />
          <Route path="/settings" component={UserSettingsPage} />
          <Route path="/shopping-list" component={ShoppingList} />
          <Route path="/my-coupons" component={MyCoupons} />
          <Route path="/coupon" component={CouponDetails} />
          <Route path="/flyer/:slug" component={PublicFlyer} />
          <Route path="/stores/:slug" component={PublicFlyer} />
          <Route path="/:slug" component={PublicFlyer} />
        </>
      ) : (
        // Usuário normal logado - sem acesso ao admin
        <>
          <Route path="/" component={Landing} />
          <Route path="/cards" component={StoresGallery} />
          <Route path="/click-environment" component={ClickEnvironment} />
          <Route path="/click-environment/:productId" component={ClickEnvironment} />
          <Route path="/click-environment/category/:category" component={ClickEnvironment} />

          <Route path="/stories-feed" component={StoriesFeed} />
          <Route path="/create-story" component={CreateStory} />
          <Route path="/price-comparison" component={PriceComparison} />
          <Route path="/product/:id/compare" component={ProductCompare} />
          <Route path="/daily-scratch" component={DailyScratchPage} />
          <Route path="/test-inline-assistant" component={TestInlineAssistant} />
          <Route path="/settings" component={UserSettingsPage} />
          <Route path="/shopping-list" component={ShoppingList} />
          <Route path="/my-coupons" component={MyCoupons} />
          <Route path="/coupon" component={CouponDetails} />
          <Route path="/super-admin" component={SuperAdminLogin} />
          <Route path="/super-admin-login" component={SuperAdminLogin} />
          <Route path="/admin-panel" component={SuperAdmin} />
          <Route path="/totem/:storeId" component={TotemDisplay} />
          <Route path="/flyer/:slug" component={PublicFlyer} />
          <Route path="/stores/:slug" component={PublicFlyer} />
          <Route path="/:slug" component={PublicFlyer} />
          {/* Usuário normal não tem acesso ao admin - redireciona para /cards */}
          <Route path="/admin" component={() => { window.location.href = '/cards'; return null; }} />
          <Route path="/admin/:rest*" component={() => { window.location.href = '/cards'; return null; }} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MaintenanceWrapper>
          <Router />
        </MaintenanceWrapper>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
