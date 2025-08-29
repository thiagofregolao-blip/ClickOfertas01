import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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
import { X, Calendar, DollarSign, Users, Gift } from "lucide-react";
import type { Promotion } from "@shared/schema";

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
      isActive: promotion?.isActive ?? true,
    },
  });

  // Auto-calcular desconto quando preços mudam
  const watchOriginalPrice = form.watch("originalPrice");
  const watchPromotionalPrice = form.watch("promotionalPrice");

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
      const endpoint = isEditing ? `/api/promotions/${promotion?.id}` : "/api/promotions";
      const method = isEditing ? "PUT" : "POST";

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
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
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

    if (validFrom < now) {
      toast({
        title: "Erro de validação", 
        description: "A data de início não pode ser no passado.",
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