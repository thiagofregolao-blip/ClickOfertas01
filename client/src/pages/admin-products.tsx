import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Star, StarOff, Eye, EyeOff } from "lucide-react";
import type { Store, Product, InsertProduct } from "@shared/schema";
import { z } from "zod";
import { PhotoCapture } from "@/components/PhotoCapture";

const productFormSchema = insertProductSchema.extend({
  name: z.string().min(1, "Nome do produto é obrigatório"),
  price: z.string().min(1, "Preço é obrigatório"),
});

type ProductFormData = z.infer<typeof productFormSchema>;

export default function AdminProducts() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
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

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/stores", store?.id, "products"],
    enabled: !!store?.id,
    retry: false,
  });

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      imageUrl: "",
      isFeatured: false,
      isActive: true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      if (!store?.id) throw new Error("Store not found");
      
      // Clean price - remove currency symbols, dots, commas and convert to number
      const cleanPrice = data.price
        .replace(/[^0-9.,]/g, '') // Remove everything except numbers, dots and commas
        .replace(/\./g, '') // Remove thousand separators (dots)
        .replace(',', '.'); // Replace comma decimal separator with dot
      
      const productData = {
        ...data,
        price: cleanPrice,
      };

      if (editingProduct) {
        await apiRequest("PATCH", `/api/stores/${store.id}/products/${editingProduct.id}`, productData);
      } else {
        await apiRequest("POST", `/api/stores/${store.id}/products`, productData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores", store?.id, "products"] });
      toast({
        title: "Sucesso!",
        description: editingProduct ? "Produto atualizado com sucesso" : "Produto criado com sucesso",
      });
      handleCancelForm();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao salvar produto",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!store?.id) throw new Error("Store not found");
      await apiRequest("DELETE", `/api/stores/${store.id}/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores", store?.id, "products"] });
      toast({
        title: "Sucesso!",
        description: "Produto excluído com sucesso",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao excluir produto",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ productId, field, value }: { productId: string; field: string; value: boolean }) => {
      if (!store?.id) throw new Error("Store not found");
      await apiRequest("PATCH", `/api/stores/${store.id}/products/${productId}`, { [field]: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores", store?.id, "products"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao atualizar produto",
        variant: "destructive",
      });
    },
  });

  const handleAddProduct = () => {
    setEditingProduct(null);
    form.reset({
      name: "",
      description: "",
      price: "",
      imageUrl: "",
      isFeatured: false,
      isActive: true,
    });
    setShowAddForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || "",
      price: product.price,
      imageUrl: product.imageUrl || "",
      isFeatured: product.isFeatured,
      isActive: product.isActive,
    });
    setShowAddForm(true);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingProduct(null);
    form.reset();
  };

  const onSubmit = (data: ProductFormData) => {
    saveMutation.mutate(data);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    if (filter === "active") return matchesSearch && product.isActive;
    if (filter === "inactive") return matchesSearch && !product.isActive;
    if (filter === "featured") return matchesSearch && product.isFeatured;
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!store) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Configure sua loja primeiro para gerenciar produtos.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Produtos</h2>
          <Button 
            onClick={handleAddProduct}
            className="bg-primary text-white hover:bg-blue-600"
            data-testid="button-add-product"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Produto
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <Input
                placeholder="Buscar produtos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
                data-testid="input-search"
              />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48" data-testid="select-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Produtos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                  <SelectItem value="featured">Em Destaque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Product Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingProduct ? "Editar Produto" : "Adicionar Novo Produto"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Produto *</Label>
                    <Input
                      id="name"
                      {...form.register("name")}
                      placeholder="Ex: Arroz Tio João 5kg"
                      data-testid="input-product-name"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Preço *</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg">
                        {store.currency}
                      </span>
                      <Input
                        id="price"
                        {...form.register("price")}
                        placeholder="25000 ou 25.000,00"
                        className="rounded-l-none"
                        data-testid="input-product-price"
                      />
                    </div>
                    {form.formState.errors.price && (
                      <p className="text-sm text-red-600">{form.formState.errors.price.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select 
                      value={form.watch("category") || "Geral"} 
                      onValueChange={(value) => form.setValue("category", value)}
                    >
                      <SelectTrigger data-testid="select-product-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Perfumes">Perfumes</SelectItem>
                        <SelectItem value="Eletrônicos">Eletrônicos</SelectItem>
                        <SelectItem value="Pesca">Pesca</SelectItem>
                        <SelectItem value="Geral">Geral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="imageUrl">Imagem do Produto</Label>
                    <div className="space-y-3">
                      <Input
                        id="imageUrl"
                        {...form.register("imageUrl")}
                        placeholder="https://exemplo.com/imagem-produto.jpg ou tire uma foto abaixo"
                        data-testid="input-product-image"
                      />
                      <div className="text-center text-sm text-gray-500">ou</div>
                      <PhotoCapture
                        onPhotoCapture={(photoUrl) => {
                          form.setValue("imageUrl", photoUrl);
                        }}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      {...form.register("description")}
                      placeholder="Descrição breve do produto..."
                      rows={3}
                      data-testid="input-product-description"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="featured"
                      checked={form.watch("isFeatured") || false}
                      onCheckedChange={(checked) => form.setValue("isFeatured", checked)}
                      data-testid="switch-featured"
                    />
                    <Label htmlFor="featured">Produto em Destaque</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={form.watch("isActive") || true}
                      onCheckedChange={(checked) => form.setValue("isActive", checked)}
                      data-testid="switch-active"
                    />
                    <Label htmlFor="active">Produto Ativo</Label>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancelForm}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saveMutation.isPending}
                    className="bg-primary text-white hover:bg-blue-600"
                    data-testid="button-save-product"
                  >
                    {saveMutation.isPending ? "Salvando..." : editingProduct ? "Atualizar" : "Criar Produto"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Products List */}
        <Card>
          <CardContent className="p-0">
            {productsLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-6 text-center text-gray-600">
                {search ? "Nenhum produto encontrado para a busca." : "Nenhum produto cadastrado ainda."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Preço
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} data-testid={`row-product-${product.id}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {product.imageUrl && (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name}
                                className="w-12 h-12 rounded-lg object-cover mr-4"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                {product.name}
                                {product.isFeatured && (
                                  <Badge variant="secondary" className="bg-accent text-white">
                                    <Star className="w-3 h-3 mr-1" />
                                    Destaque
                                  </Badge>
                                )}
                              </div>
                              {product.description && (
                                <div className="text-sm text-gray-500">{product.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {store.currency} {product.price}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant={product.isActive ? "default" : "destructive"}
                            className={product.isActive ? "bg-green-100 text-green-800" : ""}
                          >
                            {product.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleMutation.mutate({
                              productId: product.id,
                              field: "isFeatured",
                              value: !product.isFeatured
                            })}
                            data-testid={`button-toggle-featured-${product.id}`}
                          >
                            {product.isFeatured ? (
                              <StarOff className="w-4 h-4 text-accent" />
                            ) : (
                              <Star className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleMutation.mutate({
                              productId: product.id,
                              field: "isActive",
                              value: !product.isActive
                            })}
                            data-testid={`button-toggle-active-${product.id}`}
                          >
                            {product.isActive ? (
                              <EyeOff className="w-4 h-4 text-gray-600" />
                            ) : (
                              <Eye className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                            data-testid={`button-edit-${product.id}`}
                          >
                            <Edit className="w-4 h-4 text-primary" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(product.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${product.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
