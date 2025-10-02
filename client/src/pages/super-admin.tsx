import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Settings, Users, Store, Image, BarChart3, Plus, Edit, Edit2, Trash2, Eye, LogOut, Gift, Dice6, Target, Award, Save, Package, Percent, DollarSign, Trophy, RotateCcw, Download, HelpCircle, Calculator, AlertTriangle, AlertCircle, TrendingUp, Search, Brain, Globe, Activity, Zap, RefreshCw, Tag, Wifi, Crown, Router, CreditCard, Shield, EyeOff, CheckCircle, XCircle, Clock, Calendar, TrendingDown, ChevronDown, Palette, Building2, Gamepad2, Server, Filter } from 'lucide-react';
import { isUnauthorizedError } from '@/lib/authUtils';
import type { WifiSettings, WifiPayment, WifiAnalytics, InsertWifiSettings, WifiPlan } from "@shared/schema";
import { useLocation } from 'wouter';

const bannerSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  imageUrl: z.string().url("URL da imagem inválida"),
  linkUrl: z.string().optional().refine((val) => !val || val === "" || z.string().url().safeParse(val).success, {
    message: "URL do link inválida"
  }),
  bannerType: z.enum(['rotating', 'static_left', 'static_right']),
  priority: z.string().default("0"),
  backgroundColor: z.string().default("#ffffff"),
  textColor: z.string().default("#000000"),
});

type BannerFormData = z.infer<typeof bannerSchema>;

const prizeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  prizeType: z.enum(['product', 'discount', 'cashback']),
  productId: z.string().optional(),
  discountPercentage: z.string().optional(),
  discountValue: z.string().optional(),
  maxDiscountAmount: z.string().optional(),
  imageUrl: z.string().optional(),
  probability: z.string().min(1, "Probabilidade é obrigatória"),
  maxDailyWins: z.string().default("1"),
  isActive: z.boolean().default(true),
});

type PrizeFormData = z.infer<typeof prizeSchema>;

const wifiPlanSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  durationHours: z.coerce.number().min(1, "Duração deve ser maior que 0"),
  price: z.coerce.number().min(0.01, "Preço deve ser maior que 0"),
  description: z.string().optional(),
});

type WifiPlanFormData = z.infer<typeof wifiPlanSchema>;

// Category schema
const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  slug: z.string().min(1, "Slug é obrigatório").regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  sortOrder: z.coerce.number().min(0).default(0),
});

type CategoryFormData = z.infer<typeof categorySchema>;

// Hero Banner schema
const heroBannerSchema = z.object({
  imageUrl: z.string().url("URL da imagem inválida"),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  sortOrder: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

type HeroBannerFormData = z.infer<typeof heroBannerSchema>;

interface Category {
  id: string;
  name: string;
  description?: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface HeroBanner {
  id: string;
  imageUrl: string;
  title: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductBank {
  id: string;
  name: string;
  description?: string;
  zipFileName: string;
  uploadedBy: string;
  totalProducts: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductBankItem {
  id: string;
  bankId: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  model?: string;
  color?: string;
  storage?: string;
  ram?: string;
  folderName: string;
  imageUrls: string[];
  primaryImageUrl: string;
  metadata: any;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface MaintenanceMode {
  id: string;
  isActive: boolean;
  title: string;
  message: string;
  accessPassword: string;
  updatedAt: string;
  updatedBy?: string;
}

interface Banner {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  bannerType: 'rotating' | 'static_left' | 'static_right';
  isActive: boolean;
  priority: string;
  backgroundColor: string;
  textColor: string;
  viewsCount: string;
  clicksCount: string;
  createdAt: string;
  updatedAt: string;
}

interface StoreData {
  id: string;
  name: string;
  logoUrl?: string;
  themeColor: string;
  currency: string;
  whatsapp?: string;
  instagram?: string;
  address?: string;
  isActive: boolean;
  userId: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  products: Array<any>;
}

interface UserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  storeName?: string;
  phone?: string;
  address?: string;
  city?: string;
  provider: string;
  isEmailVerified: boolean;
  isSuperAdmin: boolean;
  storeOwnerToken?: string;
  createdAt: string;
  updatedAt: string;
}

interface DailyPrize {
  id: string;
  prizeType: 'product' | 'discount' | 'cashback';
  productId?: string;
  discountPercentage?: string;
  discountValue?: string;
  maxDiscountAmount?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  probability: string;
  maxDailyWins: string;
  totalWinsToday: string;
  totalWinsAllTime: string;
  isActive: boolean;
  validFrom: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

interface ScratchStats {
  totalCardsToday: number;
  cardsScratched: number;
  prizesWon: number;
  successRate: number;
}

// Componente para lista de produtos
const ProductList = ({ availableProducts, productSearchTerm, onSelectProduct }: {
  availableProducts: any[];
  productSearchTerm: string;
  onSelectProduct: (product: any) => void;
}) => {
  const filteredProducts = availableProducts.filter((product: any) =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.storeName.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    (product.category && product.category.toLowerCase().includes(productSearchTerm.toLowerCase()))
  );

  if (availableProducts.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="text-center py-12 text-gray-500">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">Nenhum produto disponível</h3>
          <p className="text-sm">Cadastre produtos nas lojas antes de criar prêmios de produto.</p>
        </div>
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="text-center py-12 text-gray-500">
          <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">Nenhum produto encontrado</h3>
          <p className="text-sm">Tente usar termos diferentes na busca.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pr-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
        {filteredProducts.map((product: any) => (
          <div
            key={product.id}
            onClick={() => onSelectProduct(product)}
            className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors group"
            data-testid={`product-option-${product.id}`}
          >
            <div className="flex items-start gap-4">
              {product.imageUrl ? (
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {product.name}
                </h3>
                
                <div className="flex items-center gap-2 mt-1">
                  {product.storeLogoUrl && (
                    <img 
                      src={product.storeLogoUrl} 
                      alt={product.storeName}
                      className="w-4 h-4 rounded object-cover"
                    />
                  )}
                  <p className="text-sm text-gray-600 truncate">
                    {product.storeName}
                  </p>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-green-600">
                      ${product.price}
                    </span>
                    {product.category && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {product.category}
                      </span>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProduct(product);
                    }}
                  >
                    Selecionar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente para controles de manutenção
function MaintenanceControls() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  // Buscar status de manutenção
  const { data: maintenanceMode, refetch } = useQuery<MaintenanceMode>({
    queryKey: ['/api/maintenance/status'],
    retry: (failureCount, error) => !isUnauthorizedError(error),
    staleTime: 0, // Sem cache para forçar nova consulta
    cacheTime: 0, // Não manter em cache
  });

  // Form para editar configurações de manutenção
  const form = useForm({
    defaultValues: {
      title: maintenanceMode?.title || 'Em Breve',
      message: maintenanceMode?.message || 'Estamos preparando as melhores ofertas do Paraguai para você!',
      accessPassword: maintenanceMode?.accessPassword || 'CLICKOFERTAS2025',
    },
  });

  // Reset form quando dados carregam
  useEffect(() => {
    if (maintenanceMode) {
      form.reset({
        title: maintenanceMode.title,
        message: maintenanceMode.message,
        accessPassword: maintenanceMode.accessPassword,
      });
    }
  }, [maintenanceMode, form]);

  // Mutation para alternar modo manutenção
  const toggleMaintenanceMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      console.log('🔧 Tentando alternar modo manutenção:', { isActive });
      return await apiRequest('POST', '/api/maintenance/toggle', { isActive });
    },
    onSuccess: () => {
      refetch();
      toast({
        title: maintenanceMode?.isActive ? "Modo manutenção desativado" : "Modo manutenção ativado",
        description: maintenanceMode?.isActive 
          ? "O site voltou ao funcionamento normal." 
          : "O site está agora em modo manutenção.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para alterar o modo manutenção.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível alterar o modo manutenção.",
          variant: "destructive",
        });
      }
    },
  });

  // Mutation para atualizar configurações
  const updateConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/maintenance/config', data);
    },
    onSuccess: () => {
      refetch();
      setIsEditing(false);
      toast({
        title: "Configurações atualizadas",
        description: "As configurações de manutenção foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para alterar configurações.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível salvar as configurações.",
          variant: "destructive",
        });
      }
    },
  });

  const handleToggleMaintenance = () => {
    toggleMaintenanceMutation.mutate(!maintenanceMode?.isActive);
  };

  const handleSaveConfig = (data: any) => {
    updateConfigMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Controles do Sistema
        </h2>
      </div>

      {/* Card de Modo Manutenção */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-600" />
                Modo Manutenção
              </CardTitle>
              <Badge variant={maintenanceMode?.isActive ? "destructive" : "default"}>
                {maintenanceMode?.isActive ? "ATIVO" : "INATIVO"}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                data-testid="button-edit-maintenance"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {isEditing ? 'Cancelar' : 'Editar'}
              </Button>
              
              <Switch 
                checked={maintenanceMode?.isActive || false}
                onCheckedChange={handleToggleMaintenance}
                disabled={toggleMaintenanceMutation.isPending}
                data-testid="switch-maintenance-mode"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSaveConfig)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título da Página</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-maintenance-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="textarea-maintenance-message" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="accessPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha de Acesso</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" data-testid="input-maintenance-password" />
                      </FormControl>
                      <FormDescription>
                        Senha para super admins acessarem durante a manutenção
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-orange-600 hover:bg-orange-700"
                    disabled={updateConfigMutation.isPending}
                    data-testid="button-save-maintenance"
                  >
                    {updateConfigMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Título:</p>
                <p className="font-medium">{maintenanceMode?.title}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Mensagem:</p>
                <p className="text-gray-700 dark:text-gray-300">{maintenanceMode?.message}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Última atualização:</p>
                <p className="text-sm text-gray-600">
                  {maintenanceMode?.updatedAt ? new Date(maintenanceMode.updatedAt).toLocaleString('pt-BR') : 'N/A'}
                </p>
              </div>
            </div>
          )}
          
          {maintenanceMode?.isActive && (
            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                  Atenção: O site está em modo manutenção. Apenas super admins podem acessar.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ========== AI TEST INTERFACE COMPONENT ==========
function AITestInterface() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // ========== BUSCAR TODOS OS PRODUTOS ==========
  const { data: allProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/super-admin/all-products'],
    gcTime: 5 * 60 * 1000,
  });

  // ========== MUTATION PARA GERAR BANNER DE TESTE ==========
  const generateTestBannerMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      return apiRequest('POST', '/api/super-admin/ai-test/generate-banner', {
        productIds,
        testMode: true
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Banner de teste gerado!",
        description: `Arte criada com sucesso usando ${selectedProducts.length} produto(s).`,
        variant: "default",
      });
      setSelectedProducts([]);
      // Invalidar cache das artes IA
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/generated-arts/manage'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na geração",
        description: error.message || "Erro ao gerar banner de teste.",
        variant: "destructive",
      });
    },
  });

  const handleProductSelect = (productId: string) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      }
      return [...prev, productId];
    });
  };

  const handleGenerateTest = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "Selecione produtos",
        description: "Escolha pelo menos 1 produto para gerar o banner.",
        variant: "destructive",
      });
      return;
    }
    generateTestBannerMutation.mutate(selectedProducts);
  };

  const filteredProducts = allProducts?.filter((product: any) => product.isActive) || [];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Brain className="w-7 h-7 text-purple-600" />
          Teste de Geração de IA
        </h2>
        <p className="text-gray-500 mt-1">
          Gere banners de teste manualmente selecionando produtos específicos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SELETOR DE PRODUTOS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Selecionar Produtos ({selectedProducts.length} selecionados)
            </CardTitle>
            <CardDescription>
              Escolha os produtos que serão usados para gerar o banner de teste
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Nenhum produto ativo encontrado</p>
                  </div>
                ) : (
                  filteredProducts.map((product: any) => (
                    <div
                      key={product.id}
                      onClick={() => handleProductSelect(product.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedProducts.includes(product.id) 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      data-testid={`product-selector-${product.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 border-2 rounded ${
                          selectedProducts.includes(product.id) 
                            ? 'bg-purple-600 border-purple-600' 
                            : 'border-gray-300'
                        }`}>
                          {selectedProducts.includes(product.id) && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{product.name}</p>
                          <p className="text-sm text-gray-500 truncate">
                            {product.storeName} • ${product.price}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PAINEL DE CONTROLE */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-600" />
              Controles de Teste
            </CardTitle>
            <CardDescription>
              Gere banners personalizados para teste e validação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* STATUS */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Status da Seleção</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Produtos selecionados:</span>
                  <span className="font-medium">{selectedProducts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total de produtos ativos:</span>
                  <span className="font-medium">{filteredProducts.length}</span>
                </div>
              </div>
            </div>

            {/* PRODUTOS SELECIONADOS */}
            {selectedProducts.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Produtos Selecionados:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedProducts.map(productId => {
                    const product = filteredProducts.find((p: any) => p.id === productId);
                    return product ? (
                      <div key={productId} className="text-sm text-gray-600 flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        {product.name}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* BOTÃO DE GERAÇÃO */}
            <Button
              onClick={handleGenerateTest}
              disabled={selectedProducts.length === 0 || generateTestBannerMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
              data-testid="button-generate-test-banner"
            >
              {generateTestBannerMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Gerando Banner...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Gerar Banner de Teste
                </>
              )}
            </Button>

            {/* INFORMAÇÕES */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Dica:</strong> O banner será gerado usando IA com base nos produtos selecionados 
                e aparecerá na aba "Artes IA" das estatísticas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ========== HERO BANNER MANAGER COMPONENT ==========
function HeroBannerManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const heroBannerForm = useForm<HeroBannerFormData>({
    resolver: zodResolver(heroBannerSchema),
    defaultValues: {
      imageUrl: "",
      title: "",
      description: "",
      sortOrder: 0,
      isActive: true,
    },
  });

  const { data: heroBanners = [], isLoading } = useQuery<HeroBanner[]>({
    queryKey: ['/api/hero-banners'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: HeroBannerFormData) => {
      return await apiRequest('POST', '/api/hero-banners', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-banners'] });
      setIsCreateOpen(false);
      setEditingBanner(null);
      heroBannerForm.reset();
      setImagePreview("");
      toast({
        title: "Banner criado",
        description: "Hero Banner criado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar banner",
        description: error.message || "Não foi possível criar o banner.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<HeroBannerFormData> }) => {
      return await apiRequest('PATCH', `/api/hero-banners/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-banners'] });
      setIsCreateOpen(false);
      setEditingBanner(null);
      heroBannerForm.reset();
      setImagePreview("");
      toast({
        title: "Banner atualizado",
        description: "Hero Banner atualizado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar banner",
        description: error.message || "Não foi possível atualizar o banner.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/hero-banners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-banners'] });
      toast({
        title: "Banner deletado",
        description: "Hero Banner removido com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao deletar banner",
        description: error.message || "Não foi possível deletar o banner.",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest('PATCH', `/api/hero-banners/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-banners'] });
      toast({
        title: "Status atualizado",
        description: "Status do banner atualizado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: HeroBannerFormData) => {
    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (banner: HeroBanner) => {
    setEditingBanner(banner);
    heroBannerForm.reset({
      imageUrl: banner.imageUrl,
      title: banner.title,
      description: banner.description || "",
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
    });
    setImagePreview(banner.imageUrl);
    setIsCreateOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja deletar este Hero Banner?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (banner: HeroBanner) => {
    toggleActiveMutation.mutate({ id: banner.id, isActive: !banner.isActive });
  };

  const sortedBanners = [...heroBanners].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Image className="w-6 h-6 text-purple-600" />
            Gerenciamento de Hero Banners
          </h2>
          <p className="text-gray-500 mt-1">
            Gerencie os banners principais exibidos no topo da página inicial
          </p>
        </div>

        <Dialog open={isCreateOpen || !!editingBanner} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingBanner(null);
            heroBannerForm.reset();
            setImagePreview("");
          }
        }}>
          <DialogTrigger asChild>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-create-hero-banner"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Hero Banner
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? 'Editar Hero Banner' : 'Criar Novo Hero Banner'}
              </DialogTitle>
              <DialogDescription>
                {editingBanner 
                  ? 'Atualize as informações do banner principal.' 
                  : 'Crie um novo banner para o carrossel principal da página inicial.'
                }
              </DialogDescription>
            </DialogHeader>

            <Form {...heroBannerForm}>
              <form onSubmit={heroBannerForm.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={heroBannerForm.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL da Imagem</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://exemplo.com/imagem.jpg" 
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setImagePreview(e.target.value);
                          }}
                          data-testid="input-hero-banner-image-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {imagePreview && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-2">Preview da Imagem:</p>
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full max-h-48 object-cover rounded"
                      onError={() => setImagePreview("")}
                    />
                  </div>
                )}

                <FormField
                  control={heroBannerForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Digite o título do banner" 
                          {...field}
                          data-testid="input-hero-banner-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={heroBannerForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Digite uma descrição para o banner" 
                          {...field}
                          rows={3}
                          data-testid="textarea-hero-banner-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={heroBannerForm.control}
                    name="sortOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ordem</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-hero-banner-sort-order"
                          />
                        </FormControl>
                        <FormDescription>
                          Ordem de exibição (menor primeiro)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={heroBannerForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-col justify-between">
                        <FormLabel>Status</FormLabel>
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-hero-banner-active"
                            />
                          </FormControl>
                          <span className="text-sm text-gray-600">
                            {field.value ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setIsCreateOpen(false);
                      setEditingBanner(null);
                      heroBannerForm.reset();
                      setImagePreview("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-hero-banner"
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : sortedBanners.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Image className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum Hero Banner cadastrado</h3>
            <p className="text-gray-500 mb-4">Comece criando seu primeiro banner principal</p>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Banner
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedBanners.map((banner) => (
            <Card key={banner.id} className="overflow-hidden" data-testid={`hero-banner-card-${banner.id}`}>
              <div className="relative">
                <img 
                  src={banner.imageUrl} 
                  alt={banner.title}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Badge variant={banner.isActive ? "default" : "secondary"}>
                    {banner.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Badge variant="outline" className="bg-white">
                    Ordem: {banner.sortOrder}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-1 truncate">{banner.title}</h3>
                {banner.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{banner.description}</p>
                )}
                
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(banner)}
                    className="flex-1"
                    data-testid={`button-edit-hero-banner-${banner.id}`}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                  
                  <Button
                    size="sm"
                    variant={banner.isActive ? "secondary" : "default"}
                    onClick={() => handleToggleActive(banner)}
                    disabled={toggleActiveMutation.isPending}
                    data-testid={`button-toggle-hero-banner-${banner.id}`}
                  >
                    {banner.isActive ? (
                      <>
                        <EyeOff className="w-3 h-3 mr-1" />
                        Desativar
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3 mr-1" />
                        Ativar
                      </>
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(banner.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-hero-banner-${banner.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================
// SUPER ADMIN ANALYTICS COMPONENT
// =============================================

// Componente Analytics Completo - Adaptado de admin-analytics.tsx
function ComprehensiveAnalytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedStore, setSelectedStore] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Tipos de dados para analytics
  interface AnalyticsOverview {
    totalSessions: number;
    totalPageViews: number;
    totalSearches: number;
    totalProductViews: number;
    averageSessionDuration: number;
    topProducts: Array<{
      id: string;
      name: string;
      storeName: string;
      viewCount: number;
      clickCount: number;
      ctr: number;
    }>;
    topSearches: Array<{
      term: string;
      count: number;
      clickRate: number;
    }>;
    bannerMetrics: Array<{
      id: string;
      title: string;
      views: number;
      clicks: number;
      ctr: number;
    }>;
    utmSources: Array<{
      source: string;
      sessions: number;
      conversions: number;
    }>;
  }

  // Buscar lojas para filtro (Super Admin pode ver todas)
  const { data: stores = [] } = useQuery({
    queryKey: ['/api/admin/stores'],
    enabled: !!user?.isSuperAdmin,
  });

  // Buscar dados de analytics usando o endpoint correto para super admin
  const { data: analyticsData, isLoading: analyticsLoading, refetch } = useQuery<AnalyticsOverview>({
    queryKey: [`/api/super-admin/analytics/global-overview?period=${selectedPeriod}&storeId=${selectedStore === 'all' ? '' : selectedStore}`],
    enabled: !!user?.isSuperAdmin,
    staleTime: 30000, // Cache por 30 segundos
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const handleExportData = () => {
    console.log('Exportando dados...', { period: selectedPeriod, store: selectedStore });
    toast({
      title: "Export iniciado",
      description: "Funcionalidade de export será implementada em breve.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Activity className="h-6 w-6 text-blue-600" />
            Analytics Dashboard Completo
          </h1>
          <p className="text-gray-600">Monitore o desempenho e engajamento dos usuários em tempo real</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={analyticsLoading}
            data-testid="button-refresh-analytics"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${analyticsLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            data-testid="button-export-analytics"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-select">Período</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger id="period-select" data-testid="select-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Últimas 24 horas</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-select">Loja</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger id="store-select" data-testid="select-store">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as lojas</SelectItem>
                  {stores.map((store: any) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status do Sistema</Label>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Analytics Online</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {analyticsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="searches">Buscas</TabsTrigger>
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="traffic">Tráfego</TabsTrigger>
          </TabsList>

          {/* ABA: VISÃO GERAL */}
          <TabsContent value="overview" className="space-y-6">
            {/* Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Sessões Totais</p>
                      <p className="text-2xl font-bold text-gray-900" data-testid="metric-sessions">
                        {analyticsData?.totalSessions?.toLocaleString() || 0}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Visualizações</p>
                      <p className="text-2xl font-bold text-gray-900" data-testid="metric-views">
                        {analyticsData?.totalProductViews?.toLocaleString() || 0}
                      </p>
                    </div>
                    <Eye className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Buscas</p>
                      <p className="text-2xl font-bold text-gray-900" data-testid="metric-searches">
                        {analyticsData?.totalSearches?.toLocaleString() || 0}
                      </p>
                    </div>
                    <Search className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Duração Média</p>
                      <p className="text-2xl font-bold text-gray-900" data-testid="metric-duration">
                        {analyticsData?.averageSessionDuration ? `${Math.round(analyticsData.averageSessionDuration)}s` : '0s'}
                      </p>
                    </div>
                    <Activity className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Produtos e Top Buscas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Top Produtos
                  </CardTitle>
                  <CardDescription>Produtos mais visualizados no período</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyticsData?.topProducts?.slice(0, 5).map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="w-6 h-6 p-0 flex items-center justify-center">
                            {index + 1}
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.storeName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{product.viewCount}</p>
                          <p className="text-xs text-gray-500">visualizações</p>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-gray-500">
                        <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Nenhum dado disponível</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Top Buscas
                  </CardTitle>
                  <CardDescription>Termos mais pesquisados no período</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyticsData?.topSearches?.slice(0, 5).map((search, index) => (
                      <div key={search.term} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="w-6 h-6 p-0 flex items-center justify-center">
                            {index + 1}
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">"{search.term}"</p>
                            <p className="text-xs text-gray-500">CTR: {(search.clickRate * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{search.count}</p>
                          <p className="text-xs text-gray-500">buscas</p>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-gray-500">
                        <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Nenhum dado disponível</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ABA: PRODUTOS */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance de Produtos</CardTitle>
                <CardDescription>Análise detalhada do engajamento com produtos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Produto</th>
                        <th className="text-left p-2">Loja</th>
                        <th className="text-right p-2">Visualizações</th>
                        <th className="text-right p-2">Cliques</th>
                        <th className="text-right p-2">CTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData?.topProducts?.map((product) => (
                        <tr key={product.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{product.name}</td>
                          <td className="p-2 text-gray-600">{product.storeName}</td>
                          <td className="p-2 text-right font-medium">{product.viewCount}</td>
                          <td className="p-2 text-right font-medium">{product.clickCount}</td>
                          <td className="p-2 text-right">
                            <Badge variant={product.ctr > 0.05 ? "default" : "secondary"}>
                              {(product.ctr * 100).toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-gray-500">
                            Nenhum dado disponível para o período selecionado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA: BUSCAS */}
          <TabsContent value="searches" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Buscas</CardTitle>
                <CardDescription>Comportamento de busca dos usuários</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Termo de Busca</th>
                        <th className="text-right p-2">Frequência</th>
                        <th className="text-right p-2">Taxa de Clique</th>
                        <th className="text-right p-2">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData?.topSearches?.map((search) => (
                        <tr key={search.term} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">"{search.term}"</td>
                          <td className="p-2 text-right">{search.count}</td>
                          <td className="p-2 text-right">
                            <Badge variant={search.clickRate > 0.1 ? "default" : "secondary"}>
                              {(search.clickRate * 100).toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="p-2 text-right">
                            {search.clickRate > 0.1 ? (
                              <Badge variant="default">Boa</Badge>
                            ) : (
                              <Badge variant="destructive">Melhorar</Badge>
                            )}
                          </td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-gray-500">
                            Nenhum dado de busca disponível
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA: BANNERS */}
          <TabsContent value="banners" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance de Banners</CardTitle>
                <CardDescription>Efetividade dos banners promocionais</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.bannerMetrics?.map((banner) => (
                    <div key={banner.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{banner.title}</h4>
                        <Badge variant={banner.ctr > 0.02 ? "default" : "secondary"}>
                          CTR: {(banner.ctr * 100).toFixed(2)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Visualizações</p>
                          <p className="font-bold">{banner.views}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Cliques</p>
                          <p className="font-bold">{banner.clicks}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Performance</p>
                          <p className={`font-bold ${banner.ctr > 0.02 ? 'text-green-600' : 'text-orange-600'}`}>
                            {banner.ctr > 0.02 ? 'Excelente' : 'Regular'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Nenhum banner ativo encontrado</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA: TRÁFEGO */}
          <TabsContent value="traffic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Fontes de Tráfego
                </CardTitle>
                <CardDescription>Análise de UTM e canais de aquisição</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.utmSources?.map((source) => (
                    <div key={source.source} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{source.source || 'Direto'}</p>
                        <p className="text-sm text-gray-600">
                          {source.conversions} conversões de {source.sessions} sessões
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{source.sessions}</p>
                        <p className="text-sm text-gray-500">
                          {source.sessions > 0 ? ((source.conversions / source.sessions) * 100).toFixed(1) : 0}% conversão
                        </p>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Nenhum dado de tráfego disponível</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function SuperAdminAnalytics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState('7');

  // ========== DADOS GLOBAIS ==========
  const { data: globalOverview, isLoading: overviewLoading } = useQuery({
    queryKey: [`/api/super-admin/analytics/global-overview?days=${selectedPeriod}`],
    gcTime: 5 * 60 * 1000, // 5 minutos
  });

  const { data: storesDetail, isLoading: storesLoading } = useQuery({
    queryKey: [`/api/super-admin/analytics/stores-detail?days=${selectedPeriod}`],
    gcTime: 5 * 60 * 1000,
  });

  const { data: globalTrending, isLoading: trendingLoading } = useQuery({
    queryKey: [`/api/analytics/global-trending?days=${selectedPeriod}`],
    gcTime: 5 * 60 * 1000,
  });

  const { data: allGeneratedArts, isLoading: artsLoading } = useQuery({
    queryKey: ['/api/super-admin/generated-arts/manage'],
    gcTime: 3 * 60 * 1000, // 3 minutos
  });

  // ========== MUTATIONS ==========
  const toggleArtMutation = useMutation({
    mutationFn: async ({ artId, isActive }: { artId: string; isActive: boolean }) => 
      apiRequest('PATCH', `/api/totem/generated-arts/${artId}/toggle`, { isActive }),
    onSuccess: () => {
      toast({
        title: "Status atualizado!",
        description: "Arte atualizada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/generated-arts/manage'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar arte.",
        variant: "destructive",
      });
    },
  });

  const deleteArtMutation = useMutation({
    mutationFn: async (artId: string) => 
      apiRequest('DELETE', `/api/super-admin/generated-arts/${artId}`),
    onSuccess: () => {
      toast({
        title: "Arte excluída!",
        description: "Arte removida com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/generated-arts/manage'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir arte.",
        variant: "destructive",
      });
    },
  });

  const forceGenerateMutation = useMutation({
    mutationFn: async () => 
      apiRequest('POST', '/api/super-admin/generated-arts/force-generate'),
    onSuccess: () => {
      toast({
        title: "Geração iniciada!",
        description: "Nova arte será gerada em instantes.",
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/super-admin/generated-arts/manage'] });
      }, 5000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao forçar geração.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* HEADER WITH PERIOD SELECTOR */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-7 h-7 text-blue-600" />
            Analytics & IA Global
          </h2>
          <p className="text-gray-500">Visão completa de todas as lojas da plataforma</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* TABS NAVIGATION */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="stores" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            Lojas
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Tendências
          </TabsTrigger>
          <TabsTrigger value="ai-arts" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Artes IA
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: VISÃO GERAL */}
        <TabsContent value="overview" className="space-y-6">
          {overviewLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* MÉTRICAS PRINCIPAIS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Lojas Total</p>
                        <p className="text-2xl font-bold text-gray-900" data-testid="metric-total-stores">
                          {globalOverview?.totalStores || 0}
                        </p>
                      </div>
                      <Store className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Produtos Total</p>
                        <p className="text-2xl font-bold text-gray-900" data-testid="metric-total-products">
                          {globalOverview?.totalProducts || 0}
                        </p>
                      </div>
                      <Package className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Sessões</p>
                        <p className="text-2xl font-bold text-gray-900" data-testid="metric-total-sessions">
                          {globalOverview?.totalSessions || 0}
                        </p>
                      </div>
                      <Users className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Buscas</p>
                        <p className="text-2xl font-bold text-gray-900" data-testid="metric-total-searches">
                          {globalOverview?.totalSearches || 0}
                        </p>
                      </div>
                      <Search className="w-8 h-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* MÉTRICAS MODERNAS DE ENGAJAMENTO */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Visualizações</p>
                        <p className="text-2xl font-bold text-gray-900" data-testid="metric-total-page-views">
                          {globalOverview?.totalPageViews || 0}
                        </p>
                      </div>
                      <Eye className="w-8 h-8 text-indigo-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Views Produtos</p>
                        <p className="text-2xl font-bold text-gray-900" data-testid="metric-total-product-views">
                          {globalOverview?.totalProductViews || 0}
                        </p>
                      </div>
                      <Package className="w-8 h-8 text-pink-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Duração Média</p>
                        <p className="text-2xl font-bold text-gray-900" data-testid="metric-avg-session-duration">
                          {Math.round((globalOverview?.averageSessionDuration || 0) / 60)}m
                        </p>
                      </div>
                      <Activity className="w-8 h-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">CTR Médio</p>
                        <p className="text-2xl font-bold text-gray-900" data-testid="metric-avg-ctr">
                          {globalOverview?.bannerMetrics?.length > 0 
                            ? `${(globalOverview.bannerMetrics.reduce((acc: any, b: any) => acc + (b.ctr || 0), 0) / globalOverview.bannerMetrics.length).toFixed(1)}%`
                            : '0%'
                          }
                        </p>
                      </div>
                      <Target className="w-8 h-8 text-teal-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ABA 2: ANALYTICS POR LOJA */}
        <TabsContent value="stores" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-blue-600" />
                Performance por Loja
              </CardTitle>
              <CardDescription>
                Analytics detalhadas de cada loja da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {storesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !storesDetail || storesDetail.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Store className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma loja encontrada.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {storesDetail.map((store: any) => {
                    const totalEngagement = store.analytics.storyViews + store.analytics.flyerViews + 
                                          store.analytics.productLikes + store.analytics.productsSaved;
                    
                    return (
                      <div key={store.storeId} className="border rounded-lg p-4" data-testid={`store-detail-${store.storeId}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-4">
                            <img 
                              src={store.storeImage} 
                              alt={store.storeName}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">{store.storeName}</h3>
                                <Badge variant={store.isActive ? "default" : "secondary"}>
                                  {store.isActive ? "Ativa" : "Inativa"}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500">
                                {store.totalProducts} produtos
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              {totalEngagement}
                            </p>
                            <p className="text-xs text-gray-500">Engajamento Total</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <p className="text-lg font-semibold text-indigo-600">{store.analytics.storyViews}</p>
                            <p className="text-xs text-gray-500">Views Stories</p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <p className="text-lg font-semibold text-pink-600">{store.analytics.flyerViews}</p>
                            <p className="text-xs text-gray-500">Views Flyers</p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <p className="text-lg font-semibold text-red-600">{store.analytics.productLikes}</p>
                            <p className="text-xs text-gray-500">Curtidas</p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <p className="text-lg font-semibold text-teal-600">{store.analytics.productsSaved}</p>
                            <p className="text-xs text-gray-500">Salvamentos</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3: TENDÊNCIAS GLOBAIS */}
        <TabsContent value="trending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                Produtos em Tendência Global
              </CardTitle>
              <CardDescription>
                Os produtos mais buscados em toda a plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendingLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : !globalTrending || globalTrending.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Ainda não há produtos em tendência.</p>
                  <p className="text-sm mt-1">Os produtos aparecerão aqui conforme as buscas aumentam.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {globalTrending.map((product: any, index: number) => (
                    <Card key={product.productId} className="overflow-hidden" data-testid={`trending-product-${index}`}>
                      <div className="relative">
                        <img 
                          src={product.imageUrl} 
                          alt={product.productName}
                          className="w-full h-48 object-cover"
                        />
                        <Badge className="absolute top-2 left-2" variant="default">
                          #{index + 1}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-gray-900 mb-2">{product.productName}</h4>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-500">{product.category}</span>
                          <span className="text-sm font-medium text-blue-600">{product.storeName}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{product.searchCount} buscas</span>
                          <span>{product.viewCount} views</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 4: GESTÃO DE ARTES IA */}
        <TabsContent value="ai-arts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Gestão Completa de Artes IA
              </CardTitle>
              <CardDescription className="flex justify-between items-center">
                <span>Controle total de todas as artes geradas automaticamente</span>
                <Button 
                  onClick={() => forceGenerateMutation.mutate()}
                  disabled={forceGenerateMutation.isPending}
                  size="sm"
                  className="flex items-center gap-2"
                  data-testid="button-force-generate"
                >
                  {forceGenerateMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Forçar Geração
                </Button>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {artsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : !allGeneratedArts || allGeneratedArts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Ainda não há artes geradas.</p>
                  <p className="text-sm mt-1">Use o botão "Forçar Geração" para criar novas artes automaticamente.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allGeneratedArts.map((art: any) => (
                    <Card key={art.id} className="overflow-hidden" data-testid={`ai-art-${art.id}`}>
                      <div className="relative">
                        <img 
                          src={art.imageUrl} 
                          alt="Arte gerada por IA"
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge variant={art.isActive ? "default" : "secondary"}>
                            {art.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 left-2"
                          onClick={() => deleteArtMutation.mutate(art.id)}
                          disabled={deleteArtMutation.isPending}
                          data-testid={`button-delete-art-${art.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">
                            {art.storeName || 'Global'} - #{art.id.slice(0, 8)}
                          </h4>
                          <Switch 
                            checked={art.isActive}
                            onCheckedChange={(checked) => {
                              toggleArtMutation.mutate({ artId: art.id, isActive: checked });
                            }}
                            disabled={toggleArtMutation.isPending}
                            data-testid={`switch-art-${art.id}`}
                          />
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          {new Date(art.generationDate).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs text-gray-400 line-clamp-2">
                          {art.prompt}
                        </p>
                        {art.trendingProducts.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">
                              Produtos: {art.trendingProducts.join(', ')}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente Dashboard Panel
function DashboardPanel() {
  const { toast } = useToast();

  // Buscar dados de todas as APIs necessárias
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ['/api/admin/stores'],
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  const { data: banners = [], isLoading: bannersLoading } = useQuery({
    queryKey: ['/api/admin/banners'],
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/super-admin/categories'],
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  const { data: wifiSettings, isLoading: wifiLoading } = useQuery({
    queryKey: ['/api/wifi-settings'],
    queryFn: async () => {
      const response = await fetch('/api/wifi-settings');
      if (!response.ok) throw new Error('Failed to fetch wifi settings');
      return await response.json();
    },
    retry: false
  });

  const { data: dailyPrizes = [], isLoading: prizesLoading } = useQuery({
    queryKey: ['/api/admin/daily-prizes'],
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Calcular métricas
  const totalStores = stores.length;
  const premiumStores = stores.filter((store: any) => store.isPremium).length;
  const activeStores = stores.filter((store: any) => store.isActive).length;
  const totalUsers = users.length;
  const activeBanners = banners.filter((banner: any) => banner.isActive).length;
  const totalBanners = banners.length;
  const totalCategories = categories.length;
  const activePrizes = dailyPrizes.filter((prize: any) => prize.isActive).length;

  const isLoading = storesLoading || usersLoading || bannersLoading || categoriesLoading || prizesLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Dashboard Super Admin
          </h1>
          <p className="text-gray-600 mt-1">
            Visão geral do sistema Click Ofertas Paraguai
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-800">
            Sistema Ativo
          </Badge>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Lojas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lojas Totais</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : totalStores}</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="text-xs text-muted-foreground">
                {premiumStores} Premium • {activeStores} Ativas
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usuários */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Usuários cadastrados
            </p>
          </CardContent>
        </Card>

        {/* Banners */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Banners</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : totalBanners}</div>
            <p className="text-xs text-muted-foreground">
              {activeBanners} Ativos
            </p>
          </CardContent>
        </Card>

        {/* Wi-Fi Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sistema Wi-Fi</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {wifiLoading ? '...' : (wifiSettings?.isActive ? 'Ativo' : 'Inativo')}
            </div>
            <p className="text-xs text-muted-foreground">
              R$ {wifiSettings?.price || '5,00'} - 24h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Métricas Secundárias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tag className="h-5 w-5" />
              Categorias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{isLoading ? '...' : totalCategories}</div>
            <p className="text-sm text-gray-600">Categorias de produtos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gift className="h-5 w-5" />
              Prêmios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{isLoading ? '...' : dailyPrizes.length}</div>
            <p className="text-sm text-gray-600">{activePrizes} Ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Crown className="h-5 w-5 text-yellow-600" />
              Taxa Premium
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {isLoading ? '...' : totalStores > 0 ? `${Math.round((premiumStores / totalStores) * 100)}%` : '0%'}
            </div>
            <p className="text-sm text-gray-600">Lojas com status premium</p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button 
          variant="outline" 
          className="h-16 flex flex-col items-center gap-2"
          onClick={() => window.location.href = '/admin-panel?tab=stores'}
        >
          <Store className="h-6 w-6" />
          <span>Gerenciar Lojas</span>
        </Button>

        <Button 
          variant="outline" 
          className="h-16 flex flex-col items-center gap-2"
          onClick={() => window.location.href = '/admin-panel?tab=banners'}
        >
          <Image className="h-6 w-6" />
          <span>Criar Banners</span>
        </Button>

        <Button 
          variant="outline" 
          className="h-16 flex flex-col items-center gap-2"
          onClick={() => window.location.href = '/admin-panel?tab=wifi'}
        >
          <Wifi className="h-6 w-6" />
          <span>Wi-Fi 24h</span>
        </Button>

        <Button 
          variant="outline" 
          className="h-16 flex flex-col items-center gap-2"
          onClick={() => window.location.href = '/admin-panel?tab=system'}
        >
          <Settings className="h-6 w-6" />
          <span>Sistema</span>
        </Button>
      </div>

      {/* Status de Saúde do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium">API</p>
                <p className="text-xs text-gray-500">Online</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium">Banco de Dados</p>
                <p className="text-xs text-gray-500">Conectado</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 ${wifiSettings?.isActive ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></div>
              <div>
                <p className="text-sm font-medium">Wi-Fi</p>
                <p className="text-xs text-gray-500">
                  {wifiSettings?.isActive ? 'Ativo' : 'Inativo'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium">Lojas</p>
                <p className="text-xs text-gray-500">{activeStores} Ativas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuperAdmin() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  
  // Detectar aba ativa da URL
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // ========== MUTATIONS PARA ARTES IA ==========
  const { data: allGeneratedArts, isLoading: artsLoading } = useQuery({
    queryKey: ['/api/super-admin/generated-arts/manage'],
    gcTime: 3 * 60 * 1000, // 3 minutos
  });

  const toggleArtMutation = useMutation({
    mutationFn: async ({ artId, isActive }: { artId: string; isActive: boolean }) => 
      apiRequest('PATCH', `/api/totem/generated-arts/${artId}/toggle`, { isActive }),
    onSuccess: () => {
      toast({
        title: "Status atualizado!",
        description: "Arte ativada/desativada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/generated-arts/manage'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar arte.",
        variant: "destructive",
      });
    },
  });

  const deleteArtMutation = useMutation({
    mutationFn: async (artId: string) => 
      apiRequest('DELETE', `/api/super-admin/generated-arts/${artId}`),
    onSuccess: () => {
      toast({
        title: "Arte excluída!",
        description: "Arte removida com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/generated-arts/manage'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir arte.",
        variant: "destructive",
      });
    },
  });

  const forceGenerateMutation = useMutation({
    mutationFn: async () => 
      apiRequest('POST', '/api/super-admin/generated-arts/force-generate'),
    onSuccess: () => {
      toast({
        title: "Geração iniciada!",
        description: "Nova arte será gerada em instantes.",
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/super-admin/generated-arts/manage'] });
      }, 5000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao forçar geração.",
        variant: "destructive",
      });
    },
  });
  
  // Refs para controles de raspadinha
  const operationModeRef = useRef<HTMLButtonElement>(null);
  const productsPerDayRef = useRef<HTMLInputElement>(null);
  const winChanceRef = useRef<HTMLInputElement>(null);
  const [isCreateBannerOpen, setIsCreateBannerOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [editingStore, setEditingStore] = useState<StoreData | null>(null);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [isCreatePrizeOpen, setIsCreatePrizeOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<DailyPrize | null>(null);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isBudgetConfigOpen, setIsBudgetConfigOpen] = useState(false);
  const [isFinancialReportOpen, setIsFinancialReportOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  
  // Categories state
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCategoryActive, setIsCategoryActive] = useState(true);

  // Redirect if not super admin
  useEffect(() => {
    if (!isLoading && (!user?.isSuperAdmin)) {
      window.location.href = "/super-admin-login";
    }
  }, [user, isLoading]);

  // Buscar banners
  const { data: banners = [] } = useQuery<Banner[]>({
    queryKey: ['/api/admin/banners'],
    enabled: !!user?.isSuperAdmin,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Buscar lojas
  const { data: stores = [] } = useQuery<StoreData[]>({
    queryKey: ['/api/admin/stores'],
    enabled: !!user?.isSuperAdmin,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Buscar usuários
  const { data: users = [] } = useQuery<UserData[]>({
    queryKey: ['/api/admin/users'],
    enabled: !!user?.isSuperAdmin,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });


  // Categories query
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/super-admin/categories'],
    enabled: !!user?.isSuperAdmin,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Daily prizes query
  const { data: dailyPrizes = [] } = useQuery<DailyPrize[]>({
    queryKey: ['/api/admin/daily-prizes'],
    enabled: !!user?.isSuperAdmin,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Scratch stats query
  const { data: scratchStats } = useQuery({
    queryKey: ['/api/admin/scratch-stats'],
    enabled: !!user?.isSuperAdmin,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Prize mutations
  const createPrizeMutation = useMutation({
    mutationFn: async (data: PrizeFormData) => {
      return await apiRequest('POST', '/api/admin/daily-prizes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/daily-prizes'] });
      setIsCreatePrizeOpen(false);
      setEditingPrize(null);
      prizeForm.reset();
      toast({
        title: "Prêmio criado",
        description: "Prêmio criado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar prêmio",
        description: error.message || "Não foi possível criar o prêmio.",
        variant: "destructive",
      });
    },
  });

  const updatePrizeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PrizeFormData> }) => {
      return await apiRequest('PUT', `/api/admin/daily-prizes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/daily-prizes'] });
      setIsCreatePrizeOpen(false);
      setEditingPrize(null);
      prizeForm.reset();
      toast({
        title: "Prêmio atualizado",
        description: "Prêmio atualizado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar prêmio",
        description: error.message || "Não foi possível atualizar o prêmio.",
        variant: "destructive",
      });
    },
  });


  // Form para criar/editar banner
  const form = useForm<BannerFormData>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
      linkUrl: "",
      bannerType: "rotating",
      priority: "0",
      backgroundColor: "#ffffff",
      textColor: "#000000",
    },
  });

  // Form para criar/editar prêmio
  const prizeForm = useForm<PrizeFormData>({
    resolver: zodResolver(prizeSchema),
    defaultValues: {
      name: "",
      description: "",
      prizeType: "discount",
      discountPercentage: "",
      discountValue: "",
      maxDiscountAmount: "",
      imageUrl: "",
      probability: "0.2",
      maxDailyWins: "1",
    },
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

  // Mutation para criar banner
  const createBannerMutation = useMutation({
    mutationFn: async (data: BannerFormData) => {
      return await apiRequest('POST', '/api/admin/banners', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] });
      setIsCreateBannerOpen(false);
      form.reset();
      toast({
        title: "Banner criado",
        description: "Banner criado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para criar banners.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao criar banner. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  // Mutation para atualizar banner
  const updateBannerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BannerFormData> & { isActive?: boolean } }) => {
      return await apiRequest('PUT', `/api/admin/banners/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] });
      setEditingBanner(null);
      form.reset();
      toast({
        title: "Banner atualizado",
        description: "Banner atualizado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para atualizar banners.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao atualizar banner. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  // Mutation para deletar banner
  const deleteBannerMutation = useMutation({
    mutationFn: async (bannerId: string) => {
      return await apiRequest('DELETE', `/api/admin/banners/${bannerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] });
      toast({
        title: "Banner deletado",
        description: "Banner deletado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para deletar banners.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao deletar banner. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  // ========== CATEGORY MUTATIONS ==========
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

  const onSubmit = (data: BannerFormData) => {
    if (editingBanner) {
      updateBannerMutation.mutate({ id: editingBanner.id, data });
    } else {
      createBannerMutation.mutate(data);
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    form.reset({
      title: banner.title,
      description: banner.description || "",
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || "",
      bannerType: banner.bannerType,
      priority: banner.priority,
      backgroundColor: banner.backgroundColor,
      textColor: banner.textColor,
    });
  };

  const handleToggleActive = (banner: Banner) => {
    updateBannerMutation.mutate({
      id: banner.id,
      data: { isActive: !banner.isActive }
    });
  };

  const handleDelete = (bannerId: string) => {
    if (confirm("Tem certeza que deseja deletar este banner?")) {
      deleteBannerMutation.mutate(bannerId);
    }
  };

  // ========== CATEGORY HANDLERS ==========
  const onCategorySubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ 
        id: editingCategory.id, 
        data: { ...data, isActive: isCategoryActive }
      });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsCategoryActive(category.isActive);
    categoryForm.reset({
      name: category.name,
      description: category.description || "",
      slug: category.slug,
      sortOrder: category.sortOrder,
    });
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

  // Mutations para lojas
  const updateStoreMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StoreData> }) => {
      return await apiRequest('PUT', `/api/admin/stores/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'] });
      setEditingStore(null);
      toast({ title: "Loja atualizada", description: "Loja atualizada com sucesso!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Acesso negado", description: "Você não tem permissão.", variant: "destructive" });
      } else {
        toast({ title: "Erro", description: "Erro ao atualizar loja.", variant: "destructive" });
      }
    },
  });

  const deleteStoreMutation = useMutation({
    mutationFn: async (storeId: string) => {
      return await apiRequest('DELETE', `/api/admin/stores/${storeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'] });
      toast({ title: "Loja deletada", description: "Loja deletada com sucesso!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Acesso negado", description: "Você não tem permissão.", variant: "destructive" });
      } else {
        toast({ title: "Erro", description: "Erro ao deletar loja.", variant: "destructive" });
      }
    },
  });

  // Mutations para usuários
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserData> }) => {
      return await apiRequest('PUT', `/api/admin/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditingUser(null);
      toast({ title: "Usuário atualizado", description: "Usuário atualizado com sucesso!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Acesso negado", description: "Você não tem permissão.", variant: "destructive" });
      } else {
        toast({ title: "Erro", description: "Erro ao atualizar usuário.", variant: "destructive" });
      }
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "Usuário deletado", description: "Usuário deletado com sucesso!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Acesso negado", description: "Você não tem permissão.", variant: "destructive" });
      } else {
        toast({ title: "Erro", description: "Erro ao deletar usuário.", variant: "destructive" });
      }
    },
  });


  // Query para buscar produtos disponíveis para prêmios
  const { data: availableProducts = [] } = useQuery({
    queryKey: ['/api/admin/products-for-prizes'],
    enabled: !!user,
  });

  // Query para buscar estatísticas de orçamento
  const { data: budgetStats } = useQuery({
    queryKey: ['/api/admin/budget-stats'],
    enabled: !!user,
  });

  const handleDeleteStore = (storeId: string) => {
    if (confirm("Tem certeza que deseja deletar esta loja? Todos os produtos serão removidos.")) {
      deleteStoreMutation.mutate(storeId);
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm("Tem certeza que deseja deletar este usuário?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleToggleStoreActive = (store: StoreData) => {
    updateStoreMutation.mutate({
      id: store.id,
      data: { isActive: !store.isActive }
    });
  };

  const handleToggleUserSuperAdmin = (userData: UserData) => {
    updateUserMutation.mutate({
      id: userData.id,
      data: { isSuperAdmin: !userData.isSuperAdmin }
    });
  };

  // Handlers para prêmios
  const onSubmitPrize = (data: PrizeFormData) => {
    // Limpar campos numéricos vazios para evitar erro no banco
    const cleanedData = {
      ...data,
      discountPercentage: data.discountPercentage === "" ? null : data.discountPercentage,
      discountValue: data.discountValue === "" ? null : data.discountValue,
      maxDiscountAmount: data.maxDiscountAmount === "" ? null : data.maxDiscountAmount,
      probability: data.probability === "" ? "0.001" : data.probability,
      maxDailyWins: data.maxDailyWins === "" ? "1" : data.maxDailyWins,
    };

    if (editingPrize) {
      updatePrizeMutation.mutate({ id: editingPrize.id, data: cleanedData });
    } else {
      createPrizeMutation.mutate(cleanedData);
    }
  };

  // Handlers para seleção de produtos
  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    prizeForm.setValue('productId', product.id);
    prizeForm.setValue('name', `${product.name} - Grátis`);
    setIsProductSelectorOpen(false);
  };

  const handleOpenProductSelector = () => {
    if (availableProducts.length === 0) {
      toast({
        title: "Nenhum produto disponível",
        description: "Cadastre produtos nas lojas antes de criar prêmios de produto.",
        variant: "destructive",
      });
      return;
    }
    setIsProductSelectorOpen(true);
  };

  const handleEditPrize = (prize: DailyPrize) => {
    setEditingPrize(prize);
    prizeForm.reset({
      name: prize.name,
      description: prize.description || "",
      prizeType: prize.prizeType,
      productId: prize.productId || "",
      discountPercentage: prize.discountPercentage || "",
      discountValue: prize.discountValue || "",
      maxDiscountAmount: prize.maxDiscountAmount || "",
      imageUrl: prize.imageUrl || "",
      probability: prize.probability,
      maxDailyWins: prize.maxDailyWins,
    });
  };

  const handleTogglePrizeActive = (prize: DailyPrize) => {
    updatePrizeMutation.mutate({
      id: prize.id,
      data: { isActive: !prize.isActive }
    });
  };

  const handleDeletePrize = (prizeId: string) => {
    if (confirm("Tem certeza que deseja deletar este prêmio?")) {
      deletePrizeMutation.mutate(prizeId);
    }
  };

  const getPrizeTypeLabel = (type: string) => {
    const types = {
      product: "Produto",
      discount: "Desconto",
      cashback: "Cashback"
    };
    return types[type as keyof typeof types] || type;
  };

  const getBannerTypeLabel = (type: string) => {
    const types = {
      rotating: "Rotativo",
      static_left: "Estático Esquerdo",
      static_right: "Estático Direito"
    };
    return types[type as keyof typeof types] || type;
  };

  const getActiveTabName = (tab: string) => {
    const tabNames = {
      "banners": "Banners",
      "stores": "Lojas", 
      "users": "Usuários",
      "promotions": "Prêmios",
      "stats": "Estatísticas",
      "analytics": "Analytics",
      "ai-test": "Orçamento IA",
      "ai-arts-main": "Artes IA",
      "categories": "Categorias",
      "product-banks": "Banco de Produtos",
      "system": "Sistema",
      "wifi": "Wi-Fi 24h",
      "premium-stores": "Lojas Premium"
    };
    return tabNames[tab as keyof typeof tabNames] || tab;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-25 to-yellow-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user?.isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-25 to-yellow-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-lg text-red-600">Acesso negado. Redirecionando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Settings className="w-8 h-8 text-red-600" />
              Painel Super Admin
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Gerencie banners, lojas e usuários do Click Ofertas Paraguai
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (window.location.href = "/api/auth/logout")}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            data-testid="button-super-admin-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Menu Dropdown Agrupado */}
          <div className="mb-6 flex flex-wrap gap-2">
            {/* Dashboard */}
            <Button 
              variant={activeTab === 'dashboard' ? 'default' : 'outline'} 
              className="flex items-center gap-2" 
              onClick={() => setActiveTab("dashboard")}
              data-testid="button-dashboard"
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </Button>

            {/* Conteúdo & Marketing */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Conteúdo & Marketing
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setActiveTab("banners")} className="cursor-pointer">
                  <Image className="w-4 h-4 mr-2" />
                  Banners
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("hero-banners")} className="cursor-pointer">
                  <Image className="w-4 h-4 mr-2" />
                  Banners Hero
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("categories")} className="cursor-pointer">
                  <Tag className="w-4 h-4 mr-2" />
                  Categorias
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("ai-arts-main")} className="cursor-pointer">
                  <Brain className="w-4 h-4 mr-2" />
                  Artes IA
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("product-banks")} className="cursor-pointer">
                  <Package className="w-4 h-4 mr-2" />
                  Banco de Produtos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Gestão de Lojas */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Gestão de Lojas
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setActiveTab("stores")} className="cursor-pointer">
                  <Store className="w-4 h-4 mr-2" />
                  Lojas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("premium-stores")} className="cursor-pointer">
                  <Crown className="w-4 h-4 mr-2" />
                  Lojas Premium
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("users")} className="cursor-pointer">
                  <Users className="w-4 h-4 mr-2" />
                  Usuários
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Gamificação & Analytics */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Gamificação & Analytics
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setActiveTab("promotions")} className="cursor-pointer">
                  <Trophy className="w-4 h-4 mr-2" />
                  Prêmios
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("stats")} className="cursor-pointer">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Estatísticas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("analytics")} className="cursor-pointer">
                  <Activity className="w-4 h-4 mr-2" />
                  Analytics
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Serviços & Sistema */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  Serviços & Sistema
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setActiveTab("wifi")} className="cursor-pointer">
                  <Wifi className="w-4 h-4 mr-2" />
                  Wi-Fi 24h
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("ai-test")} className="cursor-pointer">
                  <Brain className="w-4 h-4 mr-2" />
                  Orçamento IA
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("system")} className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Indicador da aba ativa */}
          <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-2 rounded">
            <span className="font-medium">Seção ativa:</span> {(() => {
              const tabNames = {
                "dashboard": "Dashboard",
                "banners": "Banners",
                "hero-banners": "Banners Hero",
                "stores": "Lojas", 
                "users": "Usuários",
                "promotions": "Prêmios",
                "stats": "Estatísticas",
                "analytics": "Analytics",
                "ai-test": "Orçamento IA",
                "ai-arts-main": "Artes IA",
                "categories": "Categorias",
                "product-banks": "Banco de Produtos",
                "system": "Sistema",
                "wifi": "Wi-Fi 24h",
                "premium-stores": "Lojas Premium"
              };
              return tabNames[activeTab as keyof typeof tabNames] || activeTab;
            })()}
          </div>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-6">
            <DashboardPanel />
          </TabsContent>

          {/* ABA DE BANNERS */}
          <TabsContent value="banners" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Gerenciamento de Banners
              </h2>
              
              <Dialog open={isCreateBannerOpen || !!editingBanner} onOpenChange={(open) => {
                if (!open) {
                  setIsCreateBannerOpen(false);
                  setEditingBanner(null);
                  form.reset();
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => setIsCreateBannerOpen(true)}
                    data-testid="button-create-banner"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Banner
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingBanner ? 'Editar Banner' : 'Criar Novo Banner'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingBanner 
                        ? 'Atualize as informações do banner.' 
                        : 'Crie um novo banner para a página principal.'
                      }
                    </DialogDescription>
                  </DialogHeader>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Título</FormLabel>
                              <FormControl>
                                <Input placeholder="Digite o título do banner" {...field} data-testid="input-banner-title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bannerType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo do Banner</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} data-testid="select-banner-type">
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="rotating">Rotativo</SelectItem>
                                  <SelectItem value="static_left">Estático Esquerdo</SelectItem>
                                  <SelectItem value="static_right">Estático Direito</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição (Opcional)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Digite uma descrição para o banner" {...field} data-testid="input-banner-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL da Imagem</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="https://exemplo.com/imagem.jpg" 
                                {...field} 
                                data-testid="input-banner-image-url" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="linkUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL do Link (Opcional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="https://exemplo.com" 
                                {...field} 
                                data-testid="input-banner-link-url" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prioridade</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="0" 
                                  type="number" 
                                  {...field} 
                                  data-testid="input-banner-priority" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="backgroundColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cor de Fundo</FormLabel>
                              <FormControl>
                                <Input 
                                  type="color" 
                                  {...field} 
                                  data-testid="input-banner-bg-color" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="textColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cor do Texto</FormLabel>
                              <FormControl>
                                <Input 
                                  type="color" 
                                  {...field} 
                                  data-testid="input-banner-text-color" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setIsCreateBannerOpen(false);
                            setEditingBanner(null);
                            form.reset();
                          }}
                          data-testid="button-cancel-banner"
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit" 
                          className="bg-red-600 hover:bg-red-700"
                          disabled={createBannerMutation.isPending || updateBannerMutation.isPending}
                          data-testid="button-save-banner"
                        >
                          {(createBannerMutation.isPending || updateBannerMutation.isPending) 
                            ? 'Salvando...' 
                            : editingBanner ? 'Atualizar' : 'Criar'
                          }
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Lista de Banners */}
            <div className="grid gap-4">
              {(banners || []).map((banner) => (
                <Card key={banner.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CardTitle className="text-lg">{banner.title}</CardTitle>
                        <Badge variant={banner.isActive ? "default" : "secondary"}>
                          {banner.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                        <Badge variant="outline">
                          {getBannerTypeLabel(banner.bannerType)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={banner.isActive}
                          onCheckedChange={() => handleToggleActive(banner)}
                          data-testid={`switch-banner-active-${banner.id}`}
                        />
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEdit(banner)}
                          data-testid={`button-edit-banner-${banner.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDelete(banner.id)}
                          data-testid={`button-delete-banner-${banner.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Preview da imagem */}
                      <div className="space-y-2">
                        <img 
                          src={banner.imageUrl} 
                          alt={banner.title}
                          className="w-full h-24 object-cover rounded-md"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE2MCIgdmlld0JveD0iMCAwIDMyMCAxNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNDQgODBIMTc2VjExMkgxNDRWODBaIiBmaWxsPSIjRDFEMUQ2Ii8+CjxwYXRoIGQ9Ik0xNTIgOTZIMTU2VjEwNEgxNTJWOTZaIiBmaWxsPSIjOURBMUE5Ii8+Cjwvc3ZnPgo=';
                          }}
                        />
                        {banner.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {banner.description}
                          </p>
                        )}
                      </div>

                      {/* Informações do banner */}
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Prioridade:</span> {banner.priority}
                        </div>
                        {banner.linkUrl && (
                          <div>
                            <span className="font-medium">Link:</span>{" "}
                            <a 
                              href={banner.linkUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate max-w-48 inline-block"
                            >
                              {banner.linkUrl}
                            </a>
                          </div>
                        )}
                        <div className="flex space-x-4">
                          <div>
                            <span className="font-medium">Cores:</span>
                          </div>
                          <div className="flex space-x-2">
                            <div 
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: banner.backgroundColor }}
                              title={`Fundo: ${banner.backgroundColor}`}
                            ></div>
                            <div 
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: banner.textColor }}
                              title={`Texto: ${banner.textColor}`}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Estatísticas */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <Eye className="w-4 h-4" />
                          <span>{banner.viewsCount} visualizações</span>
                        </div>
                        <div>
                          <span className="font-medium">Cliques:</span> {banner.clicksCount}
                        </div>
                        <div className="text-xs text-gray-500">
                          Criado: {new Date(banner.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(!banners || banners.length === 0) && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Image className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">Nenhum banner criado ainda.</p>
                    <p className="text-sm text-gray-400 mt-1">Clique em "Criar Banner" para começar.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ABA DE HERO BANNERS */}
          <TabsContent value="hero-banners" className="space-y-6">
            <HeroBannerManager />
          </TabsContent>

          {/* ABA DE LOJAS */}
          <TabsContent value="stores" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Gerenciamento de Lojas
              </h2>
            </div>

            <div className="grid gap-4">
              {(stores || []).map((store) => (
                <Card key={store.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CardTitle className="text-lg">{store.name}</CardTitle>
                        <Badge variant={store.isActive ? "default" : "secondary"}>
                          {store.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                        <Badge variant="outline">
                          {store.products?.length || 0} produtos
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={store.isActive}
                          onCheckedChange={() => handleToggleStoreActive(store)}
                          data-testid={`switch-store-active-${store.id}`}
                        />
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteStore(store.id)}
                          data-testid={`button-delete-store-${store.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Slug:</span> /{store.slug}
                      </div>
                      <div>
                        <span className="font-medium">Moeda:</span> {store.currency}
                      </div>
                      <div>
                        <span className="font-medium">Criada:</span> {new Date(store.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                      {store.whatsapp && (
                        <div>
                          <span className="font-medium">WhatsApp:</span> {store.whatsapp}
                        </div>
                      )}
                      {store.instagram && (
                        <div>
                          <span className="font-medium">Instagram:</span> {store.instagram}
                        </div>
                      )}
                      {store.address && (
                        <div>
                          <span className="font-medium">Endereço:</span> {store.address}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(!stores || stores.length === 0) && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Store className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">Nenhuma loja encontrada.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ABA DE USUÁRIOS */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Gerenciamento de Usuários
              </h2>
            </div>

            <div className="grid gap-4">
              {(users || []).map((userData) => (
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
                          data-testid={`button-toggle-admin-${userData.id}`}
                        >
                          {userData.isSuperAdmin ? "Remover Admin" : "Tornar Admin"}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteUser(userData.id)}
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
                          <span className="font-medium">Nome:</span> {userData.firstName} {userData.lastName}
                        </div>
                      )}
                      {userData.storeName && (
                        <div>
                          <span className="font-medium">Loja:</span> {userData.storeName}
                        </div>
                      )}
                      {userData.phone && (
                        <div>
                          <span className="font-medium">Telefone:</span> {userData.phone}
                        </div>
                      )}
                      {userData.address && (
                        <div>
                          <span className="font-medium">Endereço:</span> {userData.address}
                        </div>
                      )}
                      {userData.city && (
                        <div>
                          <span className="font-medium">Cidade:</span> {userData.city}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Cadastro:</span> {new Date(userData.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                      <div>
                        <span className="font-medium">Email Verificado:</span> {userData.isEmailVerified ? "Sim" : "Não"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(!users || users.length === 0) && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">Nenhum usuário encontrado.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* 🏆 NOVA ABA DE PROMOÇÕES COM INTERFACE REDESENHADA */}
          <TabsContent value="promotions" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-600" />
                Sistema de Promoções - Interface Redesenhada
              </h2>
              
              <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    data-testid="button-help-promotions"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Como Funciona?
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                      <Trophy className="w-6 h-6 text-yellow-600" />
                      Sistema de Promoções - Guia Completo
                    </DialogTitle>
                    <DialogDescription>
                      Entenda como funciona todo o sistema de prêmios e raspadinhas
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Como Funciona */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Gift className="w-5 h-5 text-purple-600" />
                          1. Como Funciona o Sistema
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                          <div>
                            <p className="font-medium">Dashboard Inteligente</p>
                            <p className="text-sm text-gray-600">Métricas em tempo real dos prêmios ativos, estoque disponível e probabilidades</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                          <div>
                            <p className="font-medium">6 Cartas Diárias</p>
                            <p className="text-sm text-gray-600">Sistema gera automaticamente 6 cartas por dia para cada usuário</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
                          <div>
                            <p className="font-medium">1 Tentativa por Dia</p>
                            <p className="text-sm text-gray-600">Cada usuário raspa apenas 1 carta por dia, criando expectativa</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Configuração de Prêmios */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-green-600" />
                          2. Configuração de Prêmios
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Percent className="w-4 h-4 text-blue-500" />
                              <span className="font-medium">Desconto (%)</span>
                            </div>
                            <p className="text-xs text-gray-600">Ex: 50% off com limite máximo de R$ 100</p>
                          </div>
                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <DollarSign className="w-4 h-4 text-green-500" />
                              <span className="font-medium">Cashback (R$)</span>
                            </div>
                            <p className="text-xs text-gray-600">Ex: R$ 25 de volta na próxima compra</p>
                          </div>
                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="w-4 h-4 text-purple-500" />
                              <span className="font-medium">Produto Grátis</span>
                            </div>
                            <p className="text-xs text-gray-600">Ex: Item específico gratuito</p>
                          </div>
                        </div>
                        
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <h4 className="font-medium text-yellow-800 mb-3">Configurações Importantes:</h4>
                          
                          {/* Probabilidade */}
                          <div className="mb-4">
                            <h5 className="font-semibold text-yellow-800 mb-2">📊 Probabilidade (%)</h5>
                            <p className="text-sm text-yellow-700 mb-2">
                              Define a <strong>chance de esse prêmio ser sorteado</strong> quando alguém raspa uma cartela.
                            </p>
                            <div className="bg-yellow-100 p-3 rounded border-l-4 border-yellow-400">
                              <p className="text-sm text-yellow-800">
                                <strong>Exemplo:</strong> Configurando 20% de probabilidade significa que a cada 100 raspadinhas, 
                                aproximadamente 20 pessoas ganharão esse prêmio específico.
                              </p>
                            </div>
                          </div>

                          {/* Limite Diário */}
                          <div className="mb-4">
                            <h5 className="font-semibold text-yellow-800 mb-2">🎯 Limite Diário</h5>
                            <p className="text-sm text-yellow-700 mb-2">
                              Define o <strong>número máximo de vezes</strong> que esse prêmio pode ser ganho por dia.
                            </p>
                            <div className="bg-yellow-100 p-3 rounded border-l-4 border-yellow-400">
                              <p className="text-sm text-yellow-800">
                                <strong>Exemplo:</strong> Limite diário = 1 significa que apenas 1 pessoa pode ganhar esse prêmio por dia. 
                                Após a primeira vitória, o prêmio fica esgotado até o reset de meia-noite.
                              </p>
                            </div>
                          </div>

                          {/* Como Funciona na Prática */}
                          <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
                            <h5 className="font-semibold text-orange-800 mb-2">⚡ Como Funciona na Prática</h5>
                            <div className="text-sm text-orange-700 space-y-2">
                              <p><strong>Cenário:</strong> iPhone 15 com 20% de probabilidade e limite diário = 1</p>
                              <div className="ml-3 space-y-1">
                                <p>1️⃣ Primeira pessoa raspa → 20% de chance de ganhar o iPhone</p>
                                <p>2️⃣ Se ela ganhar → prêmio fica <strong>esgotado</strong> para o resto do dia</p>
                                <p>3️⃣ Outras pessoas que rasparem no mesmo dia não podem mais ganhar esse iPhone</p>
                              </div>
                              <p className="mt-2 font-medium">
                                💡 <strong>Resumo:</strong> A probabilidade controla a frequência, mas o limite diário garante controle de custos.
                              </p>
                            </div>
                          </div>

                          <div className="mt-3">
                            <p className="text-sm text-yellow-700">
                              • <strong>Status ativo/inativo:</strong> Liga ou desliga o prêmio completamente
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Sistema Inteligente */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-red-600" />
                          3. Sistema Inteligente de Distribuição
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-red-500 mt-2"></div>
                          <div>
                            <p className="font-medium">Algoritmo Probabilístico</p>
                            <p className="text-sm text-gray-600">Não é sorteio simples, usa criptografia segura baseada nas suas configurações</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                          <div>
                            <p className="font-medium">Controle de Estoque</p>
                            <p className="text-sm text-gray-600">Para automaticamente quando atinge o limite diário</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                          <div>
                            <p className="font-medium">Reset às 00:00</p>
                            <p className="text-sm text-gray-600">Sistema reinicia automaticamente no fuso horário do Paraguai</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
                          <div>
                            <p className="font-medium">Prevenção de Fraudes</p>
                            <p className="text-sm text-gray-600">Sistema atômico que evita duplos prêmios e tentativas múltiplas</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Experiência do Usuário */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          4. Como os Usuários Ganham
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium text-blue-800 mb-3">Fluxo da Experiência:</h4>
                          <div className="space-y-2 text-sm text-blue-700">
                            <div className="flex items-center gap-2">
                              <span className="bg-blue-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                              <span>Usuário visita o site uma vez por dia</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="bg-blue-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                              <span>Vê 6 cartas de raspadinha geradas automaticamente</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="bg-blue-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                              <span>Escolhe 1 carta para raspar (som realista incluído)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="bg-blue-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
                              <span>Algoritmo decide baseado nas suas probabilidades</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="bg-blue-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">5</span>
                              <span>Prêmio é aplicado automaticamente no carrinho</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Monitoramento */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-green-600" />
                          5. Monitoramento e Controle
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium mb-2">Dashboard em Tempo Real</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                              <li>• Prêmios ativos e inativos</li>
                              <li>• Estoque disponível</li>
                              <li>• Total distribuído hoje</li>
                              <li>• Probabilidade total</li>
                            </ul>
                          </div>
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium mb-2">Controles Administrativos</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                              <li>• Reset diário manual</li>
                              <li>• Exportar relatórios</li>
                              <li>• Ligar/desligar prêmios</li>
                              <li>• Ajustar probabilidades</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Resultado Final
                      </h4>
                      <p className="text-sm text-green-700">
                        Sistema completo de gamificação que aumenta engajamento, tempo no site e conversões em vendas. 
                        Os usuários voltam diariamente para tentar a sorte, criando hábito e fidelização natural. 🚀
                      </p>
                    </div>
                  </div>
                  
                  <DialogFooter className="mt-6">
                    <Button onClick={() => setIsHelpOpen(false)} className="w-full">
                      Entendi! Vamos Começar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* 📊 DASHBOARD DE MÉTRICAS PRINCIPAIS */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  Dashboard de Prêmios
                </CardTitle>
                <CardDescription>
                  Visão geral dos prêmios e performance do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">{dailyPrizes.length}</p>
                    <p className="text-sm text-gray-600">Prêmios Ativos</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">
                      {dailyPrizes.filter(p => parseInt(p.totalWinsToday || '0') < parseInt(p.maxDailyWins || '0')).length}
                    </p>
                    <p className="text-sm text-gray-600">Com Estoque</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-3xl font-bold text-purple-600">
                      {dailyPrizes.reduce((sum, p) => sum + parseInt(p.totalWinsToday || '0'), 0)}
                    </p>
                    <p className="text-sm text-gray-600">Concedidos Hoje</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-3xl font-bold text-orange-600">
                      {(dailyPrizes.reduce((sum, p) => sum + parseFloat(p.probability || '0'), 0) * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Prob. Total</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Diário
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Relatório
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 💰 SISTEMA DE ORÇAMENTO E CONTROLE DE CUSTOS */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Sistema de Orçamento
                </CardTitle>
                <CardDescription>
                  Controle de custos e projeções financeiras do sistema de prêmios
                </CardDescription>
              </CardHeader>
              <CardContent>
                {budgetStats ? (
                  <div className="space-y-6">
                    {/* Métricas de Orçamento */}
                    <div className="grid grid-cols-2 gap-4">
                      {budgetStats.budget ? (
                        <>
                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900">Orçamento Diário</h4>
                            <div className="bg-blue-50 rounded-lg p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">Disponível</span>
                                <span className="font-bold text-blue-600">
                                  R$ {budgetStats.budget.dailyBudget.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">Gasto Hoje</span>
                                <span className={`font-medium ${budgetStats.budget.dailySpent > budgetStats.budget.dailyBudget ? 'text-red-600' : 'text-gray-900'}`}>
                                  R$ {budgetStats.budget.dailySpent.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Restante</span>
                                <span className={`font-bold ${budgetStats.budget.dailyRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  R$ {budgetStats.budget.dailyRemaining.toFixed(2)}
                                </span>
                              </div>
                              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${budgetStats.budget.dailySpent > budgetStats.budget.dailyBudget ? 'bg-red-500' : 'bg-blue-500'}`}
                                  style={{ width: `${Math.min((budgetStats.budget.dailySpent / budgetStats.budget.dailyBudget) * 100, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900">Orçamento Mensal</h4>
                            <div className="bg-purple-50 rounded-lg p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">Disponível</span>
                                <span className="font-bold text-purple-600">
                                  R$ {budgetStats.budget.monthlyBudget.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">Gasto Este Mês</span>
                                <span className={`font-medium ${budgetStats.budget.monthlySpent > budgetStats.budget.monthlyBudget ? 'text-red-600' : 'text-gray-900'}`}>
                                  R$ {budgetStats.budget.monthlySpent.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Restante</span>
                                <span className={`font-bold ${budgetStats.budget.monthlyRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  R$ {budgetStats.budget.monthlyRemaining.toFixed(2)}
                                </span>
                              </div>
                              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${budgetStats.budget.monthlySpent > budgetStats.budget.monthlyBudget ? 'bg-red-500' : 'bg-purple-500'}`}
                                  style={{ width: `${Math.min((budgetStats.budget.monthlySpent / budgetStats.budget.monthlyBudget) * 100, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="col-span-2 text-center py-8 text-gray-500">
                          <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>Nenhum orçamento configurado</p>
                          <p className="text-sm">Configure limites de orçamento para controle de custos</p>
                        </div>
                      )}
                    </div>

                    {/* Calculadora de Custos */}
                    <div className="border rounded-lg p-4 bg-orange-50">
                      <h4 className="font-medium text-orange-800 mb-3 flex items-center gap-2">
                        <Calculator className="w-4 h-4" />
                        Calculadora de Custos Estimados
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">
                            R$ {budgetStats.estimatedCosts.dailyEstimated}
                          </p>
                          <p className="text-gray-600">Custo Estimado/Dia</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {budgetStats.estimatedCosts.activePrizes}
                          </p>
                          <p className="text-gray-600">Prêmios Ativos</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-600">
                            {budgetStats.estimatedCosts.totalPrizes}
                          </p>
                          <p className="text-gray-600">Total de Prêmios</p>
                        </div>
                      </div>
                    </div>

                    {/* Alertas de Orçamento */}
                    {(budgetStats.alerts.dailyBudgetExceeded || budgetStats.alerts.monthlyBudgetExceeded || budgetStats.alerts.estimatedExceedsDailyBudget) && (
                      <div className="space-y-2">
                        {budgetStats.alerts.dailyBudgetExceeded && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <span className="font-medium text-red-800">Orçamento diário excedido!</span>
                            </div>
                            <p className="text-sm text-red-700 mt-1">O gasto de hoje superou o limite diário configurado.</p>
                          </div>
                        )}
                        {budgetStats.alerts.monthlyBudgetExceeded && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <span className="font-medium text-red-800">Orçamento mensal excedido!</span>
                            </div>
                            <p className="text-sm text-red-700 mt-1">O gasto deste mês superou o limite mensal configurado.</p>
                          </div>
                        )}
                        {budgetStats.alerts.estimatedExceedsDailyBudget && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-yellow-600" />
                              <span className="font-medium text-yellow-800">Custo estimado alto!</span>
                            </div>
                            <p className="text-sm text-yellow-700 mt-1">O custo estimado diário pode exceder o orçamento configurado.</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsBudgetConfigOpen(true)}
                        data-testid="button-budget-config"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Configurar Orçamento
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsFinancialReportOpen(true)}
                        data-testid="button-financial-report"
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Relatório Financeiro
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 mx-auto mb-3"></div>
                    <p>Carregando dados de orçamento...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 🎁 GERENCIAMENTO DE PRÊMIOS COM TABELA PROFISSIONAL */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-600" />
                  Gerenciamento de Prêmios
                </CardTitle>
                <CardDescription>
                  Configure prêmios, probabilidades e estoque - Interface redesenhada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-600">{dailyPrizes.length} prêmios configurados</p>
                  
                  <Dialog open={isCreatePrizeOpen || !!editingPrize} onOpenChange={(open) => {
                    if (!open) {
                      setIsCreatePrizeOpen(false);
                      setEditingPrize(null);
                      prizeForm.reset();
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm"
                        onClick={() => setIsCreatePrizeOpen(true)}
                        data-testid="button-create-prize"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Prêmio
                      </Button>
                    </DialogTrigger>
                    
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Gift className="w-5 h-5 text-purple-600" />
                          {editingPrize ? "Editar Prêmio" : "Criar Novo Prêmio"}
                        </DialogTitle>
                        <DialogDescription>
                          Configure os detalhes do prêmio para o sistema de raspadinha diária.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Form {...prizeForm}>
                        <form onSubmit={prizeForm.handleSubmit(onSubmitPrize)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={prizeForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nome do Prêmio</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Ex: 50% de Desconto" {...field} data-testid="input-prize-name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={prizeForm.control}
                              name="prizeType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tipo do Prêmio</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-prize-type">
                                        <SelectValue placeholder="Selecione o tipo" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="discount">Desconto (%)</SelectItem>
                                      <SelectItem value="cashback">Cashback (R$)</SelectItem>
                                      <SelectItem value="product">Produto Grátis</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={prizeForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Descrição</FormLabel>
                                <FormControl>
                                  <Input placeholder="Descrição opcional do prêmio" {...field} data-testid="input-prize-description" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {prizeForm.watch("prizeType") === "discount" && (
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={prizeForm.control}
                                name="discountPercentage"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Desconto (%)</FormLabel>
                                    <FormControl>
                                      <Input type="number" min="1" max="100" placeholder="10" {...field} data-testid="input-discount-percentage" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={prizeForm.control}
                                name="maxDiscountAmount"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Desconto Máximo (R$)</FormLabel>
                                    <FormControl>
                                      <Input placeholder="100.00" {...field} data-testid="input-max-discount" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                          
                          {prizeForm.watch("prizeType") === "cashback" && (
                            <FormField
                              control={prizeForm.control}
                              name="discountValue"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Valor do Cashback (R$)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="25.00" {...field} data-testid="input-cashback-value" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {prizeForm.watch("prizeType") === "product" && (
                            <div className="space-y-4">
                              <FormField
                                control={prizeForm.control}
                                name="productId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Produto a ser Oferecido</FormLabel>
                                    <div className="space-y-3">
                                      {selectedProduct ? (
                                        <div className="border rounded-lg p-4 bg-green-50">
                                          <div className="flex items-center gap-3">
                                            {selectedProduct.imageUrl && (
                                              <img 
                                                src={selectedProduct.imageUrl} 
                                                alt={selectedProduct.name}
                                                className="w-12 h-12 rounded object-cover flex-shrink-0"
                                              />
                                            )}
                                            <div className="flex-1">
                                              <p className="font-medium text-sm">{selectedProduct.name}</p>
                                              <p className="text-xs text-gray-600">{selectedProduct.storeName}</p>
                                              <p className="text-sm font-semibold text-green-600">
                                                ${selectedProduct.price}
                                              </p>
                                            </div>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setSelectedProduct(null);
                                                prizeForm.setValue('productId', '');
                                              }}
                                            >
                                              Trocar
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={handleOpenProductSelector}
                                          className="w-full h-20 border-dashed"
                                          data-testid="button-select-product"
                                        >
                                          <div className="text-center">
                                            <Package className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                                            <p className="text-sm">Selecionar Produto</p>
                                            <p className="text-xs text-gray-500">
                                              {availableProducts.length} produtos disponíveis
                                            </p>
                                          </div>
                                        </Button>
                                      )}
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={prizeForm.control}
                              name="probability"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Probabilidade (%)</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="0.1" max="100" step="0.1" placeholder="5.0" {...field} data-testid="input-probability" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={prizeForm.control}
                              name="maxDailyWins"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Limite Diário</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="1" placeholder="1" {...field} data-testid="input-max-daily-wins" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={prizeForm.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Prêmio Ativo</FormLabel>
                                  <FormDescription>
                                    Prêmio pode ser sorteado nas raspadinhas
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-prize-active"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <DialogFooter>
                            <Button type="submit" disabled={createPrizeMutation.isPending || updatePrizeMutation.isPending}>
                              {editingPrize ? "Atualizar" : "Criar"} Prêmio
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>

                  {/* Modal de Seleção de Produtos */}
                  <Dialog open={isProductSelectorOpen} onOpenChange={(open) => {
                    setIsProductSelectorOpen(open);
                    if (!open) {
                      setProductSearchTerm("");
                    }
                  }}>
                    <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-blue-600" />
                          Selecionar Produto para Prêmio
                        </DialogTitle>
                        <DialogDescription>
                          Escolha um produto das lojas cadastradas para ser oferecido como prêmio grátis.
                        </DialogDescription>
                      </DialogHeader>
                      
                      {/* Campo de Busca */}
                      <div className="px-1 pb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            placeholder="Buscar produtos por nome, loja ou categoria..."
                            value={productSearchTerm}
                            onChange={(e) => setProductSearchTerm(e.target.value)}
                            className="pl-10"
                            data-testid="input-product-search"
                          />
                        </div>
                      </div>
                      
                      <ProductList 
                        availableProducts={availableProducts}
                        productSearchTerm={productSearchTerm}
                        onSelectProduct={handleProductSelect}
                      />
                      
                      <div className="flex justify-between items-center pt-4 border-t">
                        <p className="text-sm text-gray-500">
                          {availableProducts.filter((product: any) =>
                            product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                            product.storeName.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                            (product.category && product.category.toLowerCase().includes(productSearchTerm.toLowerCase()))
                          ).length} produtos encontrados
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setIsProductSelectorOpen(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3">
                  {dailyPrizes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Gift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Nenhum prêmio configurado</p>
                      <p className="text-sm">Clique em "Novo Prêmio" para começar</p>
                    </div>
                  ) : (
                    dailyPrizes.map((prize) => {
                      const isOutOfStock = parseInt(prize.totalWinsToday || '0') >= parseInt(prize.maxDailyWins || '0');
                      
                      return (
                        <div key={prize.id} className={`p-4 border rounded-lg ${isOutOfStock ? 'bg-gray-50' : 'bg-white'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`w-3 h-3 rounded-full ${prize.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                <h3 className="font-semibold text-gray-900">{prize.name}</h3>
                                {isOutOfStock && <Badge variant="destructive">Esgotado</Badge>}
                                {!prize.isActive && <Badge variant="secondary">Inativo</Badge>}
                              </div>
                              
                              <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Tipo:</span>
                                  <p className="capitalize">{prize.prizeType === 'discount' ? 'Desconto' : prize.prizeType === 'cashback' ? 'Cashback' : 'Produto'}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Probabilidade:</span>
                                  <p>{(parseFloat(prize.probability) * 100).toFixed(1)}%</p>
                                </div>
                                <div>
                                  <span className="font-medium">Hoje:</span>
                                  <p>{prize.totalWinsToday || 0}/{prize.maxDailyWins || 1}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Total:</span>
                                  <p>{prize.totalWinsAllTime || 0}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setEditingPrize(prize);
                                  prizeForm.reset({
                                    name: prize.name,
                                    description: prize.description || '',
                                    prizeType: prize.prizeType as 'product' | 'discount' | 'cashback',
                                    productId: prize.productId || '',
                                    discountValue: prize.discountValue || '',
                                    discountPercentage: prize.discountPercentage?.toString() || '',
                                    maxDailyWins: prize.maxDailyWins || '1',
                                    maxDiscountAmount: prize.maxDiscountAmount || '',
                                    probability: (parseFloat(prize.probability) * 100).toString(),
                                    isActive: prize.isActive
                                  });
                                }}
                                data-testid={`button-edit-prize-${prize.id}`}
                                title="Editar prêmio"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={async () => {
                                  if (window.confirm(`Tem certeza que deseja excluir o prêmio "${prize.name}"?`)) {
                                    try {
                                      await apiRequest('DELETE', `/api/admin/daily-prizes/${prize.id}`);
                                      toast({
                                        title: "Prêmio removido!",
                                        description: "O prêmio foi excluído com sucesso.",
                                        variant: "default",
                                      });
                                      queryClient.invalidateQueries({ queryKey: ['/api/admin/daily-prizes'] });
                                    } catch (error: any) {
                                      toast({
                                        title: "Erro ao remover",
                                        description: error.message || "Não foi possível remover o prêmio.",
                                        variant: "destructive",
                                      });
                                    }
                                  }
                                }}
                                data-testid={`button-delete-prize-${prize.id}`}
                                title="Excluir prêmio"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-600" />
                  Estatísticas Antigas
                </CardTitle>
                <CardDescription>
                  Métricas legadas do sistema (descontinuadas)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    As estatísticas antigas foram substituídas pelo novo sistema de Analytics
                  </p>
                  <p className="text-sm text-gray-400">
                    Use a aba "Analytics" para ver as métricas modernas
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <ComprehensiveAnalytics />
          </TabsContent>

          {/* ABA DE TESTE IA */}
          <TabsContent value="ai-test" className="space-y-6">
            <AITestInterface />
          </TabsContent>

          {/* ABA DE SISTEMA */}
          {/* ABA ARTES IA */}
          <TabsContent value="ai-arts-main" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  Gestão Completa de Artes IA
                </CardTitle>
                <CardDescription className="flex justify-between items-center">
                  <span>Controle total de todas as artes geradas automaticamente</span>
                  <Button 
                    onClick={() => forceGenerateMutation.mutate()}
                    disabled={forceGenerateMutation.isPending}
                    size="sm"
                    className="flex items-center gap-2"
                    data-testid="button-force-generate"
                  >
                    {forceGenerateMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Forçar Geração
                  </Button>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {artsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : !allGeneratedArts || allGeneratedArts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Ainda não há artes geradas.</p>
                    <p className="text-sm mt-1">Use o botão "Forçar Geração" para criar novas artes automaticamente.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allGeneratedArts.map((art: any) => (
                      <Card key={art.id} className="overflow-hidden" data-testid={`ai-art-${art.id}`}>
                        <div className="relative">
                          <img 
                            src={art.imageUrl} 
                            alt="Arte gerada por IA"
                            className="w-full h-48 object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <Badge variant={art.isActive ? "default" : "secondary"}>
                              {art.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 left-2"
                            onClick={() => deleteArtMutation.mutate(art.id)}
                            disabled={deleteArtMutation.isPending}
                            data-testid={`button-delete-art-${art.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">
                              {art.storeName || 'Global'} - #{art.id.slice(0, 8)}
                            </h4>
                            <Switch 
                              checked={art.isActive}
                              onCheckedChange={(checked) => {
                                toggleArtMutation.mutate({ artId: art.id, isActive: checked });
                              }}
                              disabled={toggleArtMutation.isPending}
                              data-testid={`switch-art-${art.id}`}
                            />
                          </div>
                          <p className="text-sm text-gray-500 mb-2">
                            {new Date(art.generationDate).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-gray-400 line-clamp-2">
                            {art.prompt}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Gerenciamento de Categorias
              </h2>
              
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
                                      .normalize('NFD')
                                      .replace(/[\u0300-\u036f]/g, '')
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
                              <FormLabel>Slug (URL)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="categoria-slug" 
                                  {...field} 
                                  data-testid="input-category-slug" 
                                />
                              </FormControl>
                              <FormDescription>
                                URL amigável para a categoria (gerado automaticamente)
                              </FormDescription>
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
                                placeholder="Descrição da categoria..." 
                                rows={3} 
                                {...field} 
                                data-testid="textarea-category-description" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
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
                                  data-testid="input-category-sort-order" 
                                />
                              </FormControl>
                              <FormDescription>
                                Menor número = exibido primeiro
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {editingCategory && (
                          <div className="flex flex-col space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <div className="flex items-center space-x-2 mt-2">
                              <Switch 
                                checked={isCategoryActive}
                                onCheckedChange={setIsCategoryActive}
                                data-testid="switch-category-active"
                              />
                              <span className="text-sm text-gray-600">
                                {isCategoryActive ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setIsCreateCategoryOpen(false);
                            setEditingCategory(null);
                            categoryForm.reset();
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit" 
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                          data-testid="button-save-category"
                        >
                          {createCategoryMutation.isPending || updateCategoryMutation.isPending ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Lista de Categorias */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-blue-600" />
                  Categorias Cadastradas
                </CardTitle>
                <CardDescription>
                  Gerencie as categorias de produtos da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categoriesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : !categories || categories.length === 0 ? (
                  <div className="text-center py-12">
                    <Tag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Nenhuma categoria encontrada
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Comece criando sua primeira categoria para organizar os produtos.
                    </p>
                    <Button 
                      onClick={() => setIsCreateCategoryOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="button-create-first-category"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeira Categoria
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Nome</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Descrição</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Slug</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Status</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Ordem</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...categories].sort((a, b) => a.sortOrder - b.sortOrder).map((category) => (
                          <tr key={category.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="py-4 px-4">
                              <div className="font-medium text-gray-900 dark:text-gray-100" data-testid={`text-category-name-${category.id}`}>
                                {category.name}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-gray-600 dark:text-gray-400 text-sm max-w-xs truncate" data-testid={`text-category-description-${category.id}`}>
                                {category.description || 'Sem descrição'}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200" data-testid={`text-category-slug-${category.id}`}>
                                {category.slug}
                              </code>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex items-center justify-center">
                                <Switch 
                                  checked={category.isActive}
                                  onCheckedChange={() => handleToggleCategoryActive(category)}
                                  data-testid={`switch-category-active-${category.id}`}
                                />
                                <Badge 
                                  variant={category.isActive ? "default" : "secondary"}
                                  className="ml-2"
                                  data-testid={`badge-category-status-${category.id}`}
                                >
                                  {category.isActive ? "Ativo" : "Inativo"}
                                </Badge>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="text-gray-600 dark:text-gray-400" data-testid={`text-category-order-${category.id}`}>
                                {category.sortOrder}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-center space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEditCategory(category)}
                                  data-testid={`button-edit-category-${category.id}`}
                                >
                                  <Edit className="w-4 h-4" />
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA DE BANCO DE PRODUTOS */}
          <TabsContent value="product-banks" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Gerenciamento de Banco de Produtos
              </h2>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-product-bank" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Upload ZIP
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Upload Banco de Produtos</DialogTitle>
                    <DialogDescription>
                      Faça upload de um arquivo ZIP contendo pastas de produtos com imagens e descrições.
                    </DialogDescription>
                  </DialogHeader>
                  <ProductBankUploadForm />
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Bancos de Produtos
                </CardTitle>
                <CardDescription>
                  Gerencie os bancos de produtos disponíveis para os lojistas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductBanksList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <MaintenanceControls />
          </TabsContent>

          {/* ABA WI-FI 24H */}
          <TabsContent value="wifi" className="space-y-6">
            <WiFiManagementPanel />
          </TabsContent>

          {/* ABA LOJAS PREMIUM */}
          <TabsContent value="premium-stores" className="space-y-6">
            <PremiumStoresPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Configuração de Orçamento */}
      <Dialog open={isBudgetConfigOpen} onOpenChange={setIsBudgetConfigOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Configurar Orçamento de Promoções
            </DialogTitle>
            <DialogDescription>
              Configure os limites de orçamento diário e mensal para o sistema de promoções.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {budgetStats?.budget ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Orçamento Diário (USD)</label>
                    <input 
                      type="number" 
                      defaultValue={budgetStats.budget.dailyBudget}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      min="0"
                      step="0.01"
                      data-testid="input-daily-budget"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Orçamento Mensal (USD)</label>
                    <input 
                      type="number" 
                      defaultValue={budgetStats.budget.monthlyBudget}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      min="0"
                      step="0.01"
                      data-testid="input-monthly-budget"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Status Atual</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Gasto Hoje:</span>
                        <span className="font-medium">${budgetStats.budget.dailySpent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Restante Hoje:</span>
                        <span className="font-medium text-green-600">${budgetStats.budget.dailyRemaining}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gasto Este Mês:</span>
                        <span className="font-medium">${budgetStats.budget.monthlySpent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Restante Este Mês:</span>
                        <span className="font-medium text-green-600">${budgetStats.budget.monthlyRemaining}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p>Carregando configurações...</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsBudgetConfigOpen(false)}
            >
              Cancelar
            </Button>
            <Button data-testid="button-save-budget">
              Salvar Configurações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Relatório Financeiro */}
      <Dialog open={isFinancialReportOpen} onOpenChange={setIsFinancialReportOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Relatório Financeiro Detalhado
            </DialogTitle>
            <DialogDescription>
              Análise completa dos gastos e custos do sistema de promoções.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {budgetStats ? (
              <>
                {/* Resumo Financeiro */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-800 mb-2">Orçamento Diário</h3>
                    <p className="text-2xl font-bold text-blue-600">${budgetStats.budget?.dailyBudget || 0}</p>
                    <p className="text-sm text-blue-600 mt-1">
                      Gasto: ${budgetStats.budget?.dailySpent || 0}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-medium text-green-800 mb-2">Orçamento Mensal</h3>
                    <p className="text-2xl font-bold text-green-600">${budgetStats.budget?.monthlyBudget || 0}</p>
                    <p className="text-sm text-green-600 mt-1">
                      Gasto: ${budgetStats.budget?.monthlySpent || 0}
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="font-medium text-purple-800 mb-2">Custo Estimado</h3>
                    <p className="text-2xl font-bold text-purple-600">${budgetStats.estimatedCosts?.dailyEstimated || 0}</p>
                    <p className="text-sm text-purple-600 mt-1">Por dia (projeção)</p>
                  </div>
                </div>

                {/* Estatísticas de Raspadinhas */}
                {scratchStats && (
                  <div>
                    <h3 className="font-medium mb-3">Estatísticas de Hoje</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold">{scratchStats.totalCardsToday}</p>
                        <p className="text-sm text-gray-600">Cartas Geradas</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold">{scratchStats.cardsScratched}</p>
                        <p className="text-sm text-gray-600">Cartas Raspadas</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold">{scratchStats.prizesWon}</p>
                        <p className="text-sm text-gray-600">Prêmios Ganhos</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold">{scratchStats.successRate}%</p>
                        <p className="text-sm text-gray-600">Taxa de Sucesso</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lista de Prêmios Ativos */}
                <div>
                  <h3 className="font-medium mb-3">Prêmios Ativos e Custos</h3>
                  <div className="space-y-2">
                    {dailyPrizes.filter(prize => prize.isActive).map((prize) => (
                      <div key={prize.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{prize.name}</p>
                          <p className="text-sm text-gray-600">
                            Tipo: {prize.prizeType} | Probabilidade: {prize.probability}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {prize.prizeType === 'discount' && `${prize.discountPercentage}% off`}
                            {prize.prizeType === 'cashback' && `$${prize.discountValue}`}
                            {prize.prizeType === 'product' && 'Produto Grátis'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Máx/dia: {prize.maxDailyWins} | Hoje: {prize.totalWinsToday}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p>Carregando dados financeiros...</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsFinancialReportOpen(false)}
            >
              Fechar
            </Button>
            <Button data-testid="button-export-report">
              Exportar Relatório
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente para upload de ZIP com produtos
function ProductBankUploadForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const productBankSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    description: z.string().optional(),
    zipFile: z.any().optional(),
  });

  const form = useForm<z.infer<typeof productBankSchema>>({
    resolver: zodResolver(productBankSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; file: File }) => {
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.description) {
        formData.append('description', data.description);
      }
      formData.append('zipFile', data.file);

      const response = await fetch('/api/super-admin/product-banks/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro no upload');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload realizado com sucesso!",
        description: data.message || `Banco "${data.bank?.name}" criado com ${data.processedItems} produtos.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/product-banks'] });
      form.reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsUploading(false);
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      console.error('Upload error:', error);
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const onSubmit = (values: z.infer<typeof productBankSchema>) => {
    const fileInput = fileInputRef.current;
    const file = fileInput?.files?.[0];
    
    if (!file) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo ZIP",
        variant: "destructive",
      });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast({
        title: "Erro",
        description: "Apenas arquivos ZIP são permitidos",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simular progresso
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 500);

    uploadMutation.mutate(
      { 
        name: values.name, 
        description: values.description, 
        file 
      },
      {
        onSettled: () => {
          clearInterval(progressInterval);
        }
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Banco</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="Ex: Produtos Samsung Janeiro 2025"
                  data-testid="input-bank-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (opcional)</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="Descrição do banco de produtos..."
                  data-testid="textarea-bank-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium">Arquivo ZIP</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="w-full p-2 border border-gray-300 rounded-md"
            data-testid="input-zip-file"
          />
          <p className="text-xs text-gray-500">
            Upload um arquivo ZIP contendo pastas de produtos com imagens e description.txt
          </p>
        </div>

        {isUploading && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-center text-gray-600">
              Processando arquivo... {Math.round(uploadProgress)}%
            </p>
          </div>
        )}

        <DialogFooter>
          <Button 
            type="submit" 
            disabled={isUploading}
            data-testid="button-submit-upload"
          >
            {isUploading ? 'Processando...' : 'Fazer Upload'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// Componente para listar bancos de produtos
function ProductBanksList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: productBanks, isLoading, error } = useQuery({
    queryKey: ['/api/super-admin/product-banks'],
    queryFn: async () => {
      const response = await fetch('/api/super-admin/product-banks', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Erro ao buscar bancos de produtos');
      }
      return response.json();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (bankId: string) => {
      const response = await fetch(`/api/super-admin/product-banks/${bankId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao deletar banco');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Banco excluído",
        description: "Banco de produtos excluído com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/product-banks'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="text-center py-4">Carregando bancos de produtos...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-600">Erro ao carregar bancos de produtos</div>;
  }

  if (!productBanks || productBanks.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Nenhum banco de produtos encontrado</p>
        <p className="text-sm text-gray-400 mt-1">
          Faça upload de um arquivo ZIP para criar seu primeiro banco
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {productBanks.map((bank: ProductBank) => (
        <div key={bank.id} className="border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-lg">{bank.name}</h3>
                <Badge variant={bank.isActive ? "default" : "secondary"}>
                  {bank.isActive ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              
              {bank.description && (
                <p className="text-gray-600 mb-3">{bank.description}</p>
              )}
              
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  {bank.totalProducts} produtos
                </span>
                <span>ZIP: {bank.zipFileName}</span>
                <span>
                  Criado: {new Date(bank.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    data-testid={`button-view-bank-${bank.id}`}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Produtos do Banco: {bank.name}</DialogTitle>
                    <DialogDescription>
                      Visualizar produtos disponíveis neste banco
                    </DialogDescription>
                  </DialogHeader>
                  <ProductBankItemsList bankId={bank.id} />
                </DialogContent>
              </Dialog>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir este banco de produtos?')) {
                    deleteMutation.mutate(bank.id);
                  }
                }}
                disabled={deleteMutation.isPending}
                data-testid={`button-delete-bank-${bank.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Componente para listar items de um banco específico
function ProductBankItemsList({ bankId }: { bankId: string }) {
  const { data: items, isLoading } = useQuery({
    queryKey: ['/api/product-banks', bankId, 'items'],
    queryFn: async () => {
      const response = await fetch(`/api/product-banks/${bankId}/items`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Erro ao buscar produtos');
      }
      const data = await response.json();
      return data.items || [];
    }
  });

  if (isLoading) {
    return <div className="text-center py-4">Carregando produtos...</div>;
  }

  if (!items || items.length === 0) {
    return <div className="text-center py-4">Nenhum produto encontrado neste banco</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
      {items.map((item: ProductBankItem) => (
        <div key={item.id} className="border rounded-lg overflow-hidden">
          {item.primaryImageUrl && (
            <img 
              src={item.primaryImageUrl} 
              alt={item.name}
              className="w-full h-32 object-cover"
            />
          )}
          <div className="p-3">
            <h4 className="font-medium text-sm mb-1">{item.name}</h4>
            <div className="text-xs text-gray-500 space-y-1">
              <div>Marca: {item.brand}</div>
              <div>Categoria: {item.category}</div>
              {item.color && <div>Cor: {item.color}</div>}
              {item.storage && <div>Armazenamento: {item.storage}</div>}
              <div>Usado: {item.usageCount} vezes</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


// Componente Wi-Fi Management Panel - Integrado do admin-wifi.tsx
function WiFiManagementPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeWifiTab, setActiveWifiTab] = useState<'settings' | 'payments' | 'analytics' | 'commissions'>('settings');
  const [showPassword, setShowPassword] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WifiPlan | null>(null);

  // Buscar configurações
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/wifi-settings'],
    queryFn: async () => {
      const response = await fetch('/api/wifi-settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return await response.json();
    }
  });

  // Buscar pagamentos
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['/api/wifi-payments'],
    queryFn: async () => {
      const response = await fetch('/api/wifi-payments');
      if (!response.ok) throw new Error('Failed to fetch payments');
      return await response.json();
    }
  });

  // Buscar analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/wifi-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/wifi-analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return await response.json();
    }
  });

  // Buscar planos Wi-Fi
  const { data: wifiPlans, isLoading: plansLoading } = useQuery<WifiPlan[]>({
    queryKey: ['/api/wifi-plans'],
    queryFn: async () => {
      const response = await fetch('/api/wifi-plans');
      if (!response.ok) throw new Error('Failed to fetch wifi plans');
      return await response.json();
    }
  });

  // Form para planos Wi-Fi
  const planForm = useForm<WifiPlanFormData>({
    resolver: zodResolver(wifiPlanSchema),
    defaultValues: {
      name: '',
      durationHours: 24,
      price: 0,
      description: '',
    },
  });

  // Mutation para criar/editar planos
  const savePlanMutation = useMutation({
    mutationFn: async (data: WifiPlanFormData) => {
      const payload = {
        name: data.name,
        durationHours: data.durationHours,
        price: data.price.toString(),
        description: data.description || '',
        sessionTimeout: `${data.durationHours}:00:00`,
        isActive: true,
        displayOrder: 0,
      };
      
      if (editingPlan) {
        return await apiRequest('PATCH', `/api/wifi-plans/${editingPlan.id}`, payload);
      } else {
        return await apiRequest('POST', '/api/wifi-plans', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wifi-plans'] });
      toast({
        title: editingPlan ? "Plano atualizado" : "Plano criado",
        description: editingPlan ? "Plano Wi-Fi atualizado com sucesso." : "Plano Wi-Fi criado com sucesso.",
      });
      setIsPlanDialogOpen(false);
      setEditingPlan(null);
      planForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar plano.",
        variant: "destructive",
      });
    },
  });

  // Handler para abrir dialog de novo plano
  const handleNewPlan = () => {
    setEditingPlan(null);
    planForm.reset({
      name: '',
      durationHours: 24,
      price: 0,
      description: '',
    });
    setIsPlanDialogOpen(true);
  };

  // Handler para abrir dialog de edição
  const handleEditPlan = (plan: WifiPlan) => {
    setEditingPlan(plan);
    planForm.reset({
      name: plan.name,
      durationHours: plan.durationHours,
      price: parseFloat(plan.price.toString()),
      description: plan.description || '',
    });
    setIsPlanDialogOpen(true);
  };

  // Handler para submit do form
  const handlePlanSubmit = (data: WifiPlanFormData) => {
    savePlanMutation.mutate(data);
  };

  // Mutation para salvar configurações
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PUT', '/api/wifi-settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wifi-settings'] });
      toast({
        title: "Configurações salvas",
        description: "As configurações do Wi-Fi foram atualizadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Erro ao salvar configurações.",
        variant: "destructive"
      });
    }
  });

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      mikrotikHost: formData.get('mikrotikHost') as string,
      mikrotikUsername: formData.get('mikrotikUsername') as string,
      mikrotikPassword: formData.get('mikrotikPassword') as string,
      hotspotProfile: formData.get('hotspotProfile') as string,
      sessionTimeout: formData.get('sessionTimeout') as string,
      dataLimit: formData.get('dataLimit') as string,
      speedLimit: formData.get('speedLimit') as string,
      commissionPercentage: formData.get('commissionPercentage') ? parseFloat(formData.get('commissionPercentage') as string).toString() : undefined,
      isActive: formData.get('isActive') === 'on'
    };

    updateSettingsMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    return plan === 'daily' 
      ? <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />24h</Badge>
      : <Badge className="bg-purple-100 text-purple-800"><Calendar className="w-3 h-3 mr-1" />30 dias</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  // Calculate totals for analytics
  const analyticsArray = Array.isArray(analytics) ? analytics : [];
  const totalRevenue = analyticsArray.reduce((sum, a) => {
    const revenue = a.totalRevenue ? parseFloat(a.totalRevenue.toString()) : 0;
    return sum + revenue;
  }, 0);
  const totalPayments = analyticsArray.reduce((sum, a) => sum + (a.totalPayments || 0), 0);
  const successRate = totalPayments > 0 ? 
    ((analyticsArray.reduce((sum, a) => sum + (a.successfulPayments || 0), 0)) / totalPayments * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Wifi className="h-8 w-8 text-blue-600" />
            Wi-Fi 24h - Gerenciamento
          </h1>
          <p className="text-gray-600 mt-1">
            Configure planos, monitore transações e analise o desempenho do sistema Wi-Fi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            settings?.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {settings?.isActive ? '✅ Ativo' : '❌ Inativo'}
          </div>
        </div>
      </div>

      <Tabs value={activeWifiTab} onValueChange={(value) => setActiveWifiTab(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Transações
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="commissions" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Comissões
          </TabsTrigger>
        </TabsList>

        {/* Configurações Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="flex flex-col items-center gap-6 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            
            {/* Gerenciamento de Planos Wi-Fi */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Gerenciar Planos Wi-Fi
                    </CardTitle>
                    <CardDescription>
                      Crie e gerencie planos personalizados com preços e durações flexíveis
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={handleNewPlan} data-testid="button-new-plan">
                    <Plus className="w-4 h-4 mr-1" /> Novo Plano
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {plansLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {wifiPlans && wifiPlans.length > 0 ? (
                      wifiPlans.map((plan) => (
                        <div key={plan.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold">{plan.name}</h4>
                              <Badge variant={plan.isActive ? "default" : "secondary"}>
                                {plan.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span><Clock className="w-3 h-3 inline mr-1" />{plan.durationHours}h</span>
                              <span><DollarSign className="w-3 h-3 inline mr-1" />R$ {parseFloat(plan.price.toString()).toFixed(2)}</span>
                              {plan.description && <span className="text-gray-500">{plan.description}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleEditPlan(plan)}
                              data-testid={`button-edit-plan-${plan.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => {
                                apiRequest('PATCH', `/api/wifi-plans/${plan.id}/toggle`)
                                  .then(() => {
                                    queryClient.invalidateQueries({ queryKey: ['/api/wifi-plans'] });
                                    toast({ title: plan.isActive ? "Plano desativado" : "Plano ativado" });
                                  });
                              }}
                              data-testid={`button-toggle-plan-${plan.id}`}
                            >
                              {plan.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => {
                                if (confirm(`Deseja deletar o plano "${plan.name}"?`)) {
                                  apiRequest('DELETE', `/api/wifi-plans/${plan.id}`)
                                    .then(() => {
                                      queryClient.invalidateQueries({ queryKey: ['/api/wifi-plans'] });
                                      toast({ title: "Plano deletado" });
                                    });
                                }
                              }}
                              data-testid={`button-delete-plan-${plan.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Nenhum plano criado ainda</p>
                        <p className="text-sm">Clique em "Novo Plano" para começar</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dialog para Criar/Editar Plano Wi-Fi */}
            <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wifi className="w-5 h-5" />
                    {editingPlan ? 'Editar Plano Wi-Fi' : 'Novo Plano Wi-Fi'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingPlan 
                      ? 'Edite as informações do plano Wi-Fi' 
                      : 'Preencha os dados para criar um novo plano Wi-Fi'}
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...planForm}>
                  <form onSubmit={planForm.handleSubmit(handlePlanSubmit)} className="space-y-4">
                    <FormField
                      control={planForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Plano</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ex: 24 horas, 48 horas, 1 semana" 
                              {...field}
                              data-testid="input-plan-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={planForm.control}
                      name="durationHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duração (em horas)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Ex: 24, 48, 168" 
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              data-testid="input-plan-duration"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={planForm.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço (R$)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="Ex: 5.00, 10.00" 
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              data-testid="input-plan-price"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={planForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição (opcional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descrição do plano..."
                              rows={3}
                              {...field}
                              data-testid="textarea-plan-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsPlanDialogOpen(false);
                          setEditingPlan(null);
                          planForm.reset();
                        }}
                        data-testid="button-cancel-plan"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={savePlanMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid="button-save-plan"
                      >
                        {savePlanMutation.isPending ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            {editingPlan ? 'Atualizar' : 'Criar Plano'}
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Configurações Gerais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações Gerais
                </CardTitle>
                <CardDescription>
                  Configure comissões e ative/desative o sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <Label htmlFor="commissionPercentage">Comissão para Lojas (%)</Label>
                    <Input
                      id="commissionPercentage"
                      name="commissionPercentage"
                      type="number"
                      step="0.01"
                      defaultValue={settings?.commissionPercentage || 10.00}
                      placeholder="10.00"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="isActive" 
                      name="isActive"
                      defaultChecked={settings?.isActive || true}
                    />
                    <Label htmlFor="isActive">Sistema Ativo</Label>
                  </div>

                  <Button type="submit" disabled={updateSettingsMutation.isPending} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    {updateSettingsMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Configurações MikroTik */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Router className="h-5 w-5" />
                  Configurações MikroTik
                </CardTitle>
                <CardDescription>
                  Configure a conexão com o servidor MikroTik
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <Label htmlFor="mikrotikHost">Host MikroTik</Label>
                    <Input
                      id="mikrotikHost"
                      name="mikrotikHost"
                      defaultValue={settings?.mikrotikHost || ''}
                      placeholder="192.168.1.1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="mikrotikUsername">Usuário</Label>
                    <Input
                      id="mikrotikUsername"
                      name="mikrotikUsername"
                      defaultValue={settings?.mikrotikUsername || ''}
                      placeholder="admin"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="mikrotikPassword">Senha</Label>
                    <div className="relative">
                      <Input
                        id="mikrotikPassword"
                        name="mikrotikPassword"
                        type={showPassword ? "text" : "password"}
                        defaultValue={settings?.mikrotikPassword || ''}
                        placeholder="••••••••"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hotspotProfile">Perfil Hotspot</Label>
                      <Input
                        id="hotspotProfile"
                        name="hotspotProfile"
                        defaultValue={settings?.hotspotProfile || 'default'}
                        placeholder="default"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sessionTimeout">Timeout Sessão</Label>
                      <Input
                        id="sessionTimeout"
                        name="sessionTimeout"
                        defaultValue={settings?.sessionTimeout || '24:00:00'}
                        placeholder="24:00:00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dataLimit">Limite de Dados</Label>
                      <Input
                        id="dataLimit"
                        name="dataLimit"
                        defaultValue={settings?.dataLimit || 'unlimited'}
                        placeholder="unlimited"
                      />
                    </div>
                    <div>
                      <Label htmlFor="speedLimit">Limite de Velocidade</Label>
                      <Input
                        id="speedLimit"
                        name="speedLimit"
                        defaultValue={settings?.speedLimit || '10M/10M'}
                        placeholder="10M/10M"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={updateSettingsMutation.isPending} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configurações MikroTik
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
          </div>
        </TabsContent>

        {/* Transações Tab */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transações Wi-Fi</CardTitle>
              <CardDescription>
                Visualize e gerencie todas as transações do sistema Wi-Fi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Cliente</th>
                        <th className="text-left p-2">Plano</th>
                        <th className="text-left p-2">Valor</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Voucher</th>
                        <th className="text-left p-2">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments?.map((payment: any) => (
                        <tr key={payment.id} className="border-b">
                          <td className="p-2">
                            <div>
                              <div className="font-medium">{payment.customerName || 'N/A'}</div>
                              <div className="text-sm text-gray-500">{payment.customerEmail}</div>
                            </div>
                          </td>
                          <td className="p-2">{getPlanBadge(payment.plan)}</td>
                          <td className="p-2 font-medium">{formatCurrency(payment.amount)}</td>
                          <td className="p-2">{getStatusBadge(payment.status)}</td>
                          <td className="p-2">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                              {payment.voucherCode || 'N/A'}
                            </code>
                          </td>
                          <td className="p-2">{formatDate(payment.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  +{analytics?.length || 0} dias de dados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Pagamentos</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPayments}</div>
                <p className="text-xs text-muted-foreground">
                  {successRate.toFixed(1)}% taxa de sucesso
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vouchers Ativos</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsArray.reduce((sum, a) => sum + (a.activeVouchers || 0), 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Conectados agora
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comissões Tab */}
        <TabsContent value="commissions" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Comissões Wi-Fi</h3>
                <p className="text-sm">Interface de comissões em desenvolvimento</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente Premium Stores Panel - Integrado do admin-premium-stores.tsx
function PremiumStoresPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Buscar todas as lojas
  const { data: stores = [], isLoading, error } = useQuery({
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
    retry: (failureCount, error) => {
      if (error.message.includes('Acesso negado') || error.message.includes('precisa estar logado')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Show error state for API errors
  if (error) {
    return (
      <div className="space-y-6">
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
  const filteredStores = stores.filter((store: any) => 
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separar lojas premium das regulares
  const premiumStores = filteredStores.filter((store: any) => store.isPremium);
  const regularStores = filteredStores.filter((store: any) => !store.isPremium);

  const handleTogglePremium = (storeId: string, currentStatus: boolean) => {
    togglePremiumMutation.mutate({ 
      storeId, 
      isPremium: !currentStatus 
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4 animate-pulse">
          <div className="h-8 w-8 bg-gray-200 rounded"></div>
          <div className="h-6 w-48 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              <Store className="w-8 h-8 text-blue-600" />
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
              <Award className="w-8 h-8 text-purple-600" />
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
            {premiumStores.map((store: any) => (
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
          <Store className="w-5 h-5 text-gray-600" />
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
            {regularStores.map((store: any) => (
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
  );
}

// Componente StoreCard para exibir dados das lojas
function StoreCard({ store, onTogglePremium, isLoading }: { store: any; onTogglePremium: (storeId: string, currentStatus: boolean) => void; isLoading: boolean }) {
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
                  <Store className="w-6 h-6 text-gray-500" />
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

