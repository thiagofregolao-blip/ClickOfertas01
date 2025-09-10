import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Eye, Heart, Bookmark, TrendingUp, Users, MousePointer, Brain, Image, Search, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

interface GlobalTrendingProduct {
  productId: string;
  productName: string;
  searchCount: number;
  viewCount: number;
  category: string;
  imageUrl?: string;
  storeId: string;
  storeName: string;
}

interface GeneratedArt {
  id: string;
  imageUrl: string;
  prompt: string;
  isActive: boolean;
  generationDate: string;
  trendingProducts: string[];
  tag: string;
}

export default function Analytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState('7');

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

  // Buscar produtos em tendência globalmente
  const { data: globalTrending, isLoading: globalTrendingLoading } = useQuery<GlobalTrendingProduct[]>({
    queryKey: ['/api/analytics/global-trending', selectedPeriod],
    enabled: !!user,
  });

  // Buscar artes geradas automaticamente
  const { data: generatedArts, isLoading: generatedArtsLoading } = useQuery<GeneratedArt[]>({
    queryKey: ['/api/analytics/generated-arts'],
    enabled: !!user,
  });

  // Mutation para ativar/desativar arte
  const toggleArtMutation = useMutation({
    mutationFn: async ({ artId, isActive }: { artId: string; isActive: boolean }) => {
      return apiRequest(`/api/totem/generated-arts/${artId}/toggle`, 'PATCH', { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/generated-arts'] });
      toast({
        title: "Sucesso",
        description: "Status da arte atualizado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da arte",
        variant: "destructive",
      });
    }
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
              <h1 className="text-3xl font-bold text-gray-900">Analytics & IA</h1>
              <p className="text-gray-600 mt-2">Acompanhe o desempenho e gerencie recursos de IA</p>
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

      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="store" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Minha Loja
            </TabsTrigger>
            <TabsTrigger value="global" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Tendências Globais
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Artes IA
            </TabsTrigger>
          </TabsList>
          
          {/* Aba da Loja */}
          <TabsContent value="store" className="space-y-8 mt-6">
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

            {/* Produtos Mais Engajados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Produtos Mais Engajados da Sua Loja
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
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                            {index + 1}
                          </span>
                          
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
          </TabsContent>

          {/* Aba Global */}
          <TabsContent value="global" className="space-y-8 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-orange-600" />
                  Produtos Mais Buscados (Global)
                </CardTitle>
                <CardDescription>
                  Os produtos que mais despertam interesse nos usuários
                </CardDescription>
              </CardHeader>
              <CardContent>
                {globalTrendingLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="animate-pulse flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !globalTrending || globalTrending.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Ainda não há dados de busca suficientes.</p>
                    <p className="text-sm mt-1">Os dados aparecerão conforme os usuários interagirem com a plataforma.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {globalTrending.map((product, index) => (
                      <div key={product.productId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-800 text-sm font-medium">
                            {index + 1}
                          </span>
                          
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.productName}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                              <div className="w-6 h-6 bg-gray-300 rounded"></div>
                            </div>
                          )}
                          
                          <div>
                            <h4 className="font-medium text-gray-900">{product.productName}</h4>
                            <p className="text-sm text-gray-500">{product.category} • {product.storeName}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm">
                          <div className="flex items-center space-x-1 text-orange-600">
                            <Search className="h-4 w-4" />
                            <span>{product.searchCount} buscas</span>
                          </div>
                          <div className="flex items-center space-x-1 text-blue-600">
                            <Eye className="h-4 w-4" />
                            <span>{product.viewCount} views</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Artes IA */}
          <TabsContent value="ai" className="space-y-8 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  Artes Geradas Automaticamente
                </CardTitle>
                <CardDescription>
                  Geradas pela IA com base nos produtos em tendência
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generatedArtsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : !generatedArts || generatedArts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Ainda não há artes geradas.</p>
                    <p className="text-sm mt-1">As artes serão criadas automaticamente com base nos produtos em tendência.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {generatedArts.map((art) => (
                      <Card key={art.id} className="overflow-hidden">
                        <div className="relative">
                          <img 
                            src={art.imageUrl} 
                            alt="Arte gerada por IA"
                            className="w-full h-48 object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <Badge variant={art.isActive ? "default" : "secondary"}>
                              {art.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">Arte #{art.id.slice(0, 8)}</h4>
                            <Switch 
                              checked={art.isActive}
                              onCheckedChange={(checked) => {
                                toggleArtMutation.mutate({ artId: art.id, isActive: checked });
                              }}
                              disabled={toggleArtMutation.isPending}
                            />
                          </div>
                          <p className="text-sm text-gray-500 mb-2">
                            {new Date(art.generationDate).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-gray-400 line-clamp-2">
                            {art.prompt}
                          </p>
                          {art.trendingProducts.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500">
                                Produtos: {art.trendingProducts.join(', ')}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}