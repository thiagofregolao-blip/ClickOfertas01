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
  themeColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor deve estar no formato #RRGGBB"),
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
    saveMutation.mutate(data);
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
                  <Label htmlFor="logoUrl">URL do Logo</Label>
                  <Input
                    id="logoUrl"
                    {...form.register("logoUrl")}
                    placeholder="https://exemplo.com/logo.png"
                    data-testid="input-logo-url"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="themeColor">Cor do Tema</Label>
                  <div className="flex items-center space-x-3">
                    <Input
                      id="themeColor"
                      type="color"
                      {...form.register("themeColor")}
                      className="w-20 h-12 p-1"
                      data-testid="input-theme-color"
                    />
                    <Input
                      {...form.register("themeColor")}
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
