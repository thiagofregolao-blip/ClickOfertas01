import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye, BarChart3, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PromotionForm from "@/components/promotion-form";
import type { Promotion, PromotionWithDetails } from "@shared/schema";

export default function AdminPromotions() {
  const { toast } = useToast();
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

  // Buscar promoções da loja
  const { data: promotions = [], isLoading, error } = useQuery<PromotionWithDetails[]>({
    queryKey: ["/api/promotions"],
  });

  // Handle authentication errors
  if (error && error.message.includes("401")) {
    toast({
      title: "Não autorizado",
      description: "Você precisa estar logado para acessar esta página.",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
  }

  // Mutation para deletar promoção
  const deletePromotionMutation = useMutation({
    mutationFn: async (promotionId: string) => {
      const response = await fetch(`/api/promotions/${promotionId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        let errorMsg = `Erro ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch {
          // Se não conseguir ler JSON, usar mensagem padrão
        }
        throw new Error(errorMsg);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promotions"] });
      toast({
        title: "Sucesso",
        description: "Promoção deletada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value);
    return numValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    });
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (promotion: PromotionWithDetails) => {
    const now = new Date();
    const validFrom = promotion.validFrom ? new Date(promotion.validFrom) : new Date();
    const validUntil = promotion.validUntil ? new Date(promotion.validUntil) : new Date();
    const usedCount = parseInt(promotion.usedCount || "0");
    const maxClients = parseInt(promotion.maxClients || "0");

    if (!promotion.isActive) {
      return <Badge variant="secondary">Inativa</Badge>;
    }

    if (now < validFrom) {
      return <Badge variant="outline">Aguardando</Badge>;
    }

    if (now > validUntil) {
      return <Badge variant="destructive">Expirada</Badge>;
    }

    if (usedCount >= maxClients) {
      return <Badge variant="destructive">Esgotada</Badge>;
    }

    return <Badge variant="default">Ativa</Badge>;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">Promoções</h1>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Gift className="w-8 h-8 text-primary" />
              Promoções
            </h1>
            <p className="text-muted-foreground">
              Gerencie suas promoções scratch card e monitore o desempenho
            </p>
          </div>
          <Button
            onClick={() => setEditingPromotion({} as Promotion)}
            className="flex items-center gap-2"
            data-testid="button-create-promotion"
          >
            <Plus className="w-4 h-4" />
            Nova Promoção
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Promoções</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{promotions.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promoções Ativas</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {promotions.filter((p: PromotionWithDetails) => {
                  const now = new Date();
                  const validFrom = p.validFrom ? new Date(p.validFrom) : new Date();
                  const validUntil = p.validUntil ? new Date(p.validUntil) : new Date();
                  return p.isActive && now >= validFrom && now <= validUntil;
                }).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Participações</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {promotions.reduce((total: number, p: PromotionWithDetails) => total + parseInt(p.usedCount || "0"), 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const totalUsed = promotions.reduce((total: number, p: PromotionWithDetails) => total + parseInt(p.usedCount || "0"), 0);
                  const totalMax = promotions.reduce((total: number, p: PromotionWithDetails) => total + parseInt(p.maxClients || "0"), 0);
                  
                  // Debug: log valores para verificar
                  console.log('📊 Analytics Debug:', { 
                    totalUsed, 
                    totalMax, 
                    promotions: promotions.map(p => ({ 
                      name: p.name, 
                      usedCount: p.usedCount, 
                      maxClients: p.maxClients 
                    }))
                  });
                  
                  if (totalMax === 0) return '0';
                  return Math.round((totalUsed / totalMax) * 100) || 0;
                })()}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Promoções */}
        {promotions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Gift className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma promoção cadastrada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Comece criando sua primeira promoção scratch card para engajar seus clientes
              </p>
              <Button
                onClick={() => setEditingPromotion({} as Promotion)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Criar primeira promoção
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {promotions.map((promotion) => (
              <Card key={promotion.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{promotion.name}</CardTitle>
                      {getStatusBadge(promotion)}
                    </div>
                    {promotion.imageUrl && (
                      <img
                        src={promotion.imageUrl}
                        alt={promotion.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Preço Original:</span>
                      <span className="line-through">{formatCurrency(promotion.originalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Preço Promocional:</span>
                      <span className="font-bold text-green-600">{formatCurrency(promotion.promotionalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Desconto:</span>
                      <span className="font-bold text-red-600">{promotion.discountPercentage}%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Participações:</span>
                      <span>{promotion.usedCount || "0"} / {promotion.maxClients || "0"}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${Math.min((parseInt(promotion.usedCount || "0") / parseInt(promotion.maxClients || "1")) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    {/* Debug info para desenvolvedores */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs text-gray-500">
                        Debug: usedCount="{promotion.usedCount}", maxClients="{promotion.maxClients}"
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <div>Válida: {promotion.validFrom ? formatDate(promotion.validFrom) : "N/A"} - {promotion.validUntil ? formatDate(promotion.validUntil) : "N/A"}</div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingPromotion(promotion)}
                      className="flex-1"
                      data-testid={`button-edit-promotion-${promotion.id}`}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {/* TODO: ver estatísticas */}}
                      data-testid={`button-stats-promotion-${promotion.id}`}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deletePromotionMutation.mutate(promotion.id)}
                      disabled={deletePromotionMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                      data-testid={`button-delete-promotion-${promotion.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de edição/criação */}
      {editingPromotion && (
        <PromotionForm
          promotion={editingPromotion}
          onClose={() => setEditingPromotion(null)}
          onSuccess={() => {
            // Atualizar lista de promoções
            queryClient.invalidateQueries({ queryKey: ["/api/promotions"] });
          }}
        />
      )}
    </AdminLayout>
  );
}