import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, Trash2, Clock, Users, X } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InstagramStory } from "@shared/schema";
import { useState } from "react";

export default function AdminStories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStory, setSelectedStory] = useState<InstagramStory | null>(null);

  // Buscar stories da loja
  const { data: stories, isLoading } = useQuery<InstagramStory[]>({
    queryKey: ["/api/instagram-stories"],
  });

  // Mutation para deletar story
  const deleteStoryMutation = useMutation({
    mutationFn: async (storyId: string) => {
      const response = await fetch(`/api/instagram-stories/${storyId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete story");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instagram-stories"] });
      toast({
        title: "Story deletado!",
        description: "O story foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao deletar",
        description: "Não foi possível deletar o story.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  const activeStories = stories?.filter(story => story.isActive) || [];
  const expiredStories = stories?.filter(story => !story.isActive) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciar Stories</h1>
            <p className="text-gray-600 mt-1">
              Gerencie os stories da sua loja. Stories ficam ativos por 24 horas.
            </p>
          </div>
          
          <Link href="/create-story">
            <Button data-testid="button-create-story">
              <Plus className="w-4 h-4 mr-2" />
              Criar Story
            </Button>
          </Link>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Eye className="h-8 w-8 text-blue-600" />
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
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Visualizações</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stories?.reduce((sum, story) => sum + parseInt(story.viewsCount || "0"), 0) || 0}
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
                  <p className="text-sm font-medium text-gray-600">Stories Expirados</p>
                  <p className="text-2xl font-bold text-gray-900">{expiredStories.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Stories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2 text-blue-600" />
              Stories Ativos ({activeStories.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeStories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhum story ativo no momento.</p>
                <Link href="/create-story">
                  <Button variant="outline" className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Story
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeStories.map((story) => (
                  <div key={story.id} className="border rounded-lg p-4">
                    {story.mediaUrl && (
                      <>
                        {story.mediaType === 'photo' || story.mediaType === 'image' ? (
                          <img
                            src={story.mediaUrl}
                            alt="Story"
                            className="w-full h-32 object-cover rounded-md mb-3"
                            data-testid={`img-story-${story.id}`}
                          />
                        ) : (
                          <video
                            src={story.mediaUrl}
                            className="w-full h-32 object-cover rounded-md mb-3"
                            controls={false}
                            muted
                            data-testid={`video-story-${story.id}`}
                          />
                        )}
                      </>
                    )}
                    
                    <div className="space-y-2">
                      <Badge variant="secondary" className="text-green-700 bg-green-100">
                        Ativo
                      </Badge>
                      
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {story.caption}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{story.viewsCount} visualizações</span>
                        <span>
                          Expira {formatDistanceToNow(new Date(story.expiresAt), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          data-testid={`button-view-story-${story.id}`}
                          onClick={() => setSelectedStory(story)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                        
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteStoryMutation.mutate(story.id)}
                          disabled={deleteStoryMutation.isPending}
                          data-testid={`button-delete-story-${story.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Deletar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expired Stories */}
        {expiredStories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-gray-600" />
                Stories Expirados ({expiredStories.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expiredStories.map((story) => (
                  <div key={story.id} className="border rounded-lg p-4 opacity-60">
                    {story.mediaUrl && (
                      <>
                        {story.mediaType === 'photo' || story.mediaType === 'image' ? (
                          <img
                            src={story.mediaUrl}
                            alt="Story"
                            className="w-full h-32 object-cover rounded-md mb-3"
                            data-testid={`img-expired-story-${story.id}`}
                          />
                        ) : (
                          <video
                            src={story.mediaUrl}
                            className="w-full h-32 object-cover rounded-md mb-3"
                            controls={false}
                            muted
                            data-testid={`video-expired-story-${story.id}`}
                          />
                        )}
                      </>
                    )}
                    
                    <div className="space-y-2">
                      <Badge variant="outline" className="text-gray-500">
                        Expirado
                      </Badge>
                      
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {story.caption}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{story.viewsCount} visualizações</span>
                        <span>
                          Expirado {formatDistanceToNow(new Date(story.expiresAt), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                      
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteStoryMutation.mutate(story.id)}
                          disabled={deleteStoryMutation.isPending}
                          data-testid={`button-delete-expired-story-${story.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Story Preview Dialog */}
      <Dialog open={!!selectedStory} onOpenChange={(open) => !open && setSelectedStory(null)}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Preview do Story</span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedStory(null)} data-testid="button-close-story">
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedStory && (
            <div className="space-y-4">
              {/* Story Media */}
              {selectedStory.mediaUrl && (
                <div className="w-full">
                  {selectedStory.mediaType === 'photo' || selectedStory.mediaType === 'image' ? (
                    <img
                      src={selectedStory.mediaUrl}
                      alt="Story"
                      className="w-full max-h-96 object-cover rounded-md"
                      data-testid={`popup-img-story-${selectedStory.id}`}
                    />
                  ) : (
                    <video
                      src={selectedStory.mediaUrl}
                      className="w-full max-h-96 object-cover rounded-md"
                      controls
                      data-testid={`popup-video-story-${selectedStory.id}`}
                    />
                  )}
                </div>
              )}
              
              {/* Story Caption */}
              {selectedStory.caption && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-700">{selectedStory.caption}</p>
                </div>
              )}
              
              {/* Story Stats */}
              <div className="flex items-center justify-between text-sm text-gray-500 pt-2">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {parseInt(selectedStory.viewsCount || "0")} visualizações
                  </span>
                  <Badge variant={selectedStory.isActive ? "default" : "outline"}>
                    {selectedStory.isActive ? "Ativo" : "Expirado"}
                  </Badge>
                </div>
                <span>
                  {selectedStory.isActive 
                    ? `Expira ${formatDistanceToNow(new Date(selectedStory.expiresAt), { addSuffix: true, locale: ptBR })}`
                    : `Expirado ${formatDistanceToNow(new Date(selectedStory.expiresAt), { addSuffix: true, locale: ptBR })}`
                  }
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}