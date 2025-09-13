import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Tag, Info } from 'lucide-react';
import { getProductsByCategory, searchProducts, PRODUCT_CATEGORIES, type ProductCategory, type IcecatKnownProduct } from '@shared/icecat-products';

interface IcecatCodeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (gtin: string, productName: string) => void;
}

export function IcecatCodeSearchModal({ isOpen, onClose, onSelectProduct }: IcecatCodeSearchModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>("Todos");
  const [searchQuery, setSearchQuery] = useState("");

  // Produtos filtrados baseados na categoria e busca
  const filteredProducts = useMemo(() => {
    if (searchQuery.trim()) {
      return searchProducts(searchQuery);
    } else {
      return getProductsByCategory(selectedCategory);
    }
  }, [selectedCategory, searchQuery]);

  const handleSelectProduct = (product: IcecatKnownProduct) => {
    onSelectProduct(product.gtin, product.name);
    onClose();
    setSearchQuery("");
    setSelectedCategory("Todos");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Buscar Códigos de Produtos
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Barra de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por produto, marca ou GTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-products"
            />
          </div>

          {/* Aviso explicativo */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Como funciona:</p>
                <p>Esta tabela contém produtos <strong>testados</strong> que funcionam no Icecat. Selecione um produto para usar seu GTIN e importar automaticamente imagens e informações.</p>
              </div>
            </div>
          </div>

          {/* Filtros de categoria (apenas se não estiver buscando) */}
          {!searchQuery.trim() && (
            <div className="flex flex-wrap gap-2">
              {PRODUCT_CATEGORIES.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  data-testid={`filter-category-${category.toLowerCase()}`}
                >
                  {category}
                </Button>
              ))}
            </div>
          )}

          {/* Lista de produtos */}
          <div className="flex-1 min-h-0 overflow-auto">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum produto encontrado</p>
                {searchQuery.trim() && (
                  <p className="text-sm mt-1">Tente buscar por termos mais gerais ou verifique as categorias</p>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.gtin}
                    className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleSelectProduct(product)}
                    data-testid={`product-item-${product.gtin}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{product.name}</h3>
                          {product.popular && (
                            <Badge variant="secondary" className="text-xs">
                              Popular
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            <span>{product.brand}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            <span>{product.category}</span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                      </div>
                      
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xs text-muted-foreground mb-1">GTIN</div>
                        <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {product.gtin}
                        </div>
                        <Button 
                          size="sm" 
                          className="mt-2"
                          data-testid={`button-select-${product.gtin}`}
                        >
                          Usar Este
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div className="flex justify-between items-center pt-3 border-t">
            <div className="text-sm text-muted-foreground">
              {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
            </div>
            <Button variant="outline" onClick={onClose} data-testid="button-close-modal">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}