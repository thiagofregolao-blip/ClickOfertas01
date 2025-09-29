import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, Settings, Package, Eye, BarChart3, LogOut, Menu, X, Gift, Monitor, Camera, Crown, Wifi, 
  Image, Users, Store as StoreIcon, TrendingUp, Brain, Globe, Tag, Cog 
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Store } from "@shared/schema";

interface AdminConsolidatedLayoutProps {
  children: React.ReactNode;
}

export default function AdminConsolidatedLayout({ children }: AdminConsolidatedLayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const { data: store } = useQuery<Store>({
    queryKey: ["/api/stores/me"],
    retry: false,
  });

  // Build navigation array with intelligent permissions
  const navigation = [
    // Core admin functions (for all admins)
    { name: "Dashboard", href: "/super-admin", icon: BarChart3, roles: ["admin", "superAdmin"] },
    { name: "Configurações", href: "/super-admin/config", icon: Settings, roles: ["admin", "superAdmin"] },
    { name: "Produtos", href: "/super-admin/products", icon: Package, roles: ["admin", "superAdmin"] },
    { name: "Promoções", href: "/super-admin/promotions", icon: Gift, roles: ["admin", "superAdmin"] },
    
    // Super admin exclusive functions
    { name: "Banners", href: "/super-admin/banners", icon: Image, roles: ["superAdmin"] },
    { name: "Lojas", href: "/super-admin/stores", icon: StoreIcon, roles: ["superAdmin"] },
    { name: "Usuários", href: "/super-admin/users", icon: Users, roles: ["superAdmin"] },
    { name: "Estatísticas", href: "/super-admin/stats", icon: TrendingUp, roles: ["superAdmin"] },
    { name: "Analytics", href: "/super-admin/analytics", icon: BarChart3, roles: ["superAdmin"] },
    { name: "Teste IA", href: "/super-admin/ai-test", icon: Brain, roles: ["superAdmin"] },
    { name: "Arte IA", href: "/super-admin/ai-arts", icon: Globe, roles: ["superAdmin"] },
    { name: "Categorias", href: "/super-admin/categories", icon: Tag, roles: ["superAdmin"] },
    { name: "Banco de Produtos", href: "/super-admin/product-banks", icon: Package, roles: ["superAdmin"] },
    
    // Shared functions (with permission control)
    { name: "Lojas Premium", href: "/super-admin/premium-stores", icon: Crown, roles: ["superAdmin"] },
    { name: "Wi-Fi 24h", href: "/super-admin/wifi", icon: Wifi, roles: ["superAdmin"] },
    { name: "Totem", href: "/super-admin/totem", icon: Monitor, roles: ["admin", "superAdmin"] },
    { name: "Gerenciar Stories", href: "/super-admin/stories", icon: Camera, roles: ["admin", "superAdmin"] },
    { name: "Sistema", href: "/super-admin/system", icon: Cog, roles: ["superAdmin"] },
  ];

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => {
    if (user?.isSuperAdmin) {
      return item.roles.includes("superAdmin");
    } else {
      return item.roles.includes("admin");
    }
  });

  const isActiveLink = (href: string) => {
    if (href === "/super-admin" && location === "/super-admin") return true;
    if (href !== "/super-admin" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center gap-2">
                <Settings className="h-6 w-6 text-red-500" />
                <span className="text-lg font-bold text-gray-900">
                  {user?.isSuperAdmin ? "Painel Super Admin" : "Painel Administrativo"}
                </span>
              </div>
              {store && (
                <span className="text-sm text-gray-500 border-l border-gray-300 pl-3">
                  {store.name}
                </span>
              )}
            </div>

            {/* Desktop Navigation - Scrollable for many items */}
            <nav className="hidden md:flex overflow-x-auto max-w-2xl">
              <div className="flex space-x-2 px-2">
                {filteredNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.name} href={item.href}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`flex items-center space-x-2 whitespace-nowrap ${
                          isActiveLink(item.href)
                            ? "text-primary bg-primary/10 border-b-2 border-primary"
                            : "text-gray-600 hover:text-primary"
                        }`}
                        data-testid={`nav-${item.name.toLowerCase()}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden lg:inline">{item.name}</span>
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="flex items-center space-x-4">
              {/* View Public Link */}
              {store?.slug && (
                <Link href={`/flyer/${store.slug}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex"
                    data-testid="button-view-public"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Público
                  </Button>
                </Link>
              )}

              {/* Logout */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => (window.location.href = "/api/auth/logout")}
                className="hidden sm:flex text-red-600 hover:text-red-700 hover:bg-red-50"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden"
                data-testid="button-mobile-menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <nav className="space-y-2 max-h-96 overflow-y-auto">
                {filteredNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.name} href={item.href}>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start flex items-center space-x-2 ${
                          isActiveLink(item.href)
                            ? "text-primary bg-primary/10"
                            : "text-gray-600"
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Button>
                    </Link>
                  );
                })}
                
                <div className="border-t border-gray-200 pt-2 mt-2 space-y-2">
                  {store?.slug && (
                    <Link href={`/flyer/${store.slug}`}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Público
                      </Button>
                    </Link>
                  )}
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => (window.location.href = "/api/auth/logout")}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </Button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}