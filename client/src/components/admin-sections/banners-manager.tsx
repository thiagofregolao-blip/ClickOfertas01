import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Image, Plus, Edit2, Trash2 } from "lucide-react";

// Schema do banner
const bannerSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  imageUrl: z.string().url("URL inválida"),
  linkUrl: z.string().optional(),
  bannerType: z.enum(["rotating", "static_left", "static_right"]),
  priority: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
});

type BannerFormData = z.infer<typeof bannerSchema>;

interface Banner {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  bannerType: string;
  priority: number;
  backgroundColor: string;
  textColor: string;
  isActive: boolean;
  createdAt: string;
}

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function BannersManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateBannerOpen, setIsCreateBannerOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  // Query para buscar banners
  const { data: banners = [], isLoading: bannersLoading } = useQuery<Banner[]>({
    queryKey: ['/api/admin/banners'],
    enabled: !!user?.isSuperAdmin,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Form para criar/editar banner
  const form = useForm<BannerFormData>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
      linkUrl: "",
      bannerType: "rotating",
      priority: "0",
      backgroundColor: "#ffffff",
      textColor: "#000000",
    },
  });

  // Reset form quando editando
  const handleEditBanner = (banner: Banner) => {
    setEditingBanner(banner);
    form.reset({
      title: banner.title,
      description: banner.description || "",
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || "",
      bannerType: banner.bannerType as any,
      priority: banner.priority.toString(),
      backgroundColor: banner.backgroundColor,
      textColor: banner.textColor,
    });
  };

  // Mutation para criar banner
  const createBannerMutation = useMutation({
    mutationFn: async (data: BannerFormData) => {
      return await apiRequest('POST', '/api/admin/banners', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] });
      setIsCreateBannerOpen(false);
      form.reset();
      toast({
        title: "Banner criado",
        description: "Banner criado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para criar banners.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao criar banner. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  // Mutation para atualizar banner
  const updateBannerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BannerFormData> & { isActive?: boolean } }) => {
      return await apiRequest('PUT', `/api/admin/banners/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] });
      setEditingBanner(null);
      form.reset();
      toast({
        title: "Banner atualizado",
        description: "Banner atualizado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para atualizar banners.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao atualizar banner. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  // Mutation para deletar banner
  const deleteBannerMutation = useMutation({
    mutationFn: async (bannerId: string) => {
      return await apiRequest('DELETE', `/api/admin/banners/${bannerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] });
      toast({
        title: "Banner deletado",
        description: "Banner deletado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para deletar banners.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao deletar banner. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = async (data: BannerFormData) => {
    if (editingBanner) {
      updateBannerMutation.mutate({ id: editingBanner.id, data });
    } else {
      createBannerMutation.mutate(data);
    }
  };

  const handleToggleActive = (banner: Banner) => {
    updateBannerMutation.mutate({
      id: banner.id,
      data: { isActive: !banner.isActive }
    });
  };

  const handleDeleteBanner = (bannerId: string) => {
    if (confirm("Tem certeza que deseja excluir este banner?")) {
      deleteBannerMutation.mutate(bannerId);
    }
  };

  const getBannerTypeLabel = (type: string) => {
    const types = {
      rotating: "Rotativo",
      static_left: "Estático Esquerdo",
      static_right: "Estático Direito"
    };
    return types[type as keyof typeof types] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Image className="w-7 h-7 text-red-600" />
            Gerenciamento de Banners
          </h2>
          <p className="text-gray-500 mt-1">
            Gerencie os banners exibidos na página principal do site
          </p>
        </div>
        
        <Dialog open={isCreateBannerOpen || !!editingBanner} onOpenChange={(open) => {
          if (!open) {
            setIsCreateBannerOpen(false);
            setEditingBanner(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setIsCreateBannerOpen(true)}
              data-testid="button-create-banner"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Banner
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? 'Editar Banner' : 'Criar Novo Banner'}
              </DialogTitle>
              <DialogDescription>
                {editingBanner 
                  ? 'Atualize as informações do banner.' 
                  : 'Crie um novo banner para a página principal.'
                }
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o título do banner" {...field} data-testid="input-banner-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bannerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo do Banner</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-banner-type">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="rotating">Rotativo</SelectItem>
                            <SelectItem value="static_left">Estático Esquerdo</SelectItem>
                            <SelectItem value="static_right">Estático Direito</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Digite uma descrição para o banner" {...field} data-testid="input-banner-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL da Imagem</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://exemplo.com/imagem.jpg" 
                          {...field} 
                          data-testid="input-banner-image-url" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do Link (Opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://exemplo.com" 
                          {...field} 
                          data-testid="input-banner-link-url" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0" 
                            type="number" 
                            {...field} 
                            data-testid="input-banner-priority" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="backgroundColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor de Fundo</FormLabel>
                        <FormControl>
                          <Input 
                            type="color" 
                            {...field} 
                            data-testid="input-banner-bg-color" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="textColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor do Texto</FormLabel>
                        <FormControl>
                          <Input 
                            type="color" 
                            {...field} 
                            data-testid="input-banner-text-color" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsCreateBannerOpen(false);
                      setEditingBanner(null);
                      form.reset();
                    }}
                    data-testid="button-cancel-banner"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-red-600 hover:bg-red-700"
                    disabled={createBannerMutation.isPending || updateBannerMutation.isPending}
                    data-testid="button-save-banner"
                  >
                    {(createBannerMutation.isPending || updateBannerMutation.isPending) 
                      ? 'Salvando...' 
                      : editingBanner ? 'Atualizar' : 'Criar'
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Banners */}
      {bannersLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Carregando banners...</p>
        </div>
      ) : banners.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Image className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Nenhum banner encontrado.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setIsCreateBannerOpen(true)}
            >
              Criar Primeiro Banner
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {banners.map((banner) => (
            <Card key={banner.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-lg">{banner.title}</CardTitle>
                    <Badge variant={banner.isActive ? "default" : "secondary"}>
                      {banner.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                    <Badge variant="outline">
                      {getBannerTypeLabel(banner.bannerType)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={banner.isActive}
                      onCheckedChange={() => handleToggleActive(banner)}
                      data-testid={`switch-banner-active-${banner.id}`}
                    />
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditBanner(banner)}
                      data-testid={`button-edit-banner-${banner.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDeleteBanner(banner.id)}
                      data-testid={`button-delete-banner-${banner.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex gap-4">
                  {banner.imageUrl && (
                    <img 
                      src={banner.imageUrl} 
                      alt={banner.title}
                      className="w-24 h-16 object-cover rounded border"
                    />
                  )}
                  <div className="flex-1">
                    {banner.description && (
                      <p className="text-sm text-gray-600 mb-2">{banner.description}</p>
                    )}
                    <div className="text-xs text-gray-400 space-y-1">
                      <p>Prioridade: {banner.priority}</p>
                      {banner.linkUrl && <p>Link: {banner.linkUrl}</p>}
                      <p>Criado: {new Date(banner.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}