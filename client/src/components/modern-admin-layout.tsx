import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  Store, Package, Gift, Camera, Monitor, Image, BarChart3, TrendingUp, 
  Users, Wifi, Tag, Database, Brain, Globe, Settings, Eye, LogOut, ChevronDown
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Store as StoreType } from "@shared/schema";

interface ModernAdminLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function ModernAdminLayout({ children, activeSection, onSectionChange }: ModernAdminLayoutProps) {
  const { user } = useAuth();

  const { data: store } = useQuery<StoreType>({
    queryKey: ["/api/stores/me"],
    retry: false,
  });

  const menuGroups = [
    {
      title: "Loja",
      icon: Store,
      items: [
        { id: "config", label: "Configurações", icon: Settings },
        { id: "products", label: "Produtos", icon: Package },
        { id: "promotions", label: "Promoções", icon: Gift },
        { id: "stories", label: "Stories", icon: Camera },
        { id: "totem", label: "Totem", icon: Monitor },
      ]
    },
    {
      title: "Marketing",
      icon: TrendingUp,
      items: [
        { id: "banners", label: "Banners", icon: Image },
        { id: "analytics", label: "Analytics", icon: BarChart3 },
        { id: "stats", label: "Estatísticas", icon: TrendingUp },
      ]
    },
    {
      title: "Sistema",
      icon: Settings,
      items: [
        { id: "users", label: "Usuários", icon: Users },
        { id: "stores", label: "Lojas", icon: Store },
        { id: "wifi", label: "WiFi 24h", icon: Wifi },
        { id: "categories", label: "Categorias", icon: Tag },
        { id: "product-banks", label: "Banco de Produtos", icon: Database },
        { id: "system", label: "Sistema", icon: Settings },
      ]
    },
    {
      title: "IA",
      icon: Brain,
      items: [
        { id: "ai-test", label: "Teste IA", icon: Brain },
        { id: "ai-arts", label: "Arte IA", icon: Globe },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header moderno */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo e título */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Painel Administrativo</h1>
                  {store && (
                    <p className="text-sm text-gray-500">{store.name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Navegação por dropdowns */}
            <nav className="hidden md:flex items-center space-x-2">
              {menuGroups.map((group) => {
                const GroupIcon = group.icon;
                const hasActiveItem = group.items.some(item => item.id === activeSection);
                
                return (
                  <DropdownMenu key={group.title}>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className={`flex items-center space-x-2 ${
                          hasActiveItem ? 'bg-red-50 text-red-600 border border-red-200' : 'text-gray-600 hover:text-red-600'
                        }`}
                        data-testid={`dropdown-${group.title.toLowerCase()}`}
                      >
                        <GroupIcon className="w-4 h-4" />
                        <span>{group.title}</span>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                          <DropdownMenuItem
                            key={item.id}
                            onClick={() => onSectionChange(item.id)}
                            className={`flex items-center space-x-2 cursor-pointer ${
                              activeSection === item.id ? 'bg-red-50 text-red-600' : ''
                            }`}
                            data-testid={`menu-${item.id}`}
                          >
                            <ItemIcon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })}
            </nav>

            {/* Ações do usuário */}
            <div className="flex items-center space-x-3">
              {store?.slug && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/flyer/${store.slug}`, '_blank')}
                  className="hidden sm:flex"
                  data-testid="button-view-public"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Público
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => (window.location.href = "/api/auth/logout")}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Navegação mobile */}
          <div className="md:hidden border-t border-gray-200 py-3">
            <div className="flex space-x-2 overflow-x-auto">
              {menuGroups.map((group) => {
                const GroupIcon = group.icon;
                const hasActiveItem = group.items.some(item => item.id === activeSection);
                
                return (
                  <DropdownMenu key={group.title}>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className={`flex items-center space-x-1 whitespace-nowrap ${
                          hasActiveItem ? 'bg-red-50 text-red-600' : 'text-gray-600'
                        }`}
                      >
                        <GroupIcon className="w-4 h-4" />
                        <span className="text-xs">{group.title}</span>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                          <DropdownMenuItem
                            key={item.id}
                            onClick={() => onSectionChange(item.id)}
                            className={`flex items-center space-x-2 cursor-pointer ${
                              activeSection === item.id ? 'bg-red-50 text-red-600' : ''
                            }`}
                          >
                            <ItemIcon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}