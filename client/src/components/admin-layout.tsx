import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Settings, Package, Eye, BarChart3, LogOut, Menu, X, Gift, Monitor } from "lucide-react";
import { useState } from "react";
import type { Store } from "@shared/schema";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: store } = useQuery<Store>({
    queryKey: ["/api/stores/me"],
    retry: false,
  });

  const navigation = [
    { name: "Dashboard", href: "/admin", icon: BarChart3 },
    { name: "Configurações", href: "/admin/config", icon: Settings },
    { name: "Produtos", href: "/admin/products", icon: Package },
    { name: "Promoções", href: "/admin/promotions", icon: Gift },
    { name: "Totem", href: "/admin/totem", icon: Monitor },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  ];

  const isActiveLink = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {store && (
                <span className="text-lg font-bold text-gray-900">{store.name}</span>
              )}
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-6">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant="ghost"
                      className={`flex items-center space-x-2 ${
                        isActiveLink(item.href)
                          ? "text-primary bg-primary/10 border-b-2 border-primary"
                          : "text-gray-600 hover:text-primary"
                      }`}
                      data-testid={`nav-${item.name.toLowerCase()}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Button>
                  </Link>
                );
              })}
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
              <nav className="space-y-2">
                {navigation.map((item) => {
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
