import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingDown, TrendingUp, ExternalLink, RefreshCw, AlertCircle, Zap, DollarSign, ChevronDown, ArrowRightLeft, Bell, Filter, Settings, ShoppingCart, BarChart3, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPriceWithCurrency } from "@/lib/priceUtils";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import ProductCard from "@/components/product-card";
import { ProductDetailModal } from "@/components/product-detail-modal";

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
  const [selectedProductDetail, setSelectedProductDetail] = useState<any | null>(null);
  const [selectedStore, setSelectedStore] = useState<any | null>(null);
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  // Buscar produtos disponíveis no Paraguay para comparação
  const { data: paraguayProducts = [], isLoading: loadingProducts } = useQuery<any[]>({
    queryKey: ['/api/public/products-for-comparison'],
    staleTime: 5 * 60 * 1000,
  });

  // Buscar todas as lojas com produtos para exibir no lado direito
  const { data: allStores = [], isLoading: loadingStores } = useQuery<any[]>({
    queryKey: ['/api/public/stores'],
    staleTime: 10 * 60 * 1000,
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

  // Filtrar produtos relacionados para exibir no lado direito
  // Só mostrar APÓS clicar em "Comparar Preços" (quando comparisonData existir)
  const relatedProducts = useMemo(() => {
    if (!comparePricesMutation.data?.productName) return [];
    
    // Extrair todos os produtos de todas as lojas
    const allProducts = allStores.flatMap(store => 
      store.products
        ?.filter((product: any) => product.isActive)
        ?.map((product: any) => ({ ...product, store })) || []
    );
    
    // Buscar o produto comparado em todas as lojas
    const productName = comparePricesMutation.data.productName.toLowerCase();
    return allProducts
      .filter(product => {
        const similarity = product.name.toLowerCase();
        // Busca mais flexível - considera produtos similares
        return similarity.includes(productName) || 
               productName.includes(similarity) ||
               // Busca por palavras-chave do produto
               productName.split(' ').some(word => 
                 word.length > 3 && similarity.includes(word)
               );
      })
      .slice(0, 8); // Limitar a 8 resultados
  }, [allStores, comparePricesMutation.data]);

  // Hook para buscar cotação USD → BRL
  const { data: exchangeRateData } = useQuery<{ rate: number }>({
    queryKey: ['/api/exchange-rate/usd-brl'],
    refetchInterval: 30 * 60 * 1000, // Atualizar a cada 30 minutos
    staleTime: 15 * 60 * 1000, // Considerar stale após 15 minutos
  });


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

      {/* New Layout Container */}
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        
        {/* Mobile: título da seção no topo */}
        <div className="lg:hidden mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Comparação de Preços
          </h1>
          <p className="text-gray-600">
            Compare preços entre Paraguay e Brasil
          </p>
        </div>
        
        {/* Seção Superior: Busca + Resultado da Comparação */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Lado Esquerdo: Busca e Seleção */}
          <div className="space-y-6">
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
                  <div className="flex gap-2">
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
                    
                    {/* Botão Nova Pesquisa - só aparece após uma comparação */}
                    {comparePricesMutation.data && (
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedProduct(null);
                          setSelectedProductForSearch(null);
                          setShowSuggestions(false);
                          // Limpar dados da comparação
                          comparePricesMutation.reset();
                        }}
                        className="px-4"
                        data-testid="button-new-search"
                      >
                        Nova Pesquisa
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

          </div>
          
          {/* Lado Direito: Resultado da Comparação */}
          <div className="space-y-6">
            {/* Welcome Message ou Resultado Compacto */}
            {!selectedProductForSearch && !comparePricesMutation.data ? (
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="p-8 text-center">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                      <Search className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Compare Preços
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Selecione um produto e descubra quanto você pode economizar
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : comparePricesMutation.data && (
              /* Resultado da Comparação Compacto */
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Resultado da Comparação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Produto</h4>
                    <p className="text-sm">{comparePricesMutation.data.productName}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Paraguay</h4>
                      {exchangeRateData && (
                        <p className="text-lg font-bold text-green-600">
                          {formatPriceWithCurrency(
                            (parseFloat(comparePricesMutation.data.paraguayPrice.toString()) * exchangeRateData.rate).toFixed(2), 
                            'R$'
                          )}
                        </p>
                      )}
                      <p className="text-xs text-gray-600">{comparePricesMutation.data.paraguayStore}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Brasil</h4>
                      {(() => {
                        const minPrice = Math.min(...comparePricesMutation.data.brazilianPrices.map((p: any) => parseFloat(p.price.toString())));
                        const bestBrazilianOffer = comparePricesMutation.data.brazilianPrices.find((p: any) => parseFloat(p.price.toString()) === minPrice);
                        
                        return (
                          <div>
                            <p className="text-lg font-bold text-blue-600">
                              {formatPriceWithCurrency(minPrice.toFixed(2), 'R$')}
                            </p>
                            <p className="text-xs text-gray-600">{bestBrazilianOffer?.store}</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    {comparePricesMutation.data.savings.amount < 0 ? (
                      <p className="text-sm font-medium text-blue-600">
                        Mais barato no Brasil
                      </p>
                    ) : comparePricesMutation.data.savings.amount > 0 ? (
                      <div>
                        <p className="text-sm font-bold text-green-600">
                          🎉 Economia: {formatPriceWithCurrency(comparePricesMutation.data.savings.amount.toString(), 'R$')}
                        </p>
                        <p className="text-xs text-gray-600">
                          {comparePricesMutation.data.savings.percentage}% mais barato
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Preços similares</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        
        {/* Seção Inferior: Grid de Cards dos Produtos Relacionados */}
        {relatedProducts.length > 0 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Onde comprar: {comparePricesMutation.data?.productName}
              </h3>
              <p className="text-gray-600">
                {relatedProducts.length} opções encontradas nas lojas do Paraguay
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {relatedProducts.map((product) => (
                <div 
                  key={`${product.store.id}-${product.id}`}
                  className="border rounded-lg p-4 hover:shadow-md cursor-pointer transition-all bg-white"
                  onClick={() => {
                    setSelectedProductDetail(product);
                    setSelectedStore(product.store);
                  }}
                >
                  {/* Imagem do produto */}
                  <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100 mb-3">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-sm">Sem foto</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Informações do produto */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                      {product.name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {product.store.name}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-green-600">
                        {formatPriceWithCurrency(product.price?.toString() || '0', 'US$')}
                      </p>
                      {product.category && (
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {product.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProductDetail}
        store={selectedStore}
        isOpen={!!selectedProductDetail}
        onClose={() => {
          setSelectedProductDetail(null);
          setSelectedStore(null);
        }}
      />
      
      {/* Menu do Rodapé Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around py-2 px-4">
          {/* Home */}
          <Link href="/cards">
            <button
              className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
              data-testid="button-mobile-home"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
              <span className="text-xs">Home</span>
            </button>
          </Link>
          
          {/* Lista de Compras */}
          <button
            onClick={() => setLocation('/shopping-list')}
            className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
            data-testid="button-mobile-shopping"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-xs">Lista</span>
          </button>
          
          {/* Meus Cupons */}
          <button
            onClick={() => setLocation('/my-coupons')}
            className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
            data-testid="button-mobile-coupons"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="18" rx="2" ry="2"/>
              <line x1="8" y1="2" x2="8" y2="22"/>
              <line x1="16" y1="2" x2="16" y2="22"/>
            </svg>
            <span className="text-xs">Cupons</span>
          </button>
          
          {/* Configurações */}
          <button
            onClick={() => setLocation('/settings')}
            className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
            data-testid="button-mobile-settings"
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs">Config</span>
          </button>
          
          {/* Sair */}
          {isAuthenticated && (
            <button
              onClick={() => {
                window.location.href = '/api/logout';
              }}
              className="flex flex-col items-center gap-1 p-2 text-red-600 hover:text-red-700"
              data-testid="button-mobile-logout"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-xs">Sair</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
