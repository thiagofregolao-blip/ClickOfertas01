import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Eye, 
  MousePointer, 
  Search, 
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Activity,
  Target,
  Zap,
  Globe
} from 'lucide-react';
import AdminLayout from '@/components/admin-layout';

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

interface Store {
  id: string;
  name: string;
  slug: string;
}

export default function AdminAnalytics() {
  const { user, isLoading } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedStore, setSelectedStore] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Ajustar filtro de loja para lojistas normais
  useEffect(() => {
    if (user && !user.isSuperAdmin && user.hasStore) {
      setSelectedStore('my-store');
    }
  }, [user]);

  // Redirect se não tiver acesso (super admin ou lojista)
  useEffect(() => {
    if (!isLoading && !user?.isSuperAdmin && !user?.hasStore) {
      window.location.href = "/admin";
    }
  }, [user, isLoading]);

  // Buscar lojas para filtro (apenas para Super Admin)
  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ['/api/admin/stores'],
    enabled: !!user?.isSuperAdmin,
  });

  // Buscar dados de analytics principais
  const { data: analyticsData, isLoading: analyticsLoading, refetch } = useQuery<AnalyticsOverview>({
    queryKey: [`/api/analytics/reports/overview?period=${selectedPeriod}&storeId=${selectedStore === 'all' ? '' : selectedStore === 'my-store' ? '' : selectedStore}`],
    enabled: !!(user?.isSuperAdmin || user?.hasStore),
    staleTime: 30000, // Cache por 30 segundos
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const handleExportData = () => {
    // TODO: Implementar export de dados em CSV/Excel
    console.log('Exportando dados...', { period: selectedPeriod, store: selectedStore });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!user?.isSuperAdmin && !user?.hasStore) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
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
                    {user?.isSuperAdmin ? (
                      <>
                        <SelectItem value="all">Todas as lojas</SelectItem>
                        {stores.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </>
                    ) : (
                      <SelectItem value="my-store">Minha Loja</SelectItem>
                    )}
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
    </AdminLayout>
  );
}