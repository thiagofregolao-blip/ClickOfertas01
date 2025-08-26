import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCategorySchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Settings, X, Grid3X3 } from "lucide-react";
import type { Store, Category, InsertCategory } from "@shared/schema";
import { z } from "zod";

const categoryFormSchema = insertCategorySchema.extend({
  name: z.string().min(1, "Nome da categoria é obrigatório"),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

export default function AdminCategories() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

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

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
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

  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: InsertCategory) => {
      if (!store?.id) throw new Error("Store not found");
      await apiRequest(`/api/stores/${store.id}/categories`, "POST", categoryData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores", store?.id, "categories"] });
      categoryForm.reset();
      setShowAddCategoryForm(false);
      toast({
        title: "Sucesso",
        description: "Categoria criada com sucesso",
      });
    },
    onError: (error) => {
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
        description: "Falha ao criar categoria",
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...categoryData }: Category) => {
      await apiRequest(`/api/categories/${id}`, "PUT", categoryData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores", store?.id, "categories"] });
      categoryForm.reset();
      setEditingCategory(null);
      setShowAddCategoryForm(false);
      toast({
        title: "Sucesso",
        description: "Categoria atualizada com sucesso",
      });
    },
    onError: (error) => {
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
        description: "Falha ao atualizar categoria",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      await apiRequest(`/api/categories/${categoryId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores", store?.id, "categories"] });
      toast({
        title: "Sucesso",
        description: "Categoria removida com sucesso",
      });
    },
    onError: (error) => {
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
        description: "Falha ao remover categoria",
        variant: "destructive",
      });
    },
  });

  const handleCreateCategory = (data: CategoryFormData) => {
    const categoryData: InsertCategory = {
      ...data,
      storeId: store!.id,
      sortOrder: parseInt(data.sortOrder || "1"),
    };
    createCategoryMutation.mutate(categoryData);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      isActive: category.isActive,
      isDefault: category.isDefault,
      sortOrder: category.sortOrder?.toString() || "1",
    });
    setShowAddCategoryForm(true);
  };

  const handleUpdateCategory = (data: CategoryFormData) => {
    if (!editingCategory) return;
    
    const categoryData: Category = {
      ...editingCategory,
      ...data,
      sortOrder: parseInt(data.sortOrder || "1"),
    };
    updateCategoryMutation.mutate(categoryData);
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (window.confirm("Tem certeza que deseja remover esta categoria?")) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  if (isLoading || categoriesLoading) {
    return (
      <AdminLayout>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Grid3X3 className="w-8 h-8 mr-3 text-blue-600" />
              Categorias
            </h1>
            <p className="text-gray-600 mt-2">
              Organize seus produtos em categorias para melhor navegação
            </p>
          </div>
          
          <Dialog open={showAddCategoryForm} onOpenChange={(open) => {
            setShowAddCategoryForm(open);
            if (!open) {
              setEditingCategory(null);
              categoryForm.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                </DialogTitle>
              </DialogHeader>
              <form
                onSubmit={categoryForm.handleSubmit(editingCategory ? handleUpdateCategory : handleCreateCategory)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Categoria *</Label>
                  <Input
                    id="name"
                    {...categoryForm.register("name")}
                    placeholder="Ex: Eletrônicos, Roupas..."
                    data-testid="input-category-name"
                  />
                  {categoryForm.formState.errors.name && (
                    <p className="text-sm text-red-600">{categoryForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Ordem de Exibição</Label>
                  <Input
                    id="sortOrder"
                    {...categoryForm.register("sortOrder")}
                    type="number"
                    placeholder="1, 2, 3..."
                    data-testid="input-category-sort"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={categoryForm.watch("isActive")}
                    onCheckedChange={(checked) => categoryForm.setValue("isActive", checked)}
                    data-testid="switch-category-active"
                  />
                  <Label htmlFor="isActive">Categoria ativa</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isDefault"
                    checked={categoryForm.watch("isDefault")}
                    onCheckedChange={(checked) => categoryForm.setValue("isDefault", checked)}
                    data-testid="switch-category-default"
                  />
                  <Label htmlFor="isDefault">Categoria padrão</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddCategoryForm(false);
                      setEditingCategory(null);
                      categoryForm.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                    data-testid="button-save-category"
                  >
                    {createCategoryMutation.isPending || updateCategoryMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Categories Grid */}
        <div className="grid gap-6">
          {categories.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Grid3X3 className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-medium text-gray-500 mb-2">Nenhuma categoria cadastrada</h3>
                <p className="text-gray-400 text-center mb-6">
                  Crie suas primeiras categorias para organizar melhor seus produtos
                </p>
                <Button onClick={() => setShowAddCategoryForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Categoria
                </Button>
              </CardContent>
            </Card>
          ) : (
            categories.map((category) => (
              <Card key={category.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{category.name}</h3>
                        <div className="ml-3 flex gap-2">
                          {category.isActive ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Ativa
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                              Inativa
                            </Badge>
                          )}
                          {category.isDefault && (
                            <Badge variant="default" className="bg-blue-100 text-blue-800">
                              Padrão
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-500 mt-1">
                        Ordem: {category.sortOrder || 1}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                        data-testid={`button-edit-category-${category.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-category-${category.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}