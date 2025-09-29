import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Percent, 
  Store, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Users,
  CheckCircle,
  Clock,
  Download,
  Search,
  Plus,
  Eye
} from "lucide-react";

interface PartnerStore {
  id: string;
  name: string;
  ownerName?: string;
  ownerEmail?: string;
  commissionRate: number;
  isActive: boolean;
  totalEarnings: number;
  monthlyEarnings: number;
  transactionCount: number;
  joinedAt: string;
}

interface Commission {
  id: string;
  storeId: string;
  storeName: string;
  transactionId: string;
  amount: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'pending' | 'paid' | 'cancelled';
  customerName?: string;
  planName: string;
  createdAt: string;
  paidAt?: string;
}

interface CommissionStats {
  totalPartners: number;
  activePartners: number;
  totalCommissions: number;
  paidCommissions: number;
  pendingCommissions: number;
  totalEarnings: number;
  pendingEarnings: number;
  monthlyEarnings: number;
}

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function WiFiCommissionsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'partners' | 'commissions'>('partners');
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30d");
  const [selectedStore, setSelectedStore] = useState<PartnerStore | null>(null);

  // Query para lojas parceiras
  const { data: partnerStores = [], isLoading: storesLoading } = useQuery<PartnerStore[]>({
    queryKey: ['/api/admin/wifi/partners'],
    enabled: !!user?.isSuperAdmin,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Query para comissões
  const { data: commissions = [], isLoading: commissionsLoading } = useQuery<Commission[]>({
    queryKey: ['/api/admin/wifi/commissions', statusFilter, dateRange],
    enabled: !!user?.isSuperAdmin,
    staleTime: 60 * 1000,
  });

  // Query para estatísticas
  const { data: stats, isLoading: statsLoading } = useQuery<CommissionStats>({
    queryKey: ['/api/admin/wifi/commissions/stats', dateRange],
    enabled: !!user?.isSuperAdmin,
    staleTime: 60 * 1000,
  });

  // Mutation para atualizar taxa de comissão
  const updateCommissionRateMutation = useMutation({
    mutationFn: async ({ storeId, rate }: { storeId: string; rate: number }) => {
      return await apiRequest('PUT', `/api/admin/wifi/partners/${storeId}/commission`, { rate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wifi/partners'] });
      toast({
        title: "Taxa atualizada",
        description: "Taxa de comissão atualizada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar taxa de comissão.",
        variant: "destructive",
      });
    },
  });

  // Mutation para pagar comissão
  const payCommissionMutation = useMutation({
    mutationFn: async (commissionId: string) => {
      return await apiRequest('POST', `/api/admin/wifi/commissions/${commissionId}/pay`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wifi/commissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wifi/commissions/stats'] });
      toast({
        title: "Comissão paga",
        description: "Comissão marcada como paga com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao processar pagamento da comissão.",
        variant: "destructive",
      });
    },
  });

  const filteredStores = partnerStores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCommissions = commissions.filter(commission => {
    const matchesSearch = 
      commission.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.planName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || commission.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'cancelled': return <CheckCircle className="w-4 h-4 text-gray-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getDateRangeLabel = (range: string) => {
    switch (range) {
      case '7d': return 'Últimos 7 dias';
      case '30d': return 'Últimos 30 dias';
      case '90d': return 'Últimos 90 dias';
      default: return range;
    }
  };

  const exportCommissions = () => {
    const csv = [
      ['Data', 'Loja', 'Cliente', 'Plano', 'Valor Transação', 'Taxa (%)', 'Comissão', 'Status'].join(','),
      ...filteredCommissions.map(c => [
        formatDate(c.createdAt),
        c.storeName,
        c.customerName || '',
        c.planName,
        c.amount.toFixed(2),
        (c.commissionRate * 100).toFixed(1),
        c.commissionAmount.toFixed(2),
        getStatusLabel(c.status)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wifi-commissions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Percent className="w-7 h-7 text-purple-600" />
            Comissões de Lojas Parceiras
          </h2>
          <p className="text-gray-500 mt-1">
            Gerencie comissões das lojas parceiras do sistema WiFi
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Development Notice */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-800 text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Sistema em Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent className="text-yellow-700">
          <p className="text-sm">
            O sistema de comissões para lojas parceiras está em desenvolvimento. 
            As funcionalidades básicas estão implementadas, mas algumas features avançadas 
            ainda serão adicionadas nas próximas versões.
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Store className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Parceiros</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalPartners || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ativos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.activePartners || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Percent className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Comissões</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalCommissions || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pagas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.paidCommissions || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.pendingCommissions || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total R$</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(stats?.totalEarnings || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-pink-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendente R$</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(stats?.pendingEarnings || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === 'partners' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('partners')}
          className="flex-1"
          data-testid="tab-wifi-partners"
        >
          <Store className="w-4 h-4 mr-2" />
          Lojas Parceiras
        </Button>
        <Button
          variant={activeTab === 'commissions' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('commissions')}
          className="flex-1"
          data-testid="tab-wifi-commissions"
        >
          <Percent className="w-4 h-4 mr-2" />
          Comissões
        </Button>
      </div>

      {/* Partners Tab */}
      {activeTab === 'partners' && (
        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar lojas parceiras por nome, proprietário ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-partners"
            />
          </div>

          {/* Partners List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Lojas Parceiras ({filteredStores.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {storesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2 text-sm">Carregando lojas parceiras...</p>
                </div>
              ) : filteredStores.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Store className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchTerm ? "Nenhuma loja encontrada" : "Nenhuma loja parceira"}
                  </h3>
                  <p className="text-sm">
                    {searchTerm 
                      ? "Tente usar termos diferentes na busca." 
                      : "As lojas parceiras aparecerão aqui quando se cadastrarem no programa de comissões."
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredStores.map((store) => (
                    <div
                      key={store.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      data-testid={`partner-store-${store.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {store.name}
                          </h3>
                          <Badge variant={store.isActive ? "default" : "secondary"}>
                            {store.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        
                        {store.ownerName && (
                          <p className="text-sm text-gray-600 mb-1">
                            👤 {store.ownerName}
                            {store.ownerEmail && ` (${store.ownerEmail})`}
                          </p>
                        )}
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                          <div>Taxa: {(store.commissionRate * 100).toFixed(1)}%</div>
                          <div>Ganhos: {formatCurrency(store.totalEarnings)}</div>
                          <div>Este mês: {formatCurrency(store.monthlyEarnings)}</div>
                          <div>Transações: {store.transactionCount}</div>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-1">
                          Parceiro desde {formatDate(store.joinedAt)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedStore(store)}
                          data-testid={`button-view-store-${store.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Detalhes
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

      {/* Commissions Tab */}
      {activeTab === 'commissions' && (
        <div className="space-y-6">
          {/* Filters and Export */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar comissões por loja, cliente ou plano..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-commissions"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={exportCommissions}
              disabled={filteredCommissions.length === 0}
              data-testid="button-export-commissions"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          {/* Commissions List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5" />
                Comissões - {getDateRangeLabel(dateRange)} ({filteredCommissions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commissionsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2 text-sm">Carregando comissões...</p>
                </div>
              ) : filteredCommissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Percent className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchTerm || statusFilter !== "all" 
                      ? "Nenhuma comissão encontrada" 
                      : "Nenhuma comissão registrada"
                    }
                  </h3>
                  <p className="text-sm">
                    {searchTerm || statusFilter !== "all"
                      ? "Tente ajustar os filtros de busca."
                      : "As comissões aparecerão aqui conforme as transações forem processadas."
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCommissions.map((commission) => (
                    <div
                      key={commission.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      data-testid={`commission-item-${commission.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium text-gray-900">
                              {commission.storeName}
                            </h3>
                            <Badge className={getStatusColor(commission.status)}>
                              {getStatusIcon(commission.status)}
                              <span className="ml-1">{getStatusLabel(commission.status)}</span>
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                            <div>
                              Cliente: {commission.customerName || 'Não identificado'}
                            </div>
                            <div>
                              Plano: {commission.planName}
                            </div>
                            <div>
                              Taxa: {(commission.commissionRate * 100).toFixed(1)}%
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                            <div>
                              <span className="font-medium">Criado:</span> {formatDate(commission.createdAt)}
                            </div>
                            {commission.paidAt && (
                              <div>
                                <span className="font-medium">Pago:</span> {formatDate(commission.paidAt)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right ml-4">
                          <div className="mb-2">
                            <p className="text-sm text-gray-500">Valor da Transação</p>
                            <p className="font-medium text-gray-900">{formatCurrency(commission.amount)}</p>
                          </div>
                          <div className="mb-3">
                            <p className="text-sm text-gray-500">Comissão</p>
                            <p className="text-xl font-bold text-purple-600">
                              {formatCurrency(commission.commissionAmount)}
                            </p>
                          </div>
                          
                          {commission.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => payCommissionMutation.mutate(commission.id)}
                              disabled={payCommissionMutation.isPending}
                              data-testid={`button-pay-commission-${commission.id}`}
                            >
                              {payCommissionMutation.isPending ? 'Processando...' : 'Marcar como Pago'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Store Details Modal */}
      <Dialog open={!!selectedStore} onOpenChange={() => setSelectedStore(null)}>
        <DialogContent className="max-w-2xl">
          {selectedStore && (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes da Loja Parceira</DialogTitle>
                <DialogDescription>
                  Informações detalhadas sobre {selectedStore.name}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Store Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Informações da Loja</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Nome:</span> {selectedStore.name}
                      </div>
                      {selectedStore.ownerName && (
                        <div>
                          <span className="font-medium text-gray-600">Proprietário:</span> {selectedStore.ownerName}
                        </div>
                      )}
                      {selectedStore.ownerEmail && (
                        <div>
                          <span className="font-medium text-gray-600">Email:</span> {selectedStore.ownerEmail}
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-600">Status:</span>{' '}
                        <Badge variant={selectedStore.isActive ? "default" : "secondary"}>
                          {selectedStore.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Performance</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Taxa de Comissão:</span> {(selectedStore.commissionRate * 100).toFixed(1)}%
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Total de Ganhos:</span> {formatCurrency(selectedStore.totalEarnings)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Ganhos Mensais:</span> {formatCurrency(selectedStore.monthlyEarnings)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Transações:</span> {selectedStore.transactionCount}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">
                    Parceiro desde {formatDate(selectedStore.joinedAt)}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}