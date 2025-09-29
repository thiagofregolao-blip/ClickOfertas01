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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Store, Trash2, Search, Users, Package, MapPin, Phone, Instagram } from "lucide-react";

interface StoreData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  currency: string;
  ownerId: string;
  ownerEmail?: string;
  phone?: string;
  instagram?: string;
  address?: string;
  city?: string;
  productCount?: number;
  createdAt: string;
}

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function StoresManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);

  // Query para buscar lojas
  const { data: stores = [], isLoading: storesLoading } = useQuery<StoreData[]>({
    queryKey: ['/api/admin/stores'],
    enabled: !!user?.isSuperAdmin,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Mutation para alternar status ativo/inativo da loja
  const toggleStoreStatusMutation = useMutation({
    mutationFn: async ({ storeId, isActive }: { storeId: string; isActive: boolean }) => {
      return await apiRequest('PUT', `/api/admin/stores/${storeId}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'] });
      toast({
        title: "Loja atualizada",
        description: "Status da loja atualizado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para alterar lojas.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao atualizar loja. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  // Mutation para deletar loja
  const deleteStoreMutation = useMutation({
    mutationFn: async (storeId: string) => {
      return await apiRequest('DELETE', `/api/admin/stores/${storeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'] });
      setSelectedStore(null);
      toast({
        title: "Loja excluída",
        description: "Loja excluída com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para excluir lojas.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao excluir loja. Tente novamente.",
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
          <Store className="w-7 h-7 text-blue-600" />
          Gerenciamento de Lojas
        </h2>
        <p className="text-gray-500 mt-1">
          Gerencie todas as lojas cadastradas na plataforma
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
          data-testid="input-search-stores"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Lojas Ativas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stores.filter(store => store.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Produtos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stores.reduce((sum, store) => sum + (store.productCount || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stores List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Lojas Cadastradas ({filteredStores.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {storesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
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
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  data-testid={`store-item-${store.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      {store.imageUrl ? (
                        <img
                          src={store.imageUrl}
                          alt={store.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Store className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {store.name}
                        </h3>
                        <Badge variant={store.isActive ? "default" : "secondary"}>
                          {store.isActive ? "Ativa" : "Inativa"}
                        </Badge>
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
                      
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        {store.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {store.city}
                          </span>
                        )}
                        {store.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {store.phone}
                          </span>
                        )}
                        {store.instagram && (
                          <span className="flex items-center gap-1">
                            <Instagram className="w-3 h-3" />
                            @{store.instagram}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={store.isActive}
                        onCheckedChange={(checked) =>
                          toggleStoreStatusMutation.mutate({
                            storeId: store.id,
                            isActive: checked,
                          })
                        }
                        disabled={toggleStoreStatusMutation.isPending}
                        data-testid={`switch-store-status-${store.id}`}
                      />
                      <span className="text-sm text-gray-600">
                        {store.isActive ? "Ativa" : "Inativa"}
                      </span>
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedStore(store)}
                          data-testid={`button-delete-store-${store.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirmar Exclusão</DialogTitle>
                          <DialogDescription>
                            Tem certeza que deseja excluir a loja "{store.name}"? 
                            Esta ação é irreversível e também excluirá todos os produtos da loja.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setSelectedStore(null)}>
                            Cancelar
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => deleteStoreMutation.mutate(store.id)}
                            disabled={deleteStoreMutation.isPending}
                            data-testid="button-confirm-delete-store"
                          >
                            {deleteStoreMutation.isPending ? "Excluindo..." : "Excluir"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}