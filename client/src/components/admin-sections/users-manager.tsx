import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Trash2 } from "lucide-react";

interface UserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  provider: string;
  isSuperAdmin: boolean;
  storeOwnerToken?: string;
  createdAt: string;
  lastLogin?: string;
}

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function UsersManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar usuários
  const { data: users = [], isLoading: usersLoading } = useQuery<UserData[]>({
    queryKey: ['/api/admin/users'],
    staleTime: 2 * 60 * 1000,
  });

  // Mutation para alternar status de super admin
  const toggleUserSuperAdminMutation = useMutation({
    mutationFn: async ({ userId, isSuperAdmin }: { userId: string; isSuperAdmin: boolean }) => {
      return await apiRequest('PUT', `/api/admin/users/${userId}`, { isSuperAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Usuário atualizado",
        description: "Status de administrador atualizado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para alterar usuários.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao atualizar usuário. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  // Mutation para deletar usuário
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Usuário excluído",
        description: "Usuário excluído com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para excluir usuários.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao excluir usuário. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  const handleToggleUserSuperAdmin = (userData: UserData) => {
    const action = userData.isSuperAdmin ? "remover privilégios de administrador" : "tornar administrador";
    if (confirm(`Tem certeza que deseja ${action} para ${userData.email}?`)) {
      toggleUserSuperAdminMutation.mutate({
        userId: userData.id,
        isSuperAdmin: !userData.isSuperAdmin
      });
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.")) {
      deleteUserMutation.mutate(userId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-7 h-7 text-purple-600" />
          Gerenciamento de Usuários
        </h2>
        <p className="text-gray-500 mt-1">
          Gerencie usuários, permissões e privilégios de administrador
        </p>
      </div>

      {/* Lista de Usuários */}
      {usersLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Carregando usuários...</p>
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Nenhum usuário encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map((userData) => (
            <Card key={userData.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-lg">{userData.email}</CardTitle>
                    {userData.isSuperAdmin && (
                      <Badge variant="destructive">Super Admin</Badge>
                    )}
                    {userData.storeOwnerToken && (
                      <Badge variant="default">Lojista</Badge>
                    )}
                    <Badge variant="outline">
                      {userData.provider}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant={userData.isSuperAdmin ? "destructive" : "outline"}
                      onClick={() => handleToggleUserSuperAdmin(userData)}
                      disabled={toggleUserSuperAdminMutation.isPending}
                      data-testid={`button-toggle-admin-${userData.id}`}
                    >
                      {userData.isSuperAdmin ? "Remover Admin" : "Tornar Admin"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDeleteUser(userData.id)}
                      disabled={deleteUserMutation.isPending}
                      data-testid={`button-delete-user-${userData.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {userData.firstName && (
                    <div>
                      <span className="text-gray-500">Nome:</span>
                      <div className="font-medium">
                        {userData.firstName} {userData.lastName || ''}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-gray-500">Provedor:</span>
                    <div className="font-medium">{userData.provider}</div>
                  </div>
                  
                  <div>
                    <span className="text-gray-500">Cadastro:</span>
                    <div className="font-medium">
                      {new Date(userData.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  
                  {userData.lastLogin && (
                    <div>
                      <span className="text-gray-500">Último login:</span>
                      <div className="font-medium">
                        {new Date(userData.lastLogin).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  )}
                  
                  {userData.storeOwnerToken && (
                    <div>
                      <span className="text-gray-500">Token da Loja:</span>
                      <div className="font-mono text-xs bg-gray-100 p-1 rounded">
                        {userData.storeOwnerToken.substring(0, 20)}...
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Estatísticas */}
      {users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estatísticas de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{users.length}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {users.filter(u => u.isSuperAdmin).length}
                </div>
                <div className="text-sm text-gray-500">Super Admins</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.storeOwnerToken).length}
                </div>
                <div className="text-sm text-gray-500">Lojistas</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {users.filter(u => u.provider === 'replit').length}
                </div>
                <div className="text-sm text-gray-500">Via Replit</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}