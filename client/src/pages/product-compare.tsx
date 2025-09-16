import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, MapPin, MessageCircle as WhatsApp, Instagram, ShoppingBag, Crown } from "lucide-react";
import { formatPriceWithCurrency } from "@/lib/priceUtils";

interface Store {
  id: string;
  name: string;
  logoUrl?: string;
  address?: string;
  whatsapp?: string;
  instagram?: string;
  isPremium: boolean;
  themeColor: string;
}

interface ProductInStore {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  imageUrl2?: string;
  imageUrl3?: string;
  category?: string;
  brand?: string;
  store: Store;
}

interface ProductComparisonData {
  productName: string;
  productImages: string[];
  category?: string;
  brand?: string;
  description?: string;
  storesWithProduct: ProductInStore[];
}

export default function ProductCompare() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  // Buscar dados de comparação do produto
  const { data: comparisonData, isLoading } = useQuery<ProductComparisonData>({
    queryKey: ['/api/product-comparison', id],
    enabled: !!id,
  });

  // Buscar banners ativos
  const { data: banners } = useQuery({
    queryKey: ['/api/banners/active'],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando comparação...</p>
        </div>
      </div>
    );
  }

  if (!comparisonData || !comparisonData.storesWithProduct.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Produto não encontrado</h1>
          <p className="text-gray-600 mb-6">Não conseguimos encontrar este produto em nenhuma loja.</p>
          <Button onClick={() => setLocation('/cards')} variant="default">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar às lojas
          </Button>
        </div>
      </div>
    );
  }

  // Ordenar lojas: Premium primeiro, depois por preço
  const sortedStores = comparisonData.storesWithProduct.sort((a, b) => {
    // Primeiro critério: lojas premium vêm primeiro
    if (a.store.isPremium && !b.store.isPremium) return -1;
    if (!a.store.isPremium && b.store.isPremium) return 1;
    
    // Segundo critério: menor preço primeiro
    return parseFloat(a.price.toString()) - parseFloat(b.price.toString());
  });

  const minPrice = Math.min(...comparisonData.storesWithProduct.map(p => parseFloat(p.price.toString())));
  const maxPrice = Math.max(...comparisonData.storesWithProduct.map(p => parseFloat(p.price.toString())));

  // Filtrar banners verticais ativos
  const verticalBanners = banners?.filter((banner: any) => 
    banner.isActive && banner.format === 'vertical'
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.history.back()}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Comparar Preços
              </h1>
              <p className="text-sm text-gray-600">
                {comparisonData.storesWithProduct.length} lojas encontradas
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">
          {/* Seção do Produto - Layout do Modal */}
          <div className="xl:col-span-10">
            <Card data-testid="card-product-details">
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[500px]">
                  {/* Imagem do produto - Lado Esquerdo */}
                  <div className="bg-gray-50 flex items-center justify-center p-8">
                    <div className="w-full max-w-md aspect-square">
                      {comparisonData.productImages[0] ? (
                        <img 
                          src={comparisonData.productImages[0]} 
                          alt={comparisonData.productName}
                          className="w-full h-full object-contain rounded-lg"
                          data-testid="img-product-main"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-white rounded-lg">
                          <ShoppingBag className="w-24 h-24" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informações do produto - Lado Direito */}
                  <div className="p-8 flex flex-col justify-center">
                    <div className="space-y-6">
                      {/* Logo da loja com menor preço */}
                      {sortedStores[0]?.store && (
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                            {sortedStores[0].store.logoUrl ? (
                              <img 
                                src={sortedStores[0].store.logoUrl} 
                                alt={sortedStores[0].store.name}
                                className="w-full h-full object-cover"
                                data-testid="img-best-store-logo"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <ShoppingBag className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Melhor oferta</span>
                            <p className="font-semibold text-gray-900" data-testid="text-best-store-name">
                              {sortedStores[0].store.name}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Nome do produto */}
                      <h1 className="text-3xl font-bold text-blue-600" data-testid="text-product-name">
                        {comparisonData.productName}
                      </h1>

                      {/* Categoria */}
                      {comparisonData.category && (
                        <Badge variant="secondary" className="w-fit" data-testid="badge-category">
                          {comparisonData.category}
                        </Badge>
                      )}

                      {/* Preço - A partir de */}
                      <div>
                        <p className="text-gray-600 text-sm mb-1">A partir de</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-red-600 text-4xl font-bold" data-testid="text-min-price">
                            US$ {minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {maxPrice !== minPrice && (
                            <span className="text-gray-500 text-lg">
                              R$ {(minPrice * 5.39).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Descrição */}
                      {comparisonData.description && (
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">Descrição</h3>
                          <p className="text-gray-700 leading-relaxed" data-testid="text-description">
                            {comparisonData.description}
                          </p>
                        </div>
                      )}

                      {/* Resumo de preços */}
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h3 className="font-semibold text-orange-900 mb-3">Resumo de Preços</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-orange-700">Menor preço</span>
                            <p className="text-lg font-bold text-green-600" data-testid="text-summary-min-price">
                              US$ {minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm text-orange-700">Maior preço</span>
                            <p className="text-lg font-bold text-red-600" data-testid="text-max-price">
                              US$ {maxPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Banner Vertical - Lado Direito */}
          {verticalBanners.length > 0 && (
            <div className="xl:col-span-2">
              <div className="sticky top-24">
                {verticalBanners.slice(0, 1).map((banner: any) => (
                  <Card key={banner.id} className="overflow-hidden" data-testid="card-vertical-banner">
                    <CardContent className="p-0">
                      {banner.link ? (
                        <a 
                          href={banner.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={banner.imageUrl}
                            alt={banner.title || 'Banner'}
                            className="w-full h-auto object-cover"
                            data-testid="img-vertical-banner"
                          />
                        </a>
                      ) : (
                        <img
                          src={banner.imageUrl}
                          alt={banner.title || 'Banner'}
                          className="w-full h-auto object-cover"
                          data-testid="img-vertical-banner"
                        />
                      )}
                      {banner.title && (
                        <div className="p-3">
                          <h3 className="text-sm font-semibold text-gray-900" data-testid="text-banner-title">
                            {banner.title}
                          </h3>
                          {banner.description && (
                            <p className="text-xs text-gray-600 mt-1" data-testid="text-banner-description">
                              {banner.description}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lista de Lojas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">
              Onde Comprar ({sortedStores.length} lojas)
            </h3>
            <div className="text-sm text-gray-600">
              Ordenado por: lojas premium primeiro, depois menor preço
            </div>
          </div>

          <div className="grid gap-4">
            {sortedStores.map((productInStore, index) => {
              const isLowestPrice = parseFloat(productInStore.price.toString()) === minPrice;
              
              return (
                <Card 
                  key={`${productInStore.store.id}-${productInStore.id}`} 
                  className={`transition-all hover:shadow-md ${
                    productInStore.store.isPremium ? 'border-yellow-300 bg-yellow-50' : 'bg-white'
                  } ${isLowestPrice ? 'ring-2 ring-green-500' : ''}`}
                  data-testid={`card-store-${productInStore.store.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                      {/* Lado Esquerdo: Imagem do produto + Preços */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="flex flex-col">
                          {/* Badge Melhor Preço */}
                          {isLowestPrice && (
                            <Badge 
                              variant="default" 
                              className="bg-green-500 text-white text-xs px-1 py-0.5 mb-1 self-start" 
                              data-testid={`badge-best-price-${productInStore.store.id}`}
                            >
                              <Star className="w-2 h-2 mr-1" />
                              Melhor Preço
                            </Badge>
                          )}
                          
                          {/* Imagem do produto */}
                          <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {productInStore.imageUrl || comparisonData.productImages[0] ? (
                              <img 
                                src={productInStore.imageUrl || comparisonData.productImages[0]} 
                                alt={comparisonData.productName}
                                className="w-full h-full object-cover"
                                data-testid={`img-product-${productInStore.store.id}`}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <ShoppingBag className="w-10 h-10" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Preços */}
                        <div className="text-left">
                          <p className="text-2xl font-bold text-gray-900" data-testid={`text-price-${productInStore.store.id}`}>
                            {formatPriceWithCurrency(productInStore.price.toString(), 'US$')}
                          </p>
                          <p className="text-lg text-gray-600" data-testid={`text-price-brl-${productInStore.store.id}`}>
                            R$ {(parseFloat(productInStore.price.toString()) * 5.39).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          {index > 0 && (
                            <p className="text-sm text-gray-600">
                              {formatPriceWithCurrency(
                                (parseFloat(productInStore.price.toString()) - minPrice).toFixed(2), 
                                'US$ +'
                              )} que o menor
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Lado Direito: Informações da loja + Ações */}
                      <div className="flex items-center justify-end flex-1 min-w-0">
                        <div className="flex-shrink-0 ml-4 text-center">
                          {/* Logo e nome da loja */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {productInStore.store.logoUrl ? (
                                <img 
                                  src={productInStore.store.logoUrl} 
                                  alt={productInStore.store.name}
                                  className="w-full h-full object-cover"
                                  data-testid={`img-store-logo-${productInStore.store.id}`}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <ShoppingBag className="w-6 h-6" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col">
                              <h4 className="font-semibold text-gray-900 text-sm" data-testid={`text-store-name-${productInStore.store.id}`}>
                                {productInStore.store.name}
                              </h4>
                              
                              {productInStore.store.isPremium && (
                                <div className="flex gap-1 mt-1">
                                  <Badge variant="default" className="bg-yellow-500 text-white text-xs" data-testid={`badge-premium-${productInStore.store.id}`}>
                                    <Crown className="w-2 h-2 mr-1" />
                                    Premium
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Botões */}
                          <div className="flex gap-2 mb-2">
                            <Link href={`/stores/${productInStore.store.id}`}>
                              <Button 
                                size="sm" 
                                className="whitespace-nowrap"
                                style={{ backgroundColor: productInStore.store.themeColor }}
                                data-testid={`button-visit-store-${productInStore.store.id}`}
                              >
                                Visitar Loja
                              </Button>
                            </Link>
                            
                            {productInStore.store.whatsapp && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-green-600 border-green-600 hover:bg-green-50 whitespace-nowrap"
                                onClick={() => window.open(`https://wa.me/${productInStore.store.whatsapp}?text=Olá! Tenho interesse no produto: ${comparisonData.productName}`, '_blank')}
                                data-testid={`button-whatsapp-${productInStore.store.id}`}
                              >
                                <WhatsApp className="w-4 h-4 mr-2" />
                                Perguntar
                              </Button>
                            )}
                          </div>
                          
                          {/* Endereço da loja */}
                          {productInStore.store.address && (
                            <div className="flex items-center gap-1 text-sm text-gray-600 justify-center">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate" data-testid={`text-store-address-${productInStore.store.id}`}>
                                {productInStore.store.address}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}