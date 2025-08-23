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
import AdminPreview from "@/pages/admin-preview";
import PublicFlyer from "@/pages/public-flyer";
import StoresGallery from "@/pages/stores-gallery";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={StoresGallery} />
          <Route path="/login" component={Landing} />
          <Route path="/flyer/:slug" component={PublicFlyer} />
        </>
      ) : (
        <>
          <Route path="/" component={AdminDashboard} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/config" component={AdminStoreConfig} />
          <Route path="/admin/products" component={AdminProducts} />
          <Route path="/admin/preview" component={AdminPreview} />
          <Route path="/flyer/:slug" component={PublicFlyer} />
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
