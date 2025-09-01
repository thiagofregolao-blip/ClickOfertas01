import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp, ExternalLink, Loader2, DollarSign, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBrazilianPrice } from "@/lib/priceUtils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  paraguayCurrency: string;
  paraguayStore: string;
  brazilianPrices: BrazilianPrice[];
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
  
  const calculateSavings = () => {
    if (!comparisonData || !exchangeRate) return null;
    
    const paraguayPriceBRL = comparisonData.paraguayPrice * exchangeRate;
    const bestBrazilPrice = Math.min(...comparisonData.brazilianPrices.map(p => parseFloat(p.price)));
    const savings = bestBrazilPrice - paraguayPriceBRL;
    
    return {
      paraguayPriceBRL,
      bestBrazilPrice,
      savings,
      savingsPercentage: ((savings / bestBrazilPrice) * 100)
    };
  };

  const savings = calculateSavings();

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
              {/* Resumo da Comparação */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* Preço no Paraguay */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <h4 className="font-semibold text-blue-800 mb-2">Preço no Paraguay</h4>
                      <div className="space-y-1">
                        <p className="text-2xl font-bold text-blue-600">
                          R$ {formatBrazilianPrice((comparisonData.paraguayPrice * exchangeRate).toFixed(2))}
                        </p>
                        <p className="text-sm text-blue-500">
                          ≈ {comparisonData.paraguayCurrency} {formatBrazilianPrice(comparisonData.paraguayPrice)}
                        </p>
                        <p className="text-xs text-gray-600">{comparisonData.paraguayStore}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Melhor Preço Brasil */}
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <h4 className="font-semibold text-green-800 mb-2">Melhor Preço Brasil</h4>
                      {comparisonData.brazilianPrices.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-2xl font-bold text-green-600">
                            R$ {formatBrazilianPrice(Math.min(...comparisonData.brazilianPrices.map(p => parseFloat(p.price))).toFixed(2))}
                          </p>
                          <p className="text-xs text-gray-600">
                            {comparisonData.brazilianPrices.find(p => 
                              parseFloat(p.price) === Math.min(...comparisonData.brazilianPrices.map(x => parseFloat(x.price)))
                            )?.storeName}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Economia */}
                <Card className={`border-2 ${savings && savings.savings > 0 ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <h4 className="font-semibold text-gray-800 mb-2">Economia</h4>
                      {savings && (
                        <div className="space-y-1">
                          {savings.savings > 0 ? (
                            <>
                              <div className="flex items-center justify-center gap-1">
                                <TrendingDown className="w-4 h-4 text-green-600" />
                                <p className="text-2xl font-bold text-green-600">
                                  R$ {formatBrazilianPrice(Math.abs(savings.savings).toFixed(2))}
                                </p>
                              </div>
                              <p className="text-sm text-green-600">
                                {Math.abs(savings.savingsPercentage).toFixed(1)}% mais barato
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-center gap-1">
                                <TrendingUp className="w-4 h-4 text-red-600" />
                                <p className="text-2xl font-bold text-red-600">
                                  R$ {formatBrazilianPrice(Math.abs(savings.savings).toFixed(2))}
                                </p>
                              </div>
                              <p className="text-sm text-red-600">
                                {Math.abs(savings.savingsPercentage).toFixed(1)}% mais caro
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de Preços Brasileiros */}
              {comparisonData.brazilianPrices.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800">
                      Preços encontrados no Brasil ({comparisonData.brazilianPrices.length} lojas):
                    </h4>
                    <p className="text-sm text-gray-500">
                      👆 Clique em "Ver no ML" para verificar o produto
                    </p>
                  </div>
                  <div className="grid gap-3 max-h-96 overflow-y-auto">
                    {comparisonData.brazilianPrices.map((price, index) => (
                      <Card key={index} className="border-gray-200">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-medium text-gray-900">{price.storeName}</h5>
                                <Badge variant={price.availability === 'in_stock' ? 'default' : 'secondary'}>
                                  {price.availability === 'in_stock' ? 'Disponível' : 'Consultar'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-1">{price.productName}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-blue-600">
                                R$ {formatBrazilianPrice(price.price)}
                              </p>
                              {price.productUrl && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="mt-1 text-blue-600 border-blue-600 hover:bg-blue-50"
                                  onClick={() => window.open(price.productUrl, '_blank')}
                                  data-testid={`link-product-${index}`}
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  Ver no ML
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

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