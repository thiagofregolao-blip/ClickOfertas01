import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { User, Save, ArrowLeft, Camera, Settings, ShoppingCart, BarChart3, LogOut } from "lucide-react";
import { Link } from "wouter";
import type { User as UserType } from "@shared/schema";

// Schema de validação para edição de perfil
const updateUserSchema = z.object({
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  profileImageUrl: z.string().optional(),
});

type UpdateUserFormData = z.infer<typeof updateUserSchema>;

export default function UserSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  if (!user) {
    setLocation('/cards');
    return null;
  }

  const form = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      profileImageUrl: user.profileImageUrl || '',
    },
  });

  // Função para fazer upload da imagem
  const uploadImage = async (file: File): Promise<string> => {
    setIsUploading(true);
    
    try {
      // 1. Obter URL de upload
      const uploadResponse = await apiRequest("POST", "/api/objects/upload", {});
      const uploadData = await uploadResponse.json();
      const uploadURL = uploadData.uploadURL;

      // 2. Fazer upload do arquivo
      const response = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!response.ok) {
        throw new Error('Falha no upload da imagem');
      }

      // 3. Definir ACL e obter URL final
      const aclResponse = await apiRequest("PUT", "/api/profile-images", {
        imageURL: uploadURL.split('?')[0], // Remove query parameters
      });

      const aclData = await aclResponse.json();
      return aclData.objectPath; // Retorna caminho da imagem
      
    } finally {
      setIsUploading(false);
    }
  };

  const updateUserMutation = useMutation({
    mutationFn: async (data: UpdateUserFormData) => {
      let finalData = { ...data };
      
      // Se há arquivo selecionado, fazer upload primeiro
      if (selectedFile) {
        const imagePath = await uploadImage(selectedFile);
        finalData.profileImageUrl = imagePath;
      }
      
      return await apiRequest("PUT", "/api/auth/user", finalData);
    },
    onSuccess: () => {
      toast({
        title: "✅ Perfil atualizado",
        description: "Suas informações foram salvas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setSelectedFile(null);
      setPreviewUrl("");
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao salvar",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Função para lidar com seleção de arquivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "❌ Arquivo inválido",
        description: "Selecione apenas arquivos de imagem (JPG, PNG, GIF, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "❌ Arquivo muito grande",
        description: "O tamanho máximo é 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (data: UpdateUserFormData) => {
    updateUserMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b shadow-sm sticky top-0 z-10" style={{background: 'linear-gradient(to bottom right, #F04940, #FA7D22)'}}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/cards')}
              className="flex items-center gap-2 text-white hover:bg-white/10"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Configurações do Perfil</h1>
              <p className="text-sm text-white/90">Gerencie suas informações pessoais</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-6">
          
          {/* Card de Foto de Perfil */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                Foto de Perfil
              </CardTitle>
              <CardDescription>
                Esta imagem aparecerá nos stories e será visível para outros usuários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preview da foto */}
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                  {previewUrl || user.profileImageUrl ? (
                    <img 
                      src={previewUrl || user.profileImageUrl || ""} 
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement as HTMLElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-12 h-12 text-blue-600 flex items-center justify-center"><svg fill="currentColor" viewBox="0 0 24 24" class="w-12 h-12"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>';
                        }
                      }}
                    />
                  ) : (
                    <User className="w-12 h-12 text-blue-600" />
                  )}
                </div>
                
                <div className="flex-1 space-y-3">
                  {selectedFile && (
                    <div className="text-sm text-gray-600">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-gray-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)}MB
                      </p>
                    </div>
                  )}
                  
                  {/* Input de arquivo */}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="profile-image-upload"
                      data-testid="input-profile-file"
                    />
                    <label
                      htmlFor="profile-image-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      <span>
                        {selectedFile ? "Trocar Foto" : "Selecionar Foto"}
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Selecione um arquivo JPG, PNG ou GIF (máx. 5MB)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Informações Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>
                Mantenha seus dados atualizados para uma melhor experiência
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nome */}
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Seu primeiro nome"
                              className="border-gray-300 focus:border-blue-500"
                              data-testid="input-first-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Sobrenome */}
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sobrenome</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Seu sobrenome"
                              className="border-gray-300 focus:border-blue-500"
                              data-testid="input-last-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="seu@email.com"
                            className="border-gray-300 focus:border-blue-500"
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Telefone */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="(11) 99999-9999"
                            className="border-gray-300 focus:border-blue-500"
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Botão de salvar */}
                  <div className="flex justify-end pt-6">
                    <Button
                      type="submit"
                      disabled={isUploading || updateUserMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 px-8"
                      data-testid="button-save"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Enviando foto...
                        </>
                      ) : updateUserMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Menu do Rodapé Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around py-2 px-4">
          {/* Home */}
          <Link href="/cards">
            <button
              className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
              data-testid="button-mobile-home"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
              <span className="text-xs">Home</span>
            </button>
          </Link>
          
          {/* Lista de Compras */}
          <button
            onClick={() => setLocation('/shopping-list')}
            className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
            data-testid="button-mobile-shopping"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-xs">Lista</span>
          </button>
          
          {/* Comparar Preços */}
          <Link href="/price-comparison">
            <button
              className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
              data-testid="button-mobile-comparison"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-xs">Comparar</span>
            </button>
          </Link>
          
          {/* Meus Cupons */}
          <button
            onClick={() => setLocation('/my-coupons')}
            className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
            data-testid="button-mobile-coupons"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="18" rx="2" ry="2"/>
              <line x1="8" y1="2" x2="8" y2="22"/>
              <line x1="16" y1="2" x2="16" y2="22"/>
            </svg>
            <span className="text-xs">Cupons</span>
          </button>
          
          {/* Sair */}
          <button
            onClick={() => {
              window.location.href = '/api/logout';
            }}
            className="flex flex-col items-center gap-1 p-2 text-red-600 hover:text-red-700"
            data-testid="button-mobile-logout"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-xs">Sair</span>
          </button>
        </div>
      </div>
    </div>
  );
}