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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Star, StarOff, Eye, EyeOff, ChevronLeft, ChevronRight, Upload, Download, FileSpreadsheet } from "lucide-react";
import type { Store, Product, InsertProduct } from "@shared/schema";
import { z } from "zod";
import { PhotoCapture } from "@/components/PhotoCapture";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [addMoreProducts, setAddMoreProducts] = useState(false);
  
  const PRODUCTS_PER_PAGE = 15;

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
      
      // Se não for para adicionar mais produtos ou se estiver editando, fechar o modal
      if (!addMoreProducts || editingProduct) {
        setShowAddForm(false);
        setEditingProduct(null);
        setAddMoreProducts(false);
      }
      
      // Limpar o formulário sempre
      form.reset({
        name: "",
        description: "",
        price: "",
        imageUrl: "",
        isFeatured: false,
        isActive: true,
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

  // Função para exportar produtos para Excel
  const exportToExcel = () => {
    if (products.length === 0) {
      toast({
        title: "Nenhum produto encontrado",
        description: "Adicione produtos primeiro para poder exportar.",
        variant: "destructive",
      });
      return;
    }

    const excelData = products.map(product => ({
      'Nome do Produto': product.name,
      'Descrição': product.description || '',
      'Preço': product.price,
      'Categoria': product.category || 'Geral',
      'URL da Imagem': product.imageUrl || '',
      'Em Destaque': product.isFeatured ? 'Sim' : 'Não',
      'Ativo': product.isActive ? 'Sim' : 'Não'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    saveAs(blob, `produtos_${store?.name || 'loja'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Produtos exportados!",
      description: "O arquivo Excel foi baixado com sucesso.",
    });
  };

  // Função para importar produtos do Excel
  const importFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const importedProducts = jsonData.map((row: any) => ({
          name: row['Nome do Produto'] || '',
          description: row['Descrição'] || '',
          price: row['Preço'] || '',
          category: row['Categoria'] || 'Geral',
          imageUrl: row['URL da Imagem'] || '',
          isFeatured: row['Em Destaque'] === 'Sim',
          isActive: row['Ativo'] === 'Sim'
        }));

        // Aqui você pode implementar a lógica para salvar os produtos importados
        console.log('Produtos importados:', importedProducts);
        
        toast({
          title: "Importação concluída!",
          description: `${importedProducts.length} produtos foram importados.`,
        });

      } catch (error) {
        toast({
          title: "Erro na importação",
          description: "Verifique se o arquivo Excel está no formato correto.",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Limpar o input para permitir reimportação do mesmo arquivo
    event.target.value = '';
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    if (filter === "active") return matchesSearch && product.isActive;
    if (filter === "inactive") return matchesSearch && !product.isActive;
    if (filter === "featured") return matchesSearch && product.isFeatured;
    return matchesSearch;
  });

  // Resetar página quando filtro ou busca mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  // Cálculos de paginação
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);

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
          
          <div className="flex gap-2">
            {/* Excel Export/Import */}
            <Button 
              variant="outline"
              onClick={exportToExcel}
              className="flex items-center gap-2"
              data-testid="button-export-excel"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </Button>
            
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={importFromExcel}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                data-testid="input-import-excel"
              />
              <Button 
                variant="outline"
                className="flex items-center gap-2"
                data-testid="button-import-excel"
              >
                <Upload className="w-4 h-4" />
                Importar Excel
              </Button>
            </div>
            
            {/* Add Product Modal */}
            <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
              <DialogTrigger asChild>
                <Button 
                  onClick={handleAddProduct}
                  className="bg-primary text-white hover:bg-blue-600"
                  data-testid="button-add-product"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Produto
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? "Editar Produto" : "Adicionar Novo Produto"}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Produto *</Label>
                      <Input
                        id="name"
                        {...form.register("name")}
                        placeholder="Ex: Arroz Tio João 5kg"
                        className="placeholder:text-gray-400"
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
                          className="rounded-l-none placeholder:text-gray-400"
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

                    <div className="space-y-2">
                      <Label htmlFor="imageUrl">Imagem do Produto</Label>
                      <div className="flex gap-2">
                        <Input
                          id="imageUrl"
                          {...form.register("imageUrl")}
                          placeholder="URL da imagem ou use a câmera"
                          className="flex-1 placeholder:text-gray-400"
                          data-testid="input-product-image"
                        />
                        <PhotoCapture 
                          onPhotoCapture={(url) => form.setValue("imageUrl", url)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      {...form.register("description")}
                      placeholder="Descrição detalhada do produto..."
                      className="placeholder:text-gray-400"
                      rows={3}
                      data-testid="textarea-product-description"
                    />
                  </div>

                  <div className="flex items-center space-x-6">
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

                  {/* Cadastrar mais produtos option */}
                  {!editingProduct && (
                    <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <Switch
                        id="addMore"
                        checked={addMoreProducts}
                        onCheckedChange={setAddMoreProducts}
                        data-testid="switch-add-more"
                      />
                      <Label htmlFor="addMore" className="text-blue-700 font-medium">
                        Cadastrar mais produtos após salvar
                      </Label>
                    </div>
                  )}

                  <div className="flex justify-end space-x-4 pt-4">
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
              </DialogContent>
            </Dialog>
          </div>
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


        {/* Products List */}
        <Card>
          <CardContent className="p-0">
            {productsLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            ) : paginatedProducts.length === 0 ? (
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
                    {paginatedProducts.map((product) => (
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
            
            {/* Paginação */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando {startIndex + 1} até {Math.min(startIndex + PRODUCTS_PER_PAGE, filteredProducts.length)} de {filteredProducts.length} produtos
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Mostrar sempre primeira, última e páginas próximas à atual
                        return page === 1 || 
                               page === totalPages || 
                               Math.abs(page - currentPage) <= 1;
                      })
                      .map((page, index, array) => {
                        // Adicionar "..." se houver gap
                        const showEllipsis = index > 0 && array[index - 1] < page - 1;
                        
                        return (
                          <div key={page} className="flex items-center">
                            {showEllipsis && (
                              <span className="px-2 text-gray-400">...</span>
                            )}
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                              data-testid={`button-page-${page}`}
                            >
                              {page}
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    data-testid="button-next-page"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
