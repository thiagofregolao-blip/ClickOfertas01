import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

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
  CreditCard, 
  Search, 
  Calendar, 
  User, 
  Wifi, 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  Download,
  Filter
} from "lucide-react";

interface WiFiTransaction {
  id: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  planName: string;
  planDuration: number;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'pix' | 'credit_card' | 'cash';
  voucher?: string;
  voucherUsed: boolean;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}

interface TransactionStats {
  totalTransactions: number;
  totalRevenue: number;
  pendingTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
  todayTransactions: number;
  todayRevenue: number;
}

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function WiFiTransactionsManager() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30d");

  // Query para buscar transações
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<WiFiTransaction[]>({
    queryKey: ['/api/admin/wifi/transactions', statusFilter, paymentFilter, dateRange],
    enabled: !!user?.isSuperAdmin,
    staleTime: 60 * 1000,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Query para estatísticas
  const { data: stats, isLoading: statsLoading } = useQuery<TransactionStats>({
    queryKey: ['/api/admin/wifi/transactions/stats', dateRange],
    enabled: !!user?.isSuperAdmin,
    staleTime: 60 * 1000,
  });

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customerPhone?.includes(searchTerm) ||
      transaction.voucher?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.planName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    const matchesPayment = paymentFilter === "all" || transaction.paymentMethod === paymentFilter;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'refunded': return <XCircle className="w-4 h-4 text-gray-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'failed': return 'Falhou';
      case 'pending': return 'Pendente';
      case 'refunded': return 'Reembolsado';
      default: return status;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'pix': return 'PIX';
      case 'credit_card': return 'Cartão';
      case 'cash': return 'Dinheiro';
      default: return method;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'pix': return 'bg-blue-100 text-blue-800';
      case 'credit_card': return 'bg-purple-100 text-purple-800';
      case 'cash': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const exportTransactions = () => {
    const csv = [
      ['Data', 'Cliente', 'Email', 'Telefone', 'Plano', 'Valor', 'Status', 'Pagamento', 'Voucher'].join(','),
      ...filteredTransactions.map(t => [
        formatDate(t.createdAt),
        t.customerName || '',
        t.customerEmail || '',
        t.customerPhone || '',
        t.planName,
        t.amount.toFixed(2),
        getStatusLabel(t.status),
        getPaymentMethodLabel(t.paymentMethod),
        t.voucher || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wifi-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-green-600" />
            Transações WiFi
          </h2>
          <p className="text-gray-500 mt-1">
            Histórico detalhado de pagamentos e vouchers WiFi
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

          <Button
            variant="outline"
            onClick={exportTransactions}
            disabled={filteredTransactions.length === 0}
            data-testid="button-export-transactions"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalTransactions || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Receita</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(stats?.totalRevenue || 0)}
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
                <p className="text-sm font-medium text-gray-600">Concluídos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.completedTransactions || 0}
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
                  {stats?.pendingTransactions || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Falharam</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.failedTransactions || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hoje</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.todayTransactions || 0}
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
                <p className="text-sm font-medium text-gray-600">Hoje R$</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(stats?.todayRevenue || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar por cliente, email, telefone, voucher ou plano..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-transactions"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="refunded">Reembolsado</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Métodos</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="credit_card">Cartão</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Transações - {getDateRangeLabel(dateRange)} ({filteredTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-500 mt-2 text-sm">Carregando transações...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || statusFilter !== "all" || paymentFilter !== "all" 
                  ? "Nenhuma transação encontrada" 
                  : "Nenhuma transação registrada"
                }
              </h3>
              <p className="text-sm">
                {searchTerm || statusFilter !== "all" || paymentFilter !== "all"
                  ? "Tente ajustar os filtros de busca."
                  : "As transações aparecerão aqui conforme os pagamentos forem processados."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  data-testid={`transaction-item-${transaction.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900">
                          {transaction.customerName || 'Cliente não identificado'}
                        </h3>
                        <Badge className={getStatusColor(transaction.status)}>
                          {getStatusIcon(transaction.status)}
                          <span className="ml-1">{getStatusLabel(transaction.status)}</span>
                        </Badge>
                        <Badge className={getPaymentMethodColor(transaction.paymentMethod)}>
                          {getPaymentMethodLabel(transaction.paymentMethod)}
                        </Badge>
                      </div>

                      {/* Customer Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                        {transaction.customerEmail && (
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {transaction.customerEmail}
                          </div>
                        )}
                        {transaction.customerPhone && (
                          <div>{transaction.customerPhone}</div>
                        )}
                        <div className="flex items-center gap-1">
                          <Wifi className="w-4 h-4" />
                          {transaction.planName} ({formatDuration(transaction.planDuration)})
                        </div>
                      </div>

                      {/* Voucher */}
                      {transaction.voucher && (
                        <div className="mb-3">
                          <div className="inline-flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">Voucher:</span>
                            <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                              {transaction.voucher}
                            </code>
                            <Badge variant={transaction.voucherUsed ? "default" : "secondary"}>
                              {transaction.voucherUsed ? "Usado" : "Não usado"}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Dates */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
                        <div>
                          <span className="font-medium">Criado:</span> {formatDate(transaction.createdAt)}
                        </div>
                        {transaction.completedAt && (
                          <div>
                            <span className="font-medium">Concluído:</span> {formatDate(transaction.completedAt)}
                          </div>
                        )}
                        {transaction.expiresAt && (
                          <div>
                            <span className="font-medium">Expira:</span> {formatDate(transaction.expiresAt)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        #{transaction.id.slice(-8)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}