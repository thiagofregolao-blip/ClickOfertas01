import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Palette, 
  Plus, 
  Trash2, 
  Eye, 
  RefreshCw, 
  Search, 
  Wand2,
  Image as ImageIcon,
  Download,
  Play,
  Pause,
  Sparkles
} from "lucide-react";

interface AIArt {
  id: string;
  productId: string;
  productName: string;
  storeName: string;
  imageUrl: string;
  prompt: string;
  style: string;
  isActive: boolean;
  isGenerating: boolean;
  generatedAt: string;
  views: number;
  downloads: number;
}

interface GenerationStats {
  totalArts: number;
  activeArts: number;
  totalViews: number;
  totalDownloads: number;
  generatingCount: number;
  todayGenerated: number;
}

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function AIArtsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArt, setSelectedArt] = useState<AIArt | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Query para buscar artes IA
  const { data: aiArts = [], isLoading: artsLoading } = useQuery<AIArt[]>({
    queryKey: ['/api/admin/ai-arts'],
    enabled: !!user?.isSuperAdmin,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Query para estatísticas de geração
  const { data: generationStats, isLoading: statsLoading } = useQuery<GenerationStats>({
    queryKey: ['/api/admin/ai-arts/stats'],
    enabled: !!user?.isSuperAdmin,
    staleTime: 60 * 1000,
  });

  // Mutation para alternar status ativo
  const toggleArtStatusMutation = useMutation({
    mutationFn: async ({ artId, isActive }: { artId: string; isActive: boolean }) => {
      return await apiRequest('PUT', `/api/admin/ai-arts/${artId}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-arts'] });
      toast({
        title: "Status atualizado",
        description: "Status da arte IA atualizado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para alterar artes IA.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao atualizar status da arte IA.",
          variant: "destructive",
        });
      }
    },
  });

  // Mutation para deletar arte
  const deleteArtMutation = useMutation({
    mutationFn: async (artId: string) => {
      return await apiRequest('DELETE', `/api/admin/ai-arts/${artId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-arts'] });
      setSelectedArt(null);
      toast({
        title: "Arte deletada",
        description: "Arte IA removida com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para deletar artes IA.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao deletar",
          description: "Não foi possível deletar a arte IA.",
          variant: "destructive",
        });
      }
    },
  });

  // Mutation para forçar nova geração
  const regenerateArtMutation = useMutation({
    mutationFn: async (productId: string) => {
      return await apiRequest('POST', `/api/admin/ai-arts/regenerate`, { productId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-arts'] });
      toast({
        title: "Regeneração iniciada",
        description: "Nova arte está sendo gerada. Aguarde alguns momentos.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro na regeneração",
        description: "Não foi possível iniciar a regeneração da arte.",
        variant: "destructive",
      });
    },
  });

  const filteredArts = aiArts.filter(art => {
    const matchesSearch = 
      art.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.prompt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = showActiveOnly ? art.isActive : true;
    return matchesSearch && matchesFilter;
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

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getStyleColor = (style: string) => {
    switch (style.toLowerCase()) {
      case 'realistic': return 'bg-blue-100 text-blue-800';
      case 'artistic': return 'bg-purple-100 text-purple-800';
      case 'minimalist': return 'bg-gray-100 text-gray-800';
      case 'vibrant': return 'bg-orange-100 text-orange-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Palette className="w-7 h-7 text-purple-600" />
          Gestão de Artes IA
        </h2>
        <p className="text-gray-500 mt-1">
          Visualize, ative/desative e gerencie artes criadas por inteligência artificial
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Buscar por produto, loja ou prompt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-ai-arts"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={showActiveOnly ? "default" : "outline"}
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            data-testid="button-filter-active-arts"
          >
            {showActiveOnly ? "Todas" : "Somente Ativas"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Palette className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Artes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {generationStats?.totalArts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Play className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Artes Ativas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {generationStats?.activeArts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Visualizações</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(generationStats?.totalViews || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Download className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Downloads</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(generationStats?.totalDownloads || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <RefreshCw className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gerando</p>
                <p className="text-2xl font-bold text-gray-900">
                  {generationStats?.generatingCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Sparkles className="h-8 w-8 text-pink-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hoje</p>
                <p className="text-2xl font-bold text-gray-900">
                  {generationStats?.todayGenerated || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Arts Gallery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Artes Geradas por IA ({filteredArts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {artsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-500 mt-2 text-sm">Carregando artes IA...</p>
            </div>
          ) : filteredArts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Palette className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || showActiveOnly ? "Nenhuma arte encontrada" : "Nenhuma arte gerada"}
              </h3>
              <p className="text-sm">
                {searchTerm || showActiveOnly 
                  ? "Tente ajustar os filtros de busca." 
                  : "As artes aparecerão aqui conforme forem geradas pelo sistema."
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredArts.map((art) => (
                <div
                  key={art.id}
                  className={`group relative rounded-lg border overflow-hidden transition-all duration-200 hover:shadow-lg ${
                    art.isActive 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                  data-testid={`ai-art-item-${art.id}`}
                >
                  {/* Art Image */}
                  <div className="relative aspect-square bg-gray-200">
                    {art.isGenerating ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Gerando...</p>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={art.imageUrl}
                        alt={art.productName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-ai-art.png';
                        }}
                      />
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-2 left-2">
                      <Badge 
                        variant={art.isActive ? "default" : "secondary"}
                        className={art.isActive ? "bg-green-600" : ""}
                      >
                        {art.isGenerating ? "Gerando" : art.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    
                    {/* Style Badge */}
                    <div className="absolute top-2 right-2">
                      <Badge className={getStyleColor(art.style)}>
                        {art.style}
                      </Badge>
                    </div>
                    
                    {/* Actions Overlay */}
                    {!art.isGenerating && (
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white text-black hover:bg-gray-100"
                            onClick={() => setSelectedArt(art)}
                            data-testid={`button-view-art-${art.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white text-blue-600 hover:bg-blue-50"
                            onClick={() => regenerateArtMutation.mutate(art.productId)}
                            disabled={regenerateArtMutation.isPending}
                            data-testid={`button-regenerate-art-${art.id}`}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white text-red-600 hover:bg-red-50"
                            onClick={() => deleteArtMutation.mutate(art.id)}
                            disabled={deleteArtMutation.isPending}
                            data-testid={`button-delete-art-${art.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Art Info */}
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                      {art.productName}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{art.storeName}</p>
                    
                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {art.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-4 h-4" />
                          {art.downloads}
                        </span>
                      </div>
                    </div>
                    
                    {/* Toggle and Date */}
                    <div className="flex items-center justify-between">
                      <Switch
                        checked={art.isActive}
                        onCheckedChange={(checked) =>
                          toggleArtStatusMutation.mutate({
                            artId: art.id,
                            isActive: checked,
                          })
                        }
                        disabled={toggleArtStatusMutation.isPending || art.isGenerating}
                        data-testid={`switch-art-status-${art.id}`}
                      />
                      
                      <p className="text-xs text-gray-500">
                        {formatDate(art.generatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Art Details Modal */}
      <Dialog open={!!selectedArt} onOpenChange={() => setSelectedArt(null)}>
        <DialogContent className="max-w-2xl">
          {selectedArt && (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes da Arte IA</DialogTitle>
                <DialogDescription>
                  Informações completas sobre a arte gerada por IA
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Art Image */}
                <div className="space-y-4">
                  <div className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={selectedArt.imageUrl}
                      alt={selectedArt.productName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={selectedArt.isActive ? "default" : "secondary"}
                      className={selectedArt.isActive ? "bg-green-600" : ""}
                    >
                      {selectedArt.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                    <Badge className={getStyleColor(selectedArt.style)}>
                      {selectedArt.style}
                    </Badge>
                  </div>
                </div>
                
                {/* Art Info */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Produto</h4>
                    <p className="text-gray-700">{selectedArt.productName}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Loja</h4>
                    <p className="text-gray-700">{selectedArt.storeName}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Prompt Utilizado</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {selectedArt.prompt}
                    </p>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                        <Eye className="w-4 h-4" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{selectedArt.views}</p>
                      <p className="text-sm text-gray-500">Visualizações</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
                        <Download className="w-4 h-4" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{selectedArt.downloads}</p>
                      <p className="text-sm text-gray-500">Downloads</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Gerada em</h4>
                    <p className="text-gray-700">{formatDate(selectedArt.generatedAt)}</p>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => regenerateArtMutation.mutate(selectedArt.productId)}
                  disabled={regenerateArtMutation.isPending}
                  className="flex-1"
                  data-testid="button-regenerate-art-modal"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {regenerateArtMutation.isPending ? 'Regenerando...' : 'Forçar Nova Geração'}
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => deleteArtMutation.mutate(selectedArt.id)}
                  disabled={deleteArtMutation.isPending}
                  data-testid="button-delete-art-modal"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteArtMutation.isPending ? 'Deletando...' : 'Deletar'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}