import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Eye, 
  Search, 
  Store,
  Calendar,
  Activity,
  Clock,
  Target
} from "lucide-react";

interface LegacyStats {
  totalViews: number;
  totalSearches: number;
  totalSessions: number;
  totalUsers: number;
  totalStores: number;
  totalProducts: number;
  dailyViews: {
    date: string;
    views: number;
  }[];
  topSearchTerms: {
    term: string;
    count: number;
  }[];
  monthlyGrowth: {
    views: number;
    searches: number;
    users: number;
  };
}

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function StatisticsManager() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Query para estatísticas legadas
  const { data: legacyStats, isLoading: statsLoading } = useQuery<LegacyStats>({
    queryKey: ['/api/admin/statistics/legacy', timeRange],
    enabled: !!user?.isSuperAdmin,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const getTimeRangeLabel = (range: string) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Estatísticas Legadas
          </h2>
          <p className="text-gray-500 mt-1">
            Métricas básicas e históricas do sistema (substituídas pelo Analytics Avançado)
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <Button
            variant={timeRange === '7d' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimeRange('7d')}
            data-testid="button-timerange-7d"
          >
            7 dias
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimeRange('30d')}
            data-testid="button-timerange-30d"
          >
            30 dias
          </Button>
          <Button
            variant={timeRange === '90d' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimeRange('90d')}
            data-testid="button-timerange-90d"
          >
            90 dias
          </Button>
        </div>
      </div>

      {/* Legacy Notice */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-800 text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Aviso: Sistema Legado
          </CardTitle>
        </CardHeader>
        <CardContent className="text-yellow-700">
          <p className="text-sm">
            Este é o sistema de estatísticas legado. Para análises mais avançadas e detalhadas, 
            use o <strong>Analytics Avançado</strong> que oferece insights mais profundos, 
            segmentação por loja, análise de tendências e métricas em tempo real.
          </p>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Visualizações</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(legacyStats?.totalViews || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Search className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Buscas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(legacyStats?.totalSearches || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sessões</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(legacyStats?.totalSessions || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Usuários</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(legacyStats?.totalUsers || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Store className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Lojas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {legacyStats?.totalStores || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Produtos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(legacyStats?.totalProducts || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Growth Metrics */}
      {legacyStats?.monthlyGrowth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Crescimento Mensal - {getTimeRangeLabel(timeRange)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Eye className="w-6 h-6 text-blue-600 mr-2" />
                  <span className="text-lg font-medium text-gray-900">Visualizações</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  {getGrowthIcon(legacyStats.monthlyGrowth.views)}
                  <Badge className={getGrowthColor(legacyStats.monthlyGrowth.views)}>
                    {legacyStats.monthlyGrowth.views > 0 ? '+' : ''}{legacyStats.monthlyGrowth.views}%
                  </Badge>
                </div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Search className="w-6 h-6 text-green-600 mr-2" />
                  <span className="text-lg font-medium text-gray-900">Buscas</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  {getGrowthIcon(legacyStats.monthlyGrowth.searches)}
                  <Badge className={getGrowthColor(legacyStats.monthlyGrowth.searches)}>
                    {legacyStats.monthlyGrowth.searches > 0 ? '+' : ''}{legacyStats.monthlyGrowth.searches}%
                  </Badge>
                </div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-6 h-6 text-purple-600 mr-2" />
                  <span className="text-lg font-medium text-gray-900">Usuários</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  {getGrowthIcon(legacyStats.monthlyGrowth.users)}
                  <Badge className={getGrowthColor(legacyStats.monthlyGrowth.users)}>
                    {legacyStats.monthlyGrowth.users > 0 ? '+' : ''}{legacyStats.monthlyGrowth.users}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Views Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Visualizações Diárias - {getTimeRangeLabel(timeRange)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-500 mt-2 text-sm">Carregando dados diários...</p>
            </div>
          ) : legacyStats?.dailyViews && legacyStats.dailyViews.length > 0 ? (
            <div className="space-y-3">
              {legacyStats.dailyViews.map((day, index) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  data-testid={`daily-view-${index}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span className="font-medium text-gray-900">{formatDate(day.date)}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatNumber(day.views)}</p>
                    <p className="text-sm text-gray-500">visualizações</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Nenhum dado diário disponível</h3>
              <p className="text-sm">Os dados aparecerão conforme o sistema for utilizado.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Search Terms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Termos Mais Buscados - {getTimeRangeLabel(timeRange)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {legacyStats?.topSearchTerms && legacyStats.topSearchTerms.length > 0 ? (
            <div className="space-y-3">
              {legacyStats.topSearchTerms.slice(0, 10).map((term, index) => (
                <div
                  key={term.term}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  data-testid={`search-term-${index}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900">{term.term}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{term.count}</p>
                    <p className="text-sm text-gray-500">buscas</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Nenhum termo de busca registrado</h3>
              <p className="text-sm">Os termos aparecerão conforme os usuários fizerem buscas.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Migration Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 text-lg">Migração para Analytics Avançado</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 text-sm space-y-2">
          <p>• <strong>Analytics Avançado:</strong> Oferece insights mais detalhados e segmentados</p>
          <p>• <strong>Performance por Loja:</strong> Métricas individuais de cada loja</p>
          <p>• <strong>Análise de Tendências:</strong> Produtos em alta e comportamento dos usuários</p>
          <p>• <strong>Gestão de Artes IA:</strong> Controle completo das artes geradas</p>
          <p>• <strong>Tempo Real:</strong> Dados atualizados instantaneamente</p>
        </CardContent>
      </Card>
    </div>
  );
}