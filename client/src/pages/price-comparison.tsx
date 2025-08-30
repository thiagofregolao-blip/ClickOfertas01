import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, TrendingDown, TrendingUp, ExternalLink, RefreshCw, AlertCircle, Zap } from "lucide-react";
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

  const filteredProducts = paraguayProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const comparisonData = comparePricesMutation.data as ProductComparison | undefined;

  const handleCompareProduct = (productId: string) => {
    setSelectedProduct(productId);
    comparePricesMutation.mutate(productId);
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
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Digite o nome do produto (ex: iPhone 15, Samsung Galaxy S24, MacBook...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-product-search"
              />
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        {loadingProducts ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-sm mb-1" title={product.name}>
                      {product.name.length > 50 
                        ? `${product.name.substring(0, 50)}...` 
                        : product.name}
                    </h3>
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">{product.store?.name}</span>
                      {product.category && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {product.category}
                        </Badge>
                      )}
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      {formatPriceWithCurrency(product.price, 'US$')}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleCompareProduct(product.id)}
                    disabled={comparePricesMutation.isPending && selectedProduct === product.id}
                    className="w-full"
                    data-testid={`button-compare-${product.id}`}
                  >
                    {comparePricesMutation.isPending && selectedProduct === product.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Comparando...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Comparar Preços
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchQuery ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum produto encontrado
              </h3>
              <p className="text-gray-600">
                Tente buscar por termos diferentes ou categorias como "eletrônicos", "celular", "notebook".
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Digite um produto para começar
              </h3>
              <p className="text-gray-600">
                Use a barra de busca acima para encontrar produtos disponíveis no Paraguay.
              </p>
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