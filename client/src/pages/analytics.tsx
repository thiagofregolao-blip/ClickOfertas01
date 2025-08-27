import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, Heart, Bookmark, TrendingUp, Users, MousePointer } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

interface AnalyticsData {
  storyViews: number;
  flyerViews: number;
  productLikes: number;
  productsSaved: number;
}

interface ProductAnalytics {
  id: string;
  name: string;
  likes: number;
  saves: number;
  views: number;
  category: string;
  imageUrl?: string;
}

export default function Analytics() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('7'); // 7 dias por padrão

  // Buscar analytics gerais da loja
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics/overview', selectedPeriod],
    enabled: !!user,
  });

  // Buscar produtos mais engajados
  const { data: topProducts, isLoading: productsLoading } = useQuery<ProductAnalytics[]>({
    queryKey: ['/api/analytics/products', selectedPeriod],
    enabled: !!user,
  });

  if (analyticsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalEngagement = (analytics?.productLikes || 0) + (analytics?.productsSaved || 0);
  const totalViews = (analytics?.storyViews || 0) + (analytics?.flyerViews || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="text-gray-600 mt-2">Acompanhe o desempenho da sua loja</p>
            </div>
            
            {/* Filtro de período */}
            <div className="flex gap-2">
              {[
                { value: '7', label: '7 dias' },
                { value: '30', label: '30 dias' },
                { value: '90', label: '90 dias' }
              ].map(period => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPeriod === period.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Cards de Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">
                Visualizações Totais
              </CardTitle>
              <Eye className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {totalViews.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Stories: {analytics?.storyViews || 0} • Flyers: {analytics?.flyerViews || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-800">
                Curtidas
              </CardTitle>
              <Heart className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900">
                {(analytics?.productLikes || 0).toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-red-700 mt-1">
                Produtos curtidos pelos usuários
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">
                Produtos Salvos
              </CardTitle>
              <Bookmark className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {(analytics?.productsSaved || 0).toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-green-700 mt-1">
                Salvos por usuários logados
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">
                Engajamento Total
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                {totalEngagement.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-purple-700 mt-1">
                Curtidas + Saves
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Taxa de Engajamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="h-5 w-5 text-blue-600" />
              Taxa de Engajamento
            </CardTitle>
            <CardDescription>
              Proporção entre visualizações e interações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Taxa de Curtidas</span>
                <span className="font-medium">
                  {totalViews > 0 
                    ? ((analytics?.productLikes || 0) / totalViews * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: totalViews > 0 
                      ? `${Math.min(((analytics?.productLikes || 0) / totalViews * 100), 100)}%`
                      : '0%'
                  }}
                ></div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Taxa de Saves</span>
                <span className="font-medium">
                  {totalViews > 0 
                    ? ((analytics?.productsSaved || 0) / totalViews * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: totalViews > 0 
                      ? `${Math.min(((analytics?.productsSaved || 0) / totalViews * 100), 100)}%`
                      : '0%'
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Produtos Mais Engajados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Produtos Mais Engajados
            </CardTitle>
            <CardDescription>
              Seus produtos com melhor performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !topProducts || topProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Ainda não há dados de engajamento para mostrar.</p>
                <p className="text-sm mt-1">Continue promovendo seus produtos!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                          {index + 1}
                        </span>
                      </div>
                      
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <div className="w-6 h-6 bg-gray-300 rounded"></div>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="font-medium text-gray-900">{product.name}</h4>
                        <p className="text-sm text-gray-500">{product.category}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="flex items-center space-x-1 text-red-600">
                        <Heart className="h-4 w-4" />
                        <span>{product.likes}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-green-600">
                        <Bookmark className="h-4 w-4" />
                        <span>{product.saves}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-blue-600">
                        <Eye className="h-4 w-4" />
                        <span>{product.views}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}