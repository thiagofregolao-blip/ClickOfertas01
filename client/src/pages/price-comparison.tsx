import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, AlertCircle, Zap, ChevronDown, ArrowRightLeft, Bell, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPriceWithCurrency } from "@/lib/priceUtils";
import { useAuth } from "@/hooks/useAuth";
import { PriceComparisonResult } from "@/components/price-comparison-result";

interface BrazilianPrice {
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
  suggestions?: {
    name: string;
    difference: string;
    reason: string;
  }[];
  message?: string;
}

export default function PriceComparison() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedProductForSearch, setSelectedProductForSearch] = useState<any | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Buscar produtos disponíveis no Paraguay para comparação
  const { data: paraguayProducts = [], isLoading: loadingProducts } = useQuery<any[]>({
    queryKey: ['/api/public/products-for-comparison'],
    staleTime: 5 * 60 * 1000,
  });

  // Realizar comparação de preços
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

  // Buscar histórico de preços
  const { data: priceHistory = [], isLoading: loadingHistory } = useQuery<any[]>({
    queryKey: ['/api/price-history', comparePricesMutation.data?.productName],
    enabled: !!comparePricesMutation.data?.productName,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  // Filtro inteligente de produtos para autocomplete
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    return paraguayProducts
      .filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.store?.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 10); // Limitar a 10 sugestões
  }, [paraguayProducts, searchQuery]);

  // Hook para buscar cotação USD → BRL
  const { data: exchangeRateData } = useQuery<{ rate: number }>({
    queryKey: ['/api/exchange-rate/usd-brl'],
    refetchInterval: 30 * 60 * 1000, // Atualizar a cada 30 minutos
    staleTime: 15 * 60 * 1000, // Considerar stale após 15 minutos
  });

  const comparisonData = comparePricesMutation.data as ProductComparison | undefined;

  const handleCompareProduct = (product: any) => {
    setSelectedProduct(product.id);
    setSelectedProductForSearch(product);
    setSearchQuery(product.name);
    setShowSuggestions(false);
    comparePricesMutation.mutate(product.id);
  };

  const handleSelectProduct = (product: any) => {
    setSelectedProductForSearch(product);
    setSearchQuery(product.name);
    setShowSuggestions(false);
  };

  const handleInputFocus = () => {
    if (filteredProducts.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay para permitir click na sugestão
    setTimeout(() => setShowSuggestions(false), 150);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b shadow-sm" style={{background: 'linear-gradient(to bottom right, #F04940, #FA7D22)'}}>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="text-center">
            <h1 className="text-xl font-bold text-white mb-2">
              Comparação de Preços Internacional
            </h1>
            <p className="text-white max-w-2xl mx-auto">
              Compare preços entre Paraguay e Brasil. Encontre as melhores ofertas e economize em suas compras internacionais.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Buscar Produto para Comparar
              </div>
              {/* Cotação do dia */}
              {exchangeRateData && (
                <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-1 rounded-full">
                  <ArrowRightLeft className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-800 font-medium">
                    Cotação do dia: US$ 1,00 = R$ {exchangeRateData.rate?.toFixed(2)}
                  </span>
                </div>
              )}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Escolha um produto disponível no Paraguay para comparar preços com o Brasil
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Digite o nome do produto para comparar preços..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value.trim()) {
                        setShowSuggestions(true);
                      } else {
                        setShowSuggestions(false);
                        setSelectedProductForSearch(null);
                      }
                    }}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="pl-12 pr-4 h-12 text-base"
                    data-testid="input-product-search"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedProductForSearch(null);
                        setShowSuggestions(false);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                {/* Sugestões */}
                {showSuggestions && filteredProducts.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        data-testid={`item-product-${product.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {product.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-600">{product.store?.name}</span>
                            {product.category && (
                              <Badge variant="outline" className="text-xs">
                                {product.category}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-green-600 mt-1">
                            {formatPriceWithCurrency(product.price, 'US$')}
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-400 mt-1" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedProductForSearch && (
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900">{selectedProductForSearch.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-blue-700">{selectedProductForSearch.store?.name}</span>
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-blue-800">
                          {formatPriceWithCurrency(selectedProductForSearch.price, 'US$')}
                        </span>
                        {/* Conversão USD → BRL */}
                        {exchangeRateData && (
                          <span className="text-sm text-blue-600">
                            ≈ {formatPriceWithCurrency(
                              (parseFloat(selectedProductForSearch.price) * exchangeRateData.rate).toFixed(2), 
                              'R$'
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleCompareProduct(selectedProductForSearch)}
                    disabled={comparePricesMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-start-comparison"
                  >
                    {comparePricesMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Comparando...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4 mr-2" />
                        Comparar Preços
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Welcome Message */}
        {!selectedProductForSearch && !comparisonData && (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="p-12 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Search className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Compare Preços Internacionais
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Selecione um produto paraguaio na busca acima e descubra quanto você pode economizar comprando no Paraguay em vez do Brasil.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Preços atualizados em tempo real
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Comparação com lojas brasileiras
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Cálculo de economia real
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comparison Results - Usando componente padronizado */}
        {comparisonData && (
          <div className="mt-8 space-y-6">
            <PriceComparisonResult
              productName={comparisonData.productName}
              paraguayPrice={comparisonData.paraguayPrice}
              paraguayCurrency={comparisonData.paraguayCurrency || 'USD'}
              paraguayStore={comparisonData.paraguayStore || 'Loja do Paraguay'}
              brazilianPrices={comparisonData.brazilianPrices}
              exchangeRate={exchangeRateData?.rate || 5.47}
              savings={{
                amount: comparisonData.savings,
                percentage: comparisonData.savingsPercentage,
                bestStore: comparisonData.bestBrazilianStore,
                cheaperInBrazil: comparisonData.cheaperInBrazil
              }}
              showDetailedResults={true}
            />

            {/* Histórico de Preços */}
            {priceHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Histórico de Preços (últimos 30 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {priceHistory.slice(0, 10).map((record, index) => (
                      <div key={record.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{record.storeName}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(record.recordedAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">
                            {formatPriceWithCurrency(record.price, record.currency === 'BRL' ? 'R$' : 'US$')}
                          </p>
                          <Badge variant={record.availability === 'in_stock' ? 'default' : 'destructive'} className="text-xs">
                            {record.availability === 'in_stock' ? 'Disponível' : 'Indisponível'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    
                    {priceHistory.length > 10 && (
                      <p className="text-xs text-gray-500 text-center">
                        Mostrando os 10 registros mais recentes de {priceHistory.length} total
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        )}
      </div>
    </div>
  );
}