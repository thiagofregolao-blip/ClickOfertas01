import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Wifi, 
  Settings, 
  DollarSign, 
  BarChart3, 
  Users, 
  Clock, 
  Shield, 
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Router,
  Eye,
  EyeOff,
  Save,
  Calendar,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2
} from "lucide-react";
import AdminLayout from "@/components/admin-layout";
import type { WifiSettings, WifiPayment, WifiAnalytics, InsertWifiSettings, WifiPlan, InsertWifiPlan } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

type PlanType = 'daily' | 'monthly';

export default function AdminWiFi() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'settings' | 'payments' | 'analytics' | 'commissions'>('settings');
  const [showPassword, setShowPassword] = useState(false);

  // Verificar se é super admin
  if (!user?.isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
            <p className="text-gray-600">Você precisa ser um Super Admin para acessar esta seção.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Buscar configurações
  const { data: settings, isLoading: settingsLoading } = useQuery<WifiSettings>({
    queryKey: ['/api/wifi-settings'],
    queryFn: async () => {
      const response = await fetch('/api/wifi-settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return await response.json();
    }
  });

  // Buscar pagamentos
  const { data: payments, isLoading: paymentsLoading } = useQuery<WifiPayment[]>({
    queryKey: ['/api/wifi-payments'],
    queryFn: async () => {
      const response = await fetch('/api/wifi-payments');
      if (!response.ok) throw new Error('Failed to fetch payments');
      return await response.json();
    }
  });

  // Buscar analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery<WifiAnalytics[]>({
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

  // Mutation para salvar configurações
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<InsertWifiSettings>) => {
      return await apiRequest('/api/wifi-settings', {
        method: 'PUT',
        body: data
      });
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
    const data: Partial<InsertWifiSettings> = {
      mikrotikHost: formData.get('mikrotikHost') as string,
      mikrotikUsername: formData.get('mikrotikUsername') as string,
      mikrotikPassword: formData.get('mikrotikPassword') as string,
      hotspotProfile: formData.get('hotspotProfile') as string,
      sessionTimeout: formData.get('sessionTimeout') as string,
      dataLimit: formData.get('dataLimit') as string,
      speedLimit: formData.get('speedLimit') as string,
      price: parseFloat(formData.get('price') as string).toString(),
      commissionPercentage: parseFloat(formData.get('commissionPercentage') as string).toString(),
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
    <AdminLayout>
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

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
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
                    <Button size="sm" onClick={() => {
                      const name = prompt("Nome do plano (ex: '24 horas', '48 horas'):");
                      if (!name) return;
                      const durationHours = Number(prompt("Duração em horas (ex: 24, 48, 168):"));
                      if (!durationHours || durationHours <= 0) return;
                      const price = Number(prompt("Preço em R$ (ex: 5.00, 10.00):"));
                      if (!price || price <= 0) return;
                      const description = prompt("Descrição (opcional):") || "";
                      
                      const sessionTimeout = `${durationHours}:00:00`;
                      
                      apiRequest('/api/wifi-plans', {
                        method: 'POST',
                        body: { name, durationHours, price: price.toString(), description, sessionTimeout, isActive: true, displayOrder: 0 }
                      }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ['/api/wifi-plans'] });
                        toast({ title: "Plano criado com sucesso!" });
                      }).catch(err => {
                        toast({ title: "Erro ao criar plano", description: err.message, variant: "destructive" });
                      });
                    }}>
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
                              <Button size="sm" variant="ghost" onClick={() => {
                                apiRequest(`/api/wifi-plans/${plan.id}/toggle`, { method: 'PATCH' })
                                  .then(() => {
                                    queryClient.invalidateQueries({ queryKey: ['/api/wifi-plans'] });
                                    toast({ title: plan.isActive ? "Plano desativado" : "Plano ativado" });
                                  });
                              }}>
                                {plan.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => {
                                if (confirm(`Deseja deletar o plano "${plan.name}"?`)) {
                                  apiRequest(`/api/wifi-plans/${plan.id}`, { method: 'DELETE' })
                                    .then(() => {
                                      queryClient.invalidateQueries({ queryKey: ['/api/wifi-plans'] });
                                      toast({ title: "Plano deletado" });
                                    });
                                }
                              }}>
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
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Voucher</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Expira</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments?.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{payment.customerName || 'N/A'}</div>
                                <div className="text-sm text-gray-500">{payment.customerEmail}</div>
                              </div>
                            </TableCell>
                            <TableCell>{getPlanBadge(payment.plan)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>{getStatusBadge(payment.status)}</TableCell>
                            <TableCell>
                              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                {payment.voucherCode || 'N/A'}
                              </code>
                            </TableCell>
                            <TableCell>{formatDate(payment.createdAt)}</TableCell>
                            <TableCell>
                              {payment.voucherExpiresAt ? formatDate(payment.voucherExpiresAt) : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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

            <Card>
              <CardHeader>
                <CardTitle>Analytics Detalhados</CardTitle>
                <CardDescription>
                  Relatório diário de desempenho do sistema Wi-Fi
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Pagamentos</TableHead>
                          <TableHead>Receita</TableHead>
                          <TableHead>Comissões</TableHead>
                          <TableHead>Taxa Sucesso</TableHead>
                          <TableHead>PIX</TableHead>
                          <TableHead>Cartão</TableHead>
                          <TableHead>Vouchers</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analyticsArray.slice().reverse().map((day) => (
                          <TableRow key={day.date}>
                            <TableCell className="font-medium">{day.date}</TableCell>
                            <TableCell>{day.totalPayments}</TableCell>
                            <TableCell>{formatCurrency(parseFloat(day.totalRevenue.toString()))}</TableCell>
                            <TableCell>{formatCurrency(parseFloat(day.totalCommissions.toString()))}</TableCell>
                            <TableCell>
                              {day.totalPayments > 0 ? 
                                `${((day.successfulPayments / day.totalPayments) * 100).toFixed(1)}%` : 
                                '0%'
                              }
                            </TableCell>
                            <TableCell>{day.pixPayments}</TableCell>
                            <TableCell>{day.cardPayments}</TableCell>
                            <TableCell>
                              <span className="text-green-600">{day.activeVouchers}</span>
                              /
                              <span className="text-gray-500">{day.expiredVouchers}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comissões Tab */}
          <TabsContent value="commissions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Comissões de Lojas Parceiras</CardTitle>
                <CardDescription>
                  Gerencie as comissões das lojas parceiras do sistema Wi-Fi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Comissões em Desenvolvimento</h3>
                  <p className="text-gray-500">
                    O sistema de comissões para lojas parceiras será implementado em breve.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </AdminLayout>
  );
}