import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Monitor, 
  Plus, 
  Trash2, 
  Settings, 
  Play, 
  Pause, 
  Upload, 
  Image as ImageIcon, 
  Video,
  Clock,
  Palette
} from "lucide-react";

interface TotemContent {
  id: string;
  storeId: string;
  title?: string;
  description?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  duration: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface TotemSettings {
  id: string;
  storeId: string;
  backgroundColor: string;
  textColor: string;
  transitionEffect: string;
  defaultDuration: number;
  autoRotate: boolean;
  rotateInterval: number;
  isActive: boolean;
}

const contentSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  mediaUrl: z.string().url("URL inválida"),
  mediaType: z.enum(['image', 'video']),
  duration: z.number().min(1).max(60),
});

const settingsSchema = z.object({
  backgroundColor: z.string(),
  textColor: z.string(),
  transitionEffect: z.enum(['fade', 'slide', 'zoom']),
  defaultDuration: z.number().min(1).max(60),
  autoRotate: z.boolean(),
  rotateInterval: z.number().min(5).max(300),
});

type ContentFormData = z.infer<typeof contentSchema>;
type SettingsFormData = z.infer<typeof settingsSchema>;

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function TotemManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content');
  const [isCreateContentOpen, setIsCreateContentOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<TotemContent | null>(null);

  // Buscar dados da loja atual
  const { data: storeData } = useQuery({
    queryKey: ['/api/stores/me'],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Buscar conteúdo do totem
  const { data: totemContent = [], isLoading: contentLoading } = useQuery<TotemContent[]>({
    queryKey: ['/api/totem/content'],
    enabled: !!storeData?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Buscar configurações do totem
  const { data: totemSettings, isLoading: settingsLoading } = useQuery<TotemSettings>({
    queryKey: ['/api/totem/settings'],
    enabled: !!storeData?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Form para conteúdo
  const contentForm = useForm<ContentFormData>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      title: "",
      description: "",
      mediaUrl: "",
      mediaType: "image",
      duration: 5,
    },
  });

  // Form para configurações
  const settingsForm = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      backgroundColor: totemSettings?.backgroundColor || "#ffffff",
      textColor: totemSettings?.textColor || "#000000",
      transitionEffect: totemSettings?.transitionEffect || "fade",
      defaultDuration: totemSettings?.defaultDuration || 5,
      autoRotate: totemSettings?.autoRotate || true,
      rotateInterval: totemSettings?.rotateInterval || 30,
    },
  });

  // Mutation para criar conteúdo
  const createContentMutation = useMutation({
    mutationFn: async (data: ContentFormData) => {
      return await apiRequest('POST', '/api/totem/content', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/totem/content'] });
      setIsCreateContentOpen(false);
      contentForm.reset();
      toast({
        title: "Conteúdo adicionado",
        description: "Conteúdo adicionado ao totem com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar conteúdo. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar conteúdo
  const updateContentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContentFormData> }) => {
      return await apiRequest('PUT', `/api/totem/content/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/totem/content'] });
      setEditingContent(null);
      contentForm.reset();
      toast({
        title: "Conteúdo atualizado",
        description: "Conteúdo atualizado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar conteúdo. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar conteúdo
  const deleteContentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/totem/content/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/totem/content'] });
      toast({
        title: "Conteúdo removido",
        description: "Conteúdo removido do totem com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao remover conteúdo. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para alternar status ativo
  const toggleContentStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest('PUT', `/api/totem/content/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/totem/content'] });
      toast({
        title: "Status atualizado",
        description: "Status do conteúdo atualizado com sucesso!",
      });
    },
  });

  // Mutation para atualizar configurações
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      return await apiRequest('PUT', '/api/totem/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/totem/settings'] });
      toast({
        title: "Configurações salvas",
        description: "Configurações do totem atualizadas com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleEditContent = (content: TotemContent) => {
    setEditingContent(content);
    contentForm.reset({
      title: content.title || "",
      description: content.description || "",
      mediaUrl: content.mediaUrl,
      mediaType: content.mediaType,
      duration: content.duration,
    });
  };

  const onSubmitContent = (data: ContentFormData) => {
    if (editingContent) {
      updateContentMutation.mutate({ id: editingContent.id, data });
    } else {
      createContentMutation.mutate(data);
    }
  };

  const onSubmitSettings = (data: SettingsFormData) => {
    updateSettingsMutation.mutate(data);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Monitor className="w-7 h-7 text-purple-600" />
          Gerenciamento de Totem
        </h2>
        <p className="text-gray-500 mt-1">
          Gerencie o conteúdo e configurações do totem da sua loja
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === 'content' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('content')}
          className="flex-1"
          data-testid="tab-totem-content"
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          Conteúdo
        </Button>
        <Button
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('settings')}
          className="flex-1"
          data-testid="tab-totem-settings"
        >
          <Settings className="w-4 h-4 mr-2" />
          Configurações
        </Button>
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <ImageIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total de Conteúdo</p>
                    <p className="text-2xl font-bold text-gray-900">{totemContent.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Play className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Conteúdo Ativo</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {totemContent.filter(c => c.isActive).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Duração Total</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {totemContent.filter(c => c.isActive).reduce((sum, c) => sum + c.duration, 0)}s
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add Content Button */}
          <div className="flex justify-end">
            <Dialog open={isCreateContentOpen || !!editingContent} onOpenChange={(open) => {
              if (!open) {
                setIsCreateContentOpen(false);
                setEditingContent(null);
                contentForm.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsCreateContentOpen(true)} data-testid="button-add-content">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Conteúdo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingContent ? 'Editar' : 'Adicionar'} Conteúdo
                  </DialogTitle>
                  <DialogDescription>
                    {editingContent ? 'Edite' : 'Adicione'} imagens ou vídeos para exibir no totem
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...contentForm}>
                  <form onSubmit={contentForm.handleSubmit(onSubmitContent)} className="space-y-4">
                    <FormField
                      control={contentForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título (opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Título do conteúdo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={contentForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição (opcional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Descrição do conteúdo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={contentForm.control}
                      name="mediaUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL da Mídia</FormLabel>
                          <FormControl>
                            <Input placeholder="https://exemplo.com/imagem.jpg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={contentForm.control}
                        name="mediaType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Mídia</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="image">Imagem</SelectItem>
                                <SelectItem value="video">Vídeo</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={contentForm.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duração (segundos)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                max="60"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsCreateContentOpen(false);
                          setEditingContent(null);
                          contentForm.reset();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createContentMutation.isPending || updateContentMutation.isPending}
                        data-testid="button-save-content"
                      >
                        {(createContentMutation.isPending || updateContentMutation.isPending) ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Content List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Conteúdo do Totem ({totemContent.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contentLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2 text-sm">Carregando conteúdo...</p>
                </div>
              ) : totemContent.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Monitor className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Nenhum conteúdo adicionado</h3>
                  <p className="text-sm">Adicione imagens ou vídeos para exibir no totem.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {totemContent.map((content) => (
                    <div
                      key={content.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      data-testid={`content-item-${content.id}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          {content.mediaType === 'image' ? (
                            <img
                              src={content.mediaUrl}
                              alt={content.title || 'Conteúdo'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : (
                            <Video className="w-8 h-8 text-gray-400" />
                          )}
                          <div className="hidden w-full h-full flex items-center justify-center">
                            {content.mediaType === 'image' ? (
                              <ImageIcon className="w-8 h-8 text-gray-400" />
                            ) : (
                              <Video className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {content.title || `Conteúdo ${content.mediaType}`}
                            </h3>
                            <Badge variant={content.isActive ? "default" : "secondary"}>
                              {content.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                            <Badge variant="outline">
                              {content.mediaType === 'image' ? 'Imagem' : 'Vídeo'}
                            </Badge>
                          </div>
                          
                          {content.description && (
                            <p className="text-sm text-gray-600 mt-1 truncate">
                              {content.description}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {content.duration}s
                            </span>
                            <span>
                              Criado em {formatDate(content.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={content.isActive}
                          onCheckedChange={(checked) =>
                            toggleContentStatusMutation.mutate({
                              id: content.id,
                              isActive: checked,
                            })
                          }
                          disabled={toggleContentStatusMutation.isPending}
                          data-testid={`switch-content-status-${content.id}`}
                        />

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditContent(content)}
                          data-testid={`button-edit-content-${content.id}`}
                        >
                          Editar
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteContentMutation.mutate(content.id)}
                          disabled={deleteContentMutation.isPending}
                          data-testid={`button-delete-content-${content.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações do Totem
            </CardTitle>
          </CardHeader>
          <CardContent>
            {settingsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-500 mt-2 text-sm">Carregando configurações...</p>
              </div>
            ) : (
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(onSubmitSettings)} className="space-y-6">
                  {/* Visual Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                      <Palette className="w-5 h-5 text-blue-600" />
                      Aparência
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={settingsForm.control}
                        name="backgroundColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor de Fundo</FormLabel>
                            <FormControl>
                              <Input type="color" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={settingsForm.control}
                        name="textColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor do Texto</FormLabel>
                            <FormControl>
                              <Input type="color" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={settingsForm.control}
                      name="transitionEffect"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Efeito de Transição</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o efeito" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="fade">Fade</SelectItem>
                              <SelectItem value="slide">Slide</SelectItem>
                              <SelectItem value="zoom">Zoom</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Timing Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-green-600" />
                      Temporização
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={settingsForm.control}
                        name="defaultDuration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duração Padrão (segundos)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                max="60"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={settingsForm.control}
                        name="rotateInterval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Intervalo de Rotação (segundos)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="5" 
                                max="300"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={settingsForm.control}
                      name="autoRotate"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Rotação Automática</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Ativar rotação automática entre conteúdos
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateSettingsMutation.isPending}
                      data-testid="button-save-settings"
                    >
                      {updateSettingsMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}