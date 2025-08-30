import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingDown, TrendingUp, ExternalLink, RefreshCw, AlertCircle, Zap, DollarSign, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPriceWithCurrency } from "@/lib/priceUtils";

interface BrazilianPrice {
  store: string;
  price: number;
  currency: string;
  url: string;
  availability: 'in_stock' | 'out_of_stock' | 'limited';
  lastUpdated: string;
}

interface ProductComparison {
  productName: string;
  paraguayPrice: number;
  paraguayCurrency: string;
  paraguayStore: string;
  brazilianPrices: BrazilianPrice[];
  suggestions: {
    name: string;
    difference: string;
    reason: string;
  }[];
  savings: {
    amount: number;
    percentage: number;
    bestStore: string;
  };
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
      <div className="bg-white border-b shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🌎 Comparação de Preços Internacional
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Compare preços entre Paraguay e Brasil. Encontre as melhores ofertas e economize em suas compras internacionais.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Buscar Produto para Comparar
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
                      <span className="text-lg font-bold text-blue-800">
                        {formatPriceWithCurrency(selectedProductForSearch.price, 'US$')}
                      </span>
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

        {/* Comparison Results */}
        {comparisonData && (
          <div className="mt-8 space-y-6">
            {/* Summary Card */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <TrendingDown className="w-5 h-5" />
                  Resultado da Comparação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Produto</h4>
                    <p className="text-sm">{comparisonData.productName}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Preço no Paraguay</h4>
                    <p className="text-lg font-bold text-green-600">
                      {formatPriceWithCurrency(comparisonData.paraguayPrice, comparisonData.paraguayCurrency)}
                    </p>
                    <p className="text-xs text-gray-600">{comparisonData.paraguayStore}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Economia Máxima</h4>
                    <p className="text-lg font-bold text-red-600">
                      -{formatPriceWithCurrency(comparisonData.savings.amount, 'R$')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {comparisonData.savings.percentage}% mais barato que {comparisonData.savings.bestStore}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Brazilian Prices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🇧🇷 Preços no Brasil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comparisonData.brazilianPrices.map((price, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-semibold">{price.store}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={price.availability === 'in_stock' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {price.availability === 'in_stock' ? 'Em estoque' : 
                             price.availability === 'limited' ? 'Estoque limitado' : 'Sem estoque'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Atualizado: {new Date(price.lastUpdated).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {formatPriceWithCurrency(price.price, price.currency)}
                        </div>
                        <Button variant="outline" size="sm" asChild className="mt-2">
                          <a href={price.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Ver loja
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Suggestions */}
            {comparisonData.suggestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Produtos Similares Sugeridos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {comparisonData.suggestions.map((suggestion, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <h4 className="font-semibold">{suggestion.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{suggestion.reason}</p>
                        <Badge variant="outline" className="mt-2">
                          {suggestion.difference}
                        </Badge>
                      </div>
                    ))}
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