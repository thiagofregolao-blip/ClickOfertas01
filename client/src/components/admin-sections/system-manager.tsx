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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Settings, 
  AlertTriangle, 
  Save, 
  RefreshCw, 
  Database, 
  FileText, 
  Trash2,
  Download,
  Upload,
  Server,
  Shield,
  Activity,
  Clock,
  HardDrive,
  Globe,
  Mail
} from "lucide-react";

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  adminEmail: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  sessionTimeout: number;
  uploadMaxSize: number;
  cacheTimeout: number;
  backupFrequency: string;
  logLevel: string;
}

interface SystemStats {
  uptime: number;
  totalUsers: number;
  totalStores: number;
  totalProducts: number;
  dbSize: string;
  cacheSize: string;
  lastBackup?: string;
  diskSpace: {
    used: string;
    total: string;
    percentage: number;
  };
}

interface SystemLog {
  id: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  timestamp: string;
  userId?: string;
  ip?: string;
}

const systemSettingsSchema = z.object({
  siteName: z.string().min(1, "Nome do site é obrigatório"),
  siteDescription: z.string().min(1, "Descrição é obrigatória"),
  adminEmail: z.string().email("Email inválido"),
  maintenanceMessage: z.string().min(1, "Mensagem de manutenção é obrigatória"),
  sessionTimeout: z.number().min(1, "Timeout deve ser maior que 0"),
  uploadMaxSize: z.number().min(1, "Tamanho máximo deve ser maior que 0"),
  cacheTimeout: z.number().min(1, "Cache timeout deve ser maior que 0"),
  backupFrequency: z.enum(['daily', 'weekly', 'monthly']),
  logLevel: z.enum(['debug', 'info', 'warning', 'error']),
});

type SystemSettingsFormData = z.infer<typeof systemSettingsSchema>;

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function SystemManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'settings' | 'stats' | 'logs' | 'maintenance'>('settings');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Query para configurações do sistema
  const { data: systemSettings, isLoading: settingsLoading } = useQuery<SystemSettings>({
    queryKey: ['/api/admin/system/settings'],
    enabled: !!user?.isSuperAdmin,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Query para estatísticas do sistema
  const { data: systemStats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ['/api/admin/system/stats'],
    enabled: !!user?.isSuperAdmin,
    staleTime: 60 * 1000,
  });

  // Query para logs do sistema
  const { data: systemLogs = [], isLoading: logsLoading } = useQuery<SystemLog[]>({
    queryKey: ['/api/admin/system/logs'],
    enabled: !!user?.isSuperAdmin && activeTab === 'logs',
    staleTime: 30 * 1000,
  });

  // Form para configurações
  const settingsForm = useForm<SystemSettingsFormData>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: {
      siteName: systemSettings?.siteName || "",
      siteDescription: systemSettings?.siteDescription || "",
      adminEmail: systemSettings?.adminEmail || "",
      maintenanceMessage: systemSettings?.maintenanceMessage || "",
      sessionTimeout: systemSettings?.sessionTimeout || 24,
      uploadMaxSize: systemSettings?.uploadMaxSize || 10,
      cacheTimeout: systemSettings?.cacheTimeout || 3600,
      backupFrequency: systemSettings?.backupFrequency || "daily",
      logLevel: systemSettings?.logLevel || "info",
    },
  });

  // Mutation para salvar configurações
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: SystemSettingsFormData & Partial<SystemSettings>) => {
      return await apiRequest('PUT', '/api/admin/system/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system/settings'] });
      toast({
        title: "Configurações salvas",
        description: "Configurações do sistema atualizadas com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações do sistema.",
        variant: "destructive",
      });
    },
  });

  // Mutation para alternar modo manutenção
  const toggleMaintenanceMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await apiRequest('PUT', '/api/admin/system/maintenance', { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system/settings'] });
      toast({
        title: "Modo manutenção atualizado",
        description: systemSettings?.maintenanceMode 
          ? "Sistema saiu do modo manutenção" 
          : "Sistema entrou em modo manutenção",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao alterar modo manutenção.",
        variant: "destructive",
      });
    },
  });

  // Mutation para limpar cache
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/system/cache/clear');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system/stats'] });
      toast({
        title: "Cache limpo",
        description: "Cache do sistema foi limpo com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao limpar cache do sistema.",
        variant: "destructive",
      });
    },
  });

  // Mutation para fazer backup
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/system/backup');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system/stats'] });
      setIsBackupModalOpen(false);
      toast({
        title: "Backup criado",
        description: "Backup do sistema criado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar backup do sistema.",
        variant: "destructive",
      });
    },
  });

  const onSubmitSettings = (data: SystemSettingsFormData) => {
    saveSettingsMutation.mutate({
      ...data,
      maintenanceMode: systemSettings?.maintenanceMode || false,
      allowRegistration: systemSettings?.allowRegistration || true,
      requireEmailVerification: systemSettings?.requireEmailVerification || false,
    });
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatFileSize = (bytes: string) => {
    const num = parseInt(bytes);
    if (isNaN(num)) return bytes;
    
    if (num >= 1073741824) {
      return (num / 1073741824).toFixed(2) + ' GB';
    } else if (num >= 1048576) {
      return (num / 1048576).toFixed(2) + ' MB';
    } else if (num >= 1024) {
      return (num / 1024).toFixed(2) + ' KB';
    }
    return num + ' bytes';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'debug': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'info': return <Activity className="w-4 h-4 text-blue-600" />;
      case 'debug': return <FileText className="w-4 h-4 text-gray-600" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-7 h-7 text-gray-600" />
          Sistema
        </h2>
        <p className="text-gray-500 mt-1">
          Configurações gerais, modo manutenção e monitoramento do sistema
        </p>
      </div>

      {/* Maintenance Alert */}
      {systemSettings?.maintenanceMode && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">Sistema em Modo Manutenção</h3>
                <p className="text-sm text-red-700 mt-1">
                  {systemSettings.maintenanceMessage}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleMaintenanceMutation.mutate(false)}
                disabled={toggleMaintenanceMutation.isPending}
                className="ml-auto"
                data-testid="button-disable-maintenance"
              >
                Desativar Manutenção
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('settings')}
          className="flex-1"
          data-testid="tab-system-settings"
        >
          <Settings className="w-4 h-4 mr-2" />
          Configurações
        </Button>
        <Button
          variant={activeTab === 'stats' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('stats')}
          className="flex-1"
          data-testid="tab-system-stats"
        >
          <Activity className="w-4 h-4 mr-2" />
          Estatísticas
        </Button>
        <Button
          variant={activeTab === 'logs' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('logs')}
          className="flex-1"
          data-testid="tab-system-logs"
        >
          <FileText className="w-4 h-4 mr-2" />
          Logs
        </Button>
        <Button
          variant={activeTab === 'maintenance' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('maintenance')}
          className="flex-1"
          data-testid="tab-system-maintenance"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Manutenção
        </Button>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            {settingsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mx-auto"></div>
                <p className="text-gray-500 mt-2 text-sm">Carregando configurações...</p>
              </div>
            ) : (
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(onSubmitSettings)} className="space-y-6">
                  {/* Site Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-600" />
                      Configurações do Site
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={settingsForm.control}
                        name="siteName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Site</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={settingsForm.control}
                        name="adminEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email do Administrador</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={settingsForm.control}
                      name="siteDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição do Site</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* System Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <Server className="w-4 h-4 text-green-600" />
                      Configurações do Sistema
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={settingsForm.control}
                        name="sessionTimeout"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timeout de Sessão (horas)</FormLabel>
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
                        control={settingsForm.control}
                        name="uploadMaxSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tamanho Máximo Upload (MB)</FormLabel>
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
                        control={settingsForm.control}
                        name="cacheTimeout"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cache Timeout (segundos)</FormLabel>
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={settingsForm.control}
                        name="backupFrequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Frequência de Backup</FormLabel>
                            <FormControl>
                              <select 
                                className="w-full p-2 border rounded-md"
                                {...field}
                              >
                                <option value="daily">Diário</option>
                                <option value="weekly">Semanal</option>
                                <option value="monthly">Mensal</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={settingsForm.control}
                        name="logLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nível de Log</FormLabel>
                            <FormControl>
                              <select 
                                className="w-full p-2 border rounded-md"
                                {...field}
                              >
                                <option value="debug">Debug</option>
                                <option value="info">Info</option>
                                <option value="warning">Warning</option>
                                <option value="error">Error</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Maintenance Message */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      Configurações de Manutenção
                    </h4>
                    
                    <FormField
                      control={settingsForm.control}
                      name="maintenanceMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mensagem de Manutenção</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="O sistema está em manutenção. Retornaremos em breve."
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Esta mensagem será exibida quando o sistema estiver em modo manutenção
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={saveSettingsMutation.isPending}
                      data-testid="button-save-settings"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saveSettingsMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Uptime</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatUptime(systemStats?.uptime || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Database className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">DB Size</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatFileSize(systemStats?.dbSize || "0")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <RefreshCw className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Cache Size</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatFileSize(systemStats?.cacheSize || "0")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <HardDrive className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Disk Usage</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {systemStats?.diskSpace?.percentage || 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Dados do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-600">Total de Usuários</p>
                  <p className="text-3xl font-bold text-blue-900">{systemStats?.totalUsers || 0}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-600">Total de Lojas</p>
                  <p className="text-3xl font-bold text-green-900">{systemStats?.totalStores || 0}</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-purple-600">Total de Produtos</p>
                  <p className="text-3xl font-bold text-purple-900">{systemStats?.totalProducts || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disk Space */}
          {systemStats?.diskSpace && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  Espaço em Disco
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Usado: {systemStats.diskSpace.used}</span>
                    <span>Total: {systemStats.diskSpace.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        systemStats.diskSpace.percentage > 80 ? 'bg-red-600' :
                        systemStats.diskSpace.percentage > 60 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${systemStats.diskSpace.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    {systemStats.diskSpace.percentage.toFixed(1)}% utilizado
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Logs do Sistema (Últimos 100)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mx-auto"></div>
                <p className="text-gray-500 mt-2 text-sm">Carregando logs...</p>
              </div>
            ) : systemLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Nenhum log disponível</h3>
                <p className="text-sm">Os logs do sistema aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {systemLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg text-sm"
                    data-testid={`log-item-${log.id}`}
                  >
                    <div className="flex-shrink-0">
                      {getLogLevelIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={getLogLevelColor(log.level)}>
                          {log.level.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDate(log.timestamp)}
                        </span>
                        {log.userId && (
                          <span className="text-xs text-gray-500">
                            User: {log.userId}
                          </span>
                        )}
                        {log.ip && (
                          <span className="text-xs text-gray-500">
                            IP: {log.ip}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-900">{log.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          {/* Maintenance Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Modo Manutenção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Ativar Modo Manutenção</h4>
                  <p className="text-sm text-gray-600">
                    Bloqueia acesso ao sistema para usuários normais
                  </p>
                </div>
                <Switch
                  checked={systemSettings?.maintenanceMode || false}
                  onCheckedChange={(checked) => toggleMaintenanceMutation.mutate(checked)}
                  disabled={toggleMaintenanceMutation.isPending}
                  data-testid="switch-maintenance-mode"
                />
              </div>
            </CardContent>
          </Card>

          {/* System Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Ações do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Limpar Cache</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Remove todos os dados em cache para forçar atualização
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => clearCacheMutation.mutate()}
                    disabled={clearCacheMutation.isPending}
                    data-testid="button-clear-cache"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {clearCacheMutation.isPending ? 'Limpando...' : 'Limpar Cache'}
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Backup do Sistema</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Cria um backup completo do banco de dados
                  </p>
                  <Dialog open={isBackupModalOpen} onOpenChange={setIsBackupModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" data-testid="button-backup-system">
                        <Database className="w-4 h-4 mr-2" />
                        Criar Backup
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirmar Backup</DialogTitle>
                        <DialogDescription>
                          Tem certeza que deseja criar um backup completo do sistema? 
                          Esta operação pode levar alguns minutos.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsBackupModalOpen(false)}>
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => createBackupMutation.mutate()}
                          disabled={createBackupMutation.isPending}
                          data-testid="button-confirm-backup"
                        >
                          {createBackupMutation.isPending ? 'Criando...' : 'Criar Backup'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              {systemStats?.lastBackup && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Último backup:</strong> {formatDate(systemStats.lastBackup)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Status do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                  <p className="font-medium text-green-800">Database</p>
                  <p className="text-sm text-green-600">Online</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                  <p className="font-medium text-green-800">API</p>
                  <p className="text-sm text-green-600">Funcionando</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                  <p className="font-medium text-green-800">Cache</p>
                  <p className="text-sm text-green-600">Ativo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}