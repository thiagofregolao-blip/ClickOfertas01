import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Package, Search, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function AITestManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState("");

  // ========== BUSCAR TODOS OS PRODUTOS ==========
  const { data: allProducts = [], isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ['/api/super-admin/all-products'],
    enabled: !!user?.isSuperAdmin,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // ========== MUTATION PARA GERAR BANNER DE TESTE ==========
  const generateTestBannerMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      return apiRequest('POST', '/api/super-admin/ai-test/generate-banner', {
        productIds,
        testMode: true
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Banner de teste gerado!",
        description: `Arte criada com sucesso usando ${selectedProducts.length} produto(s).`,
        variant: "default",
      });
      setSelectedProducts([]);
      // Invalidar cache das artes IA
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/generated-arts/manage'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na geração",
        description: error.message || "Erro ao gerar banner de teste.",
        variant: "destructive",
      });
    },
  });

  const handleProductSelect = (productId: string) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      }
      return [...prev, productId];
    });
  };

  const handleGenerateTest = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "Selecione produtos",
        description: "Escolha pelo menos 1 produto para gerar o banner.",
        variant: "destructive",
      });
      return;
    }
    generateTestBannerMutation.mutate(selectedProducts);
  };

  const filteredProducts = allProducts.filter((product: any) => {
    if (!product.isActive) return false;
    if (!productSearchTerm) return true;
    
    const searchLower = productSearchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.storeName?.toLowerCase().includes(searchLower) ||
      product.category?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Brain className="w-7 h-7 text-purple-600" />
          Teste de Geração de IA
        </h2>
        <p className="text-gray-500 mt-1">
          Gere banners de teste manualmente selecionando produtos específicos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SELETOR DE PRODUTOS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Selecionar Produtos ({selectedProducts.length})
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar produtos por nome, loja ou categoria..."
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-products"
              />
            </div>
          </CardHeader>
          <CardContent className="h-96">
            {productsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-500 mt-2 text-sm">Carregando produtos...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">
                  {productSearchTerm ? "Nenhum produto encontrado" : "Nenhum produto disponível"}
                </h3>
                <p className="text-sm">
                  {productSearchTerm 
                    ? "Tente usar termos diferentes na busca." 
                    : "Cadastre produtos nas lojas antes de criar banners de teste."
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredProducts.map((product: any) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product.id)}
                    className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                      selectedProducts.includes(product.id)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    data-testid={`product-option-${product.id}`}
                  >
                    <div className="flex items-start gap-3">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2">{product.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {product.storeName}
                          </Badge>
                          {product.category && (
                            <Badge variant="secondary" className="text-xs">
                              {product.category}
                            </Badge>
                          )}
                          {product.price && (
                            <span className="text-xs font-medium text-green-600">
                              R$ {parseFloat(product.price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {selectedProducts.includes(product.id) && (
                        <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PAINEL DE GERAÇÃO */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              Gerar Banner de Teste
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Como funciona:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Selecione de 1 a 5 produtos do lado esquerdo</li>
                <li>• Clique em "Gerar Banner" para criar uma arte com IA</li>
                <li>• O banner será criado automaticamente e aparecerá na seção "Artes IA"</li>
                <li>• Você pode ativar/desativar as artes geradas posteriormente</li>
              </ul>
            </div>

            {selectedProducts.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Produtos Selecionados:</h4>
                <div className="space-y-2">
                  {selectedProducts.map(productId => {
                    const product = allProducts.find((p: any) => p.id === productId);
                    return product ? (
                      <div key={productId} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        <span className="font-medium">{product.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {product.storeName}
                        </Badge>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            <Button
              onClick={handleGenerateTest}
              disabled={selectedProducts.length === 0 || generateTestBannerMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="lg"
              data-testid="button-generate-test-banner"
            >
              {generateTestBannerMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Gerando Banner...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Gerar Banner ({selectedProducts.length} produto{selectedProducts.length !== 1 ? 's' : ''})
                </>
              )}
            </Button>

            <div className="text-xs text-gray-500 text-center">
              ⚡ A geração pode levar alguns segundos para ser concluída
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}