import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Download, Trash2, MapPin, Store, DollarSign, Settings, BarChart3, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { SavedProductWithDetails } from "@shared/schema";
import jsPDF from 'jspdf';

// Agrupar produtos por loja
function groupProductsByStore(savedProducts: SavedProductWithDetails[]) {
  const grouped = savedProducts.reduce((acc, savedProduct) => {
    const storeId = savedProduct.product.store.id;
    if (!acc[storeId]) {
      acc[storeId] = {
        store: savedProduct.product.store,
        products: []
      };
    }
    acc[storeId].products.push(savedProduct);
    return acc;
  }, {} as Record<string, { store: any; products: SavedProductWithDetails[] }>);
  
  return Object.values(grouped);
}

export default function ShoppingList() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [, setLocation] = useLocation();

  const { data: savedProducts = [], isLoading, error } = useQuery<SavedProductWithDetails[]>({
    queryKey: ['/api/saved-products'],
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 segundos
  });

  const removeProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      return apiRequest("DELETE", `/api/saved-products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-products'] });
      toast({
        title: "Produto removido!",
        description: "O produto foi removido da sua lista de compras.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o produto.",
        variant: "destructive",
      });
    },
  });

  const groupedProducts = groupProductsByStore(savedProducts);

  // Calcular totais
  const grandTotal = savedProducts.reduce((total, savedProduct) => {
    return total + Number(savedProduct.product.price || 0);
  }, 0);

  const generatePDF = async () => {
    if (savedProducts.length === 0) {
      toast({
        title: "Lista vazia",
        description: "Adicione produtos à sua lista antes de gerar o PDF.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPDF(true);
    
    try {
      const pdf = new jsPDF();
      let yPosition = 20;
      
      // Título
      pdf.setFontSize(20);
      pdf.text('Lista de Compras - Paraguai', 20, yPosition);
      yPosition += 15;
      
      // Data
      pdf.setFontSize(12);
      pdf.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, yPosition);
      yPosition += 10;
      
      // Total geral
      pdf.text(`Total Geral: US$ ${grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, yPosition);
      yPosition += 20;

      // Produtos por loja
      groupedProducts.forEach((group) => {
        const storeTotal = group.products.reduce((total, savedProduct) => {
          return total + Number(savedProduct.product.price || 0);
        }, 0);

        // Nome da loja
        pdf.setFontSize(16);
        pdf.text(`${group.store.name}`, 20, yPosition);
        yPosition += 8;
        
        // Total da loja
        pdf.setFontSize(12);
        pdf.text(`Total: US$ ${storeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, yPosition);
        yPosition += 8;
        
        yPosition += 5;

        // Produtos da loja
        group.products.forEach((savedProduct) => {
          if (yPosition > 270) { // Nova página se necessário
            pdf.addPage();
            yPosition = 20;
          }
          
          const product = savedProduct.product;
          const price = Number(product.price || 0);
          
          pdf.setFontSize(11);
          pdf.text(`• ${product.name}`, 30, yPosition);
          pdf.text(`US$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 150, yPosition);
          yPosition += 6;
        });
        
        yPosition += 10;
      });

      // Adicionar rodapé
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.text('Gerado por ClickOfertas', 20, 285);
        pdf.text(`Página ${i} de ${pageCount}`, 170, 285);
      }

      // Download
      pdf.save(`lista-compras-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "PDF gerado!",
        description: "Sua lista de compras foi baixada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Login necessário</h2>
            <p className="text-gray-600">
              Faça login para ver sua lista de compras.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="mb-4">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(2)].map((_, j) => (
                    <div key={j} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar</h2>
            <p className="text-gray-600">
              Não foi possível carregar sua lista de compras.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b shadow-sm" style={{background: 'linear-gradient(to bottom right, #F04940, #FA7D22)'}}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShoppingCart className="h-7 w-7 text-white" />
                Lista de Compras
              </h1>
              <p className="text-white/90 mt-1">
                {savedProducts.length} produto{savedProducts.length !== 1 ? 's' : ''} em {groupedProducts.length} loja{groupedProducts.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            {savedProducts.length > 0 && (
              <Button 
                onClick={generatePDF}
                disabled={isGeneratingPDF}
                className="bg-white hover:bg-gray-100 text-gray-900 border border-white/20"
              >
                <Download className="h-4 w-4 mr-2" />
                {isGeneratingPDF ? 'Gerando...' : 'Baixar PDF'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-6">

          {/* Resumo */}
          {savedProducts.length > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">{groupedProducts.length} loja{groupedProducts.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">{savedProducts.length} produto{savedProducts.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="text-lg font-bold text-green-700">
                    US$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lista vazia */}
        {savedProducts.length === 0 && (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Lista vazia</h2>
              <p className="text-gray-600 mb-6">
                Comece salvando produtos usando o botão "Salvar" nos panfletos das lojas.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Produtos agrupados por loja */}
        {groupedProducts.map((group) => {
          const storeTotal = group.products.reduce((total, savedProduct) => {
            return total + Number(savedProduct.product.price || 0);
          }, 0);

          return (
            <Card key={group.store.id} className="mb-6">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: group.store.themeColor || '#E11D48' }}
                      />
                      {group.store.name}
                    </CardTitle>
                    {group.store.address && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-2">
                        <MapPin className="h-4 w-4" />
                        {group.store.address}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="mb-2">
                      {group.products.length} produto{group.products.length !== 1 ? 's' : ''}
                    </Badge>
                    <div className="text-lg font-bold text-green-600">
                      US$ {storeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {group.products.map((savedProduct) => {
                    const product = savedProduct.product;
                    const price = Number(product.price || 0);
                    
                    return (
                      <div key={savedProduct.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          {product.imageUrl && (
                            <img 
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{product.name}</h4>
                            {product.description && (
                              <p className="text-sm text-gray-600 line-clamp-1">
                                {product.description}
                              </p>
                            )}
                            {product.category && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {product.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-bold text-gray-900">
                              US$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-sm text-gray-600">
                              {group.store.currency || 'Gs.'} {(price * Number(group.store.dollarRate || 7500)).toLocaleString('pt-BR')}
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProductMutation.mutate(savedProduct.id)}
                            disabled={removeProductMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Menu do Rodapé Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around py-2 px-4">
          {/* Home */}
          <Link href="/">
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
          
          {/* Configurações */}
          <button
            onClick={() => setLocation('/settings')}
            className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
            data-testid="button-mobile-settings"
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs">Config</span>
          </button>
          
          {/* Comparar Preços */}
          <Link href="/price-comparison">
            <button
              className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
              data-testid="button-mobile-comparison"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-xs">Comparar</span>
            </button>
          </Link>
          
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