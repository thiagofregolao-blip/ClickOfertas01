import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Package, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductBankItem } from "@shared/schema";

interface ProductBankSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProducts: (selectedProducts: ProductBankItem[]) => void;
}

const CATEGORIES = [
  "Todos", "Smartphones", "Acessórios", "Redes", "Armazenamento", "Periféricos", "Áudio", "Consoles",
  "Games", "Brinquedos", "Eletroportáteis", "Eletrônicos", "Computadores"
];

export function ProductBankSearchModal({ isOpen, onClose, onSelectProducts }: ProductBankSearchModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<ProductBankItem[]>([]);
  const pageSize = 10;

  // Buscar produtos do banco
  const { data: searchData, isLoading: isSearching } = useQuery({
    queryKey: ['/api/product-banks/items', searchQuery, selectedCategory, currentPage, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedCategory && selectedCategory !== 'Todos') params.append('category', selectedCategory);
      params.append('page', currentPage.toString());
      params.append('pageSize', pageSize.toString());
      
      const response = await apiRequest('GET', `/api/product-banks/items?${params.toString()}`);
      return await response.json();
    },
    enabled: isOpen,
  });

  const products = searchData?.items || [];
  const totalProducts = searchData?.total || 0;
  const totalPages = Math.ceil(totalProducts / pageSize);

  // Reset quando modal abre/fecha
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedCategory("Todos");
      setCurrentPage(1);
      setSelectedProducts([]);
    }
  }, [isOpen]);

  // Reset page quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const handleProductSelect = (product: ProductBankItem) => {
    setSelectedProducts(prev => {
      const isSelected = prev.find(p => p.id === product.id);
      if (isSelected) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  };

  const handleSelectAll = () => {
    const allSelected = products.every(p => selectedProducts.find(sp => sp.id === p.id));
    if (allSelected) {
      // Desmarcar todos da página atual
      setSelectedProducts(prev => prev.filter(p => !products.find(cp => cp.id === p.id)));
    } else {
      // Marcar todos da página atual
      const newProducts = products.filter(p => !selectedProducts.find(sp => sp.id === p.id));
      setSelectedProducts(prev => [...prev, ...newProducts]);
    }
  };

  const handleConfirm = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "Nenhum produto selecionado",
        description: "Selecione pelo menos um produto para continuar.",
        variant: "destructive",
      });
      return;
    }
    
    onSelectProducts(selectedProducts);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0" data-testid="modal-product-bank-search">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Package className="w-6 h-6" />
            Buscar Códigos de Produtos
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 w-6 p-0"
              onClick={onClose}
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {/* Campo de busca */}
          <div className="px-6 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por produto, marca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-products"
              />
            </div>
            
            {/* Informação sobre funcionamento */}
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium">Como funciona:</span>
                  <br />
                  Esta tabela contém produtos do nosso banco interno. Selecione produtos para importar automaticamente informações e imagens.
                </div>
              </div>
            </div>
          </div>

          {/* Filtros de categoria */}
          <div className="px-6 pb-4">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.slice(0, 8).map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  data-testid={`button-category-${category.toLowerCase()}`}
                  className="h-8"
                >
                  {category}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {CATEGORIES.slice(8).map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  data-testid={`button-category-${category.toLowerCase()}`}
                  className="h-8"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Lista de produtos */}
          <ScrollArea className="flex-1 p-6">
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Buscando produtos...</div>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mb-4" />
                <div className="text-lg font-medium">Nenhum produto encontrado</div>
                <div className="text-sm">Tente ajustar sua busca ou categoria</div>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((product) => {
                  const isSelected = selectedProducts.find(p => p.id === product.id);
                  const isPopular = (product.timesUsed || 0) > 5;
                  
                  return (
                    <div
                      key={product.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleProductSelect(product)}
                      data-testid={`product-item-${product.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm leading-tight">{product.name}</h3>
                            {isPopular && (
                              <Badge variant="secondary" className="text-xs px-2 py-0">
                                Popular
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            {product.brand && (
                              <>
                                <span className="inline-flex items-center gap-1">
                                  <Package className="w-3 h-3" />
                                  {product.brand}
                                </span>
                                <span>•</span>
                              </>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-muted-foreground/40"></span>
                              {product.category}
                            </span>
                          </div>
                          
                          {product.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="ml-4 flex-shrink-0 flex flex-col items-end gap-2">
                          <Button
                            size="sm"
                            variant={isSelected ? "default" : "outline"}
                            className="min-w-[80px]"
                            data-testid={`button-use-product-${product.id}`}
                          >
                            {isSelected ? "Selecionado" : "Usar Este"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <Separator />

          {/* Rodapé com paginação e ações */}
          <div className="p-6 space-y-4">
            {/* Informações e paginação */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>{totalProducts} produtos encontrados</span>
                {selectedProducts.length > 0 && (
                  <Badge variant="outline" className="text-primary border-primary">
                    {selectedProducts.length} selecionado{selectedProducts.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    data-testid="button-previous-page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <span className="text-xs">
                    Página {currentPage} de {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            
            {/* Botões de ação */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel"
              >
                Fechar
              </Button>
              
              {products.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  data-testid="button-select-all-page"
                >
                  {products.every(p => selectedProducts.find(sp => sp.id === p.id))
                    ? 'Desmarcar página'
                    : 'Marcar página'
                  }
                </Button>
              )}
              
              <Button
                onClick={handleConfirm}
                disabled={selectedProducts.length === 0}
                data-testid="button-confirm-selection"
                className="ml-auto"
              >
                Importar Produtos ({selectedProducts.length})
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}