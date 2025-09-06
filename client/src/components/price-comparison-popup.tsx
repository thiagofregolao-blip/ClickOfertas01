import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, DollarSign, BarChart3 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PriceComparisonResult } from "@/components/price-comparison-result";

interface BrazilianPrice {
  productName: string;
  storeName: string;
  price: string;
  currency: string;
  productUrl: string;
  availability: string;
}

interface ProductComparison {
  productName: string;
  paraguayPrice: number;
  paraguayCurrency?: string;
  paraguayStore?: string;
  brazilianPrices: BrazilianPrice[];
  bestBrazilianPrice: number;
  bestBrazilianStore: string;
  savings: number;
  savingsPercentage: number;
  cheaperInBrazil: boolean;
  message?: string;
}

interface PriceComparisonPopupProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

export default function PriceComparisonPopup({
  isOpen,
  onClose,
  productId,
  productName
}: PriceComparisonPopupProps) {
  const { toast } = useToast();

  // Hook para buscar cotação USD → BRL
  const { data: exchangeRateData } = useQuery<{ rate: number }>({
    queryKey: ['/api/exchange-rate/usd-brl'],
    refetchInterval: 30 * 60 * 1000, // Atualizar a cada 30 minutos
    staleTime: 15 * 60 * 1000, // Considerar stale após 15 minutos
  });

  const exchangeRate = exchangeRateData?.rate || 5.47;

  // Mutation para comparar preços
  const comparePricesMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await apiRequest("POST", `/api/price-comparison/compare`, { productId });
      return await response.json();
    },
    onSuccess: (data: ProductComparison) => {
      toast({
        title: "Comparação realizada!",
        description: data.message || `Encontrados preços em ${data.brazilianPrices.length} lojas brasileiras.`,
      });
    },
    onError: () => {
      toast({
        title: "Erro na comparação",
        description: "Não foi possível comparar os preços no momento.",
        variant: "destructive",
      });
    },
  });

  // Executar comparação quando o popup abrir
  useEffect(() => {
    if (isOpen && !comparePricesMutation.data && !comparePricesMutation.isPending) {
      comparePricesMutation.mutate(productId);
    }
  }, [isOpen, productId]);

  const comparisonData = comparePricesMutation.data as ProductComparison | undefined;
  const isLoading = comparePricesMutation.isPending;
  const error = comparePricesMutation.error?.message;
  
  // Calcular dados de economia a partir da resposta do backend
  const getSavingsData = () => {
    if (!comparisonData) return null;
    
    return {
      amount: comparisonData.savings,
      percentage: comparisonData.savingsPercentage,
      bestStore: comparisonData.bestBrazilianStore,
      cheaperInBrazil: comparisonData.cheaperInBrazil
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Comparação de Preços: {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-lg">Buscando preços no Brasil...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-medium">Erro na comparação:</p>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {comparisonData && !isLoading && (
            <>
              {/* Usar o componente padronizado */}
              <PriceComparisonResult
                productName={comparisonData.productName}
                paraguayPrice={comparisonData.paraguayPrice}
                paraguayCurrency={comparisonData.paraguayCurrency || 'USD'}
                paraguayStore={comparisonData.paraguayStore || 'Loja do Paraguay'}
                brazilianPrices={comparisonData.brazilianPrices}
                exchangeRate={exchangeRate}
                savings={getSavingsData()}
                showDetailedResults={true}
              />

              {/* Cotação Atual */}
              <div className="text-center text-sm text-gray-500 border-t pt-4">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Cotação atual: 1 USD = R$ {exchangeRate.toFixed(3)}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}