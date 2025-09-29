import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  Wifi, 
  DollarSign, 
  Users, 
  Clock,
  Calendar,
  Target,
  CheckCircle,
  Activity
} from "lucide-react";

interface WiFiAnalytics {
  totalRevenue: number;
  totalPayments: number;
  activeVouchers: number;
  totalVouchers: number;
  averageSessionDuration: number;
  conversionRate: number;
  popularPlans: {
    planName: string;
    planDuration: number;
    sales: number;
    revenue: number;
  }[];
  dailyStats: {
    date: string;
    revenue: number;
    payments: number;
    vouchers: number;
  }[];
  paymentMethods: {
    method: string;
    count: number;
    revenue: number;
    percentage: number;
  }[];
  revenueGrowth: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

interface DetailedReport {
  period: string;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalRevenue: number;
  averageTicket: number;
  uniqueCustomers: number;
  repeatCustomers: number;
  topHours: {
    hour: number;
    transactions: number;
  }[];
  customerSegments: {
    segment: string;
    count: number;
    revenue: number;
  }[];
}

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function WiFiAnalyticsManager() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<string>("30d");
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed'>('overview');

  // Query para analytics WiFi
  const { data: analytics, isLoading: analyticsLoading } = useQuery<WiFiAnalytics>({
    queryKey: ['/api/admin/wifi/analytics', dateRange],
    enabled: !!user?.isSuperAdmin,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Query para relatório detalhado
  const { data: detailedReport, isLoading: reportLoading } = useQuery<DetailedReport>({
    queryKey: ['/api/admin/wifi/analytics/detailed', dateRange],
    enabled: !!user?.isSuperAdmin && activeTab === 'detailed',
    staleTime: 2 * 60 * 1000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const formatDuration = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}min`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return remainingHours > 0 ? `${days}d ${remainingHours.toFixed(1)}h` : `${days}d`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const getDateRangeLabel = (range: string) => {
    switch (range) {
      case '7d': return 'Últimos 7 dias';
      case '30d': return 'Últimos 30 dias';
      case '90d': return 'Últimos 90 dias';
      default: return range;
    }
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600 bg-green-100';
    if (growth < 0) return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="w-4 h-4" />;
    if (growth < 0) return <TrendingUp className="w-4 h-4 rotate-180" />;
    return <Target className="w-4 h-4" />;
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'pix': return 'bg-blue-100 text-blue-800';
      case 'credit_card': return 'bg-purple-100 text-purple-800';
      case 'cash': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method.toLowerCase()) {
      case 'pix': return 'PIX';
      case 'credit_card': return 'Cartão';
      case 'cash': return 'Dinheiro';
      default: return method;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            Analytics WiFi
          </h2>
          <p className="text-gray-500 mt-1">
            Métricas detalhadas do sistema de pagamento WiFi
          </p>
        </div>

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

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('overview')}
          className="flex-1"
          data-testid="tab-wifi-overview"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Visão Geral
        </Button>
        <Button
          variant={activeTab === 'detailed' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('detailed')}
          className="flex-1"
          data-testid="tab-wifi-detailed"
        >
          <Activity className="w-4 h-4 mr-2" />
          Relatório Detalhado
        </Button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Receita Total</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(analytics?.totalRevenue || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total de Pagamentos</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics?.totalPayments || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Wifi className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Vouchers Ativos</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics?.activeVouchers || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Duração Média</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatDuration(analytics?.averageSessionDuration || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Growth Metrics */}
          {analytics?.revenueGrowth && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Crescimento de Receita - {getDateRangeLabel(dateRange)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      <Calendar className="w-6 h-6 text-blue-600 mr-2" />
                      <span className="text-lg font-medium text-gray-900">Diário</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      {getGrowthIcon(analytics.revenueGrowth.daily)}
                      <Badge className={getGrowthColor(analytics.revenueGrowth.daily)}>
                        {formatPercentage(analytics.revenueGrowth.daily)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      <Calendar className="w-6 h-6 text-green-600 mr-2" />
                      <span className="text-lg font-medium text-gray-900">Semanal</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      {getGrowthIcon(analytics.revenueGrowth.weekly)}
                      <Badge className={getGrowthColor(analytics.revenueGrowth.weekly)}>
                        {formatPercentage(analytics.revenueGrowth.weekly)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      <Calendar className="w-6 h-6 text-purple-600 mr-2" />
                      <span className="text-lg font-medium text-gray-900">Mensal</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      {getGrowthIcon(analytics.revenueGrowth.monthly)}
                      <Badge className={getGrowthColor(analytics.revenueGrowth.monthly)}>
                        {formatPercentage(analytics.revenueGrowth.monthly)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Popular Plans */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Planos Mais Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2 text-sm">Carregando planos...</p>
                </div>
              ) : analytics?.popularPlans && analytics.popularPlans.length > 0 ? (
                <div className="space-y-3">
                  {analytics.popularPlans.map((plan, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      data-testid={`popular-plan-${index}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{plan.planName}</h4>
                          <p className="text-sm text-gray-500">
                            {formatDuration(plan.planDuration)} • {plan.sales} vendas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatCurrency(plan.revenue)}</p>
                        <p className="text-sm text-gray-500">receita</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Nenhum dado de planos disponível</p>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Métodos de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.paymentMethods && analytics.paymentMethods.length > 0 ? (
                <div className="space-y-3">
                  {analytics.paymentMethods.map((method, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      data-testid={`payment-method-${index}`}
                    >
                      <div className="flex items-center space-x-3">
                        <Badge className={getPaymentMethodColor(method.method)}>
                          {getPaymentMethodLabel(method.method)}
                        </Badge>
                        <div>
                          <p className="font-medium text-gray-900">{method.count} transações</p>
                          <p className="text-sm text-gray-500">{method.percentage.toFixed(1)}% do total</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatCurrency(method.revenue)}</p>
                        <p className="text-sm text-gray-500">receita</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Nenhum dado de pagamentos disponível</p>
              )}
            </CardContent>
          </Card>

          {/* Daily Stats Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Estatísticas Diárias - {getDateRangeLabel(dateRange)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.dailyStats && analytics.dailyStats.length > 0 ? (
                <div className="space-y-3">
                  {analytics.dailyStats.map((day, index) => (
                    <div
                      key={day.date}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      data-testid={`daily-stat-${index}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        <span className="font-medium text-gray-900">{formatDate(day.date)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-6 text-right">
                        <div>
                          <p className="font-medium text-gray-900">{formatCurrency(day.revenue)}</p>
                          <p className="text-sm text-gray-500">receita</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{day.payments}</p>
                          <p className="text-sm text-gray-500">pagamentos</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{day.vouchers}</p>
                          <p className="text-sm text-gray-500">vouchers</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Nenhum dado diário disponível</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Tab */}
      {activeTab === 'detailed' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Relatório Detalhado - {getDateRangeLabel(dateRange)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2 text-sm">Carregando relatório detalhado...</p>
                </div>
              ) : detailedReport ? (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-600">Total de Transações</p>
                      <p className="text-2xl font-bold text-blue-900">{detailedReport.totalTransactions}</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-600">Taxa de Sucesso</p>
                      <p className="text-2xl font-bold text-green-900">
                        {detailedReport.totalTransactions > 0 
                          ? ((detailedReport.successfulTransactions / detailedReport.totalTransactions) * 100).toFixed(1)
                          : 0
                        }%
                      </p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm font-medium text-purple-600">Ticket Médio</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {formatCurrency(detailedReport.averageTicket)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm font-medium text-orange-600">Clientes Únicos</p>
                      <p className="text-2xl font-bold text-orange-900">{detailedReport.uniqueCustomers}</p>
                    </div>
                  </div>

                  {/* Top Hours */}
                  {detailedReport.topHours && detailedReport.topHours.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Horários de Pico</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {detailedReport.topHours.slice(0, 8).map((hourData, index) => (
                          <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-lg font-bold text-gray-900">{hourData.hour}h</p>
                            <p className="text-sm text-gray-500">{hourData.transactions} transações</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customer Segments */}
                  {detailedReport.customerSegments && detailedReport.customerSegments.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Segmentos de Clientes</h4>
                      <div className="space-y-3">
                        {detailedReport.customerSegments.map((segment, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{segment.segment}</p>
                              <p className="text-sm text-gray-500">{segment.count} clientes</p>
                            </div>
                            <p className="font-medium text-gray-900">{formatCurrency(segment.revenue)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Nenhum relatório disponível</h3>
                  <p className="text-sm">Os dados aparecerão conforme as transações forem processadas.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}