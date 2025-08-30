import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, X, ArrowLeft } from 'lucide-react';
import { useLocation, Link } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

type MediaType = 'image' | 'video';

interface StoryData {
  storeId: string;
  mediaType: MediaType;
  mediaUrl: string;
  caption?: string;
  productName?: string;
  productPrice?: string;
  productDiscountPrice?: string;
  productCategory?: string;
  isProductPromo: boolean;
  backgroundColor: string;
  textColor: string;
}

export default function CreateStory() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [isProductPromo, setIsProductPromo] = useState(false);

  const [formData, setFormData] = useState({
    caption: '',
    productName: '',
    productPrice: '',
    productDiscountPrice: '',
    productCategory: '',
    backgroundColor: '#ffffff',
    textColor: '#000000',
  });

  // Buscar loja do usuário
  const { data: userStore } = useQuery({
    queryKey: ['/api/stores/me'],
    enabled: isAuthenticated,
  });

  // Mutation para criar story
  const createStoryMutation = useMutation({
    mutationFn: async (storyData: StoryData) => {
      const response = await fetch('/api/instagram-stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyData),
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to create story');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Story criado!',
        description: 'Seu story foi publicado com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/instagram-stories'] });
      setLocation('/stories-feed');
    },
    onError: (error) => {
      console.error('Erro ao criar story:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o story. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: MediaType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Verificar tipo de arquivo
    const isValidImage = type === 'image' && file.type.startsWith('image/');
    const isValidVideo = type === 'video' && file.type.startsWith('video/');

    if (!isValidImage && !isValidVideo) {
      toast({
        title: 'Arquivo inválido',
        description: `Selecione um arquivo de ${type === 'image' ? 'imagem' : 'vídeo'} válido.`,
        variant: 'destructive',
      });
      return;
    }

    // Verificar tamanho (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo deve ter no máximo 50MB.',
        variant: 'destructive',
      });
      return;
    }

    setMediaFile(file);
    setMediaType(type);

    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = () => {
    // Para captura de câmera, vamos usar o input file com capture="environment"
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userStore || !(userStore as any).id) {
      toast({
        title: 'Erro',
        description: 'Você precisa ter uma loja para criar stories.',
        variant: 'destructive',
      });
      return;
    }

    if (!mediaFile || !mediaPreview) {
      toast({
        title: 'Mídia obrigatória',
        description: 'Selecione uma foto ou vídeo para o story.',
        variant: 'destructive',
      });
      return;
    }

    // Simular upload da mídia (normalmente seria para um serviço de storage)
    // Por enquanto, vamos usar o dataURL como URL temporário
    const storyData: StoryData = {
      storeId: (userStore as any).id,
      mediaType,
      mediaUrl: mediaPreview, // Em produção, seria a URL do arquivo no storage
      isProductPromo,
      backgroundColor: formData.backgroundColor,
      textColor: formData.textColor,
      ...(mediaType === 'image' && isProductPromo && {
        productName: formData.productName,
        productPrice: formData.productPrice,
        productDiscountPrice: formData.productDiscountPrice,
        productCategory: formData.productCategory,
      }),
      ...(mediaType === 'video' && {
        caption: formData.caption,
      }),
    };

    createStoryMutation.mutate(storyData);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-[400px]">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Você precisa estar logado para criar stories.
            </p>
            <Button asChild className="w-full mt-4">
              <Link href="/api/login">Fazer Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-center flex-1">Criar Story</h1>
          <div className="w-10" /> {/* Espaçador */}
        </div>

        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                {(userStore as any)?.name || 'Sua Loja'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload de Mídia */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Adicionar Mídia</Label>
                
                {mediaPreview ? (
                  <div className="relative">
                    {mediaType === 'image' ? (
                      <img 
                        src={mediaPreview} 
                        alt="Preview" 
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    ) : (
                      <video 
                        src={mediaPreview} 
                        className="w-full h-64 object-cover rounded-lg"
                        controls
                      />
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={clearMedia}
                      data-testid="button-clear-media"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {/* Botões de Upload */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCameraCapture}
                      className="flex items-center gap-2 h-12"
                      data-testid="button-camera"
                    >
                      <Camera className="h-5 w-5" />
                      Tirar Foto
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 h-12"
                      data-testid="button-upload-image"
                    >
                      <Upload className="h-5 w-5" />
                      Galeria de Fotos
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => videoInputRef.current?.click()}
                      className="flex items-center gap-2 h-12"
                      data-testid="button-upload-video"
                    >
                      <Upload className="h-5 w-5" />
                      Selecionar Vídeo
                    </Button>

                    {/* Inputs ocultos */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'image')}
                      className="hidden"
                    />
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleFileSelect(e, 'video')}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Formulário condicional baseado no tipo de mídia */}
              {mediaPreview && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Toggle para promoção de produto (apenas para imagens) */}
                  {mediaType === 'image' && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isProductPromo"
                        checked={isProductPromo}
                        onChange={(e) => setIsProductPromo(e.target.checked)}
                        className="rounded"
                        data-testid="checkbox-product-promo"
                      />
                      <Label htmlFor="isProductPromo">
                        Esta é uma promoção de produto
                      </Label>
                    </div>
                  )}

                  {/* Campos para promoção de produto (fotos) */}
                  {mediaType === 'image' && isProductPromo && (
                    <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h3 className="font-semibold text-blue-700 dark:text-blue-300">
                        Informações do Produto
                      </h3>
                      
                      <div>
                        <Label htmlFor="productName">Nome do Produto *</Label>
                        <Input
                          id="productName"
                          value={formData.productName}
                          onChange={(e) => setFormData({...formData, productName: e.target.value})}
                          placeholder="Ex: iPhone 15 Pro Max"
                          required
                          data-testid="input-product-name"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="productPrice">Preço</Label>
                          <Input
                            id="productPrice"
                            value={formData.productPrice}
                            onChange={(e) => setFormData({...formData, productPrice: e.target.value})}
                            placeholder="R$ 1.200"
                            data-testid="input-product-price"
                          />
                        </div>
                        <div>
                          <Label htmlFor="productDiscountPrice">Preço Promocional</Label>
                          <Input
                            id="productDiscountPrice"
                            value={formData.productDiscountPrice}
                            onChange={(e) => setFormData({...formData, productDiscountPrice: e.target.value})}
                            placeholder="R$ 999"
                            data-testid="input-discount-price"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="productCategory">Categoria</Label>
                        <Select 
                          value={formData.productCategory}
                          onValueChange={(value) => setFormData({...formData, productCategory: value})}
                        >
                          <SelectTrigger data-testid="select-product-category">
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="eletronicos">Eletrônicos</SelectItem>
                            <SelectItem value="roupas">Roupas & Acessórios</SelectItem>
                            <SelectItem value="casa">Casa & Jardim</SelectItem>
                            <SelectItem value="beleza">Beleza & Cuidados</SelectItem>
                            <SelectItem value="esportes">Esportes & Lazer</SelectItem>
                            <SelectItem value="alimentacao">Alimentação</SelectItem>
                            <SelectItem value="outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Campo de legenda (vídeos) */}
                  {mediaType === 'video' && (
                    <div>
                      <Label htmlFor="caption">Legenda do Vídeo</Label>
                      <Textarea
                        id="caption"
                        value={formData.caption}
                        onChange={(e) => setFormData({...formData, caption: e.target.value})}
                        placeholder="Escreva uma legenda para seu vídeo..."
                        rows={3}
                        data-testid="textarea-caption"
                      />
                    </div>
                  )}

                  {/* Personalização visual */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Personalização</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="backgroundColor">Cor de Fundo</Label>
                        <Input
                          id="backgroundColor"
                          type="color"
                          value={formData.backgroundColor}
                          onChange={(e) => setFormData({...formData, backgroundColor: e.target.value})}
                          className="h-10"
                          data-testid="input-bg-color"
                        />
                      </div>
                      <div>
                        <Label htmlFor="textColor">Cor do Texto</Label>
                        <Input
                          id="textColor"
                          type="color"
                          value={formData.textColor}
                          onChange={(e) => setFormData({...formData, textColor: e.target.value})}
                          className="h-10"
                          data-testid="input-text-color"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Botão de publicar */}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createStoryMutation.isPending}
                    data-testid="button-publish-story"
                  >
                    {createStoryMutation.isPending ? 'Publicando...' : 'Publicar Story'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}