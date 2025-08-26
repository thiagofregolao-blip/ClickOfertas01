import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Edit, Save, X, Camera, Upload } from "lucide-react";
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

interface UserConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
}

export default function UserConfigModal({ isOpen, onClose, user }: UserConfigModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

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
      const formData = new FormData();
      formData.append('file', file);
      
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
      onClose();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Configurações do Perfil
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Upload de Foto de Perfil */}
            <div className="flex flex-col items-center space-y-4 pb-4 border-b">
              {/* Preview da foto */}
              <div className="relative w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
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
                        parent.innerHTML = '<div class="w-8 h-8 text-blue-600 flex items-center justify-center"><svg fill="currentColor" viewBox="0 0 24 24" class="w-8 h-8"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>';
                      }
                    }}
                  />
                ) : (
                  <User className="w-8 h-8 text-blue-600" />
                )}
              </div>

              {/* Botão de upload */}
              <div className="w-full space-y-2">
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
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>
                    {selectedFile ? "Trocar Foto" : "Selecionar Foto"}
                  </span>
                </label>
                
                {selectedFile && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600">{selectedFile.name}</p>
                    <p className="text-xs text-gray-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)}MB
                    </p>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 text-center">
                  Selecione um arquivo JPG, PNG ou GIF (máx. 5MB)
                </p>
              </div>
            </div>

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

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isUploading || updateUserMutation.isPending}
                data-testid="button-cancel"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isUploading || updateUserMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
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
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}