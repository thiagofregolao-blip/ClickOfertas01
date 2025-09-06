import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ShoppingCart, Globe, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface PriceResult {
  title: string;
  price: string;
  originalPrice?: string;
  currency: string;
  url: string;
  imageUrl?: string;
  availability: string;
  seller?: string;
  rating?: string;
  source: string;
  scrapedAt: string;
}

export default function ApifyDemo() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const { toast } = useToast();

  // Test connectivity
  const { data: connectionTest, isLoading: testingConnection } = useQuery({
    queryKey: ['/api/apify/test'],
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Search results
  const { data: searchResults, isLoading: searching, error } = useQuery({
    queryKey: ['/api/apify/search/google', activeSearch],
    enabled: !!activeSearch,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Digite um termo para buscar",
        variant: "destructive",
      });
      return;
    }
    setActiveSearch(`q=${encodeURIComponent(searchQuery)}&maxItems=5`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <Zap className="text-blue-600" size={40} />
            Apify Demo - Busca de Preços
          </h1>
          <p className="text-gray-600 text-lg">
            Integração com Apify para busca de preços em tempo real
          </p>
        </div>

        {/* Connection Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="text-green-600" size={20} />
              Status da Conexão
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testingConnection ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                <span>Testando conexão...</span>
              </div>
            ) : (connectionTest as any)?.status === 'success' ? (
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">Conectado com sucesso!</span>
                <Badge variant="outline" className="ml-2">{(connectionTest as any).message}</Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="font-medium">Erro na conexão</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search Interface */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="text-blue-600" size={20} />
              Busca de Preços no Google Shopping
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Digite um produto para buscar (ex: smartphone, notebook...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
                data-testid="input-search-query"
              />
              <Button 
                onClick={handleSearch} 
                disabled={searching || !searchQuery.trim()}
                data-testid="button-search"
              >
                {searching ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2" size={16} />
                    Buscar
                  </>
                )}
              </Button>
            </div>
            
            {activeSearch && (
              <p className="text-sm text-gray-500 mt-2">
                Buscando por: <span className="font-medium">{decodeURIComponent(activeSearch.split('=')[1].split('&')[0])}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Search Results */}
        {error && (
          <Card className="mb-6 border-red-200">
            <CardContent className="pt-6">
              <div className="text-red-600 text-center">
                <p className="font-medium">Erro na busca</p>
                <p className="text-sm">{(error as any)?.message || 'Erro desconhecido'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {searchResults && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Resultados da Busca
              </h2>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {(searchResults as any).totalResults} produtos encontrados
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(searchResults as any).results?.map((product: PriceResult, index: number) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    {/* Product Image */}
                    {product.imageUrl && (
                      <div className="mb-3">
                        <img 
                          src={product.imageUrl} 
                          alt={product.title}
                          className="w-full h-32 object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Product Title */}
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {product.title}
                    </h3>

                    {/* Price */}
                    <div className="mb-2">
                      <span className="text-2xl font-bold text-green-600">
                        {product.currency} {product.price}
                      </span>
                      {product.originalPrice && (
                        <span className="text-sm text-gray-500 line-through ml-2">
                          {product.currency} {product.originalPrice}
                        </span>
                      )}
                    </div>

                    {/* Seller & Rating */}
                    <div className="flex justify-between items-center mb-3">
                      {product.seller && (
                        <Badge variant="secondary" className="text-xs">
                          {product.seller}
                        </Badge>
                      )}
                      {product.rating && (
                        <span className="text-yellow-500 text-sm">
                          ⭐ {product.rating}
                        </span>
                      )}
                    </div>

                    {/* Availability */}
                    <div className="mb-3">
                      <Badge 
                        variant={product.availability.includes('Disponível') ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {product.availability}
                      </Badge>
                    </div>

                    {/* View Product Button */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => window.open(product.url, '_blank')}
                      data-testid={`button-view-product-${index}`}
                    >
                      <ShoppingCart className="mr-2" size={14} />
                      Ver Produto
                    </Button>

                    {/* Metadata */}
                    <div className="mt-2 text-xs text-gray-400">
                      Fonte: {product.source} • {new Date(product.scrapedAt).toLocaleString('pt-BR')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">✅ Funcionando</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• <strong>Google Shopping</strong> - Busca funcionando perfeitamente</li>
                <li>• <strong>Conectividade</strong> - API Apify conectada com sucesso</li>
                <li>• <strong>Dados em tempo real</strong> - Preços atualizados</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-orange-600">⚠️ Limitações</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• <strong>Amazon/eBay</strong> - Precisam de créditos pagos</li>
                <li>• <strong>Plano gratuito</strong> - $5/mês em créditos Apify</li>
                <li>• <strong>Expansão</strong> - Mais scrapers disponíveis na loja</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}