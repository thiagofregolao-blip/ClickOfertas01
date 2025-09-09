import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Plus, Monitor, Settings, Upload, Play, Pause, Eye, Clock } from "lucide-react";
import AdminLayout from "@/components/admin-layout";
import type { TotemContent, TotemSettings } from "@shared/schema";

export default function AdminTotem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content');
  const [isCreating, setIsCreating] = useState(false);

  // Buscar conteúdo atual do totem
  const { data: totemData, isLoading } = useQuery({
    queryKey: ['/api/totem/my-content'],
    queryFn: async () => {
      const response = await fetch('/api/stores/me');
      const store = await response.json();
      if (store?.id) {
        const contentResponse = await fetch(`/api/totem/${store.id}/content`);
        return await contentResponse.json();
      }
      return { content: [] };
    }
  });

  // Buscar configurações do totem
  const { data: settingsData } = useQuery({
    queryKey: ['/api/totem/settings'],
    queryFn: async () => {
      const response = await fetch('/api/totem/settings');
      return await response.json();
    }
  });

  const content = totemData?.content || [];
  const settings = settingsData?.settings;

  // Mutation para criar conteúdo
  const createContentMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/totem/content', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/totem/my-content'] });
      toast({
        title: "Sucesso!",
        description: "Conteúdo criado com sucesso",
      });
      setIsCreating(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar conteúdo",
        variant: "destructive",
      });
    }
  });

  // Mutation para deletar conteúdo
  const deleteContentMutation = useMutation({
    mutationFn: async (contentId: string) => {
      return await apiRequest('DELETE', `/api/totem/content/${contentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/totem/my-content'] });
      toast({
        title: "Sucesso!",
        description: "Conteúdo removido com sucesso",
      });
    }
  });

  // Mutation para atualizar configurações
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/totem/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/totem/settings'] });
      toast({
        title: "Sucesso!",
        description: "Configurações atualizadas com sucesso",
      });
    }
  });

  const [newContent, setNewContent] = useState({
    title: '',
    description: '',
    mediaUrl: '',
    mediaType: 'image' as 'image' | 'video',
    displayDuration: '10',
    scheduleStart: '',
    scheduleEnd: '',
    sortOrder: '0'
  });

  const handleSubmitContent = (e: React.FormEvent) => {
    e.preventDefault();
    createContentMutation.mutate(newContent);
  };

  const handleDeleteContent = (contentId: string) => {
    if (confirm('Tem certeza que deseja remover este conteúdo?')) {
      deleteContentMutation.mutate(contentId);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Totem</h1>
            <p className="text-gray-600">Configure o conteúdo exibido nas TVs do totem</p>
          </div>
          <div className="flex items-center space-x-2">
            <Monitor className="w-5 h-5 text-gray-400" />
            <Badge variant="secondary">
              {content.length} conteúdos
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <Button
            variant={activeTab === 'content' ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab('content')}
            data-testid="tab-content"
          >
            Conteúdo
          </Button>
          <Button
            variant={activeTab === 'settings' ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab('settings')}
            data-testid="tab-settings"
          >
            Configurações
          </Button>
        </div>

        {activeTab === 'content' && (
          <div className="space-y-6">
            {/* Botão para adicionar conteúdo */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Conteúdo do Totem</CardTitle>
                  <CardDescription>
                    Gerencie as artes e vídeos exibidos no totem
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setIsCreating(!isCreating)}
                  data-testid="button-add-content"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Conteúdo
                </Button>
              </CardHeader>
            </Card>

            {/* Formulário de criação */}
            {isCreating && (
              <Card>
                <CardHeader>
                  <CardTitle>Novo Conteúdo</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitContent} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="title">Título</Label>
                        <Input
                          id="title"
                          value={newContent.title}
                          onChange={(e) => setNewContent(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Nome do conteúdo"
                          required
                          data-testid="input-title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mediaType">Tipo de Mídia</Label>
                        <Select
                          value={newContent.mediaType}
                          onValueChange={(value) => setNewContent(prev => ({ ...prev, mediaType: value as 'image' | 'video' }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="image">Imagem</SelectItem>
                            <SelectItem value="video">Vídeo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Descrição (opcional)</Label>
                      <Textarea
                        id="description"
                        value={newContent.description}
                        onChange={(e) => setNewContent(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descrição do conteúdo"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="mediaUrl">URL da Mídia</Label>
                      <Input
                        id="mediaUrl"
                        value={newContent.mediaUrl}
                        onChange={(e) => setNewContent(prev => ({ ...prev, mediaUrl: e.target.value }))}
                        placeholder="https://exemplo.com/imagem.jpg"
                        type="url"
                        required
                        data-testid="input-media-url"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="displayDuration">Duração (segundos)</Label>
                        <Input
                          id="displayDuration"
                          type="number"
                          min="1"
                          max="300"
                          value={newContent.displayDuration}
                          onChange={(e) => setNewContent(prev => ({ ...prev, displayDuration: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="scheduleStart">Início (opcional)</Label>
                        <Input
                          id="scheduleStart"
                          type="datetime-local"
                          value={newContent.scheduleStart}
                          onChange={(e) => setNewContent(prev => ({ ...prev, scheduleStart: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="scheduleEnd">Fim (opcional)</Label>
                        <Input
                          id="scheduleEnd"
                          type="datetime-local"
                          value={newContent.scheduleEnd}
                          onChange={(e) => setNewContent(prev => ({ ...prev, scheduleEnd: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreating(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={createContentMutation.isPending}
                        data-testid="button-submit-content"
                      >
                        {createContentMutation.isPending ? "Criando..." : "Criar Conteúdo"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Lista de conteúdo */}
            <div className="grid gap-4">
              {content.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Monitor className="w-12 h-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum conteúdo cadastrado
                    </h3>
                    <p className="text-gray-500 text-center mb-4">
                      Adicione imagens ou vídeos para exibir no seu totem
                    </p>
                    <Button onClick={() => setIsCreating(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Primeiro Conteúdo
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                content.map((item: TotemContent) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                            {item.mediaType === 'image' ? (
                              <img
                                src={item.mediaUrl}
                                alt={item.title}
                                className="w-full h-full object-cover rounded-lg"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NFY0NEgyMFYyMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTI4IDI4TDM2IDM2TDQwIDMyIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=';
                                }}
                              />
                            ) : (
                              <Play className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{item.title}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                              <div className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {item.displayDuration}s
                              </div>
                              <Badge variant={item.isActive ? "default" : "secondary"}>
                                {item.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                              <span className="capitalize">{item.mediaType}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(item.mediaUrl, '_blank')}
                            data-testid={`button-preview-${item.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteContent(item.id)}
                            disabled={deleteContentMutation.isPending}
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Configurações do Totem
              </CardTitle>
              <CardDescription>
                Configure a aparência e comportamento do totem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Cor de Fundo</Label>
                    <Input
                      type="color"
                      defaultValue={settings?.backgroundColor || "#000000"}
                      className="w-full h-10"
                    />
                  </div>
                  <div>
                    <Label>Efeito de Transição</Label>
                    <Select defaultValue={settings?.transitionEffect || "fade"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fade">Fade</SelectItem>
                        <SelectItem value="slide">Deslizar</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Intervalo de Rotação (segundos)</Label>
                    <Input
                      type="number"
                      min="5"
                      max="300"
                      defaultValue={settings?.rotationInterval || "10"}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Rotação Automática</Label>
                    <Switch defaultChecked={settings?.autoRotate !== false} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => updateSettingsMutation.mutate({})}
                    disabled={updateSettingsMutation.isPending}
                    data-testid="button-save-settings"
                  >
                    {updateSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}