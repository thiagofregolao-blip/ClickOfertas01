import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Settings, Users, Store, Image, BarChart3, Plus, Edit, Edit2, Trash2, Eye, LogOut, Gift, Dice6, Target, Award, Save, Package, Percent, DollarSign, Trophy, RotateCcw, Download, HelpCircle, Calculator, AlertTriangle, AlertCircle, TrendingUp, Search } from 'lucide-react';
import { isUnauthorizedError } from '@/lib/authUtils';

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

export default function SuperAdmin() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  // Buscar prêmios diários
  const { data: dailyPrizes = [] } = useQuery<DailyPrize[]>({
    queryKey: ['/api/admin/daily-prizes'],
    enabled: !!user?.isSuperAdmin,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Buscar estatísticas das raspadinhas
  const { data: scratchStats } = useQuery<ScratchStats>({
    queryKey: ['/api/admin/scratch-stats'],
    enabled: !!user?.isSuperAdmin,
    retry: (failureCount, error) => !isUnauthorizedError(error),
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

  // Mutations para prêmios diários
  const createPrizeMutation = useMutation({
    mutationFn: async (data: PrizeFormData) => {
      return await apiRequest('POST', '/api/admin/daily-prizes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/daily-prizes'] });
      setIsCreatePrizeOpen(false);
      prizeForm.reset();
      toast({
        title: "Prêmio criado",
        description: "Prêmio criado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para criar prêmios.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao criar prêmio. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  const updatePrizeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PrizeFormData> & { isActive?: boolean } }) => {
      return await apiRequest('PUT', `/api/admin/daily-prizes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/daily-prizes'] });
      setEditingPrize(null);
      prizeForm.reset();
      toast({
        title: "Prêmio atualizado",
        description: "Prêmio atualizado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para atualizar prêmios.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao atualizar prêmio. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  const deletePrizeMutation = useMutation({
    mutationFn: async (prizeId: string) => {
      return await apiRequest('DELETE', `/api/admin/daily-prizes/${prizeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/daily-prizes'] });
      toast({
        title: "Prêmio deletado",
        description: "Prêmio deletado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para deletar prêmios.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao deletar prêmio. Tente novamente.",
          variant: "destructive",
        });
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-25 to-yellow-50 dark:from-gray-900 dark:to-gray-800">
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

        <Tabs defaultValue="banners" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="banners" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Banners
            </TabsTrigger>
            <TabsTrigger value="stores" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Lojas
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="promotions" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Promoções
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Estatísticas
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Sistema
            </TabsTrigger>
          </TabsList>

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
                          {store.products.length} produtos
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

                  
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={async () => {
                        try {
                          const res = await apiRequest('POST', '/api/admin/daily-scratch/test');
                          const response = await res.json();
                          
                          if (response.success) {
                            toast({
                              title: "Sistema Testado!",
                              description: response.message || "Sistema funcionando normalmente",
                              variant: "default",
                            });
                          } else {
                            toast({
                              title: "Problema no Sistema",
                              description: response.message || response.suggestion || "Sistema não está funcionando corretamente",
                              variant: "destructive",
                            });
                          }
                        } catch (error: any) {
                          console.error('Erro no teste:', error);
                          let errorMessage = "Falha ao testar o sistema";
                          
                          if (error.message?.includes('Sistema não configurado')) {
                            errorMessage = "Sistema ainda não foi configurado";
                          } else if (error.message?.includes('No prizes') || error.message?.includes('prêmios')) {
                            errorMessage = "Não há prêmios ativos cadastrados. Configure prêmios primeiro!";
                          }
                          
                          toast({
                            title: "Erro no Teste",
                            description: errorMessage,
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Dice6 className="w-4 h-4 mr-2" />
                      Testar Sistema
                    </Button>
                    <Button 
                      className="w-full"
                      onClick={async () => {
                        try {
                          // Coletar valores dos inputs
                          const isAutomatic = operationModeRef.current?.getAttribute('data-state') === 'checked';
                          const productsPerDay = parseInt(productsPerDayRef.current?.value || '5');
                          const winChance = parseInt(winChanceRef.current?.value || '25');
                          
                          // Validações básicas
                          if (productsPerDay < 1 || productsPerDay > 10) {
                            toast({
                              title: "Erro de Validação",
                              description: "Produtos por dia deve ser entre 1 e 10",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          if (winChance < 1 || winChance > 100) {
                            toast({
                              title: "Erro de Validação",
                              description: "Chance de ganhar deve ser entre 1% e 100%",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          console.log('🎯 Salvando configurações:', {
                            mode: isAutomatic ? 'automatic' : 'manual',
                            productsPerDay,
                            winChance
                          });
                          
                          // Enviar para API
                          const res = await apiRequest('PUT', '/api/admin/scratch-config', {
                            mode: isAutomatic ? 'automatic' : 'manual',
                            productsPerDay,
                            winChance,
                            isEnabled: true
                          });
                          const response = await res.json();
                          
                          toast({
                            title: "Configurações Salvas!",
                            description: `Sistema configurado: ${productsPerDay} produtos/dia, ${winChance}% chance de ganhar`,
                            variant: "default",
                          });
                          
                          console.log('✅ Configurações salvas:', response);
                        } catch (error: any) {
                          console.error('❌ Erro ao salvar configurações:', error);
                          
                          let errorMessage = "Não foi possível salvar as configurações";
                          if (error.message?.includes('Failed to update config')) {
                            errorMessage = "Erro interno do servidor. Tente novamente.";
                          }
                          
                          toast({
                            title: "Erro ao Salvar",
                            description: errorMessage,
                            variant: "destructive",
                          });
                        }
                      }}
                      data-testid="button-save-config"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Configurações
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Estatísticas Reais */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    Estatísticas Hoje
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{scratchStats?.cardsScratched || 0}</p>
                      <p className="text-sm text-gray-600">Cartas Raspadas</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{scratchStats?.prizesWon || 0}</p>
                      <p className="text-sm text-gray-600">Prêmios Ganhos</p>
                    </div>
                  </div>
                  
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{scratchStats?.successRate?.toFixed(1) || 0}%</p>
                    <p className="text-sm text-gray-600">Taxa de Sucesso</p>
                  </div>
                  
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{scratchStats?.totalCardsToday || 0}</p>
                    <p className="text-sm text-gray-600">Total de Cartas</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gestão de Produtos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-600" />
                  Produtos Selecionados para Raspadinha
                </CardTitle>
                <CardDescription>
                  Produtos que podem aparecer nas rapadinhas diárias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-600">5 produtos selecionados para hoje</p>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm">
                      <Dice6 className="w-4 h-4 mr-2" />
                      Gerar Automático
                    </Button>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Selecionar Produtos
                    </Button>
                  </div>
                </div>
                
                <div className="grid gap-3 max-h-60 overflow-y-auto">
                  {/* Produtos selecionados - Mock */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded"></div>
                      <div>
                        <p className="font-medium">iPhone 15 Pro Max</p>
                        <p className="text-sm text-gray-600">Loja: TechStore PY</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">50% DESC</Badge>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded"></div>
                      <div>
                        <p className="font-medium">Smart TV Samsung 65"</p>
                        <p className="text-sm text-gray-600">Loja: ElectroMax</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">R$ 200 OFF</Badge>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded"></div>
                      <div>
                        <p className="font-medium">Nike Air Max</p>
                        <p className="text-sm text-gray-600">Loja: SportCenter</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">30% DESC</Badge>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gestão Real de Prêmios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-600" />
                  Prêmios Disponíveis
                </CardTitle>
                <CardDescription>
                  Configure os tipos de prêmios que podem ser ganhos
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
                        <DialogTitle>
                          {editingPrize ? 'Editar Prêmio' : 'Criar Novo Prêmio'}
                        </DialogTitle>
                        <DialogDescription>
                          {editingPrize 
                            ? 'Atualize as informações do prêmio.' 
                            : 'Crie um novo prêmio para as raspadinhas diárias.'
                          }
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
                                    <Input placeholder="Ex: Desconto Especial" {...field} data-testid="input-prize-name" />
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
                                  <Select onValueChange={field.onChange} value={field.value} data-testid="select-prize-type">
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="discount">Desconto</SelectItem>
                                      <SelectItem value="cashback">Cashback</SelectItem>
                                      <SelectItem value="product">Produto Específico</SelectItem>
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
                                <FormLabel>Descrição (Opcional)</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Descreva o prêmio..." {...field} data-testid="input-prize-description" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={prizeForm.control}
                              name="discountPercentage"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Desconto (%)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="20" 
                                      type="number" 
                                      {...field} 
                                      data-testid="input-prize-discount-percentage" 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={prizeForm.control}
                              name="discountValue"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Valor Fixo</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="25.00" 
                                      type="number" 
                                      step="0.01" 
                                      {...field} 
                                      data-testid="input-prize-discount-value" 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={prizeForm.control}
                              name="probability"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Probabilidade</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="0.2" 
                                      type="number" 
                                      step="0.01"
                                      max="1"
                                      min="0"
                                      {...field} 
                                      data-testid="input-prize-probability" 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => {
                                setIsCreatePrizeOpen(false);
                                setEditingPrize(null);
                                prizeForm.reset();
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button 
                              type="submit"
                              disabled={createPrizeMutation.isPending || updatePrizeMutation.isPending}
                              data-testid="button-save-prize"
                            >
                              {editingPrize ? 'Atualizar' : 'Criar'} Prêmio
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {/* 🎯 NOVA TABELA DE PRÊMIOS FUNCIONAL */}
                <div className="border rounded-lg">
                  {/* Header da tabela */}
                  <div className="grid grid-cols-7 gap-4 p-3 bg-gray-50 text-sm font-medium text-gray-700 border-b">
                    <div className="col-span-2">Prêmio</div>
                    <div>Tipo</div>
                    <div>Probabilidade</div>
                    <div>Estoque</div>
                    <div>Status</div>
                    <div>Ações</div>
                  </div>
                  
                  {/* Dados dos prêmios */}
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {dailyPrizes.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <Gift className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">Nenhum prêmio cadastrado</p>
                        <p className="text-sm">Clique em "Novo Prêmio" para começar</p>
                      </div>
                    ) : (
                      dailyPrizes.map((prize) => {
                        const stockLeft = parseInt(prize.maxDailyWins || '0') - parseInt(prize.totalWinsToday || '0');
                        const stockPercentage = stockLeft > 0 ? (stockLeft / parseInt(prize.maxDailyWins || '1')) * 100 : 0;
                        
                        return (
                          <div key={prize.id} className="grid grid-cols-7 gap-4 p-4 hover:bg-gray-50">
                            {/* Coluna 1-2: Info do Prêmio */}
                            <div className="col-span-2">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                  {prize.prizeType === 'product' ? (
                                    <Package className="w-8 h-8 p-1.5 bg-blue-100 text-blue-600 rounded-lg" />
                                  ) : prize.prizeType === 'discount' ? (
                                    <Percent className="w-8 h-8 p-1.5 bg-green-100 text-green-600 rounded-lg" />
                                  ) : (
                                    <DollarSign className="w-8 h-8 p-1.5 bg-purple-100 text-purple-600 rounded-lg" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-medium text-gray-900 truncate">{prize.name}</h4>
                                  <p className="text-sm text-gray-600 truncate">{prize.description}</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Coluna 3: Tipo */}
                            <div className="flex items-center">
                              <Badge variant="outline">
                                {prize.prizeType === 'product' ? 'PRODUTO' :
                                 prize.prizeType === 'discount' ? `${prize.discountPercentage}% OFF` :
                                 `R$ ${prize.discountValue}`}
                              </Badge>
                            </div>
                            
                            {/* Coluna 4: Probabilidade */}
                            <div className="flex items-center">
                              <div className="text-center">
                                <p className="font-medium">{(parseFloat(prize.probability) * 100).toFixed(1)}%</p>
                              </div>
                            </div>
                            
                            {/* Coluna 5: Estoque */}
                            <div className="flex items-center">
                              <div className="text-center">
                                <p className="font-medium">{stockLeft}/{prize.maxDailyWins}</p>
                              </div>
                            </div>
                            
                            {/* Coluna 6: Status */}
                            <div className="flex items-center">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  prize.isActive && stockLeft > 0 ? 'bg-green-500' :
                                  prize.isActive && stockLeft === 0 ? 'bg-yellow-500' : 'bg-red-500'
                                }`} />
                                <span className="text-sm">
                                  {prize.isActive ? (stockLeft > 0 ? 'Ativo' : 'Esgotado') : 'Inativo'}
                                </span>
                              </div>
                            </div>
                            
                            {/* Coluna 7: Ações */}
                            <div className="flex items-center gap-1">
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
                        );
                      })
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Algoritmo Inteligente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dice6 className="w-5 h-5 text-indigo-600" />
                  Algoritmo Inteligente
                </CardTitle>
                <CardDescription>
                  Sistema automático de seleção de produtos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">30%</p>
                    <p className="text-xs text-gray-600">Popularidade</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-600">20%</p>
                    <p className="text-xs text-gray-600">Análise de Preço</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-lg font-bold text-yellow-600">20%</p>
                    <p className="text-xs text-gray-600">Margem Loja</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-lg font-bold text-purple-600">30%</p>
                    <p className="text-xs text-gray-600">Novidade + Cat.</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    Gerar Sugestões
                  </Button>
                  <Button className="flex-1">
                    Aplicar Automático
                  </Button>
                </div>
              </CardContent>
            </Card>
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
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Estatísticas do Sistema</h3>
              <p className="text-gray-500">Em desenvolvimento...</p>
            </div>
          </TabsContent>

          {/* ABA DE SISTEMA */}
          <TabsContent value="system" className="space-y-6">
            <MaintenanceControls />
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