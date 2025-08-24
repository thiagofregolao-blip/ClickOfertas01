import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStoreSchema, updateStoreSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/admin-layout";
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
      toast({
        title: "Sucesso!",
        description: "Configurações da loja salvas com sucesso",
      });
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
      customUsdBrlRate: data.customUsdBrlRate && data.customUsdBrlRate.trim() ? Number(data.customUsdBrlRate) : undefined,
    };
    saveMutation.mutate(payload);
  };

  if (isLoading || storeLoading) {
    return (
      <AdminLayout>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Configurações da Loja</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Loja *</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="Ex: Mercadinho Silva"
                    data-testid="input-store-name"
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
                    />
                    <p className="text-sm text-gray-600">
                      Cole aqui o link (URL) da imagem do seu logo. Recomendamos formato PNG ou JPG.
                    </p>
                    {form.watch("logoUrl") && (
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">Preview:</p>
                        <img 
                          src={form.watch("logoUrl") || ""} 
                          alt="Preview do logo"
                          className="h-12 w-auto object-contain border rounded p-1"
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
                      className="w-20 h-12 p-1"
                      data-testid="input-theme-color"
                    />
                    <Input
                      value={form.watch("themeColor") || "#E11D48"}
                      onChange={(e) => form.setValue("themeColor", e.target.value)}
                      placeholder="#E11D48"
                      className="flex-1"
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
                    <SelectTrigger data-testid="select-currency">
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

                <div className="space-y-2">
                  <Label htmlFor="customUsdBrlRate">Taxa USD/BRL Personalizada (opcional)</Label>
                  <Input
                    id="customUsdBrlRate"
                    {...form.register("customUsdBrlRate")}
                    placeholder="5.47"
                    type="number"
                    step="0.01"
                    data-testid="input-custom-usd-brl-rate"
                  />
                  <p className="text-sm text-gray-600">
                    Deixe em branco para usar a cotação automática da API. Defina sua própria taxa para ter controle total sobre os preços.
                  </p>
                  {form.formState.errors.customUsdBrlRate && (
                    <p className="text-sm text-red-600">{form.formState.errors.customUsdBrlRate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    {...form.register("whatsapp")}
                    placeholder="+595 21 123-4567"
                    data-testid="input-whatsapp"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    {...form.register("instagram")}
                    placeholder="@mercadinhosilva"
                    data-testid="input-instagram"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Textarea
                  id="address"
                  {...form.register("address")}
                  placeholder="Rua das Flores, 123, Centro - Asunción"
                  rows={3}
                  data-testid="input-address"
                />
              </div>

              {/* Localização GPS */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Localização GPS</Label>
                  <p className="text-sm text-gray-600">
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
                    />
                    {form.formState.errors.longitude && (
                      <p className="text-sm text-red-600">{form.formState.errors.longitude.message}</p>
                    )}
                  </div>
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
    </AdminLayout>
  );
}
