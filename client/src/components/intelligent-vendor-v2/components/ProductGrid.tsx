
import React from 'react';
import { Product, VendorConfig } from '../types';
import { Star, ShoppingCart, Heart, Eye, TrendingUp, Zap } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  config: VendorConfig;
  layout?: 'grid' | 'list';
  showComparison?: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onProductClick,
  config,
  layout = 'grid',
  showComparison = false
}) => {
  const formatPrice = (price?: { USD?: number; BRL?: number }) => {
    if (!price) return 'Preço não disponível';
    
    if (config.language === 'pt' && price.BRL) {
      return `R$ ${price.BRL.toFixed(2)}`;
    } else if (price.USD) {
      return `$${price.USD.toFixed(2)}`;
    }
    
    return 'Preço não disponível';
  };

  const getAvailabilityColor = (availability?: string) => {
    switch (availability) {
      case 'in_stock': return 'text-green-600 bg-green-100';
      case 'limited': return 'text-orange-600 bg-orange-100';
      case 'out_of_stock': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAvailabilityText = (availability?: string) => {
    switch (availability) {
      case 'in_stock': return 'Em estoque';
      case 'limited': return 'Estoque limitado';
      case 'out_of_stock': return 'Fora de estoque';
      default: return 'Disponibilidade não informada';
    }
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <Star className="h-4 w-4 text-gray-300" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </div>
          </div>
        );
      } else {
        stars.push(
          <Star key={i} className="h-4 w-4 text-gray-300" />
        );
      }
    }
    
    return (
      <div className="flex items-center space-x-1">
        <div className="flex">{stars}</div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          ({rating.toFixed(1)})
        </span>
      </div>
    );
  };

  if (layout === 'list') {
    return (
      <div className="space-y-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer group"
            onClick={() => onProductClick(product)}
          >
            <div className="flex">
              {/* Imagem */}
              <div className="w-48 h-32 flex-shrink-0 relative overflow-hidden">
                <img
                  src={product.imageUrl || '/placeholder-product.jpg'}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                
                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col space-y-1">
                  {product.discount && product.discount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      -{product.discount}%
                    </span>
                  )}
                  {product.availability === 'limited' && (
                    <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                      <Zap className="h-3 w-3 inline mr-1" />
                      Limitado
                    </span>
                  )}
                </div>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 p-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {product.title}
                  </h3>
                  
                  <div className="flex items-center space-x-4 mb-2">
                    {renderStars(product.rating)}
                    {product.reviews && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {product.reviews} avaliações
                      </span>
                    )}
                  </div>

                  {product.brand && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Marca: {product.brand}
                    </p>
                  )}

                  {product.features && product.features.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Características:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {product.features.slice(0, 3).map((feature, index) => (
                          <span
                            key={index}
                            className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-primary">
                        {formatPrice(product.price)}
                      </span>
                      {product.originalPrice && product.price?.USD && product.originalPrice > product.price.USD && (
                        <span className="text-sm text-gray-500 line-through">
                          ${product.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${getAvailabilityColor(product.availability)}`}>
                        {getAvailabilityText(product.availability)}
                      </span>
                      {product.storeName && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {product.storeName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implementar wishlist
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Adicionar aos favoritos"
                    >
                      <Heart className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onProductClick(product);
                      }}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span>Ver</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer group"
          onClick={() => onProductClick(product)}
        >
          {/* Imagem */}
          <div className="relative overflow-hidden">
            <img
              src={product.imageUrl || '/placeholder-product.jpg'}
              alt={product.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            
            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col space-y-1">
              {product.discount && product.discount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                  -{product.discount}%
                </span>
              )}
              {product.availability === 'limited' && (
                <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                  <Zap className="h-3 w-3 mr-1" />
                  Limitado
                </span>
              )}
            </div>

            {/* Ações rápidas */}
            <div className="absolute top-2 right-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implementar wishlist
                }}
                className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-full shadow-md transition-colors"
                title="Adicionar aos favoritos"
              >
                <Heart className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implementar visualização rápida
                }}
                className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-full shadow-md transition-colors"
                title="Visualização rápida"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {product.title}
            </h3>
            
            {/* Rating */}
            <div className="mb-2">
              {renderStars(product.rating)}
            </div>

            {/* Preço */}
            <div className="mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-primary">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && product.price?.USD && product.originalPrice > product.price.USD && (
                  <span className="text-sm text-gray-500 line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Disponibilidade e Loja */}
            <div className="flex items-center justify-between text-xs mb-3">
              <span className={`px-2 py-1 rounded-full ${getAvailabilityColor(product.availability)}`}>
                {getAvailabilityText(product.availability)}
              </span>
              {product.storeName && (
                <span className="text-gray-500 dark:text-gray-400 truncate ml-2">
                  {product.storeName}
                </span>
              )}
            </div>

            {/* Botão de ação */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onProductClick(product);
              }}
              className="w-full py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 group-hover:shadow-md"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Ver Produto</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
