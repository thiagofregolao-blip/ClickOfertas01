import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminStoreConfig from "@/pages/admin-store-config";
import AdminProducts from "@/pages/admin-products";
import AdminPromotions from "@/pages/admin-promotions";
import AdminPreview from "@/pages/admin-preview";
import Analytics from "@/pages/analytics";
import PublicFlyer from "@/pages/public-flyer";
import StoresGallery from "@/pages/stores-gallery";
import UserSettingsPage from "@/pages/user-settings";
import ShoppingList from "@/pages/shopping-list";
import MyCoupons from "@/pages/my-coupons";
import CouponDetails from "@/pages/coupon-details";
import NotFound from "@/pages/not-found";

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
        <Route path="/flyer/:slug" component={LoadingComponent} />
        <Route path="/stores/:slug" component={LoadingComponent} />
        <Route path="/admin" component={LoadingComponent} />
        <Route path="/admin/*" component={LoadingComponent} />
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
          <Route path="/cards" component={StoresGallery} />
          <Route path="/flyer/:slug" component={PublicFlyer} />
          <Route path="/stores/:slug" component={PublicFlyer} />
        </>
      ) : user?.hasStore ? (
        // Lojista logado - painel admin
        <>
          <Route path="/" component={AdminDashboard} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/config" component={AdminStoreConfig} />
          <Route path="/admin/products" component={AdminProducts} />
          <Route path="/admin/promotions" component={AdminPromotions} />
          <Route path="/admin/preview" component={AdminPreview} />
          <Route path="/admin/analytics" component={Analytics} />
          <Route path="/cards" component={StoresGallery} />
          <Route path="/settings" component={UserSettingsPage} />
          <Route path="/shopping-list" component={ShoppingList} />
          <Route path="/my-coupons" component={MyCoupons} />
          <Route path="/coupon" component={CouponDetails} />
          <Route path="/flyer/:slug" component={PublicFlyer} />
          <Route path="/stores/:slug" component={PublicFlyer} />
        </>
      ) : (
        // Usuário normal logado - galeria de lojas
        <>
          <Route path="/" component={StoresGallery} />
          <Route path="/cards" component={StoresGallery} />
          <Route path="/settings" component={UserSettingsPage} />
          <Route path="/shopping-list" component={ShoppingList} />
          <Route path="/my-coupons" component={MyCoupons} />
          <Route path="/coupon" component={CouponDetails} />
          <Route path="/flyer/:slug" component={PublicFlyer} />
          <Route path="/stores/:slug" component={PublicFlyer} />
          {/* Bloqueia acesso ao admin para usuários normais */}
          <Route path="/admin*" component={NotFound} />
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
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
