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
import StoriesFeed from "@/pages/stories-feed";
import CreateStory from "@/pages/create-story";
import PriceComparison from "@/pages/price-comparison";
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
        <Route path="/stories-feed" component={LoadingComponent} />
        <Route path="/create-story" component={LoadingComponent} />
        <Route path="/price-comparison" component={LoadingComponent} />
        <Route path="/flyer/:slug" component={PublicFlyer} />
        <Route path="/stores/:slug" component={PublicFlyer} />
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
          <Route path="/stories-feed" component={StoriesFeed} />
          <Route path="/create-story" component={CreateStory} />
          <Route path="/price-comparison" component={PriceComparison} />
          <Route path="/flyer/:slug" component={PublicFlyer} />
          <Route path="/stores/:slug" component={PublicFlyer} />
        </>
      ) : (
        // Usuário logado - acesso completo
        <>
          {/* Rotas principais */}
          <Route path="/" component={StoresGallery} />
          <Route path="/cards" component={StoresGallery} />
          <Route path="/stories-feed" component={StoriesFeed} />
          <Route path="/create-story" component={CreateStory} />
          <Route path="/price-comparison" component={PriceComparison} />
          <Route path="/flyer/:slug" component={PublicFlyer} />
          <Route path="/stores/:slug" component={PublicFlyer} />
          <Route path="/settings" component={UserSettingsPage} />
          <Route path="/shopping-list" component={ShoppingList} />
          <Route path="/my-coupons" component={MyCoupons} />
          <Route path="/coupon" component={CouponDetails} />
          
          {/* Rotas de admin - sempre disponíveis para usuários logados */}
          <Route path="/admin" component={user?.hasStore ? AdminDashboard : AdminStoreConfig} />
          <Route path="/admin/config" component={AdminStoreConfig} />
          <Route path="/admin/products" component={user?.hasStore ? AdminProducts : AdminStoreConfig} />
          <Route path="/admin/promotions" component={user?.hasStore ? AdminPromotions : AdminStoreConfig} />
          <Route path="/admin/preview" component={user?.hasStore ? AdminPreview : AdminStoreConfig} />
          <Route path="/admin/analytics" component={user?.hasStore ? Analytics : AdminStoreConfig} />
          <Route path="/create-store" component={AdminStoreConfig} />
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
