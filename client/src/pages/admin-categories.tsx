import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCategorySchema, insertCategorySellerSchema, updateCategorySchema, updateCategorySellerSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Phone, Users, Settings, X } from "lucide-react";
import type { Store, Category, CategoryWithSellers, InsertCategory, InsertCategorySeller, CategorySeller } from "@shared/schema";
import { z } from "zod";

const categoryFormSchema = insertCategorySchema.extend({
  name: z.string().min(1, "Nome da categoria é obrigatório"),
});

const sellerFormSchema = insertCategorySellerSchema.extend({
  name: z.string().min(1, "Nome do vendedor é obrigatório"),
  whatsapp: z.string().min(8, "Número do WhatsApp é obrigatório"),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;
type SellerFormData = z.infer<typeof sellerFormSchema>;

export default function AdminCategories() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [managingSellersFor, setManagingSellersFor] = useState<CategoryWithSellers | null>(null);
  const [showAddSellerForm, setShowAddSellerForm] = useState(false);
  const [editingSeller, setEditingSeller] = useState<CategorySeller | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Não autorizado",
        description: "Você foi desconectado. Fazendo login novamente...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: store } = useQuery<Store>({
    queryKey: ["/api/stores/me"],
    retry: false,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<CategoryWithSellers[]>({
    queryKey: ["/api/stores", store?.id, "categories"],
    enabled: !!store?.id,
    retry: false,
  });

  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      isActive: true,
      isDefault: false,
      sortOrder: "1",
    },
  });

  const sellerForm = useForm<SellerFormData>({
    resolver: zodResolver(sellerFormSchema),
    defaultValues: {
      name: "",
      whatsapp: "",
      isActive: true,
      sortOrder: "1",
    },
  });

  const saveCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      if (!store?.id) throw new Error("Loja não encontrada");
      
      if (editingCategory) {
        await apiRequest("PATCH", `/api/categories/${editingCategory.id}`, data);
      } else {
        await apiRequest("POST", `/api/stores/${store.id}/categories`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores", store?.id, "categories"] });
      toast({
        title: "Sucesso!",
        description: editingCategory ? "Categoria atualizada com sucesso" : "Categoria criada com sucesso",
      });
      
      setShowAddCategoryForm(false);
      setEditingCategory(null);
      categoryForm.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi desconectado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: editingCategory ? "Erro ao atualizar categoria" : "Erro ao criar categoria",
        variant: "destructive",
      });
    },
  });

  const saveSellerMutation = useMutation({
    mutationFn: async (data: SellerFormData) => {
      if (!managingSellersFor) throw new Error("Categoria não encontrada");
      
      if (editingSeller) {
        await apiRequest("PATCH", `/api/category-sellers/${editingSeller.id}`, data);
      } else {
        await apiRequest("POST", `/api/categories/${managingSellersFor.id}/sellers`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores", store?.id, "categories"] });
      toast({
        title: "Sucesso!",
        description: editingSeller ? "Vendedor atualizado com sucesso" : "Vendedor adicionado com sucesso",
      });
      
      setShowAddSellerForm(false);
      setEditingSeller(null);
      sellerForm.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi desconectado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: editingSeller ? "Erro ao atualizar vendedor" : "Erro ao adicionar vendedor",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      if (!store?.id) throw new Error("Loja não encontrada");
      await apiRequest("DELETE", `/api/stores/${store.id}/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores", store?.id, "categories"] });
      toast({
        title: "Sucesso!",
        description: "Categoria removida com sucesso",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi desconectado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao remover categoria",
        variant: "destructive",
      });
    },
  });

  const deleteSellerMutation = useMutation({
    mutationFn: async ({ sellerId, categoryId }: { sellerId: string; categoryId: string }) => {
      await apiRequest("DELETE", `/api/categories/${categoryId}/sellers/${sellerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores", store?.id, "categories"] });
      toast({
        title: "Sucesso!",
        description: "Vendedor removido com sucesso",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi desconectado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao remover vendedor",
        variant: "destructive",
      });
    },
  });

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      isActive: category.isActive ?? true,
      isDefault: category.isDefault ?? false,
      sortOrder: category.sortOrder || "1",
    });
    setShowAddCategoryForm(true);
  };

  const handleEditSeller = (seller: CategorySeller) => {
    setEditingSeller(seller);
    sellerForm.reset({
      name: seller.name,
      whatsapp: seller.whatsapp,
      isActive: seller.isActive ?? true,
      sortOrder: seller.sortOrder || "1",
    });
    setShowAddSellerForm(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (confirm("Tem certeza que deseja remover esta categoria? Esta ação não pode ser desfeita.")) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  const handleDeleteSeller = async (sellerId: string, categoryId: string) => {
    if (confirm("Tem certeza que deseja remover este vendedor?")) {
      deleteSellerMutation.mutate({ sellerId, categoryId });
    }
  };

  if (!isAuthenticated || isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div>Carregando...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
            <p className="text-gray-600">Gerencie as categorias da sua loja e vendedores por categoria</p>
          </div>
          
          <Dialog open={showAddCategoryForm} onOpenChange={setShowAddCategoryForm}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingCategory(null);
                  categoryForm.reset();
                }}
                data-testid="button-add-category"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                </DialogTitle>
              </DialogHeader>
              <form
                onSubmit={categoryForm.handleSubmit((data) => saveCategoryMutation.mutate(data))}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="category-name">Nome da Categoria</Label>
                  <Input
                    id="category-name"
                    placeholder="Ex: Perfumaria"
                    {...categoryForm.register("name")}
                    data-testid="input-category-name"
                  />
                  {categoryForm.formState.errors.name && (
                    <p className="text-sm text-red-600">{categoryForm.formState.errors.name.message}</p>
                  )}
                </div>


                <div className="space-y-2">
                  <Label htmlFor="category-sortOrder">Ordem de Exibição</Label>
                  <Input
                    id="category-sortOrder"
                    type="number"
                    placeholder="1"
                    {...categoryForm.register("sortOrder")}
                    data-testid="input-category-sort"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="category-active"
                    checked={categoryForm.watch("isActive") ?? true}
                    onCheckedChange={(checked) => categoryForm.setValue("isActive", checked)}
                    data-testid="switch-category-active"
                  />
                  <Label htmlFor="category-active">Categoria ativa</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddCategoryForm(false);
                      setEditingCategory(null);
                      categoryForm.reset();
                    }}
                    data-testid="button-cancel-category"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saveCategoryMutation.isPending}
                    data-testid="button-save-category"
                  >
                    {saveCategoryMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {categoriesLoading ? (
          <div className="text-center py-8">Carregando categorias...</div>
        ) : categories.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Nenhuma categoria encontrada. Crie sua primeira categoria!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {categories.map((category) => (
              <Card key={category.id} data-testid={`category-card-${category.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      {category.isDefault && (
                        <Badge variant="secondary" data-testid={`badge-default-${category.id}`}>
                          Padrão
                        </Badge>
                      )}
                      {!category.isActive && (
                        <Badge variant="destructive" data-testid={`badge-inactive-${category.id}`}>
                          Inativa
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManagingSellersFor(category)}
                        data-testid={`button-manage-sellers-${category.id}`}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Vendedores ({category.sellers?.length || 0})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                        data-testid={`button-edit-category-${category.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!category.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-700"
                          data-testid={`button-delete-category-${category.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {category.sellers && category.sellers.length > 0 && (
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Vendedores:</h4>
                      <div className="grid gap-2">
                        {category.sellers.map((seller) => (
                          <div key={seller.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="font-medium text-sm">{seller.name}</p>
                                <p className="text-sm text-gray-600">{seller.whatsapp}</p>
                              </div>
                              {!seller.isActive && (
                                <Badge variant="destructive" className="text-xs">
                                  Inativo
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Dialog para gerenciar vendedores */}
        <Dialog 
          open={!!managingSellersFor} 
          onOpenChange={(open) => {
            if (!open) {
              setManagingSellersFor(null);
              setShowAddSellerForm(false);
              setEditingSeller(null);
              sellerForm.reset();
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Vendedores - {managingSellersFor?.name}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingSeller(null);
                    sellerForm.reset();
                    setShowAddSellerForm(true);
                  }}
                  data-testid="button-add-seller"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </DialogTitle>
            </DialogHeader>

            {showAddSellerForm && (
              <Card className="mb-4">
                <CardContent className="pt-6">
                  <form
                    onSubmit={sellerForm.handleSubmit((data) => saveSellerMutation.mutate(data))}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="seller-name">Nome do Vendedor</Label>
                        <Input
                          id="seller-name"
                          placeholder="Ex: João Silva"
                          {...sellerForm.register("name")}
                          data-testid="input-seller-name"
                        />
                        {sellerForm.formState.errors.name && (
                          <p className="text-sm text-red-600">{sellerForm.formState.errors.name.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="seller-whatsapp">WhatsApp</Label>
                        <Input
                          id="seller-whatsapp"
                          placeholder="Ex: +595 991 123456"
                          {...sellerForm.register("whatsapp")}
                          data-testid="input-seller-whatsapp"
                        />
                        {sellerForm.formState.errors.whatsapp && (
                          <p className="text-sm text-red-600">{sellerForm.formState.errors.whatsapp.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="seller-active"
                        checked={sellerForm.watch("isActive") ?? true}
                        onCheckedChange={(checked) => sellerForm.setValue("isActive", checked)}
                        data-testid="switch-seller-active"
                      />
                      <Label htmlFor="seller-active">Vendedor ativo</Label>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddSellerForm(false);
                          setEditingSeller(null);
                          sellerForm.reset();
                        }}
                        data-testid="button-cancel-seller"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={saveSellerMutation.isPending}
                        data-testid="button-save-seller"
                      >
                        {saveSellerMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {managingSellersFor?.sellers && managingSellersFor.sellers.length > 0 ? (
                managingSellersFor.sellers.map((seller) => (
                  <div key={seller.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{seller.name}</p>
                        <p className="text-sm text-gray-600">{seller.whatsapp}</p>
                      </div>
                      {!seller.isActive && (
                        <Badge variant="destructive">Inativo</Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSeller(seller)}
                        data-testid={`button-edit-seller-${seller.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSeller(seller.id, managingSellersFor.id)}
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-delete-seller-${seller.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum vendedor cadastrado para esta categoria.</p>
                  <p className="text-sm">Clique em "Adicionar" para cadastrar um vendedor.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}