import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Crown, Search, Store, Star, Package, DollarSign } from "lucide-react";

interface StoreWithStats {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  isPremium?: boolean;
  currency: string;
  ownerId: string;
  ownerEmail?: string;
  productCount?: number;
  createdAt: string;
}

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function PremiumStoresManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Query para buscar lojas
  const { data: stores = [], isLoading: storesLoading } = useQuery<StoreWithStats[]>({
    queryKey: ['/api/admin/stores'],
    enabled: !!user?.isSuperAdmin,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Mutation para alternar status premium
  const togglePremiumStatusMutation = useMutation({
    mutationFn: async ({ storeId, isPremium }: { storeId: string; isPremium: boolean }) => {
      return await apiRequest('PUT', `/api/admin/stores/${storeId}/premium`, { isPremium });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'] });
      toast({
        title: "Status Premium atualizado",
        description: "Status premium da loja atualizado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para alterar status premium.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao atualizar status premium. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const premiumStores = stores.filter(store => store.isPremium);
  const activeStores = stores.filter(store => store.isActive);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Crown className="w-7 h-7 text-yellow-600" />
          Lojas Premium
        </h2>
        <p className="text-gray-500 mt-1">
          Gerencie o status premium das lojas - lojas premium aparecem primeiro nas comparações
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Buscar lojas por nome, slug ou email do proprietário..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-premium-stores"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Store className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Lojas</p>
                <p className="text-2xl font-bold text-gray-900">{stores.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Crown className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Lojas Premium</p>
                <p className="text-2xl font-bold text-gray-900">{premiumStores.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Lojas Ativas</p>
                <p className="text-2xl font-bold text-gray-900">{activeStores.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Taxa Premium</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stores.length > 0 ? Math.round((premiumStores.length / stores.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Premium Benefits Info */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <Crown className="w-5 h-5" />
            Benefícios do Status Premium
          </CardTitle>
        </CardHeader>
        <CardContent className="text-yellow-700">
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Aparecem primeiro em todas as comparações de preços</li>
            <li>Destaque especial na listagem de lojas</li>
            <li>Maior visibilidade para produtos</li>
            <li>Prioridade nos resultados de busca</li>
          </ul>
        </CardContent>
      </Card>

      {/* Stores List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Gerenciar Status Premium ({filteredStores.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {storesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mx-auto"></div>
              <p className="text-gray-500 mt-2 text-sm">Carregando lojas...</p>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Store className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? "Nenhuma loja encontrada" : "Nenhuma loja cadastrada"}
              </h3>
              <p className="text-sm">
                {searchTerm ? "Tente usar termos diferentes na busca." : "As lojas aparecerão aqui quando forem cadastradas."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStores.map((store) => (
                <div
                  key={store.id}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                    store.isPremium ? 'border-yellow-300 bg-yellow-50' : 'hover:bg-gray-50'
                  }`}
                  data-testid={`premium-store-item-${store.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center relative">
                      {store.imageUrl ? (
                        <img
                          src={store.imageUrl}
                          alt={store.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Store className="w-6 h-6 text-gray-400" />
                      )}
                      {store.isPremium && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                          <Crown className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {store.name}
                        </h3>
                        
                        <div className="flex items-center space-x-2">
                          <Badge variant={store.isActive ? "default" : "secondary"}>
                            {store.isActive ? "Ativa" : "Inativa"}
                          </Badge>
                          
                          {store.isPremium && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-100">
                              <Crown className="w-3 h-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>/{store.slug}</span>
                        <span>•</span>
                        <span>{store.currency}</span>
                        <span>•</span>
                        <span>{store.productCount || 0} produtos</span>
                      </div>
                      
                      {store.ownerEmail && (
                        <p className="text-sm text-gray-600 mt-1">
                          👤 {store.ownerEmail}
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-500 mt-1">
                        Criada em {formatDate(store.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right text-sm">
                      <p className="font-medium text-gray-900">
                        Status Premium
                      </p>
                      <p className="text-gray-500">
                        {store.isPremium ? "Ativado" : "Desativado"}
                      </p>
                    </div>
                    
                    <Switch
                      checked={store.isPremium || false}
                      onCheckedChange={(checked) =>
                        togglePremiumStatusMutation.mutate({
                          storeId: store.id,
                          isPremium: checked,
                        })
                      }
                      disabled={togglePremiumStatusMutation.isPending || !store.isActive}
                      data-testid={`switch-premium-status-${store.id}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 text-lg">Como funciona o Status Premium?</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 text-sm space-y-2">
          <p>• <strong>Lojas Premium:</strong> Aparecem primeiro em todas as comparações de preços</p>
          <p>• <strong>Ordem de exibição:</strong> Primeiro lojas premium, depois lojas normais</p>
          <p>• <strong>Requisito:</strong> A loja precisa estar ativa para ativar o status premium</p>
          <p>• <strong>Resultado:</strong> Maior visibilidade e conversão para lojas premium</p>
        </CardContent>
      </Card>
    </div>
  );
}