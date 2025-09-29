import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { 
  Gift, 
  Plus, 
  Trash2, 
  Settings, 
  DollarSign, 
  Target, 
  Calendar,
  Trophy,
  Users,
  TrendingUp,
  Edit,
  Play,
  Pause
} from "lucide-react";

interface Promotion {
  id: string;
  title: string;
  description: string;
  type: 'scratch_card' | 'discount' | 'gift';
  value: number;
  minPurchase?: number;
  maxRedemptions?: number;
  currentRedemptions: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

interface PromotionBudget {
  dailyBudget: number;
  monthlyBudget: number;
  dailySpent: number;
  monthlySpent: number;
  lastUpdated: string;
}

const promotionSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  type: z.enum(['scratch_card', 'discount', 'gift']),
  value: z.number().min(0.01, "Valor deve ser maior que 0"),
  minPurchase: z.number().min(0).optional(),
  maxRedemptions: z.number().min(1).optional(),
  startDate: z.string(),
  endDate: z.string(),
});

type PromotionFormData = z.infer<typeof promotionSchema>;

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function PromotionsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'promotions' | 'budget' | 'help'>('dashboard');
  const [isCreatePromotionOpen, setIsCreatePromotionOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

  // Query para buscar promoções
  const { data: promotions = [], isLoading: promotionsLoading } = useQuery<Promotion[]>({
    queryKey: ['/api/admin/promotions'],
    enabled: !!user?.isSuperAdmin,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Query para buscar orçamento
  const { data: budget, isLoading: budgetLoading } = useQuery<PromotionBudget>({
    queryKey: ['/api/admin/promotions/budget'],
    enabled: !!user?.isSuperAdmin,
    staleTime: 60 * 1000,
  });

  // Form para promoções
  const promotionForm = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "scratch_card",
      value: 0,
      minPurchase: 0,
      maxRedemptions: 100,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  });

  // Mutation para criar promoção
  const createPromotionMutation = useMutation({
    mutationFn: async (data: PromotionFormData) => {
      return await apiRequest('POST', '/api/admin/promotions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions'] });
      setIsCreatePromotionOpen(false);
      promotionForm.reset();
      toast({
        title: "Promoção criada",
        description: "Promoção criada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar promoção. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar promoção
  const updatePromotionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PromotionFormData> }) => {
      return await apiRequest('PUT', `/api/admin/promotions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions'] });
      setEditingPromotion(null);
      promotionForm.reset();
      toast({
        title: "Promoção atualizada",
        description: "Promoção atualizada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar promoção. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar promoção
  const deletePromotionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/promotions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions'] });
      toast({
        title: "Promoção removida",
        description: "Promoção removida com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao remover promoção. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para alternar status ativo
  const togglePromotionStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest('PUT', `/api/admin/promotions/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions'] });
      toast({
        title: "Status atualizado",
        description: "Status da promoção atualizado com sucesso!",
      });
    },
  });

  const handleEditPromotion = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    promotionForm.reset({
      title: promotion.title,
      description: promotion.description,
      type: promotion.type,
      value: promotion.value,
      minPurchase: promotion.minPurchase || 0,
      maxRedemptions: promotion.maxRedemptions || 100,
      startDate: promotion.startDate.split('T')[0],
      endDate: promotion.endDate.split('T')[0],
    });
  };

  const onSubmitPromotion = (data: PromotionFormData) => {
    if (editingPromotion) {
      updatePromotionMutation.mutate({ id: editingPromotion.id, data });
    } else {
      createPromotionMutation.mutate(data);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getPromotionTypeLabel = (type: string) => {
    switch (type) {
      case 'scratch_card': return 'Raspadinha';
      case 'discount': return 'Desconto';
      case 'gift': return 'Brinde';
      default: return type;
    }
  };

  const getPromotionTypeColor = (type: string) => {
    switch (type) {
      case 'scratch_card': return 'bg-yellow-100 text-yellow-800';
      case 'discount': return 'bg-blue-100 text-blue-800';
      case 'gift': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const activePromotions = promotions.filter(p => p.isActive);
  const totalRedemptions = promotions.reduce((sum, p) => sum + p.currentRedemptions, 0);
  const budgetUsagePercent = budget ? Math.round((budget.monthlySpent / budget.monthlyBudget) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Gift className="w-7 h-7 text-purple-600" />
          Sistema de Promoções
        </h2>
        <p className="text-gray-500 mt-1">
          Gerencie promoções, raspadinhas e sistema de prêmios
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('dashboard')}
          className="flex-1"
          data-testid="tab-promotions-dashboard"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Dashboard
        </Button>
        <Button
          variant={activeTab === 'promotions' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('promotions')}
          className="flex-1"
          data-testid="tab-promotions-manage"
        >
          <Gift className="w-4 h-4 mr-2" />
          Promoções
        </Button>
        <Button
          variant={activeTab === 'budget' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('budget')}
          className="flex-1"
          data-testid="tab-promotions-budget"
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Orçamento
        </Button>
        <Button
          variant={activeTab === 'help' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('help')}
          className="flex-1"
          data-testid="tab-promotions-help"
        >
          <Settings className="w-4 h-4 mr-2" />
          Ajuda
        </Button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Gift className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total de Promoções</p>
                    <p className="text-2xl font-bold text-gray-900">{promotions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Play className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Promoções Ativas</p>
                    <p className="text-2xl font-bold text-gray-900">{activePromotions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Trophy className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total de Resgates</p>
                    <p className="text-2xl font-bold text-gray-900">{totalRedemptions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Orçamento Usado</p>
                    <p className="text-2xl font-bold text-gray-900">{budgetUsagePercent}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Dashboard */}
          {budget && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Dashboard em Tempo Real
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Orçamento Diário</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Gasto</span>
                        <span>R$ {budget.dailySpent.toFixed(2)} / R$ {budget.dailyBudget.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min((budget.dailySpent / budget.dailyBudget) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Orçamento Mensal</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Gasto</span>
                        <span>R$ {budget.monthlySpent.toFixed(2)} / R$ {budget.monthlyBudget.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${Math.min((budget.monthlySpent / budget.monthlyBudget) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Promotions Tab */}
      {activeTab === 'promotions' && (
        <div className="space-y-6">
          {/* Add Promotion Button */}
          <div className="flex justify-end">
            <Dialog open={isCreatePromotionOpen || !!editingPromotion} onOpenChange={(open) => {
              if (!open) {
                setIsCreatePromotionOpen(false);
                setEditingPromotion(null);
                promotionForm.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsCreatePromotionOpen(true)} data-testid="button-add-promotion">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Promoção
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingPromotion ? 'Editar' : 'Criar'} Promoção
                  </DialogTitle>
                  <DialogDescription>
                    {editingPromotion ? 'Edite' : 'Configure'} os detalhes da promoção
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...promotionForm}>
                  <form onSubmit={promotionForm.handleSubmit(onSubmitPromotion)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={promotionForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Título</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome da promoção" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={promotionForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="scratch_card">Raspadinha</SelectItem>
                                <SelectItem value="discount">Desconto</SelectItem>
                                <SelectItem value="gift">Brinde</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={promotionForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Descrição detalhada da promoção" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={promotionForm.control}
                        name="value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor (R$)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={promotionForm.control}
                        name="minPurchase"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Compra Mínima (R$)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={promotionForm.control}
                        name="maxRedemptions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Máx. Resgates</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={promotionForm.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de Início</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={promotionForm.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de Fim</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsCreatePromotionOpen(false);
                          setEditingPromotion(null);
                          promotionForm.reset();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createPromotionMutation.isPending || updatePromotionMutation.isPending}
                        data-testid="button-save-promotion"
                      >
                        {(createPromotionMutation.isPending || updatePromotionMutation.isPending) ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Promotions List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Promoções ({promotions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {promotionsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2 text-sm">Carregando promoções...</p>
                </div>
              ) : promotions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Gift className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma promoção criada</h3>
                  <p className="text-sm">Crie sua primeira promoção para começar.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {promotions.map((promotion) => (
                    <div
                      key={promotion.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      data-testid={`promotion-item-${promotion.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {promotion.title}
                          </h3>
                          <Badge variant={promotion.isActive ? "default" : "secondary"}>
                            {promotion.isActive ? "Ativa" : "Inativa"}
                          </Badge>
                          <Badge className={getPromotionTypeColor(promotion.type)}>
                            {getPromotionTypeLabel(promotion.type)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{promotion.description}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Valor: R$ {promotion.value.toFixed(2)}</span>
                          <span>•</span>
                          <span>Resgates: {promotion.currentRedemptions}/{promotion.maxRedemptions || '∞'}</span>
                          <span>•</span>
                          <span>{formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={promotion.isActive}
                          onCheckedChange={(checked) =>
                            togglePromotionStatusMutation.mutate({
                              id: promotion.id,
                              isActive: checked,
                            })
                          }
                          disabled={togglePromotionStatusMutation.isPending}
                          data-testid={`switch-promotion-status-${promotion.id}`}
                        />

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPromotion(promotion)}
                          data-testid={`button-edit-promotion-${promotion.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deletePromotionMutation.mutate(promotion.id)}
                          disabled={deletePromotionMutation.isPending}
                          data-testid={`button-delete-promotion-${promotion.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budget Tab */}
      {activeTab === 'budget' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Sistema de Orçamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {budgetLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-500 mt-2 text-sm">Carregando orçamento...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-gray-600">
                  Configure e monitore o orçamento para promoções. O sistema controla automaticamente 
                  os gastos diários e mensais.
                </p>
                
                {budget && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Orçamento Diário</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Limite diário:</span>
                          <span className="font-medium">R$ {budget.dailyBudget.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Gasto hoje:</span>
                          <span className="font-medium text-red-600">R$ {budget.dailySpent.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Disponível:</span>
                          <span className="font-medium text-green-600">
                            R$ {(budget.dailyBudget - budget.dailySpent).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Orçamento Mensal</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Limite mensal:</span>
                          <span className="font-medium">R$ {budget.monthlyBudget.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Gasto este mês:</span>
                          <span className="font-medium text-red-600">R$ {budget.monthlySpent.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Disponível:</span>
                          <span className="font-medium text-green-600">
                            R$ {(budget.monthlyBudget - budget.monthlySpent).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Tab */}
      {activeTab === 'help' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Como Funciona o Sistema de Promoções
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Tipos de Promoção</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• <strong>Raspadinha:</strong> Promoção interativa onde o cliente "raspa" para descobrir o prêmio</p>
                <p>• <strong>Desconto:</strong> Desconto percentual ou valor fixo aplicado na compra</p>
                <p>• <strong>Brinde:</strong> Item gratuito dado ao cliente mediante condições específicas</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Sistema de Orçamento</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• <strong>Controle diário:</strong> Limite máximo de gastos por dia</p>
                <p>• <strong>Controle mensal:</strong> Limite máximo de gastos por mês</p>
                <p>• <strong>Monitoramento automático:</strong> Sistema para promoções quando limite é atingido</p>
                <p>• <strong>Relatório em tempo real:</strong> Acompanhe gastos em tempo real</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Dicas Importantes</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Configure datas de início e fim para controlar a duração das promoções</p>
                <p>• Use compra mínima para aumentar o ticket médio</p>
                <p>• Limite máximo de resgates evita gastos excessivos</p>
                <p>• Monitore o orçamento regularmente para ajustar estratégias</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}