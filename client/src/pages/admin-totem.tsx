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

  // Buscar dados da loja atual
  const { data: storeData } = useQuery({
    queryKey: ['/api/stores/me'],
    queryFn: async () => {
      const response = await fetch('/api/stores/me');
      return await response.json();
    }
  });

  // Buscar conteúdo atual do totem
  const { data: totemData, isLoading } = useQuery({
    queryKey: ['/api/totem/my-content'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/stores/me');
        const store = await response.json();
        if (store?.id) {
          const contentResponse = await fetch(`/api/totem/${store.id}/content`);
          const data = await contentResponse.json();
          return data;
        }
        return { content: [] };
      } catch (error) {
        console.error('Error fetching totem content:', error);
        return { content: [] };
      }
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
      // Limpar o formulário
      setNewContent({
        title: '',
        description: '',
        mediaUrl: '',
        mediaType: 'image' as 'image' | 'video',
        displayDuration: '10',
        scheduleStart: '',
        scheduleEnd: '',
        sortOrder: '0'
      });
      // Limpar estados de upload
      setUploadMethod('url');
      setSelectedFile(null);
      setIsUploading(false);
      // Limpar estados de IA
      setAiContent({
        title: '',
        description: '',
        style: 'moderno',
        colors: '',
        price: ''
      });
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

  const [uploadMethod, setUploadMethod] = useState<'url' | 'file' | 'ai'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Estados para geração com IA
  const [aiContent, setAiContent] = useState({
    title: '',
    description: '',
    style: 'moderno',
    colors: '',
    price: ''
  });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [generatedBanner, setGeneratedBanner] = useState<string | null>(null);

  // Mutation para gerar banner com IA
  const generateAIBannerMutation = useMutation({
    mutationFn: async (aiData: typeof aiContent) => {
      const response = await apiRequest('POST', '/api/totem/generate-banner', aiData);
      return await response.json(); // Processar JSON aqui
    },
    onSuccess: (data) => {
      console.log('🎯 AI Banner Response:', data);
      console.log('🎯 ImageUrl recebida:', data.imageUrl);
      
      // Salvar o banner gerado em estado específico
      setGeneratedBanner(data.imageUrl);
      
      // Usar o banner gerado como URL do conteúdo
      setNewContent(prev => {
        const newState = {
          ...prev,
          mediaUrl: data.imageUrl,
          title: aiContent.title,
          description: aiContent.description
        };
        console.log('🎯 Novo estado newContent:', newState);
        return newState;
      });
      
      toast({
        title: "Banner Gerado!",
        description: "Banner criado com IA. Revise e clique em 'Criar Conteúdo'",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na IA",
        description: error.message || "Erro ao gerar banner com IA",
        variant: "destructive",
      });
    }
  });

  const handleGenerateAI = async () => {
    if (!aiContent.title) {
      toast({
        title: "Erro",
        description: "Título é obrigatório para gerar com IA",
        variant: "destructive",
      });
      return;
    }
    
    generateAIBannerMutation.mutate(aiContent);
  };

  // Função para limpar estados quando mudar método
  const handleMethodChange = (newMethod: 'url' | 'file' | 'ai') => {
    setUploadMethod(newMethod);
    // Limpar estados dependendo do método anterior
    if (newMethod !== 'file') {
      setSelectedFile(null);
    }
    if (newMethod !== 'ai') {
      setAiContent({
        title: '',
        description: '',
        style: 'moderno',
        colors: '',
        price: ''
      });
      setGeneratedBanner(null);
    }
    if (newMethod !== 'url') {
      setNewContent(prev => ({ ...prev, mediaUrl: '' }));
    }
  };

  const handleSubmitContent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações específicas por método
    if (uploadMethod === 'url' && !newContent.mediaUrl) {
      toast({
        title: "Erro",
        description: "URL da mídia é obrigatória",
        variant: "destructive",
      });
      return;
    }
    
    if (uploadMethod === 'file' && !selectedFile) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo para upload",
        variant: "destructive",
      });
      return;
    }
    
    if (uploadMethod === 'ai' && !newContent.mediaUrl) {
      toast({
        title: "Erro",
        description: "Primeiro gere o banner com IA antes de criar o conteúdo",
        variant: "destructive",
      });
      return;
    }
    
    let mediaUrl = newContent.mediaUrl;
    
    // Se está usando upload de arquivo, fazer upload primeiro
    if (uploadMethod === 'file' && selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const response = await fetch('/api/totem/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Erro no upload');
        }
        
        const uploadResult = await response.json();
        mediaUrl = uploadResult.url;
      } catch (error) {
        toast({
          title: "Erro no upload",
          description: "Não foi possível fazer upload do arquivo",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }
    
    // Filtrar campos vazios antes de enviar
    const cleanContent = {
      title: newContent.title,
      description: newContent.description || undefined,
      mediaUrl: mediaUrl,
      mediaType: newContent.mediaType,
      displayDuration: newContent.displayDuration,
      sortOrder: newContent.sortOrder,
      ...(newContent.scheduleStart && { scheduleStart: newContent.scheduleStart }),
      ...(newContent.scheduleEnd && { scheduleEnd: newContent.scheduleEnd }),
    };
    
    createContentMutation.mutate(cleanContent);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-detectar tipo de mídia baseado no arquivo
      if (file.type.startsWith('image/')) {
        setNewContent(prev => ({ ...prev, mediaType: 'image' }));
      } else if (file.type.startsWith('video/')) {
        setNewContent(prev => ({ ...prev, mediaType: 'video' }));
      }
    }
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

                    {/* Opções de Mídia: URL, Upload Local ou Gerar com IA */}
                    <div className="space-y-4">
                      <div>
                        <Label>Como obter a mídia?</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                          <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="uploadMethod"
                              value="url"
                              checked={uploadMethod === 'url'}
                              onChange={(e) => handleMethodChange(e.target.value as 'url' | 'file' | 'ai')}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span>🌐 URL Externa</span>
                          </label>
                          <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="uploadMethod"
                              value="file"
                              checked={uploadMethod === 'file'}
                              onChange={(e) => handleMethodChange(e.target.value as 'url' | 'file' | 'ai')}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span>📁 Upload Local</span>
                          </label>
                          <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="uploadMethod"
                              value="ai"
                              checked={uploadMethod === 'ai'}
                              onChange={(e) => handleMethodChange(e.target.value as 'url' | 'file' | 'ai')}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span>🤖 Gerar com IA</span>
                          </label>
                        </div>
                      </div>

                      {uploadMethod === 'url' && (
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
                      )}

                      {uploadMethod === 'file' && (
                        <div>
                          <Label htmlFor="fileUpload">Selecionar Arquivo</Label>
                          <Input
                            id="fileUpload"
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleFileChange}
                            required
                            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            data-testid="input-file-upload"
                          />
                          {selectedFile && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600">
                                <strong>Arquivo:</strong> {selectedFile.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                Tamanho: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {uploadMethod === 'ai' && (
                        <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                          <div className="text-center mb-4">
                            <h3 className="text-lg font-semibold text-blue-700 mb-2">🤖 Gerar Banner com IA</h3>
                            <p className="text-sm text-blue-600">Descreva como você quer que seja o banner e a IA criará para você</p>
                          </div>

                          {/* Layout dividido: formulário à esquerda, preview à direita */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Formulário - Lado Esquerdo */}
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 gap-4">
                                <div>
                                  <Label htmlFor="aiTitle">Título do Banner *</Label>
                                  <Input
                                    id="aiTitle"
                                    value={aiContent.title}
                                    onChange={(e) => setAiContent(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Ex: Promoção Black Friday"
                                    required
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="aiPrice">Preço (opcional)</Label>
                                  <Input
                                    id="aiPrice"
                                    value={aiContent.price}
                                    onChange={(e) => setAiContent(prev => ({ ...prev, price: e.target.value }))}
                                    placeholder="Ex: R$ 199,90"
                                  />
                                </div>
                              </div>

                              <div>
                                <Label htmlFor="aiDescription">Descrição do produto/serviço</Label>
                                <Textarea
                                  id="aiDescription"
                                  value={aiContent.description}
                                  onChange={(e) => setAiContent(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="Ex: Smartphone Samsung Galaxy com tela de 6.5 polegadas"
                                  rows={3}
                                />
                              </div>

                              <div className="grid grid-cols-1 gap-4">
                                <div>
                                  <Label htmlFor="aiStyle">Estilo do Banner</Label>
                                  <Select
                                    value={aiContent.style}
                                    onValueChange={(value) => setAiContent(prev => ({ ...prev, style: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="moderno">Moderno e Minimalista</SelectItem>
                                      <SelectItem value="colorido">Colorido e Vibrante</SelectItem>
                                      <SelectItem value="elegante">Elegante e Sofisticado</SelectItem>
                                      <SelectItem value="promocional">Promocional e Chamativo</SelectItem>
                                      <SelectItem value="profissional">Profissional e Limpo</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="aiColors">Cores Preferidas</Label>
                                  <Input
                                    id="aiColors"
                                    value={aiContent.colors}
                                    onChange={(e) => setAiContent(prev => ({ ...prev, colors: e.target.value }))}
                                    placeholder="Ex: azul, branco, vermelho"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-center">
                                <Button
                                  type="button"
                                  onClick={handleGenerateAI}
                                  disabled={generateAIBannerMutation.isPending}
                                  className="bg-blue-600 hover:bg-blue-700 w-full"
                                >
                                  {generateAIBannerMutation.isPending ? (
                                    <>🔄 Gerando Banner...</>
                                  ) : (
                                    <>🎨 Gerar Banner com IA</>
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Preview - Lado Direito */}
                            <div className="space-y-4">
                              <div className="text-center">
                                <h4 className="text-md font-medium text-gray-700 mb-2">Preview do Banner</h4>
                                <p className="text-xs text-gray-500">A imagem aparecerá aqui após a geração</p>
                              </div>
                              
                              <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                                {/* Debug para ver se está chegando aqui */}
                                {uploadMethod === 'ai' && console.log('AI method selected, mediaUrl:', newContent.mediaUrl, 'generatedBanner:', generatedBanner)}
                                
                                {generatedBanner ? (
                                  <div className="space-y-3">
                                    {/* Imagem em formato totem (16:9) apenas */}
                                    <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden shadow-lg">
                                      <img 
                                        src={generatedBanner} 
                                        alt="Banner para totem" 
                                        className="w-full h-full object-cover"
                                        onLoad={() => console.log('✅ Imagem carregou com sucesso:', generatedBanner)}
                                        onError={(e) => {
                                          console.error('❌ Erro ao carregar imagem:', generatedBanner);
                                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyMCIgaGVpZ2h0PSIxMDgwIiB2aWV3Qm94PSIwIDAgMTkyMCAxMDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTkyMCIgaGVpZ2h0PSIxMDgwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9Ijk2MCIgeT0iNTQwIiBmaWxsPSIjNkI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDgiIGR5PSIuM2VtIj5FcnJvIGFvIGNhcnJlZ2FyIGltYWdlbTwvdGV4dD4KPHN2Zz4K';
                                        }}
                                      />
                                    </div>
                                    
                                    {/* Controles minimalistas */}
                                    <div className="flex justify-center space-x-2">
                                      <Button
                                        type="button"
                                        onClick={handleGenerateAI}
                                        disabled={generateAIBannerMutation.isPending}
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                      >
                                        {generateAIBannerMutation.isPending ? '🔄 Gerando...' : '🎨 Regenerar'}
                                      </Button>
                                      <Button
                                        type="button"
                                        onClick={() => setGeneratedBanner(null)}
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                      >
                                        🗑️ Limpar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center space-y-3 p-8">
                                    <div className="text-gray-400 text-6xl">🖼️</div>
                                    <p className="text-gray-500">Nenhum banner gerado ainda</p>
                                    <p className="text-xs text-gray-400">Preencha os campos ao lado e clique em "Gerar Banner com IA"</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
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
                        disabled={createContentMutation.isPending || isUploading}
                        data-testid="button-submit-content"
                      >
                        {isUploading ? "Fazendo Upload..." : createContentMutation.isPending ? "Criando..." : "Criar Conteúdo"}
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
                            onClick={() => {
                              if (storeData?.id) {
                                window.open(`/totem/${storeData.id}`, '_blank');
                              } else {
                                toast({
                                  title: "Erro",
                                  description: "ID da loja não encontrado",
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={!storeData?.id}
                            data-testid={`button-preview-${item.id}`}
                            title="Visualizar totem completo"
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