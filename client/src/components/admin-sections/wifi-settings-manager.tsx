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
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { 
  Wifi, 
  Settings, 
  DollarSign, 
  Router, 
  Clock, 
  Gauge,
  Server,
  Shield,
  Save,
  TestTube
} from "lucide-react";

interface WiFiPlan {
  id: string;
  name: string;
  duration: number; // em horas
  price: number;
  multiplier: number;
  commissionRate: number;
  isActive: boolean;
}

interface MikroTikSettings {
  host: string;
  username: string;
  password: string;
  profile: string;
  timeout: number;
  uploadLimit: number;
  downloadLimit: number;
  isEnabled: boolean;
}

const planSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  duration: z.number().min(1, "Duração deve ser maior que 0"),
  price: z.number().min(0.01, "Preço deve ser maior que 0"),
  multiplier: z.number().min(0.1, "Multiplicador deve ser maior que 0"),
  commissionRate: z.number().min(0).max(100, "Taxa deve estar entre 0 e 100"),
});

const mikrotikSchema = z.object({
  host: z.string().min(1, "Host é obrigatório"),
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
  profile: z.string().min(1, "Perfil é obrigatório"),
  timeout: z.number().min(1, "Timeout deve ser maior que 0"),
  uploadLimit: z.number().min(1, "Limite de upload obrigatório"),
  downloadLimit: z.number().min(1, "Limite de download obrigatório"),
});

type PlanFormData = z.infer<typeof planSchema>;
type MikroTikFormData = z.infer<typeof mikrotikSchema>;

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function WiFiSettingsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'plans' | 'mikrotik'>('plans');
  const [editingPlan, setEditingPlan] = useState<WiFiPlan | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  // Query para buscar planos WiFi
  const { data: wifiPlans = [], isLoading: plansLoading } = useQuery<WiFiPlan[]>({
    queryKey: ['/api/admin/wifi/plans'],
    enabled: !!user?.isSuperAdmin,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Query para buscar configurações MikroTik
  const { data: mikrotikSettings, isLoading: mikrotikLoading } = useQuery<MikroTikSettings>({
    queryKey: ['/api/admin/wifi/mikrotik'],
    enabled: !!user?.isSuperAdmin,
    staleTime: 2 * 60 * 1000,
  });

  // Form para planos
  const planForm = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      duration: 1,
      price: 0,
      multiplier: 1,
      commissionRate: 0,
    },
  });

  // Form para MikroTik
  const mikrotikForm = useForm<MikroTikFormData>({
    resolver: zodResolver(mikrotikSchema),
    defaultValues: {
      host: mikrotikSettings?.host || "",
      username: mikrotikSettings?.username || "",
      password: mikrotikSettings?.password || "",
      profile: mikrotikSettings?.profile || "hotspot",
      timeout: mikrotikSettings?.timeout || 24,
      uploadLimit: mikrotikSettings?.uploadLimit || 1024,
      downloadLimit: mikrotikSettings?.downloadLimit || 1024,
    },
  });

  // Mutation para criar/atualizar plano
  const savePlanMutation = useMutation({
    mutationFn: async (data: PlanFormData & { id?: string }) => {
      if (data.id) {
        return await apiRequest('PUT', `/api/admin/wifi/plans/${data.id}`, data);
      } else {
        return await apiRequest('POST', '/api/admin/wifi/plans', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wifi/plans'] });
      setIsCreatingPlan(false);
      setEditingPlan(null);
      planForm.reset();
      toast({
        title: "Plano salvo",
        description: "Plano WiFi salvo com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao salvar plano WiFi. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar plano
  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      return await apiRequest('DELETE', `/api/admin/wifi/plans/${planId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wifi/plans'] });
      toast({
        title: "Plano removido",
        description: "Plano WiFi removido com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao remover plano WiFi.",
        variant: "destructive",
      });
    },
  });

  // Mutation para alternar status ativo do plano
  const togglePlanStatusMutation = useMutation({
    mutationFn: async ({ planId, isActive }: { planId: string; isActive: boolean }) => {
      return await apiRequest('PUT', `/api/admin/wifi/plans/${planId}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wifi/plans'] });
      toast({
        title: "Status atualizado",
        description: "Status do plano WiFi atualizado com sucesso!",
      });
    },
  });

  // Mutation para salvar configurações MikroTik
  const saveMikroTikMutation = useMutation({
    mutationFn: async (data: MikroTikFormData & { isEnabled: boolean }) => {
      return await apiRequest('PUT', '/api/admin/wifi/mikrotik', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wifi/mikrotik'] });
      toast({
        title: "Configurações salvas",
        description: "Configurações do MikroTik atualizadas com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações do MikroTik.",
        variant: "destructive",
      });
    },
  });

  // Mutation para testar conexão MikroTik
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/wifi/mikrotik/test');
    },
    onSuccess: (data) => {
      toast({
        title: "Conexão bem-sucedida",
        description: "Conexão com MikroTik testada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Falha na conexão",
        description: "Não foi possível conectar com o MikroTik. Verifique as configurações.",
        variant: "destructive",
      });
    },
  });

  const handleEditPlan = (plan: WiFiPlan) => {
    setEditingPlan(plan);
    planForm.reset({
      name: plan.name,
      duration: plan.duration,
      price: plan.price,
      multiplier: plan.multiplier,
      commissionRate: plan.commissionRate,
    });
  };

  const onSubmitPlan = (data: PlanFormData) => {
    savePlanMutation.mutate({
      ...data,
      id: editingPlan?.id,
    });
  };

  const onSubmitMikroTik = (data: MikroTikFormData) => {
    saveMikroTikMutation.mutate({
      ...data,
      isEnabled: mikrotikSettings?.isEnabled || false,
    });
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) {
      return `${hours}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
  };

  const formatSpeed = (kbps: number) => {
    if (kbps >= 1024) {
      return `${(kbps / 1024).toFixed(1)} Mbps`;
    }
    return `${kbps} Kbps`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wifi className="w-7 h-7 text-blue-600" />
          Configurações WiFi
        </h2>
        <p className="text-gray-500 mt-1">
          Configure planos de pagamento WiFi e integração com MikroTik
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === 'plans' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('plans')}
          className="flex-1"
          data-testid="tab-wifi-plans"
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Planos WiFi
        </Button>
        <Button
          variant={activeTab === 'mikrotik' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('mikrotik')}
          className="flex-1"
          data-testid="tab-mikrotik-config"
        >
          <Router className="w-4 h-4 mr-2" />
          MikroTik
        </Button>
      </div>

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {/* Create/Edit Plan Form */}
          {(isCreatingPlan || editingPlan) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingPlan ? 'Editar' : 'Criar'} Plano WiFi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...planForm}>
                  <form onSubmit={planForm.handleSubmit(onSubmitPlan)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={planForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Plano</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: WiFi 1 Hora" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={planForm.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duração (horas)</FormLabel>
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        control={planForm.control}
                        name="multiplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Multiplicador</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                min="0.1"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Multiplicador de preço para cálculos
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={planForm.control}
                        name="commissionRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Taxa de Comissão (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                min="0"
                                max="100"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
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
                          setIsCreatingPlan(false);
                          setEditingPlan(null);
                          planForm.reset();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={savePlanMutation.isPending}
                        data-testid="button-save-plan"
                      >
                        {savePlanMutation.isPending ? 'Salvando...' : 'Salvar Plano'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Add Plan Button */}
          {!isCreatingPlan && !editingPlan && (
            <div className="flex justify-end">
              <Button onClick={() => setIsCreatingPlan(true)} data-testid="button-add-plan">
                <DollarSign className="w-4 h-4 mr-2" />
                Adicionar Plano
              </Button>
            </div>
          )}

          {/* Plans List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Planos WiFi ({wifiPlans.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {plansLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2 text-sm">Carregando planos...</p>
                </div>
              ) : wifiPlans.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Nenhum plano configurado</h3>
                  <p className="text-sm">Crie o primeiro plano WiFi para começar.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {wifiPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      data-testid={`plan-item-${plan.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {plan.name}
                          </h3>
                          <Badge variant={plan.isActive ? "default" : "secondary"}>
                            {plan.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDuration(plan.duration)}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            R$ {plan.price.toFixed(2)}
                          </div>
                          <div>
                            Multiplicador: {plan.multiplier}x
                          </div>
                          <div>
                            Comissão: {plan.commissionRate}%
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={plan.isActive}
                          onCheckedChange={(checked) =>
                            togglePlanStatusMutation.mutate({
                              planId: plan.id,
                              isActive: checked,
                            })
                          }
                          disabled={togglePlanStatusMutation.isPending}
                          data-testid={`switch-plan-status-${plan.id}`}
                        />

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPlan(plan)}
                          data-testid={`button-edit-plan-${plan.id}`}
                        >
                          Editar
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deletePlanMutation.mutate(plan.id)}
                          disabled={deletePlanMutation.isPending}
                          data-testid={`button-delete-plan-${plan.id}`}
                        >
                          Deletar
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

      {/* MikroTik Tab */}
      {activeTab === 'mikrotik' && (
        <div className="space-y-6">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Status da Conexão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${mikrotikSettings?.isEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium">
                    {mikrotikSettings?.isEnabled ? 'MikroTik Conectado' : 'MikroTik Desconectado'}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnectionMutation.mutate()}
                  disabled={testConnectionMutation.isPending}
                  data-testid="button-test-connection"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  {testConnectionMutation.isPending ? 'Testando...' : 'Testar Conexão'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* MikroTik Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Router className="w-5 h-5" />
                Configurações do MikroTik
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mikrotikLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2 text-sm">Carregando configurações...</p>
                </div>
              ) : (
                <Form {...mikrotikForm}>
                  <form onSubmit={mikrotikForm.handleSubmit(onSubmitMikroTik)} className="space-y-6">
                    {/* Connection Settings */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        Configurações de Conexão
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={mikrotikForm.control}
                          name="host"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Host/IP</FormLabel>
                              <FormControl>
                                <Input placeholder="192.168.1.1" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={mikrotikForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Usuário</FormLabel>
                              <FormControl>
                                <Input placeholder="admin" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={mikrotikForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={mikrotikForm.control}
                          name="profile"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Perfil</FormLabel>
                              <FormControl>
                                <Input placeholder="hotspot" {...field} />
                              </FormControl>
                              <FormDescription>
                                Nome do perfil no MikroTik
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Limits Settings */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-green-600" />
                        Limites e Timeouts
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={mikrotikForm.control}
                          name="timeout"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Timeout (horas)</FormLabel>
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
                        
                        <FormField
                          control={mikrotikForm.control}
                          name="uploadLimit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Limite Upload (Kbps)</FormLabel>
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
                        
                        <FormField
                          control={mikrotikForm.control}
                          name="downloadLimit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Limite Download (Kbps)</FormLabel>
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
                      
                      {/* Speed Display */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Upload</p>
                          <p className="text-lg font-medium text-gray-900">
                            {formatSpeed(mikrotikForm.watch('uploadLimit') || 0)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Download</p>
                          <p className="text-lg font-medium text-gray-900">
                            {formatSpeed(mikrotikForm.watch('downloadLimit') || 0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={saveMikroTikMutation.isPending}
                        data-testid="button-save-mikrotik"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {saveMikroTikMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>

          {/* Help Section */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800 text-lg">Configuração do MikroTik</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700 text-sm space-y-2">
              <p>• <strong>Host/IP:</strong> Endereço IP do seu roteador MikroTik</p>
              <p>• <strong>Usuário/Senha:</strong> Credenciais de acesso ao MikroTik</p>
              <p>• <strong>Perfil:</strong> Nome do perfil hotspot configurado no MikroTik</p>
              <p>• <strong>Timeout:</strong> Tempo limite da sessão em horas</p>
              <p>• <strong>Limites:</strong> Velocidade máxima de upload/download em Kbps</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}