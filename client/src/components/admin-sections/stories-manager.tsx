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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Instagram, 
  Plus, 
  Trash2, 
  Eye, 
  Heart, 
  Clock, 
  Users, 
  Search,
  Play,
  X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InstagramStory {
  id: string;
  storeId: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  isActive: boolean;
  views: number;
  likes: number;
  createdAt: string;
  expiresAt: string;
}

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function StoriesManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStory, setSelectedStory] = useState<InstagramStory | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Query para buscar stories
  const { data: stories = [], isLoading: storiesLoading } = useQuery<InstagramStory[]>({
    queryKey: ['/api/instagram-stories'],
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Mutation para deletar story
  const deleteStoryMutation = useMutation({
    mutationFn: async (storyId: string) => {
      return await apiRequest('DELETE', `/api/instagram-stories/${storyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/instagram-stories'] });
      setSelectedStory(null);
      toast({
        title: "Story deletado",
        description: "Story removido com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para deletar stories.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao deletar",
          description: "Não foi possível deletar o story.",
          variant: "destructive",
        });
      }
    },
  });

  // Mutation para alternar status ativo
  const toggleStoryStatusMutation = useMutation({
    mutationFn: async ({ storyId, isActive }: { storyId: string; isActive: boolean }) => {
      return await apiRequest('PUT', `/api/instagram-stories/${storyId}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/instagram-stories'] });
      toast({
        title: "Status atualizado",
        description: "Status do story atualizado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do story.",
        variant: "destructive",
      });
    },
  });

  const activeStories = stories.filter(story => story.isActive);
  const expiredStories = stories.filter(story => !story.isActive);

  const filteredStories = stories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = showActiveOnly ? story.isActive : true;
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

  const getTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR,
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Instagram className="w-7 h-7 text-pink-600" />
          Gerenciar Stories
        </h2>
        <p className="text-gray-500 mt-1">
          Gerencie seus stories do Instagram - ativos e expirados
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Buscar stories por título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-stories"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={showActiveOnly ? "default" : "outline"}
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            data-testid="button-filter-active"
          >
            {showActiveOnly ? "Todos" : "Somente Ativos"}
          </Button>
          
          <Button asChild data-testid="button-create-story">
            <a href="/create-story" target="_blank" rel="noopener noreferrer">
              <Plus className="w-4 h-4 mr-2" />
              Criar Story
            </a>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Instagram className="h-8 w-8 text-pink-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Stories</p>
                <p className="text-2xl font-bold text-gray-900">{stories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Play className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Stories Ativos</p>
                <p className="text-2xl font-bold text-gray-900">{activeStories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Views</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stories.reduce((sum, story) => sum + story.views, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Likes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stories.reduce((sum, story) => sum + story.likes, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stories List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="w-5 h-5" />
            Stories ({filteredStories.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {storiesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600 mx-auto"></div>
              <p className="text-gray-500 mt-2 text-sm">Carregando stories...</p>
            </div>
          ) : filteredStories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Instagram className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || showActiveOnly ? "Nenhum story encontrado" : "Nenhum story criado"}
              </h3>
              <p className="text-sm mb-4">
                {searchTerm || showActiveOnly 
                  ? "Tente ajustar os filtros de busca." 
                  : "Crie seu primeiro story para começar."
                }
              </p>
              {!searchTerm && !showActiveOnly && (
                <Button asChild>
                  <a href="/create-story" target="_blank" rel="noopener noreferrer">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Story
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStories.map((story) => (
                <div
                  key={story.id}
                  className={`relative group rounded-lg overflow-hidden border transition-all duration-200 hover:shadow-lg ${
                    story.isActive 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                  data-testid={`story-item-${story.id}`}
                >
                  {/* Story Image */}
                  <div className="relative aspect-[9/16] bg-gray-200">
                    <img
                      src={story.imageUrl}
                      alt={story.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-story.png';
                      }}
                    />
                    
                    {/* Status Badge */}
                    <div className="absolute top-2 left-2">
                      <Badge 
                        variant={story.isActive ? "default" : "secondary"}
                        className={story.isActive ? "bg-green-600" : ""}
                      >
                        {story.isActive ? "Ativo" : "Expirado"}
                      </Badge>
                    </div>
                    
                    {/* Actions Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white text-black hover:bg-gray-100"
                          onClick={() => setSelectedStory(story)}
                          data-testid={`button-view-story-${story.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white text-red-600 hover:bg-red-50"
                          onClick={() => deleteStoryMutation.mutate(story.id)}
                          disabled={deleteStoryMutation.isPending}
                          data-testid={`button-delete-story-${story.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Story Info */}
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                      {story.title}
                    </h3>
                    
                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {story.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {story.likes}
                        </span>
                      </div>
                    </div>
                    
                    {/* Dates */}
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(story.createdAt)}
                      </div>
                      {isExpired(story.expiresAt) && (
                        <div className="text-red-500">
                          Expirou em {formatDate(story.expiresAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Story Details Modal */}
      <Dialog open={!!selectedStory} onOpenChange={() => setSelectedStory(null)}>
        <DialogContent className="max-w-md">
          {selectedStory && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Detalhes do Story</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedStory(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Story Image */}
                <div className="relative aspect-[9/16] bg-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={selectedStory.imageUrl}
                    alt={selectedStory.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Story Info */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      {selectedStory.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant={selectedStory.isActive ? "default" : "secondary"}>
                        {selectedStory.isActive ? "Ativo" : "Expirado"}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                        <Eye className="w-4 h-4" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{selectedStory.views}</p>
                      <p className="text-sm text-gray-500">Views</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                        <Heart className="w-4 h-4" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{selectedStory.likes}</p>
                      <p className="text-sm text-gray-500">Likes</p>
                    </div>
                  </div>
                  
                  {/* Dates */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Criado:</span>
                      <span>{formatDate(selectedStory.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Expira:</span>
                      <span className={isExpired(selectedStory.expiresAt) ? "text-red-500" : ""}>
                        {formatDate(selectedStory.expiresAt)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Link */}
                  {selectedStory.linkUrl && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Link:</p>
                      <a
                        href={selectedStory.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm break-all"
                      >
                        {selectedStory.linkUrl}
                      </a>
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex space-x-2 pt-4 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteStoryMutation.mutate(selectedStory.id)}
                    disabled={deleteStoryMutation.isPending}
                    className="flex-1"
                    data-testid="button-delete-story-modal"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleteStoryMutation.isPending ? 'Deletando...' : 'Deletar Story'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}