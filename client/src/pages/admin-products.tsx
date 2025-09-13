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
import { Plus, Edit, Trash2, Star, StarOff, Eye, EyeOff, ChevronLeft, ChevronRight, Upload, Download, FileSpreadsheet, Package, Camera, Settings, PlayCircle, CircleX, Gift, Clock } from "lucide-react";
import type { Store, Product, InsertProduct } from "@shared/schema";
import { z } from "zod";
import { PhotoCapture } from "@/components/PhotoCapture";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const productFormSchema = insertProductSchema.extend({
  name: z.string().min(1, "Nome do produto é obrigatório"),
  price: z.string().min(1, "Preço é obrigatório"),
  scratchPrice: z.string().optional(),
  scratchExpiresAt: z.string().optional(),
  gtin: z.string().optional(),
  brand: z.string().optional(),
  productCode: z.string().optional(),
  sourceType: z.string().optional(),
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
  const [icecatSearching, setIcecatSearching] = useState(false);
  const [gtinInput, setGtinInput] = useState("");

  // Função para buscar produto no Icecat via GTIN
  const searchIcecatProduct = async () => {
    if (!gtinInput.trim() || gtinInput.replace(/[^0-9]/g, '').length < 8) {
      toast({
        title: "GTIN inválido",
        description: "Por favor, insira um código GTIN/EAN válido (mínimo 8 dígitos)",
        variant: "destructive",
      });
      return;
    }

    setIcecatSearching(true);

    try {
      // Buscar produto no Icecat com fallback de idioma (BR → EN)
      const cleanGtin = gtinInput.replace(/[^0-9]/g, '').trim();
      const response = await fetch(`/api/icecat/product/${cleanGtin}?lang=BR`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Produto não encontrado no catálogo Icecat");
      }
      
      const product = await response.json();

      // Preencher formulário automaticamente
      form.setValue("name", product.name);
      form.setValue("description", product.description || "");
      form.setValue("category", product.category || "Eletrônicos");
      form.setValue("imageUrl", product.images[0] || "");
      form.setValue("imageUrl2", product.images[1] || "");
      form.setValue("imageUrl3", product.images[2] || "");
      form.setValue("gtin", cleanGtin);
      form.setValue("brand", product.brand || "");
      form.setValue("sourceType", "icecat");
      form.setValue("showInTotem", true); // ✅ Ativar totem automaticamente

      const demoWarning = product.demoAccount ? " (conta demo)" : "";
      
      toast({
        title: "✅ Produto encontrado!",
        description: `${product.name} carregado via Icecat com ${product.images.length} imagens${demoWarning}`,
      });

    } catch (error: any) {
      toast({
        title: "Produto não encontrado",
        description: error.message || "Não foi possível encontrar o produto no catálogo Icecat",
        variant: "destructive",
      });
    } finally {
      setIcecatSearching(false);
    }
  };
  
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
      imageUrl2: "",
      imageUrl3: "",
      isFeatured: false,
      showInStories: false,
      showInTotem: false, // NOVO: Controle para exibição no totem
      isActive: true,
      // Campos de raspadinha
      isScratchCard: false,
      scratchPrice: "",
      scratchExpiresAt: "",
      scratchTimeLimitMinutes: "60",
      maxScratchRedemptions: "10",
      scratchMessage: "Você ganhou um super desconto! Raspe aqui e confira",
      // Campos Icecat
      gtin: "",
      brand: "",
      productCode: "",
      sourceType: "manual",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      if (!store?.id) throw new Error("Store not found");
      
      // Apenas converter para número sem alterar formato
      const cleanPrice = data.price;
      
      // Limpar preço da raspadinha se fornecido
      const cleanScratchPrice = data.scratchPrice || null;
      
      const productData = {
        ...data,
        price: cleanPrice,
        scratchPrice: cleanScratchPrice,
        scratchExpiresAt: data.scratchExpiresAt ? new Date(data.scratchExpiresAt).toISOString() : null,
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
        imageUrl2: "",
        imageUrl3: "",
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
      imageUrl2: "",
      imageUrl3: "",
      isFeatured: false,
      showInStories: false,
      showInTotem: false,
      isActive: true,
      // Campos de raspadinha - valores padrão
      isScratchCard: false,
      scratchPrice: "",
      scratchExpiresAt: "",
      scratchTimeLimitMinutes: "60",
      maxScratchRedemptions: "10",
      scratchMessage: "Você ganhou um super desconto! Raspe aqui e confira",
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
      imageUrl2: product.imageUrl2 || "",
      imageUrl3: product.imageUrl3 || "",
      isFeatured: product.isFeatured,
      showInStories: product.showInStories || false,
      showInTotem: product.showInTotem || false,
      isActive: product.isActive,
      // Campos de raspadinha
      isScratchCard: product.isScratchCard || false,
      scratchPrice: product.scratchPrice?.toString() || "",
      scratchExpiresAt: product.scratchExpiresAt ? new Date(product.scratchExpiresAt).toISOString().slice(0, 16) : "",
      scratchTimeLimitMinutes: product.scratchTimeLimitMinutes || "60",
      maxScratchRedemptions: product.maxScratchRedemptions || "10",
      scratchMessage: product.scratchMessage || "Você ganhou um super desconto! Raspe aqui e confira",
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
      'Categoria': product.category || 'Perfumaria',
      'URL da Imagem 1': product.imageUrl || '',
      'URL da Imagem 2': product.imageUrl2 || '',
      'URL da Imagem 3': product.imageUrl3 || '',
      'Em Destaque': product.isFeatured ? 'Sim' : 'Não',
      'Nos Stories': product.showInStories ? 'Sim' : 'Não',
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
  const importFromExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!store?.id) {
      toast({
        title: "Erro",
        description: "Loja não encontrada.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const importedProducts = jsonData.map((row: any) => ({
          name: row['Nome do Produto'] || '',
          description: row['Descrição'] || '',
          price: String(row['Preço'] || '0').replace(/[^0-9.,]/g, '').replace(/\./g, '').replace(',', '.'),
          category: row['Categoria'] || 'Perfumaria',
          imageUrl: row['URL da Imagem 1'] || row['URL da Imagem'] || '',
          imageUrl2: row['URL da Imagem 2'] || '',
          imageUrl3: row['URL da Imagem 3'] || '',
          isFeatured: row['Em Destaque'] === 'Sim',
          isActive: row['Ativo'] === 'Sim'
        }));

        // Processar produtos de forma sequencial para evitar conflitos
        let updated = 0;
        let created = 0;

        for (const productData of importedProducts) {
          if (!productData.name.trim()) continue;
          
          try {
            // Verificar se produto já existe pelo nome
            const existingProduct = products.find(p => 
              p.name.toLowerCase().trim() === productData.name.toLowerCase().trim()
            );
            
            if (existingProduct) {
              // Atualizar produto existente
              await apiRequest("PATCH", `/api/stores/${store.id}/products/${existingProduct.id}`, productData);
              updated++;
            } else {
              // Criar novo produto
              await apiRequest("POST", `/api/stores/${store.id}/products`, productData);
              created++;
            }
          } catch (error) {
            console.error('Erro ao processar produto:', productData.name, error);
          }
        }
        
        // Atualizar a lista de produtos após importação
        queryClient.invalidateQueries({ queryKey: ["/api/stores", store?.id, "products"] });
        
        toast({
          title: "Importação concluída!",
          description: `${created} produtos criados, ${updated} produtos atualizados.`,
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
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Produtos</h2>
        </div>
        
        {/* Action buttons for mobile */}
        <div className="sm:hidden flex justify-center gap-2 flex-wrap">
          <Button 
            variant="outline"
            onClick={exportToExcel}
            className="flex items-center gap-2"
            data-testid="button-export-excel-mobile"
          >
            <Download className="w-4 h-4" />
            Exportar
          </Button>
          
          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={importFromExcel}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              data-testid="input-import-excel-mobile"
            />
            <Button 
              variant="outline"
              className="flex items-center gap-2"
              data-testid="button-import-excel-mobile"
            >
              <Upload className="w-4 h-4" />
              Importar
            </Button>
          </div>
          
          <Button 
            onClick={handleAddProduct}
            className="bg-primary text-white hover:bg-blue-600"
            data-testid="button-add-product-mobile-inline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
        
        {/* Action Buttons - Desktop and Tablet */}
        <div className="hidden sm:flex justify-center items-center gap-3 flex-wrap">
          <Button 
            variant="outline"
            onClick={exportToExcel}
            className="flex items-center gap-2"
            data-testid="button-export-excel"
          >
            <Download className="w-4 h-4" />
            Exportar
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
              Importar
            </Button>
          </div>
          
          <Button 
            onClick={handleAddProduct}
            className="bg-primary text-white hover:bg-blue-600"
            data-testid="button-add-product"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
        
        {/* Dialog - Shared by both mobile and desktop */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-50">
            <DialogHeader className="bg-white p-6 -mx-6 -mt-6 mb-4 border-b">
              <DialogTitle className="text-xl font-semibold text-gray-800">
                {editingProduct ? "Editar Produto" : "Adicionar Novo Produto"}
              </DialogTitle>
            </DialogHeader>
              
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Busca no Icecat */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-5 rounded-lg border border-blue-200 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                      <Package className="w-5 h-5 mr-2 text-blue-600" />
                      🔍 Buscar Produto no Catálogo Icecat
                    </h3>
                    <div className="bg-white p-4 rounded-lg border border-blue-100">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <Label htmlFor="gtin-search" className="text-gray-700 font-medium text-sm">Código de Barras (GTIN/EAN/UPC)</Label>
                          <Input
                            id="gtin-search"
                            value={gtinInput}
                            onChange={(e) => setGtinInput(e.target.value)}
                            placeholder="Ex: 7891234567890"
                            className="mt-1 placeholder:text-gray-400 border-gray-300 focus:border-blue-500"
                            data-testid="input-gtin-search"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            onClick={searchIcecatProduct}
                            disabled={icecatSearching || !gtinInput.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                            data-testid="button-search-icecat"
                          >
                            {icecatSearching ? "Buscando..." : "🔍 Buscar"}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        ✨ Preenchimento automático: nome, descrição, categoria e até 3 imagens oficiais + <strong>totem ativado</strong>
                      </p>
                    </div>
                  </div>

                  {/* Informações Básicas */}
                  <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                      <Package className="w-5 h-5 mr-2 text-blue-600" />
                      Informações Básicas
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-gray-700 font-medium">Nome do Produto *</Label>
                        <Input
                          id="name"
                          {...form.register("name")}
                          placeholder="Ex: Arroz Tio João 5kg"
                          className="placeholder:text-gray-400 border-gray-300 focus:border-blue-500"
                          data-testid="input-product-name"
                        />
                        {form.formState.errors.name && (
                          <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="price" className="text-gray-700 font-medium">Preço *</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 font-medium bg-gray-100 px-2 py-1 rounded text-sm">
                            {store.currency}
                          </span>
                          <Input
                            id="price"
                            {...form.register("price")}
                            placeholder="25.000 ou 25000"
                            className="pl-16 placeholder:text-gray-400 border-gray-300 focus:border-blue-500"
                            data-testid="input-product-price"
                          />
                        </div>
                        {form.formState.errors.price && (
                          <p className="text-sm text-red-600">{form.formState.errors.price.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-gray-700 font-medium">Categoria</Label>
                        <Select 
                          value={form.watch("category") || "Perfumaria"} 
                          onValueChange={(value) => form.setValue("category", value)}
                        >
                          <SelectTrigger className="border-gray-300 focus:border-blue-500" data-testid="select-product-category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Perfumaria">Perfumaria</SelectItem>
                            <SelectItem value="Bebidas">Bebidas</SelectItem>
                            <SelectItem value="Eletrônica">Eletrônica</SelectItem>
                            <SelectItem value="Cosméticos">Cosméticos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-gray-700 font-medium">Descrição</Label>
                        <Textarea
                          id="description"
                          {...form.register("description")}
                          placeholder="Descrição detalhada do produto..."
                          className="placeholder:text-gray-400 border-gray-300 focus:border-blue-500"
                          rows={2}
                          data-testid="textarea-product-description"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Imagens do Produto */}
                  <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                      <Camera className="w-5 h-5 mr-2 text-green-600" />
                      Imagens do Produto (3 fotos)
                    </h3>
                    <div className="space-y-4">
                      {/* Imagem 1 */}
                      <div className="space-y-2">
                        <Label htmlFor="imageUrl" className="text-gray-700 font-medium text-sm">Imagem Principal *</Label>
                        <Input
                          id="imageUrl"
                          {...form.register("imageUrl")}
                          placeholder="Cole a URL da primeira imagem..."
                          className="placeholder:text-gray-400 border-gray-300 focus:border-blue-500"
                          data-testid="input-product-image-1"
                        />
                        <div className="flex items-center justify-center">
                          <span className="text-gray-500 text-xs">ou</span>
                        </div>
                        <PhotoCapture 
                          onPhotoCapture={(url) => form.setValue("imageUrl", url)}
                        />
                      </div>

                      {/* Imagem 2 */}
                      <div className="space-y-2">
                        <Label htmlFor="imageUrl2" className="text-gray-700 font-medium text-sm">Segunda Imagem</Label>
                        <Input
                          id="imageUrl2"
                          {...form.register("imageUrl2")}
                          placeholder="Cole a URL da segunda imagem..."
                          className="placeholder:text-gray-400 border-gray-300 focus:border-blue-500"
                          data-testid="input-product-image-2"
                        />
                      </div>

                      {/* Imagem 3 */}
                      <div className="space-y-2">
                        <Label htmlFor="imageUrl3" className="text-gray-700 font-medium text-sm">Terceira Imagem</Label>
                        <Input
                          id="imageUrl3"
                          {...form.register("imageUrl3")}
                          placeholder="Cole a URL da terceira imagem..."
                          className="placeholder:text-gray-400 border-gray-300 focus:border-blue-500"
                          data-testid="input-product-image-3"
                        />
                      </div>
                    </div>
                  </div>

                  {/* TEMPORARIAMENTE DESABILITADO - Configuração de Raspadinha */}
                  {/* 
                  <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                      <Gift className="w-5 h-5 mr-2 text-orange-600" />
                      Configuração de Raspadinha
                    </h3>
                    
                    <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200 mb-4">
                      <Switch
                        id="scratch-card"
                        checked={form.watch("isScratchCard") || false}
                        onCheckedChange={(checked) => form.setValue("isScratchCard", checked)}
                        data-testid="switch-scratch-card"
                      />
                      <Label htmlFor="scratch-card" className="text-orange-800 font-medium">
                        Ativar Raspadinha para este produto
                      </Label>
                    </div>
                    
                    {form.watch("isScratchCard") && (
                      <div className="space-y-4 p-4 bg-orange-25 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="scratch-price" className="text-gray-700 font-medium">Preço com Desconto *</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 font-medium bg-gray-100 px-2 py-1 rounded text-sm">
                                {store?.currency}
                              </span>
                              <Input
                                id="scratch-price"
                                {...form.register("scratchPrice")}
                                placeholder="Ex: 15.000 (menor que o preço normal)"
                                className="pl-16 placeholder:text-gray-400 border-gray-300 focus:border-orange-500"
                                data-testid="input-scratch-price"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="scratch-time-limit" className="text-gray-700 font-medium">Tempo Limite (minutos)</Label>
                            <Select
                              value={form.watch("scratchTimeLimitMinutes") || "60"}
                              onValueChange={(value) => form.setValue("scratchTimeLimitMinutes", value)}
                            >
                              <SelectTrigger className="border-gray-300 focus:border-orange-500">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="30">30 minutos</SelectItem>
                                <SelectItem value="60">1 hora</SelectItem>
                                <SelectItem value="120">2 horas</SelectItem>
                                <SelectItem value="180">3 horas</SelectItem>
                                <SelectItem value="360">6 horas</SelectItem>
                                <SelectItem value="720">12 horas</SelectItem>
                                <SelectItem value="1440">24 horas</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="scratch-expires" className="text-gray-700 font-medium">Data de Expiração da Promoção</Label>
                            <Input
                              id="scratch-expires"
                              type="datetime-local"
                              {...form.register("scratchExpiresAt")}
                              className="border-gray-300 focus:border-orange-500"
                              data-testid="input-scratch-expires"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="max-redemptions" className="text-gray-700 font-medium">Máximo de Raspagens</Label>
                            <Select
                              value={form.watch("maxScratchRedemptions") || "10"}
                              onValueChange={(value) => form.setValue("maxScratchRedemptions", value)}
                            >
                              <SelectTrigger className="border-gray-300 focus:border-orange-500">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5 pessoas</SelectItem>
                                <SelectItem value="10">10 pessoas</SelectItem>
                                <SelectItem value="25">25 pessoas</SelectItem>
                                <SelectItem value="50">50 pessoas</SelectItem>
                                <SelectItem value="100">100 pessoas</SelectItem>
                                <SelectItem value="999">Ilimitado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="scratch-message" className="text-gray-700 font-medium">Mensagem da Raspadinha</Label>
                          <Textarea
                            id="scratch-message"
                            {...form.register("scratchMessage")}
                            placeholder="Você ganhou um super desconto! Raspe aqui e confira"
                            className="placeholder:text-gray-400 border-gray-300 focus:border-orange-500"
                            rows={3}
                            data-testid="textarea-scratch-message"
                          />
                          <p className="text-xs text-gray-500">Esta mensagem aparecerá na superfície dourada da raspadinha</p>
                        </div>
                        
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <Clock className="w-4 h-4 text-yellow-600 mt-0.5" />
                            <div>
                              <p className="text-yellow-800 text-sm font-medium">Importante:</p>
                              <p className="text-yellow-700 text-xs mt-1">
                                • O preço com desconto deve ser menor que o preço normal<br/>
                                • Após raspar, o cliente terá o tempo limite especificado para aproveitar<br/>
                                • A promoção expira automaticamente na data definida
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  */}

                  {/* Configurações */}
                  <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                      <Settings className="w-5 h-5 mr-2 text-purple-600" />
                      Configurações
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <Switch
                          id="featured"
                          checked={form.watch("isFeatured") || false}
                          onCheckedChange={(checked) => form.setValue("isFeatured", checked)}
                          data-testid="switch-featured"
                        />
                        <Label htmlFor="featured" className="text-yellow-800 font-medium">
                          Produto em Destaque
                        </Label>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <Switch
                          id="stories"
                          checked={form.watch("showInStories") || false}
                          onCheckedChange={(checked) => form.setValue("showInStories", checked)}
                          data-testid="switch-stories"
                        />
                        <Label htmlFor="stories" className="text-purple-800 font-medium">
                          Mostrar nos Stories
                        </Label>
                      </div>

                      {/* NOVO: Controle para Totem */}
                      <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <Switch
                          id="totem"
                          checked={form.watch("showInTotem") || false}
                          onCheckedChange={(checked) => form.setValue("showInTotem", checked)}
                          data-testid="switch-totem"
                        />
                        <Label htmlFor="totem" className="text-orange-800 font-medium">
                          Exibir no Totem
                        </Label>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <Switch
                          id="active"
                          checked={form.watch("isActive") || true}
                          onCheckedChange={(checked) => form.setValue("isActive", checked)}
                          data-testid="switch-active"
                        />
                        <Label htmlFor="active" className="text-green-800 font-medium">
                          Produto Ativo
                        </Label>
                      </div>
                    </div>

                    {/* Cadastrar mais produtos option */}
                    {!editingProduct && (
                      <div className="mt-4 flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <Switch
                          id="addMore"
                          checked={addMoreProducts}
                          onCheckedChange={setAddMoreProducts}
                          data-testid="switch-add-more"
                        />
                        <Label htmlFor="addMore" className="text-blue-700 font-medium">
                          Cadastrar mais produtos após salvar este
                        </Label>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCancelForm}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={saveMutation.isPending}
                      className="bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                      data-testid="button-save-product"
                    >
                      {saveMutation.isPending ? "Salvando..." : editingProduct ? "Atualizar Produto" : "Criar Produto"}
                    </Button>
                  </div>
                </form>
          </DialogContent>
        </Dialog>

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
              <>
                {/* Desktop Table Layout */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full table-fixed">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-2/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Produto
                        </th>
                        <th className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Preço
                        </th>
                        <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="w-1/4 px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                                  {product.showInStories && (
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                      <Eye className="w-3 h-3 mr-1" />
                                      Stories
                                    </Badge>
                                  )}
                                </div>
                                {product.description && (
                                  <div className="text-sm text-gray-500" title={product.description}>
                                    {product.description.length > 40 
                                      ? `${product.description.substring(0, 40)}...` 
                                      : product.description
                                    }
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {store.currency} {Number(product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleMutation.mutate({
                                  productId: product.id,
                                  field: "isFeatured",
                                  value: !product.isFeatured
                                })}
                                data-testid={`button-toggle-featured-${product.id}`}
                                title={product.isFeatured ? "Remover destaque" : "Marcar como destaque"}
                                className="flex flex-col items-center py-2"
                              >
                                {product.isFeatured ? (
                                  <StarOff className="w-4 h-4 text-accent" />
                                ) : (
                                  <Star className="w-4 h-4 text-gray-400" />
                                )}
                                <span className="text-xs mt-1 text-gray-500">Destaque</span>
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
                                title={product.isActive ? "Desativar produto" : "Ativar produto"}
                                className="flex flex-col items-center py-2"
                              >
                                {product.isActive ? (
                                  <EyeOff className="w-4 h-4 text-gray-600" />
                                ) : (
                                  <Eye className="w-4 h-4 text-gray-400" />
                                )}
                                <span className="text-xs mt-1 text-gray-500">Ativo</span>
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleMutation.mutate({
                                  productId: product.id,
                                  field: "showInStories",
                                  value: !product.showInStories
                                })}
                                data-testid={`button-toggle-stories-${product.id}`}
                                title={product.showInStories ? "Remover dos Stories" : "Adicionar aos Stories"}
                                className="flex flex-col items-center py-2"
                              >
                                {product.showInStories ? (
                                  <CircleX className="w-4 h-4 text-purple-600" />
                                ) : (
                                  <PlayCircle className="w-4 h-4 text-gray-400" />
                                )}
                                <span className="text-xs mt-1 text-gray-500">Stories</span>
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditProduct(product)}
                                data-testid={`button-edit-${product.id}`}
                                title="Editar produto"
                                className="flex flex-col items-center py-2"
                              >
                                <Edit className="w-4 h-4 text-blue-600" />
                                <span className="text-xs mt-1 text-gray-500">Editar</span>
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(product.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-${product.id}`}
                                title="Excluir produto"
                                className="flex flex-col items-center py-2"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                                <span className="text-xs mt-1 text-gray-500">Excluir</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card Layout */}
                <div className="lg:hidden divide-y divide-gray-200">
                  {paginatedProducts.map((product) => (
                    <div key={product.id} className="p-4 bg-white" data-testid={`card-product-${product.id}`}>
                      {/* Conteúdo do produto */}
                      <div className="flex items-start space-x-3 mb-4">
                        {product.imageUrl && (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          {/* Badges above product name - same line */}
                          <div className="flex items-center gap-2 mb-2">
                            <Badge 
                              variant={product.isActive ? "default" : "destructive"}
                              className={`text-xs ${product.isActive ? "bg-green-100 text-green-800" : ""}`}
                            >
                              {product.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                            {product.isFeatured && (
                              <Badge variant="secondary" className="bg-accent text-white text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Destaque
                              </Badge>
                            )}
                            {product.showInStories && (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                                <Eye className="w-3 h-3 mr-1" />
                                Stories
                              </Badge>
                            )}
                          </div>
                          
                          {/* Product name */}
                          <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
                            {product.name}
                          </h3>
                          
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {store.currency} {Number(product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          
                          {product.description && (
                            <p className="text-sm text-gray-500 line-clamp-2" title={product.description}>
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Botões de ação na parte inferior */}
                      <div className="flex items-center justify-center space-x-2 pt-2 border-t border-gray-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMutation.mutate({
                            productId: product.id,
                            field: "isFeatured",
                            value: !product.isFeatured
                          })}
                          data-testid={`button-toggle-featured-${product.id}`}
                          title={product.isFeatured ? "Remover destaque" : "Marcar como destaque"}
                          className="flex-1 flex flex-col items-center py-2 hover:bg-transparent"
                        >
                          <div className={`p-1 rounded-full ${product.isFeatured ? 'bg-yellow-500' : 'bg-transparent'}`}>
                            {product.isFeatured ? (
                              <StarOff className="w-3 h-3 text-white" />
                            ) : (
                              <Star className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                          <span className="text-xs mt-1 text-gray-500">Destaque</span>
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
                          title={product.isActive ? "Desativar produto" : "Ativar produto"}
                          className="flex-1 flex flex-col items-center py-2 hover:bg-transparent"
                        >
                          <div className={`p-1 rounded-full ${product.isActive ? 'bg-green-500' : 'bg-transparent'}`}>
                            {product.isActive ? (
                              <EyeOff className="w-3 h-3 text-white" />
                            ) : (
                              <Eye className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                          <span className="text-xs mt-1 text-gray-500">Ativo</span>
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMutation.mutate({
                            productId: product.id,
                            field: "showInStories",
                            value: !product.showInStories
                          })}
                          data-testid={`button-toggle-stories-${product.id}`}
                          title={product.showInStories ? "Remover dos Stories" : "Adicionar aos Stories"}
                          className="flex-1 flex flex-col items-center py-2 hover:bg-transparent"
                        >
                          <div className={`p-1 rounded-full ${product.showInStories ? 'bg-purple-500' : 'bg-transparent'}`}>
                            {product.showInStories ? (
                              <CircleX className="w-3 h-3 text-white" />
                            ) : (
                              <PlayCircle className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                          <span className="text-xs mt-1 text-gray-500">Stories</span>
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProduct(product)}
                          data-testid={`button-edit-${product.id}`}
                          title="Editar produto"
                          className="flex-1 flex flex-col items-center py-2 hover:bg-transparent"
                        >
                          <div className="p-1 rounded-full bg-blue-500">
                            <Edit className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs mt-1 text-gray-500">Editar</span>
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(product.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${product.id}`}
                          title="Excluir produto"
                          className="flex-1 flex flex-col items-center py-2 hover:bg-transparent"
                        >
                          <div className="p-1 rounded-full bg-red-500">
                            <Trash2 className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs mt-1 text-gray-500">Excluir</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
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
