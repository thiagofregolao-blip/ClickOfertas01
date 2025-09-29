import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tag, Plus, Edit2, Trash2 } from "lucide-react";

// Schema da categoria
const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  slug: z.string().min(1, "Slug é obrigatório"),
  sortOrder: z.number(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface Category {
  id: string;
  name: string;
  description?: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function CategoriesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Query para buscar categorias
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/super-admin/categories'],
    staleTime: 2 * 60 * 1000,
  });

  // Form para criar/editar categoria
  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      slug: "",
      sortOrder: 0,
    },
  });

  // Reset form quando editando
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description || "",
      slug: category.slug,
      sortOrder: category.sortOrder,
    });
  };

  // Mutation para criar categoria
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      return await apiRequest('POST', '/api/super-admin/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/categories'] });
      setIsCreateCategoryOpen(false);
      categoryForm.reset();
      toast({
        title: "Categoria criada",
        description: "Categoria criada com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para criar categorias.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao criar categoria. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  // Mutation para atualizar categoria
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CategoryFormData> & { isActive?: boolean } }) => {
      return await apiRequest('PUT', `/api/super-admin/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/categories'] });
      setEditingCategory(null);
      categoryForm.reset();
      toast({
        title: "Categoria atualizada",
        description: "Categoria atualizada com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para atualizar categorias.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao atualizar categoria. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  // Mutation para deletar categoria
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      return await apiRequest('DELETE', `/api/super-admin/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/categories'] });
      toast({
        title: "Categoria excluída",
        description: "Categoria excluída com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para excluir categorias.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao excluir categoria. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  const onCategorySubmit = async (data: CategoryFormData) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleToggleCategoryActive = (category: Category) => {
    updateCategoryMutation.mutate({
      id: category.id,
      data: { isActive: !category.isActive }
    });
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (confirm("Tem certeza que deseja excluir esta categoria?")) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-7 h-7 text-blue-600" />
            Gerenciamento de Categorias
          </h2>
          <p className="text-gray-500 mt-1">
            Organize os produtos em categorias para facilitar a navegação
          </p>
        </div>
        
        <Dialog open={isCreateCategoryOpen || !!editingCategory} onOpenChange={(open) => {
          if (!open) {
            setIsCreateCategoryOpen(false);
            setEditingCategory(null);
            categoryForm.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setIsCreateCategoryOpen(true)}
              data-testid="button-create-category"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Editar Categoria' : 'Criar Nova Categoria'}
              </DialogTitle>
              <DialogDescription>
                {editingCategory 
                  ? 'Atualize as informações da categoria.' 
                  : 'Crie uma nova categoria para organizar os produtos.'
                }
              </DialogDescription>
            </DialogHeader>

            <Form {...categoryForm}>
              <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={categoryForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Categoria</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Digite o nome da categoria" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              // Auto-generate slug from name
                              const slug = e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9]/g, '-')
                                .replace(/-+/g, '-')
                                .replace(/^-|-$/g, '');
                              categoryForm.setValue('slug', slug);
                            }}
                            data-testid="input-category-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={categoryForm.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug (URL amigável)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="categoria-exemplo" 
                            {...field} 
                            data-testid="input-category-slug"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={categoryForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Digite uma descrição para a categoria" 
                          {...field} 
                          data-testid="input-category-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={categoryForm.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ordem de Exibição</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-category-sort-order"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsCreateCategoryOpen(false);
                      setEditingCategory(null);
                      categoryForm.reset();
                    }}
                    data-testid="button-cancel-category"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                    data-testid="button-save-category"
                  >
                    {(createCategoryMutation.isPending || updateCategoryMutation.isPending) 
                      ? 'Salvando...' 
                      : editingCategory ? 'Atualizar' : 'Criar'
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Categorias */}
      {categoriesLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Carregando categorias...</p>
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Nenhuma categoria encontrada.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setIsCreateCategoryOpen(true)}
            >
              Criar Primeira Categoria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Categorias Cadastradas ({categories.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-gray-600">Nome</th>
                    <th className="py-2 text-gray-600">Slug</th>
                    <th className="py-2 text-gray-600">Ordem</th>
                    <th className="py-2 text-gray-600">Status</th>
                    <th className="py-2 text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {categories
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((category) => (
                    <tr key={category.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <div>
                          <div className="font-medium">{category.name}</div>
                          {category.description && (
                            <div className="text-sm text-gray-500">{category.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {category.slug}
                        </code>
                      </td>
                      <td className="py-3">
                        <Badge variant="outline">{category.sortOrder}</Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          <Switch 
                            checked={category.isActive}
                            onCheckedChange={() => handleToggleCategoryActive(category)}
                            data-testid={`switch-category-active-${category.id}`}
                          />
                          <Badge variant={category.isActive ? "default" : "secondary"}>
                            {category.isActive ? "Ativa" : "Inativa"}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditCategory(category)}
                            data-testid={`button-edit-category-${category.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDeleteCategory(category.id)}
                            data-testid={`button-delete-category-${category.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}