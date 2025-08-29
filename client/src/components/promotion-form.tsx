import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { X, Calendar, DollarSign, Users, Gift, Package } from "lucide-react";
import type { Promotion, Product } from "@shared/schema";

const promotionSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().min(5, "Descrição deve ter pelo menos 5 caracteres"),
  imageUrl: z.string().url("URL da imagem inválida").optional().or(z.literal("")),
  category: z.string().min(1, "Categoria é obrigatória"),
  originalPrice: z.string().min(1, "Preço original é obrigatório"),
  promotionalPrice: z.string().min(1, "Preço promocional é obrigatório"),
  discountPercentage: z.string().min(1, "Desconto é obrigatório"),
  maxClients: z.string().min(1, "Número máximo de participantes é obrigatório"),
  validFrom: z.string().min(1, "Data de início é obrigatória"),
  validUntil: z.string().min(1, "Data de fim é obrigatória"),
  scratchMessage: z.string().min(5, "Mensagem deve ter pelo menos 5 caracteres"),
  baseProductId: z.string().optional(), // Produto base para a promoção
  isActive: z.boolean().default(true),
});

type PromotionFormData = z.infer<typeof promotionSchema>;

interface PromotionFormProps {
  promotion?: Promotion | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PromotionForm({ promotion, onClose, onSuccess }: PromotionFormProps) {
  const { toast } = useToast();
  const [isCalculatingDiscount, setIsCalculatingDiscount] = useState(false);

  const isEditing = Boolean(promotion?.id);

  // Buscar produtos da loja para seleção
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/stores/me", { credentials: "include" });
      if (!response.ok) throw new Error("Erro ao buscar loja");
      const store = await response.json();
      
      const productsResponse = await fetch(`/api/stores/${store.id}/products`, { credentials: "include" });
      if (!productsResponse.ok) throw new Error("Erro ao buscar produtos");
      return productsResponse.json() as Product[];
    },
  });

  const form = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      name: promotion?.name || "",
      description: promotion?.description || "",
      imageUrl: promotion?.imageUrl || "",
      category: promotion?.category || "",
      originalPrice: promotion?.originalPrice || "",
      promotionalPrice: promotion?.promotionalPrice || "",
      discountPercentage: promotion?.discountPercentage || "",
      maxClients: promotion?.maxClients || "",
      validFrom: promotion?.validFrom ? 
        new Date(promotion.validFrom).toISOString().slice(0, 16) : "",
      validUntil: promotion?.validUntil ? 
        new Date(promotion.validUntil).toISOString().slice(0, 16) : "",
      scratchMessage: promotion?.scratchMessage || "Parabéns! Você ganhou um desconto especial!",
      baseProductId: promotion?.baseProductId || "",
      isActive: promotion?.isActive ?? true,
    },
  });

  // Auto-calcular desconto quando preços mudam
  const watchOriginalPrice = form.watch("originalPrice");
  const watchPromotionalPrice = form.watch("promotionalPrice");
  const watchBaseProductId = form.watch("baseProductId");

  // Auto-preencher campos com dados do produto selecionado
  useEffect(() => {
    if (watchBaseProductId && watchBaseProductId !== "none" && products.length > 0) {
      const selectedProduct = products.find(p => p.id === watchBaseProductId);
      if (selectedProduct) {
        form.setValue("name", `${selectedProduct.name} - PROMOÇÃO ESPECIAL`);
        if (selectedProduct.description) {
          form.setValue("description", selectedProduct.description);
        }
        if (selectedProduct.imageUrl) {
          form.setValue("imageUrl", selectedProduct.imageUrl);
        }
        if (selectedProduct.category) {
          form.setValue("category", selectedProduct.category);
        }
        if (selectedProduct.price) {
          form.setValue("originalPrice", selectedProduct.price);
          // Sugerir 30% de desconto por padrão
          const original = parseFloat(selectedProduct.price);
          const promotional = Math.round(original * 0.7 * 100) / 100;
          form.setValue("promotionalPrice", promotional.toString());
        }
      }
    }
  }, [watchBaseProductId, products, form]);

  useEffect(() => {
    if (watchOriginalPrice && watchPromotionalPrice && !isCalculatingDiscount) {
      const original = parseFloat(watchOriginalPrice);
      const promotional = parseFloat(watchPromotionalPrice);
      
      if (original > 0 && promotional > 0 && promotional < original) {
        const discount = Math.round(((original - promotional) / original) * 100);
        setIsCalculatingDiscount(true);
        form.setValue("discountPercentage", discount.toString());
        setTimeout(() => setIsCalculatingDiscount(false), 100);
      }
    }
  }, [watchOriginalPrice, watchPromotionalPrice, form, isCalculatingDiscount]);

  // Mutation para criar/editar promoção
  const mutation = useMutation({
    mutationFn: async (data: PromotionFormData) => {
      // Para criação, precisamos buscar o storeId do usuário
      let endpoint: string;
      const method = isEditing ? "PUT" : "POST";

      if (isEditing) {
        endpoint = `/api/promotions/${promotion?.id}`;
      } else {
        // Buscar storeId do usuário autenticado
        const storeResponse = await fetch("/api/stores/me", { credentials: "include" });
        if (!storeResponse.ok) {
          throw new Error("Erro ao buscar dados da loja");
        }
        const store = await storeResponse.json();
        endpoint = `/api/stores/${store.id}/promotions`;
      }

      const payload = {
        ...data,
        validFrom: new Date(data.validFrom),
        validUntil: new Date(data.validUntil),
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!response.ok) {
        let errorMsg = `Erro ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch {
          // Se não conseguir ler JSON, tentar como texto
          try {
            const errorText = await response.text();
            errorMsg = errorText || errorMsg;
          } catch {
            // Usar mensagem padrão se tudo falhar
          }
        }
        throw new Error(errorMsg);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promotions"] });
      toast({
        title: "Sucesso!",
        description: `Promoção ${isEditing ? "atualizada" : "criada"} com sucesso!`,
      });
      onSuccess?.();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PromotionFormData) => {
    // Validações adicionais
    const originalPrice = parseFloat(data.originalPrice);
    const promotionalPrice = parseFloat(data.promotionalPrice);
    const validFrom = new Date(data.validFrom);
    const validUntil = new Date(data.validUntil);
    const now = new Date();

    if (promotionalPrice >= originalPrice) {
      toast({
        title: "Erro de validação",
        description: "O preço promocional deve ser menor que o preço original.",
        variant: "destructive",
      });
      return;
    }

    // Ajustar validação para permitir data de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Início do dia
    const startDate = new Date(validFrom);
    startDate.setHours(0, 0, 0, 0); // Início do dia

    if (startDate < today) {
      toast({
        title: "Erro de validação", 
        description: "A data de início não pode ser anterior a hoje.",
        variant: "destructive",
      });
      return;
    }

    if (validUntil <= validFrom) {
      toast({
        title: "Erro de validação",
        description: "A data de fim deve ser posterior à data de início.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate(data);
  };

  const categories = [
    "Smartphones",
    "Eletrônicos", 
    "Informática",
    "Casa & Jardim",
    "Moda",
    "Beleza",
    "Esportes",
    "Livros",
    "Jogos",
    "Outros"
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <CardTitle>
              {isEditing ? "Editar Promoção" : "Nova Promoção"}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
            data-testid="button-close-form"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Informações Básicas</h3>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Promoção *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: iPhone 15 Pro com 50% OFF" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva os detalhes da promoção..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL da Imagem</FormLabel>
                        <FormControl>
                          <Input placeholder="https://exemplo.com/imagem.jpg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Produto Base */}
                <FormField
                  control={form.control}
                  name="baseProductId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Produto Base (Opcional)
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um produto para copiar dados" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-gray-500">Sem produto base</span>
                          </SelectItem>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              <div className="flex items-center gap-2">
                                <span className="truncate">{product.name}</span>
                                <span className="text-xs text-gray-500">
                                  - {product.price}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-600">
                        Selecione um produto para copiar automaticamente: nome, descrição, imagem e preços
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Preços */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Preços
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="originalPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço Original (PYG) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="100000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="promotionalPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço Promocional (PYG) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="50000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discountPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Desconto (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="50"
                            {...field}
                            disabled={isCalculatingDiscount}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Período e Participantes */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Período e Participantes
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="validFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Início *</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="validUntil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Fim *</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="maxClients"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Número Máximo de Participantes *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="100"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Mensagem e Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configurações Finais</h3>
                
                <FormField
                  control={form.control}
                  name="scratchMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem de Vitória *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Mensagem que aparece quando o usuário raspa o card..."
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Promoção Ativa
                        </FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Permitir que usuários vejam e participem desta promoção
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

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={mutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={mutation.isPending}
                  data-testid="button-save-promotion"
                >
                  {mutation.isPending ? "Salvando..." : 
                   isEditing ? "Atualizar Promoção" : "Criar Promoção"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}