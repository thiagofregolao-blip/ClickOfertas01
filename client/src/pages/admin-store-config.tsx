import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStoreSchema, updateStoreSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import AdminConsolidatedLayout from "@/components/admin-consolidated-layout";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import type { Store, InsertStore, UpdateStore } from "@shared/schema";
import { z } from "zod";

const storeFormSchema = insertStoreSchema.extend({
  name: z.string().min(1, "Nome da loja é obrigatório"),
  themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/i, "Cor deve estar no formato #RRGGBB"),
  latitude: z.string().optional().refine(val => !val || (!isNaN(Number(val)) && Number(val) >= -90 && Number(val) <= 90), "Latitude deve ser um número entre -90 e 90"),
  longitude: z.string().optional().refine(val => !val || (!isNaN(Number(val)) && Number(val) >= -180 && Number(val) <= 180), "Longitude deve ser um número entre -180 e 180"),
  // Banner fields
  bannerUrl: z.string().optional(),
  bannerText: z.string().optional(),
  bannerSubtext: z.string().optional(),
  bannerGradient: z.string().optional(),
}).omit({
  customUsdBrlRate: true,
}).extend({
  customUsdBrlRate: z.string().optional(),
});

type StoreFormData = z.infer<typeof storeFormSchema>;

export default function AdminStoreConfig() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  
  // Detecta se estamos na rota de criação de store
  const isCreating = location === '/create-store';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: store, isLoading: storeLoading } = useQuery<Store>({
    queryKey: ["/api/stores/me"],
    retry: false,
    enabled: !isCreating, // Só busca store se não estiver criando
  });

  const form = useForm<StoreFormData>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      name: "",
      logoUrl: "",
      themeColor: "#E11D48",
      currency: "Gs.",
      whatsapp: "",
      instagram: "",
      address: "",
      latitude: "",
      longitude: "",
      customUsdBrlRate: "",
      // Banner fields
      bannerUrl: "",
      bannerText: "",
      bannerSubtext: "",
      bannerGradient: "purple-to-pink",
    },
  });

  // Update form when store data loads
  useEffect(() => {
    if (store) {
      form.reset({
        name: store.name || "",
        logoUrl: store.logoUrl || "",
        themeColor: store.themeColor || "#E11D48",
        currency: store.currency || "Gs.",
        whatsapp: store.whatsapp || "",
        instagram: store.instagram || "",
        address: store.address || "",
        latitude: store.latitude ? String(store.latitude) : "",
        longitude: store.longitude ? String(store.longitude) : "",
        customUsdBrlRate: store.customUsdBrlRate ? String(store.customUsdBrlRate) : "",
        // Banner fields
        bannerUrl: store.bannerUrl || "",
        bannerText: store.bannerText || "",
        bannerSubtext: store.bannerSubtext || "",
        bannerGradient: store.bannerGradient || "purple-to-pink",
      });
    }
  }, [store, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: StoreFormData) => {
      if (store) {
        await apiRequest("PATCH", `/api/stores/${store.id}`, data);
      } else {
        await apiRequest("POST", "/api/stores", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Sucesso!",
        description: isCreating ? "Loja criada com sucesso!" : "Configurações salvas com sucesso",
      });
      if (isCreating) {
        window.location.href = "/admin";
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StoreFormData) => {
    // Convert latitude, longitude and customUsdBrlRate to appropriate types for API
    const payload = {
      ...data,
      latitude: data.latitude && data.latitude.trim() ? data.latitude : undefined,
      longitude: data.longitude && data.longitude.trim() ? data.longitude : undefined,
      customUsdBrlRate: data.customUsdBrlRate && data.customUsdBrlRate.trim() ? data.customUsdBrlRate : undefined,
    };
    saveMutation.mutate(payload);
  };

  if (isLoading || storeLoading) {
    const LoadingContent = (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );

    if (isCreating) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full">
            {LoadingContent}
          </div>
        </div>
      );
    }

    return (
      <AdminConsolidatedLayout>
        {LoadingContent}
      </AdminConsolidatedLayout>
    );
  }

  const FormContent = (
    <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Configurações da Loja</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Seção: Dados da Loja */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-xl p-6 border-l-4 border-blue-400">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-bold">🏪</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Dados da Loja</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Informações básicas e identidade visual</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Loja *</Label>
                    <Input
                      id="name"
                      {...form.register("name")}
                      placeholder="Ex: Mercadinho Silva"
                      data-testid="input-store-name"
                      className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo da Empresa</Label>
                    <div className="space-y-3">
                      <Input
                        id="logoUrl"
                        {...form.register("logoUrl")}
                        placeholder="https://exemplo.com/logo.png"
                        data-testid="input-logo-url"
                        className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700"
                      />
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Cole aqui o link (URL) da imagem do seu logo. Recomendamos formato PNG ou JPG.
                      </p>
                      {form.watch("logoUrl") && (
                        <div className="mt-2">
                          <p className="text-sm font-medium mb-1">Preview:</p>
                          <img 
                            src={form.watch("logoUrl") || ""} 
                            alt="Preview do logo"
                            className="h-12 w-auto object-contain border rounded p-1 bg-white"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                            onLoad={(e) => {
                              e.currentTarget.style.display = 'block';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="themeColor">Cor do Tema</Label>
                    <div className="flex items-center space-x-3">
                      <Input
                        id="themeColor"
                        type="color"
                        value={form.watch("themeColor") || "#E11D48"}
                        onChange={(e) => form.setValue("themeColor", e.target.value)}
                        className="w-16 h-12 p-1 border-blue-200 dark:border-blue-700"
                        data-testid="input-theme-color"
                      />
                      <Input
                        value={form.watch("themeColor") || "#E11D48"}
                        onChange={(e) => form.setValue("themeColor", e.target.value)}
                        placeholder="#E11D48"
                        className="flex-1 bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700"
                        data-testid="input-theme-color-text"
                      />
                    </div>
                    {form.formState.errors.themeColor && (
                      <p className="text-sm text-red-600">{form.formState.errors.themeColor.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Símbolo da Moeda</Label>
                    <Select 
                      value={form.watch("currency") || ""} 
                      onValueChange={(value) => form.setValue("currency", value)}
                    >
                      <SelectTrigger data-testid="select-currency" className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Gs.">Gs. (Guarani)</SelectItem>
                        <SelectItem value="US$">US$ (Dólar)</SelectItem>
                        <SelectItem value="R$">R$ (Real)</SelectItem>
                        <SelectItem value="€">€ (Euro)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Seção: Contatos e Redes Sociais */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-xl p-6 border-l-4 border-blue-400">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-bold">📱</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Contatos e Redes Sociais</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Como os clientes podem entrar em contato</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      {...form.register("whatsapp")}
                      placeholder="+595 21 123-4567"
                      data-testid="input-whatsapp"
                      className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      {...form.register("instagram")}
                      placeholder="@mercadinhosilva"
                      data-testid="input-instagram"
                      className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700"
                    />
                  </div>
                </div>
              </div>

              {/* Seção: Banner YouTube-Style */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-100 dark:from-purple-950/30 dark:to-pink-900/30 rounded-xl p-6 border-l-4 border-purple-400">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-bold">🎨</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Banner YouTube-Style</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Configure o banner principal da sua loja</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="bannerUrl">Imagem de Fundo do Banner</Label>
                    <div className="space-y-3">
                      <Input
                        id="bannerUrl"
                        {...form.register("bannerUrl")}
                        placeholder="https://exemplo.com/banner.jpg"
                        data-testid="input-banner-url"
                        className="bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-700"
                      />
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        URL da imagem de fundo do banner. Recomendamos 1920x600px.
                      </p>
                      {form.watch("bannerUrl") && (
                        <div className="mt-2">
                          <p className="text-sm font-medium mb-1">Preview:</p>
                          <div className="relative h-32 bg-gray-200 rounded-lg overflow-hidden">
                            <img 
                              src={form.watch("bannerUrl") || ""} 
                              alt="Preview do banner"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                              onLoad={(e) => {
                                e.currentTarget.style.display = 'block';
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="bannerText">Texto Principal</Label>
                      <Input
                        id="bannerText"
                        {...form.register("bannerText")}
                        placeholder="SUPER OFERTAS"
                        data-testid="input-banner-text"
                        className="bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-700"
                      />
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Texto principal do banner (ex: nome da loja em destaque)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bannerSubtext">Texto Secundário</Label>
                      <Input
                        id="bannerSubtext"
                        {...form.register("bannerSubtext")}
                        placeholder="Os melhores preços você encontra aqui!"
                        data-testid="input-banner-subtext"
                        className="bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-700"
                      />
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Texto secundário ou slogan (opcional)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bannerGradient">Estilo do Gradiente</Label>
                    <Select 
                      value={form.watch("bannerGradient") || "purple-to-pink"} 
                      onValueChange={(value) => form.setValue("bannerGradient", value)}
                    >
                      <SelectTrigger data-testid="select-banner-gradient" className="bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purple-to-pink">Roxo → Rosa</SelectItem>
                        <SelectItem value="blue-to-cyan">Azul → Ciano</SelectItem>
                        <SelectItem value="red-to-orange">Vermelho → Laranja</SelectItem>
                        <SelectItem value="green-to-blue">Verde → Azul</SelectItem>
                        <SelectItem value="yellow-to-red">Amarelo → Vermelho</SelectItem>
                        <SelectItem value="indigo-to-purple">Índigo → Roxo</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Gradiente de fundo quando não há imagem personalizada
                    </p>
                  </div>

                  {/* Preview do Banner */}
                  <div className="space-y-2">
                    <Label>Preview do Banner</Label>
                    <div className="relative h-40 rounded-lg overflow-hidden border">
                      <div 
                        className={`absolute inset-0 ${
                          form.watch("bannerGradient") === "blue-to-cyan" ? "bg-gradient-to-br from-blue-600 via-cyan-600 to-cyan-500" :
                          form.watch("bannerGradient") === "red-to-orange" ? "bg-gradient-to-br from-red-600 via-red-500 to-orange-500" :
                          form.watch("bannerGradient") === "green-to-blue" ? "bg-gradient-to-br from-green-600 via-teal-600 to-blue-500" :
                          form.watch("bannerGradient") === "yellow-to-red" ? "bg-gradient-to-br from-yellow-500 via-orange-500 to-red-600" :
                          form.watch("bannerGradient") === "indigo-to-purple" ? "bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-500" :
                          "bg-gradient-to-br from-purple-600 via-pink-600 to-red-500"
                        }`}
                      >
                        {form.watch("bannerUrl") && (
                          <div 
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
                            style={{ backgroundImage: `url(${form.watch("bannerUrl")})` }}
                          />
                        )}
                        
                        <div className="relative z-10 h-full flex items-center justify-center p-4">
                          <div className="text-center">
                            <h1 className="text-xl md:text-3xl font-black text-white drop-shadow-2xl tracking-wider transform -rotate-1">
                              {form.watch("bannerText") || form.watch("name") || "NOME DA LOJA"}
                            </h1>
                            {form.watch("bannerSubtext") && (
                              <p className="text-sm md:text-lg text-white/90 mt-1 font-semibold drop-shadow-lg">
                                {form.watch("bannerSubtext")}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/30"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção: Localização e Endereço */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-xl p-6 border-l-4 border-blue-400">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-bold">📍</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Localização e Endereço</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Onde sua loja está localizada</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Textarea
                      id="address"
                      {...form.register("address")}
                      placeholder="Rua das Flores, 123, Centro - Asunción"
                      rows={3}
                      data-testid="input-address"
                      className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-base font-medium">Coordenadas GPS (opcional)</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Adicione as coordenadas da sua loja para mostrar o botão "Como chegar" no seu flyer.
                        Você pode encontrar as coordenadas no Google Maps.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="latitude">Latitude</Label>
                        <Input
                          id="latitude"
                          {...form.register("latitude")}
                          placeholder="-25.2637"
                          data-testid="input-latitude"
                          className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700"
                        />
                        {form.formState.errors.latitude && (
                          <p className="text-sm text-red-600">{form.formState.errors.latitude.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="longitude">Longitude</Label>
                        <Input
                          id="longitude"
                          {...form.register("longitude")}
                          placeholder="-57.5759"
                          data-testid="input-longitude"
                          className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700"
                        />
                        {form.formState.errors.longitude && (
                          <p className="text-sm text-red-600">{form.formState.errors.longitude.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção: Configurações Avançadas */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-xl p-6 border-l-4 border-blue-400">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-bold">⚙️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Configurações Avançadas</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Opções de personalização avançada</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customUsdBrlRate">Taxa USD/BRL Personalizada (opcional)</Label>
                  <Input
                    id="customUsdBrlRate"
                    {...form.register("customUsdBrlRate")}
                    placeholder="5.47"
                    type="number"
                    step="0.01"
                    data-testid="input-custom-usd-brl-rate"
                    className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Deixe em branco para usar a cotação automática da API. Defina sua própria taxa para ter controle total sobre os preços.
                  </p>
                  {form.formState.errors.customUsdBrlRate && (
                    <p className="text-sm text-red-600">{form.formState.errors.customUsdBrlRate.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline"
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={saveMutation.isPending}
                  className="bg-primary text-white hover:bg-blue-600"
                  data-testid="button-save"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  );

  if (isCreating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full">
          {FormContent}
        </div>
      </div>
    );
  }

  return (
    <AdminConsolidatedLayout>
      {FormContent}
    </AdminConsolidatedLayout>
  );
}
