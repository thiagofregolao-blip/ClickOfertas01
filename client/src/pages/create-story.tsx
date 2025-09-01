import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, X, ArrowLeft } from 'lucide-react';
import { useLocation, Link } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    <div className="fixed inset-0 bg-black z-50">
      {/* Header com fundo escuro estilo Instagram */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => window.history.back()}
            className="text-white hover:bg-white/20"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-white text-center flex-1">Criar Story</h1>
          <div className="w-10" />
        </div>
        
        {/* Info da loja */}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-[2px]">
            <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
              <span className="text-xs font-semibold">
                {((userStore as any)?.name || 'Loja').charAt(0)}
              </span>
            </div>
          </div>
          <span className="text-white text-sm font-medium">
            {(userStore as any)?.name || 'Sua Loja'}
          </span>
        </div>
      </div>

      {/* Área principal de criação - estilo story viewer */}
      <div className="w-full h-full relative flex items-center justify-center">
        <div className="w-full max-w-md h-full relative">
          
          {/* Preview da mídia ou área de upload */}
          <div className="w-full h-full relative bg-gray-900 rounded-none md:rounded-lg overflow-hidden">
            {mediaPreview ? (
              <div className="relative w-full h-full">
                {mediaType === 'image' ? (
                  <img 
                    src={mediaPreview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video 
                    src={mediaPreview} 
                    className="w-full h-full object-cover"
                    controls
                  />
                )}
                
                {/* Botão de remover mídia */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full"
                  onClick={clearMedia}
                  data-testid="button-clear-media"
                >
                  <X className="h-4 w-4" />
                </Button>
                
                {/* Overlay com informações do produto/vídeo */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  {/* Preview das informações do produto */}
                  {mediaType === 'image' && isProductPromo && formData.productName && (
                    <div className="text-white mb-4">
                      <h3 className="font-semibold text-lg">{formData.productName}</h3>
                      {formData.productPrice && (
                        <div className="flex items-center gap-2 mt-1">
                          {formData.productDiscountPrice && (
                            <span className="text-red-300 line-through text-sm">
                              {formData.productPrice}
                            </span>
                          )}
                          <span className="text-green-400 font-bold">
                            {formData.productDiscountPrice || formData.productPrice}
                          </span>
                        </div>
                      )}
                      {formData.productCategory && (
                        <span className="text-white/70 text-sm">#{formData.productCategory}</span>
                      )}
                    </div>
                  )}
                  
                  {/* Preview da legenda do vídeo */}
                  {mediaType === 'video' && formData.caption && (
                    <div className="text-white mb-4">
                      <p className="text-sm">{formData.caption}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                <div className="text-center mb-8">
                  <Camera className="h-16 w-16 mx-auto mb-4 text-white/60" />
                  <h2 className="text-xl font-semibold mb-2">Adicionar Mídia</h2>
                  <p className="text-white/70 text-sm">Escolha uma foto ou vídeo para seu story</p>
                </div>
                
                <div className="space-y-4 w-full max-w-xs">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCameraCapture}
                    className="w-full flex items-center gap-2 h-12 bg-white/10 border-white/20 text-white hover:bg-white/20"
                    data-testid="button-camera"
                  >
                    <Camera className="h-5 w-5" />
                    Tirar Foto
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2 h-12 bg-white/10 border-white/20 text-white hover:bg-white/20"
                    data-testid="button-upload-image"
                  >
                    <Upload className="h-5 w-5" />
                    Galeria de Fotos
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full flex items-center gap-2 h-12 bg-white/10 border-white/20 text-white hover:bg-white/20"
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Painel lateral/inferior para configurações - estilo modal */}
      {mediaPreview && (
        <div className="absolute bottom-0 left-0 right-0 md:top-0 md:right-0 md:bottom-auto md:left-auto md:w-80 bg-white dark:bg-gray-900 p-4 md:h-full overflow-y-auto z-20">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Configurações do Story</h3>
            
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
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={createStoryMutation.isPending}
                data-testid="button-publish-story"
              >
                {createStoryMutation.isPending ? 'Publicando...' : 'Publicar Story'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}