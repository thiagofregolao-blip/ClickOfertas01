import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Heart, ShoppingCart, Star, Sparkles, Zap } from 'lucide-react';
import { LazyImage } from '@/components/lazy-image';
import { useQuery } from '@tanstack/react-query';

interface Product {
  id: string;
  title: string;
  category: string;
  imageUrl?: string;
  price?: { USD?: number };
  storeId: string;
  storeName: string;
  storeLogoUrl?: string;
  storePremium?: boolean;
}

interface ClickEnvironmentProps {
  params: { productId?: string; category?: string };
}

export default function ClickEnvironment({ params }: ClickEnvironmentProps) {
  const [, setLocation] = useLocation();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Buscar produto principal e sugestões relacionadas
  const { data: suggestions, isLoading } = useQuery<{
    mainProduct?: Product;
    relatedProducts: Product[];
    aiMessage: string;
  }>({
    queryKey: [`/api/click-suggestions`, params.productId, params.category],
    enabled: !!(params.productId || params.category),
  });

  const handleAddToCart = (productId: string) => {
    setSelectedProducts(prev => [...prev, productId]);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleGoToShoppingList = () => {
    setLocation('/shopping-list');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Click preparando sugestões especiais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Efeitos de fundo animados */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header com botão voltar */}
      <div className="relative z-10 p-6">
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
        {/* Header do Click Assistant */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Click Environment</h1>
              <p className="text-xl text-blue-200">Ambiente Exclusivo de Descobertas</p>
            </div>
          </div>
          
          {/* Mensagem da IA */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 max-w-3xl mx-auto border border-white/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="text-white text-lg leading-relaxed">
                  {suggestions?.aiMessage || "Com base na sua busca, aqui estão algumas sugestões que podem te ajudar! 🎯 Não se esqueça de salvar em sua lista de compras."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Produto principal (se houver) */}
        {suggestions?.mainProduct && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-400" />
              Produto Selecionado
            </h2>
            <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <ProductCard 
                product={suggestions.mainProduct} 
                isSelected={selectedProducts.includes(suggestions.mainProduct.id)}
                onAddToCart={handleAddToCart}
                featured={true}
              />
            </div>
          </div>
        )}

        {/* Produtos relacionados */}
        {suggestions?.relatedProducts && suggestions.relatedProducts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-400" />
              Sugestões Inteligentes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestions.relatedProducts.map(product => (
                <div key={product.id} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                  <ProductCard 
                    product={product} 
                    isSelected={selectedProducts.includes(product.id)}
                    onAddToCart={handleAddToCart}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão para lista de compras */}
        {selectedProducts.length > 0 && (
          <div className="fixed bottom-6 right-6 z-20">
            <Button
              onClick={handleGoToShoppingList}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-2xl shadow-2xl text-lg font-semibold flex items-center gap-2"
              data-testid="go-to-shopping-list"
            >
              <ShoppingCart className="w-5 h-5" />
              Ver Lista ({selectedProducts.length})
            </Button>
          </div>
        )}

        {/* Mensagem de sucesso */}
        {showSuccess && (
          <div className="fixed top-6 right-6 z-30 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-2xl animate-bounce">
            ✅ Adicionado à lista!
          </div>
        )}
      </div>
    </div>
  );
}

// Componente do Card de Produto
function ProductCard({ 
  product, 
  isSelected, 
  onAddToCart, 
  featured = false 
}: { 
  product: Product; 
  isSelected: boolean; 
  onAddToCart: (id: string) => void;
  featured?: boolean;
}) {
  return (
    <div className={`${featured ? 'scale-105' : ''} transition-transform duration-300`}>
      <div className="flex items-start gap-4 mb-4">
        <div className={`${featured ? 'w-24 h-24' : 'w-16 h-16'} flex-shrink-0`}>
          <LazyImage
            src={product.imageUrl || '/api/placeholder/64/64'}
            alt={product.title}
            className="w-full h-full object-contain bg-white/20 rounded-xl border border-white/30"
            placeholder="📦"
          />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className={`${featured ? 'text-xl' : 'text-lg'} font-semibold text-white line-clamp-2`}>
              {product.title}
            </h3>
            {product.storePremium && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-semibold ml-2">
                🏆 Premium
              </Badge>
            )}
          </div>
          
          {/* Info da loja */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 flex-shrink-0">
              <LazyImage
                src={product.storeLogoUrl || '/api/placeholder/24/24'}
                alt={product.storeName}
                className="w-full h-full object-contain bg-white/20 rounded"
                placeholder="🏪"
              />
            </div>
            <span className="text-blue-200 text-sm">{product.storeName}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-white">
              <span className="text-sm text-blue-200">Categoria:</span>
              <span className="ml-2 text-white font-medium">{product.category}</span>
            </div>
            {product.price?.USD && (
              <div className="text-right">
                <div className="text-green-300 font-bold text-lg">
                  USD {product.price.USD}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex gap-3">
        <Button
          onClick={() => onAddToCart(product.id)}
          disabled={isSelected}
          className={`flex-1 ${
            isSelected 
              ? 'bg-green-600 hover:bg-green-600' 
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
          } text-white font-semibold py-2 px-4 rounded-xl transition-all duration-300`}
          data-testid={`add-to-cart-${product.id}`}
        >
          {isSelected ? (
            <>✅ Na Lista</>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Adicionar
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="bg-white/20 border-white/30 text-white hover:bg-white/30 p-2 rounded-xl"
          data-testid={`favorite-${product.id}`}
        >
          <Heart className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}