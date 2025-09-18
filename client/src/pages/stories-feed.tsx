import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Heart, Share2, Plus, Eye, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { TwoPartHeader, TOTAL_HEADER_HEIGHT } from '@/components/TwoPartHeader';

interface InstagramStory {
  id: string;
  storeId: string;
  userId: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  caption?: string;
  productName?: string;
  productPrice?: string;
  productDiscountPrice?: string;
  productCategory?: string;
  isProductPromo: boolean;
  backgroundColor: string;
  textColor: string;
  isActive: boolean;
  viewsCount: string;
  likesCount: string;
  expiresAt: string;
  createdAt: string;
  store: {
    id: string;
    name: string;
    logoUrl?: string;
    slug: string;
  };
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
}

export default function StoriesFeed() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Buscar todos os stories ativos
  const { data: stories = [], isLoading, error } = useQuery<InstagramStory[]>({
    queryKey: ['/api/instagram-stories'],
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Performance optimization: removed debug logs

  // Agrupar stories por loja
  const storiesGrouped = stories.reduce((acc, story) => {
    const storeId = story.store.id;
    if (!acc[storeId]) {
      acc[storeId] = {
        store: story.store,
        stories: [],
      };
    }
    acc[storeId].stories.push(story);
    return acc;
  }, {} as Record<string, { store: InstagramStory['store']; stories: InstagramStory[] }>);

  // Mutation para registrar visualização
  const viewStoryMutation = useMutation({
    mutationFn: async (storyId: string) => {
      const response = await fetch(`/api/instagram-stories/${storyId}/view`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to register view');
      return response.json();
    },
  });

  // Mutation para curtir/descurtir
  const likeStoryMutation = useMutation({
    mutationFn: async ({ storyId, isLiked }: { storyId: string; isLiked: boolean }) => {
      const method = isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/instagram-stories/${storyId}/like`, {
        method,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to like story');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/instagram-stories'] });
    },
  });

  const openStoryViewer = (storyIndex: number) => {
    setSelectedStoryIndex(storyIndex);
    setIsViewerOpen(true);
    
    // Registrar visualização
    const story = stories[storyIndex];
    if (story) {
      viewStoryMutation.mutate(story.id);
    }
  };

  const closeStoryViewer = () => {
    setIsViewerOpen(false);
    setSelectedStoryIndex(null);
  };

  const nextStory = () => {
    if (selectedStoryIndex !== null && selectedStoryIndex < stories.length - 1) {
      const newIndex = selectedStoryIndex + 1;
      setSelectedStoryIndex(newIndex);
      viewStoryMutation.mutate(stories[newIndex].id);
    }
  };

  const previousStory = () => {
    if (selectedStoryIndex !== null && selectedStoryIndex > 0) {
      const newIndex = selectedStoryIndex - 1;
      setSelectedStoryIndex(newIndex);
      viewStoryMutation.mutate(stories[newIndex].id);
    }
  };

  const handleLike = (story: InstagramStory) => {
    if (!isAuthenticated) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para curtir stories.',
      });
      return;
    }

    // Assumir que não está curtido (simplificado)
    likeStoryMutation.mutate({ storyId: story.id, isLiked: false });
  };

  const handleShare = async (story: InstagramStory) => {
    const shareData = {
      title: `Story de ${story.store.name}`,
      text: story.caption || `Confira este story de ${story.store.name}`,
      url: window.location.origin + `/stories/${story.id}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Erro ao compartilhar:', error);
      }
    } else {
      // Fallback: copiar para clipboard
      navigator.clipboard.writeText(shareData.url);
      toast({
        title: 'Link copiado!',
        description: 'O link do story foi copiado para a área de transferência.',
      });
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isViewerOpen) return;

      if (e.key === 'ArrowLeft') {
        previousStory();
      } else if (e.key === 'ArrowRight') {
        nextStory();
      } else if (e.key === 'Escape') {
        closeStoryViewer();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isViewerOpen, selectedStoryIndex]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando stories...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentStory = selectedStoryIndex !== null ? stories[selectedStoryIndex] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
      {/* TwoPartHeader with categories support */}
      <TwoPartHeader
        variant="full"
        title="Stories"
        isAuthenticated={isAuthenticated}
        user={user}
        onLogin={() => setLocation('/login')}
        onLogout={() => window.location.href = '/api/auth/logout'}
        showBack={true}
        onBack={() => setLocation('/')}
        gradient="bg-gradient-to-r from-purple-500 to-pink-500"
        data-testid="header-stories-feed"
      >
        {/* Botão de criar story no header */}
        {isAuthenticated && (
          <Button asChild data-testid="button-create-story" size="sm" className="bg-purple-600 hover:bg-purple-700">
            <Link href="/create-story" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Criar Story
            </Link>
          </Button>
        )}
      </TwoPartHeader>
      
      <div className="container mx-auto px-4" style={{ paddingTop: `${TOTAL_HEADER_HEIGHT + 24}px` }}>

        {/* Barra de Stories (horizontal scroll) */}
        <div className="mb-8">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {Object.entries(storiesGrouped).map(([storeId, { store, stories: storeStories }]) => (
              <div key={storeId} className="flex-shrink-0">
                <button
                  onClick={() => {
                    const firstStoryIndex = stories.findIndex(s => s.store.id === storeId);
                    if (firstStoryIndex !== -1) {
                      openStoryViewer(firstStoryIndex);
                    }
                  }}
                  className="flex flex-col items-center space-y-2 group"
                  data-testid={`story-button-${store.slug}`}
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full p-[3px] bg-gradient-to-r from-purple-500 to-pink-500">
                      <Avatar className="w-full h-full border-2 border-white dark:border-gray-800">
                        <AvatarImage src={store.logoUrl} alt={store.name} />
                        <AvatarFallback>{store.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className="absolute -bottom-1 -right-1 text-xs px-1.5 py-0.5"
                    >
                      {storeStories.length}
                    </Badge>
                  </div>
                  <span className="text-xs text-center max-w-[70px] truncate group-hover:text-purple-600">
                    {store.name}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Grid de Stories (preview) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {stories.map((story, index) => (
            <Card 
              key={story.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => openStoryViewer(index)}
              data-testid={`story-card-${story.id}`}
            >
              <CardContent className="p-0">
                <div className="relative aspect-[9/16] overflow-hidden rounded-t-lg">
                  {story.mediaType === 'image' ? (
                    <img
                      src={story.mediaUrl}
                      alt={story.productName || 'Story'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        console.log('❌ Erro ao carregar imagem do story:', story.id);
                        // Fallback para imagem padrão se der erro
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f3f4f6"/><text x="100" y="100" text-anchor="middle" fill="%23666">📷</text></svg>';
                      }}
                    />
                  ) : (
                    <video
                      src={story.mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                      onError={(e) => {
                        console.log('❌ Erro ao carregar vídeo do story:', story.id);
                      }}
                    />
                  )}
                  
                  {/* Overlay com informações */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20">
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={story.store.logoUrl} alt={story.store.name} />
                        <AvatarFallback className="text-xs">{story.store.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-white text-sm font-medium">
                        {story.store.name}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                      {story.isProductPromo && story.productName && (
                        <div className="text-white">
                          <h3 className="font-semibold text-sm mb-1">{story.productName}</h3>
                          {story.productPrice && (
                            <div className="flex items-center gap-2">
                              {story.productDiscountPrice && (
                                <span className="text-red-300 line-through text-xs">
                                  {story.productPrice}
                                </span>
                              )}
                              <span className="text-green-300 font-bold text-sm">
                                {story.productDiscountPrice || story.productPrice}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {story.caption && (
                        <p className="text-white text-sm mt-2 line-clamp-2">
                          {story.caption}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3 text-white/80 text-xs">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {story.viewsCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {story.likesCount}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {new Date(story.createdAt).toLocaleDateString('pt-BR')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mensagem quando não há stories */}
        {stories.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📱</div>
            <h3 className="text-xl font-semibold mb-2">Nenhum story ativo</h3>
            <p className="text-muted-foreground mb-6">
              Seja o primeiro a criar um story!
            </p>
            {isAuthenticated && (
              <Button asChild>
                <Link href="/create-story">Criar Meu Primeiro Story</Link>
              </Button>
            )}
          </div>
        )}

        {/* Debug info - temporário */}
        {!isLoading && (
          <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs">
            📊 Stories: {stories.length} | Loading: {isLoading ? 'Sim' : 'Não'}
          </div>
        )}
      </div>

      {/* Story Viewer Modal */}
      <Dialog open={isViewerOpen} onOpenChange={closeStoryViewer}>
        <DialogContent className="max-w-md p-0 bg-black border-none">
          {currentStory && (
            <div className="relative aspect-[9/16] w-full">
              {currentStory.mediaType === 'image' ? (
                <img
                  src={currentStory.mediaUrl}
                  alt={currentStory.productName || 'Story'}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <video
                  src={currentStory.mediaUrl}
                  className="w-full h-full object-cover rounded-lg"
                  controls
                  autoPlay
                />
              )}

              {/* Story Header */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={currentStory.store.logoUrl} alt={currentStory.store.name} />
                    <AvatarFallback>{currentStory.store.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white font-medium text-sm">{currentStory.store.name}</p>
                    <p className="text-white/70 text-xs">
                      {new Date(currentStory.createdAt).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={closeStoryViewer}
                  className="text-white hover:bg-white/20"
                  data-testid="button-close-story"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Story Content Overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                {currentStory.isProductPromo && currentStory.productName && (
                  <div className="bg-black/50 rounded-lg p-3 mb-3">
                    <h3 className="text-white font-semibold">{currentStory.productName}</h3>
                    {currentStory.productPrice && (
                      <div className="flex items-center gap-2 mt-1">
                        {currentStory.productDiscountPrice && (
                          <span className="text-red-300 line-through text-sm">
                            {currentStory.productPrice}
                          </span>
                        )}
                        <span className="text-green-300 font-bold">
                          {currentStory.productDiscountPrice || currentStory.productPrice}
                        </span>
                      </div>
                    )}
                    {currentStory.productCategory && (
                      <Badge variant="secondary" className="mt-2">
                        {currentStory.productCategory}
                      </Badge>
                    )}
                  </div>
                )}

                {currentStory.caption && (
                  <div className="bg-black/50 rounded-lg p-3 mb-3">
                    <p className="text-white">{currentStory.caption}</p>
                  </div>
                )}

                {/* Story Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(currentStory)}
                      className="text-white hover:bg-white/20 flex items-center gap-2"
                      data-testid="button-like-story"
                    >
                      <Heart className="h-5 w-5" />
                      {currentStory.likesCount}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShare(currentStory)}
                      className="text-white hover:bg-white/20"
                      data-testid="button-share-story"
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedStoryIndex !== null && selectedStoryIndex > 0 && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={previousStory}
                        className="text-white hover:bg-white/20"
                        data-testid="button-previous-story"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                    )}
                    {selectedStoryIndex !== null && selectedStoryIndex < stories.length - 1 && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={nextStory}
                        className="text-white hover:bg-white/20"
                        data-testid="button-next-story"
                      >
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="text-white/70 text-xs text-center mt-2">
                  {selectedStoryIndex !== null && (
                    <span>{selectedStoryIndex + 1} de {stories.length} stories</span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="absolute top-2 left-4 right-4">
                <div className="flex gap-1">
                  {Array.from({ length: stories.length }).map((_, index) => (
                    <div
                      key={index}
                      className={`h-0.5 flex-1 rounded-full ${
                        selectedStoryIndex !== null && index <= selectedStoryIndex
                          ? 'bg-white'
                          : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}