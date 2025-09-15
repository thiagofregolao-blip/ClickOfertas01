import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Crown, Search, Store as StoreIcon, Users, DollarSign, Star, AlertTriangle, ShieldAlert } from "lucide-react";
import AdminLayout from "@/components/admin-layout";
import { useAuth } from "@/hooks/useAuth";
import type { Store } from "@shared/schema";

interface StoreWithStats extends Store {
  productCount?: number;
}

export default function AdminPremiumStores() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const { user, isLoading: isLoadingAuth } = useAuth();

  // Check if user is super admin - show error if not
  if (!isLoadingAuth && !user?.isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <Card className="border-red-200">
            <CardContent className="p-8 text-center">
              <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-700 mb-2">Acesso Negado</h2>
              <p className="text-red-600 mb-6">
                Esta página é restrita apenas para super administradores do sistema.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <p className="text-sm text-red-700">
                    <strong>Permissão necessária:</strong> Super Admin
                  </p>
                </div>
                <p className="text-sm text-red-600 mt-2">
                  Entre em contato com um administrador do sistema para obter acesso.
                </p>
              </div>
              <Button 
                onClick={() => window.history.back()}
                variant="outline"
                data-testid="button-go-back"
              >
                Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  // Buscar todas as lojas - só executa se for super admin
  const { data: stores = [], isLoading, error } = useQuery<StoreWithStats[]>({
    queryKey: ['/api/admin/all-stores'],
    queryFn: async () => {
      const response = await fetch('/api/admin/all-stores');
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Acesso negado - apenas super admins podem acessar esta página');
        }
        if (response.status === 401) {
          throw new Error('Você precisa estar logado para acessar esta página');
        }
        throw new Error('Erro ao buscar lojas');
      }
      return response.json();
    },
    enabled: !!user?.isSuperAdmin, // Only run query if user is super admin
    retry: (failureCount, error) => {
      // Don't retry on permission errors
      if (error.message.includes('Acesso negado') || error.message.includes('precisa estar logado')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Show error state for API errors
  if (error && user?.isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <Card className="border-red-200">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-700 mb-2">Erro ao Carregar</h2>
              <p className="text-red-600 mb-6">
                {error.message || 'Ocorreu um erro ao carregar as informações das lojas.'}
              </p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/all-stores'] })}
                data-testid="button-retry"
              >
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  // Mutation para alterar status premium
  const togglePremiumMutation = useMutation({
    mutationFn: async ({ storeId, isPremium }: { storeId: string; isPremium: boolean }) => {
      const response = await fetch(`/api/admin/stores/${storeId}/premium`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPremium })
      });
      if (!response.ok) throw new Error('Erro ao alterar status premium');
      return response.json();
    },
    onSuccess: (_, { storeId, isPremium }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-stores'] });
      toast({
        title: isPremium ? "Loja promovida!" : "Premium removido",
        description: isPremium 
          ? "A loja agora tem status premium e aparecerá primeiro nas comparações" 
          : "A loja não é mais premium e seguirá a ordenação padrão",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao alterar status premium da loja",
        variant: "destructive",
      });
    }
  });

  // Filtrar lojas por busca
  const filteredStores = stores.filter(store => 
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separar lojas premium das regulares
  const premiumStores = filteredStores.filter(store => store.isPremium);
  const regularStores = filteredStores.filter(store => !store.isPremium);

  const handleTogglePremium = (storeId: string, currentStatus: boolean) => {
    togglePremiumMutation.mutate({ 
      storeId, 
      isPremium: !currentStatus 
    });
  };

  if (isLoadingAuth || isLoading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center space-x-4 animate-pulse">
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
            <div className="h-6 w-48 bg-gray-200 rounded"></div>
          </div>
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <Crown className="w-8 h-8 text-yellow-600" />
            <h1 className="text-3xl font-bold text-gray-900">Lojas Premium</h1>
          </div>
          <p className="text-gray-600">
            Gerencie quais lojas têm status premium e aparecerão primeiro nas comparações de produtos
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <StoreIcon className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total de Lojas</p>
                  <p className="text-2xl font-bold">{stores.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Crown className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">Lojas Premium</p>
                  <p className="text-2xl font-bold text-yellow-600">{premiumStores.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Lojas Regulares</p>
                  <p className="text-2xl font-bold">{regularStores.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Star className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Taxa Premium</p>
                  <p className="text-2xl font-bold">
                    {stores.length > 0 ? Math.round((premiumStores.length / stores.length) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              data-testid="input-search-stores"
              placeholder="Buscar por nome ou slug da loja..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Premium Stores Section */}
        {premiumStores.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <Crown className="w-5 h-5 text-yellow-600" />
              <h2 className="text-xl font-semibold text-gray-900">Lojas Premium ({premiumStores.length})</h2>
            </div>
            <div className="space-y-3">
              {premiumStores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  onTogglePremium={handleTogglePremium}
                  isLoading={togglePremiumMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Stores Section */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <StoreIcon className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Lojas Regulares ({regularStores.length})</h2>
          </div>
          {regularStores.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm ? "Nenhuma loja regular encontrada com esses critérios" : "Todas as lojas são premium!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {regularStores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  onTogglePremium={handleTogglePremium}
                  isLoading={togglePremiumMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>

        {/* No results */}
        {filteredStores.length === 0 && searchTerm && (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma loja encontrada com "{searchTerm}"</p>
              <Button
                data-testid="button-clear-search"
                variant="outline"
                onClick={() => setSearchTerm("")}
                className="mt-3"
              >
                Limpar busca
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

interface StoreCardProps {
  store: StoreWithStats;
  onTogglePremium: (storeId: string, currentStatus: boolean) => void;
  isLoading: boolean;
}

function StoreCard({ store, onTogglePremium, isLoading }: StoreCardProps) {
  return (
    <Card className={`transition-all duration-200 ${store.isPremium ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' : 'hover:shadow-md'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Logo da loja */}
            <div className="relative">
              {store.logoUrl ? (
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <StoreIcon className="w-6 h-6 text-gray-500" />
                </div>
              )}
              {store.isPremium && (
                <Crown className="absolute -top-1 -right-1 w-5 h-5 text-yellow-600" />
              )}
            </div>

            {/* Informações da loja */}
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900">{store.name}</h3>
                {store.isPremium && (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    Premium
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-600">
                <p>Slug: /{store.slug}</p>
                {store.productCount !== undefined && (
                  <p>{store.productCount} produtos</p>
                )}
              </div>
            </div>
          </div>

          {/* Toggle Premium */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm text-gray-600">Status Premium</p>
              <p className="text-xs text-gray-500">
                {store.isPremium ? "Aparece primeiro" : "Ordenação padrão"}
              </p>
            </div>
            <Switch
              data-testid={`switch-premium-${store.id}`}
              checked={store.isPremium || false}
              onCheckedChange={() => onTogglePremium(store.id, store.isPremium || false)}
              disabled={isLoading}
              className="data-[state=checked]:bg-yellow-600"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}