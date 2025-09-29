import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Store, 
  Users, 
  Search, 
  Eye, 
  BarChart3,
  Target,
  Globe,
  Activity,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface AnalyticsOverview {
  totalStores: number;
  totalProducts: number;
  totalViews: number;
  totalSearches: number;
  totalSessions: number;
  popularProducts: {
    id: string;
    name: string;
    storeName: string;
    searchCount: number;
  }[];
  topStores: {
    id: string;
    name: string;
    views: number;
    products: number;
  }[];
  dailyStats: {
    date: string;
    views: number;
    searches: number;
    sessions: number;
  }[];
}

interface StoreAnalytics {
  id: string;
  name: string;
  totalViews: number;
  totalProducts: number;
  avgViewsPerProduct: number;
  topProducts: {
    id: string;
    name: string;
    views: number;
  }[];
  weeklyViews: {
    date: string;
    views: number;
  }[];
}

interface TrendingProducts {
  id: string;
  name: string;
  storeName: string;
  searchCount: number;
  viewCount: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function AnalyticsManager() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'stores' | 'trends' | 'ai_arts'>('overview');

  // Query para visão geral
  const { data: analyticsOverview, isLoading: overviewLoading } = useQuery<AnalyticsOverview>({
    queryKey: ['/api/admin/analytics/overview'],
    enabled: !!user?.isSuperAdmin,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Query para analytics por loja
  const { data: storeAnalytics = [], isLoading: storesLoading } = useQuery<StoreAnalytics[]>({
    queryKey: ['/api/admin/analytics/stores'],
    enabled: !!user?.isSuperAdmin && activeTab === 'stores',
    staleTime: 2 * 60 * 1000,
  });

  // Query para produtos trending
  const { data: trendingProducts = [], isLoading: trendsLoading } = useQuery<TrendingProducts[]>({
    queryKey: ['/api/admin/analytics/trending'],
    enabled: !!user?.isSuperAdmin && activeTab === 'trends',
    staleTime: 2 * 60 * 1000,
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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUp className="w-4 h-4 text-green-600" />;
      case 'down': return <ArrowDown className="w-4 h-4 text-red-600" />;
      default: return <Target className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600 bg-green-100';
      case 'down': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-blue-600" />
          Analytics Avançado
        </h2>
        <p className="text-gray-500 mt-1">
          Análise completa de performance, tendências e comportamento dos usuários
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('overview')}
          className="flex-1"
          data-testid="tab-analytics-overview"
        >
          <Globe className="w-4 h-4 mr-2" />
          Visão Geral
        </Button>
        <Button
          variant={activeTab === 'stores' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('stores')}
          className="flex-1"
          data-testid="tab-analytics-stores"
        >
          <Store className="w-4 h-4 mr-2" />
          Lojas
        </Button>
        <Button
          variant={activeTab === 'trends' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('trends')}
          className="flex-1"
          data-testid="tab-analytics-trends"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Tendências
        </Button>
        <Button
          variant={activeTab === 'ai_arts' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('ai_arts')}
          className="flex-1"
          data-testid="tab-analytics-ai-arts"
        >
          <Activity className="w-4 h-4 mr-2" />
          Artes IA
        </Button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Global Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Store className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total de Lojas</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analyticsOverview?.totalStores || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Target className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Produtos</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(analyticsOverview?.totalProducts || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Eye className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Visualizações</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(analyticsOverview?.totalViews || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Search className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Buscas</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(analyticsOverview?.totalSearches || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Sessões</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(analyticsOverview?.totalSessions || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Popular Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Produtos Mais Buscados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overviewLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2 text-sm">Carregando dados...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analyticsOverview?.popularProducts?.slice(0, 10).map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      data-testid={`popular-product-${index}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{product.name}</h4>
                          <p className="text-sm text-gray-500">{product.storeName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{product.searchCount}</p>
                        <p className="text-sm text-gray-500">buscas</p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-center text-gray-500 py-8">Nenhum dado disponível</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Stores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Lojas com Melhor Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsOverview?.topStores?.slice(0, 10).map((store, index) => (
                  <div
                    key={store.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    data-testid={`top-store-${index}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{store.name}</h4>
                        <p className="text-sm text-gray-500">{store.products} produtos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatNumber(store.views)}</p>
                      <p className="text-sm text-gray-500">visualizações</p>
                    </div>
                  </div>
                )) || (
                  <p className="text-center text-gray-500 py-8">Nenhum dado disponível</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stores Tab */}
      {activeTab === 'stores' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Performance por Loja
              </CardTitle>
            </CardHeader>
            <CardContent>
              {storesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2 text-sm">Carregando dados por loja...</p>
                </div>
              ) : storeAnalytics.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Store className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Nenhum dado disponível</h3>
                  <p className="text-sm">Os dados aparecerão conforme as lojas forem utilizadas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {storeAnalytics.map((store) => (
                    <Card key={store.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{store.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold text-blue-600">{formatNumber(store.totalViews)}</p>
                            <p className="text-xs text-gray-500">Views Totais</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-600">{store.totalProducts}</p>
                            <p className="text-xs text-gray-500">Produtos</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-purple-600">{store.avgViewsPerProduct.toFixed(1)}</p>
                            <p className="text-xs text-gray-500">Média/Produto</p>
                          </div>
                        </div>
                        
                        {store.topProducts && store.topProducts.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Produtos Mais Vistos</h5>
                            <div className="space-y-1">
                              {store.topProducts.slice(0, 3).map((product, index) => (
                                <div key={product.id} className="flex justify-between text-sm">
                                  <span className="truncate">{product.name}</span>
                                  <span className="font-medium">{product.views}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Produtos Mais Buscados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2 text-sm">Carregando tendências...</p>
                </div>
              ) : trendingProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma tendência disponível</h3>
                  <p className="text-sm">As tendências aparecerão conforme os produtos forem buscados.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trendingProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      data-testid={`trending-product-${index}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{product.name}</h4>
                          <p className="text-sm text-gray-500">{product.storeName}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <p className="font-medium text-gray-900">{product.searchCount}</p>
                          <p className="text-xs text-gray-500">Buscas</p>
                        </div>
                        
                        <div className="text-center">
                          <p className="font-medium text-gray-900">{product.viewCount}</p>
                          <p className="text-xs text-gray-500">Views</p>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {getTrendIcon(product.trend)}
                          <Badge className={getTrendColor(product.trend)}>
                            {product.trendPercentage > 0 ? '+' : ''}{product.trendPercentage}%
                          </Badge>
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

      {/* AI Arts Tab */}
      {activeTab === 'ai_arts' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Gestão de Artes IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Gestão de Artes IA</h3>
              <p className="text-sm">
                Esta seção permitirá visualizar, ativar/desativar e deletar artes geradas por IA.
                <br />
                Também será possível forçar nova geração de artes para produtos específicos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}