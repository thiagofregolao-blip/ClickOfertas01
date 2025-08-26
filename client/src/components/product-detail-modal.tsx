import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Heart, 
  Bookmark, 
  Share2, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Star,
  MapPin,
  Phone,
  MessageCircle
} from "lucide-react";
import type { Product, StoreWithProducts } from "@shared/schema";
import { useEngagement } from "@/hooks/use-engagement";
import { useAuth } from "@/hooks/useAuth";
import { useAppVersion } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

interface ProductDetailModalProps {
  product: Product | null;
  store: StoreWithProducts | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal de Detalhes do Produto - Adaptativo para Mobile e Desktop
 * 
 * VERSÃO MOBILE: Fullscreen com swipe para fotos
 * VERSÃO DESKTOP: Modal centralizado com hover
 */
export function ProductDetailModal({ product, store, isOpen, onClose }: ProductDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [nextImageIndex, setNextImageIndex] = useState(1);
  const [isClosing, setIsClosing] = useState(false);
  const { isMobile, isDesktop } = useAppVersion();
  const { toast } = useToast();
  const { handleDoubleTap, handleSaveProduct, isProductLiked, toggleLike } = useEngagement();
  const { isAuthenticated } = useAuth();

  // Touch gestures para navegação de imagens
  const [touchStartImage, setTouchStartImage] = useState<number | null>(null);
  const [touchEndImage, setTouchEndImage] = useState<number | null>(null);
  
  // Touch gestures para carrossel de produtos
  const [touchStartProduct, setTouchStartProduct] = useState<number | null>(null);
  const [touchEndProduct, setTouchEndProduct] = useState<number | null>(null);

  const minSwipeDistance = 50;

  // Gestures para imagens do produto
  const onImageTouchStart = (e: React.TouchEvent) => {
    setTouchEndImage(null);
    setTouchStartImage(e.targetTouches[0].clientX);
  };

  const onImageTouchMove = (e: React.TouchEvent) => {
    setTouchEndImage(e.targetTouches[0].clientX);
  };

  const onImageTouchEnd = () => {
    if (!touchStartImage || !touchEndImage) return;
    const distance = touchStartImage - touchEndImage;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && images.length > 1) {
      nextImage();
    }
    if (isRightSwipe && images.length > 1) {
      prevImage();
    }
  };

  // Gestures para carrossel de produtos
  const onProductTouchStart = (e: React.TouchEvent) => {
    setTouchEndProduct(null);
    setTouchStartProduct(e.targetTouches[0].clientX);
  };

  const onProductTouchMove = (e: React.TouchEvent) => {
    setTouchEndProduct(e.targetTouches[0].clientX);
  };

  const onProductTouchEnd = () => {
    if (!touchStartProduct || !touchEndProduct) return;
    const distance = touchStartProduct - touchEndProduct;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    const storeProducts = store?.products?.filter(p => p.isActive) || [];
    const currentIndex = storeProducts.findIndex(p => p.id === product.id);
    const totalProducts = storeProducts.length;

    if (totalProducts <= 1) return;

    if (isLeftSwipe) {
      // Próximo produto
      const newIndex = currentIndex < totalProducts - 1 ? currentIndex + 1 : 0;
      const newProduct = storeProducts[newIndex];
      if (newProduct) {
        setCurrentImageIndex(0);
        // Transição mais suave
        setIsClosing(true);
        setTimeout(() => {
          setIsClosing(false);
          onClose();
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('openProductModal', {
              detail: { product: newProduct, store }
            }));
          }, 50);
        }, 200);
      }
    }
    if (isRightSwipe) {
      // Produto anterior
      const newIndex = currentIndex > 0 ? currentIndex - 1 : totalProducts - 1;
      const newProduct = storeProducts[newIndex];
      if (newProduct) {
        setCurrentImageIndex(0);
        // Transição mais suave
        setIsClosing(true);
        setTimeout(() => {
          setIsClosing(false);
          onClose();
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('openProductModal', {
              detail: { product: newProduct, store }
            }));
          }, 50);
        }, 200);
      }
    }
  };

  // Reset image index when product changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [product?.id]);

  if (!product || !store) return null;

  // Múltiplas fotos para produtos da Shopping China - Tamanhos padronizados
  const getProductImages = (product: Product) => {
    if (!product.imageUrl) return [];
    
    // Para Shopping China, adicionar fotos adicionais com tamanhos padronizados
    if (store?.slug === 'shopping-china') {
      const baseImages = [
        product.imageUrl,
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=600&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&h=600&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=600&h=600&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&crop=center'
      ];
      return baseImages.slice(0, 4); // Máximo de 4 fotos
    }
    
    // Para outras lojas, usar apenas a imagem principal
    return [product.imageUrl];
  };
  
  const images = getProductImages(product);

  const nextImage = () => {
    if (images.length > 1 && !isTransitioning) {
      const nextIndex = (currentImageIndex + 1) % images.length;
      setNextImageIndex(nextIndex);
      setSlideDirection('left');
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex(nextIndex);
        setIsTransitioning(false);
      }, 350);
    }
  };

  const prevImage = () => {
    if (images.length > 1 && !isTransitioning) {
      const prevIndex = (currentImageIndex - 1 + images.length) % images.length;
      setNextImageIndex(prevIndex);
      setSlideDirection('right');
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex(prevIndex);
        setIsTransitioning(false);
      }, 350);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `${product.name} - ${store.name}`,
      text: `Confira este produto na ${store.name}!`,
      url: window.location.href
    };

    if (navigator.share && typeof navigator.canShare === 'function') {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copiado!",
          description: "Link do produto copiado para área de transferência.",
        });
      } catch (err) {
        toast({
          title: "Erro ao copiar",
          description: "Não foi possível copiar o link.",
          variant: "destructive",
        });
      }
    }
  };

  const handleContact = () => {
    if (store.whatsapp) {
      const message = `Olá! Vi o produto "${product.name}" no seu panfleto e gostaria de mais informações.`;
      const whatsappUrl = `https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    // Fallback se não houver WhatsApp
    } else {
      toast({
        title: "Contato não disponível",
        description: "Esta loja não configurou informações de contato.",
      });
    }
  };

  const handleDirections = () => {
    if (store?.latitude && store?.longitude) {
      const googleMapsUrl = `https://www.google.com/maps?q=${store.latitude},${store.longitude}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  // Layout Mobile (Fullscreen)
  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          setIsClosing(true);
          setTimeout(() => {
            setIsClosing(false);
            onClose();
          }, 400);
        }
      }}>
        <DialogContent className={`w-full h-full max-w-none max-h-none m-0 p-0 bg-white ${isClosing ? 'animate-modal-zoom-out' : ''}`}>
          <div className="relative h-full flex flex-col overflow-hidden">
            {/* Nome da Loja e Badges - Área separada acima da imagem */}
            <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: store.themeColor || '#E11D48' }}
                  />
                  <h2 className="text-sm font-medium text-gray-600">
                    {store.name.split(' ').slice(0, 2).join(' ')}
                  </h2>
                </div>
                <div className="flex items-center gap-1">
                  {product.isFeatured && (
                    <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-none text-xs">
                      🔥 Destaque
                    </Badge>
                  )}
                  {product.category && (
                    <Badge variant="secondary" className="text-xs px-2 py-1">
                      {product.category}
                    </Badge>
                  )}
                </div>
              </div>
              
              
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Conteúdo Scrollável - Imagem e informações juntas */}
            <div 
              className="flex-1 min-h-0 overflow-y-scroll"
              onTouchStart={onProductTouchStart}
              onTouchMove={onProductTouchMove}
              onTouchEnd={onProductTouchEnd}
            >
              {/* Galeria de Imagens - Agora dentro do scroll */}
              <div 
                className="relative h-64 bg-gray-100 flex-shrink-0 overflow-hidden"
                onTouchStart={onImageTouchStart}
                onTouchMove={onImageTouchMove}
                onTouchEnd={onImageTouchEnd}
              >
                {images.length > 0 ? (
                  <>
                    <div className="relative w-full h-full overflow-hidden">
                      {/* Imagem atual */}
                      <img
                        src={images[currentImageIndex]}
                        alt={product.name}
                        className={`absolute inset-0 w-full h-full object-cover ${
                          isTransitioning 
                            ? slideDirection === 'left' 
                              ? 'animate-slide-out-left' 
                              : 'animate-slide-out-right'
                            : ''
                        }`}
                        onDoubleClick={(e) => handleDoubleTap(product.id, e)}
                      />
                      
                      {/* Próxima imagem (durante transição) */}
                      {isTransitioning && (
                        <img
                          src={images[nextImageIndex]}
                          alt={product.name}
                          className={`absolute inset-0 w-full h-full object-cover ${
                            slideDirection === 'left'
                              ? 'animate-slide-in-right'
                              : 'animate-slide-in-left'
                          }`}
                        />
                      )}
                    </div>
                    
                    {/* Indicadores */}
                    {images.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                        {images.map((_, index) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full ${
                              index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <div className="text-gray-400 text-center">
                      <div className="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-2"></div>
                      <p className="text-sm">Sem imagem</p>
                    </div>
                  </div>
                )}

                {/* Carrossel de Produtos - Navegação */}
                {(() => {
                  const storeProducts = store.products?.filter(p => p.isActive) || [];
                  const currentIndex = storeProducts.findIndex(p => p.id === product.id);
                  const totalProducts = storeProducts.length;
                  
                  const navigateToProduct = (direction: 'prev' | 'next') => {
                    if (totalProducts <= 1) return;
                    
                    let newIndex;
                    if (direction === 'prev') {
                      newIndex = currentIndex > 0 ? currentIndex - 1 : totalProducts - 1;
                    } else {
                      newIndex = currentIndex < totalProducts - 1 ? currentIndex + 1 : 0;
                    }
                    
                    const newProduct = storeProducts[newIndex];
                    if (newProduct) {
                      setCurrentImageIndex(0);
                      // Transição mais suave com animação
                      setIsClosing(true);
                      setTimeout(() => {
                        setIsClosing(false);
                        onClose();
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('openProductModal', {
                            detail: { product: newProduct, store }
                          }));
                        }, 50);
                      }, 200);
                    }
                  };
                  
                  return totalProducts > 1 ? (
                    <>
                      <button
                        onClick={() => navigateToProduct('prev')}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 rounded-full p-2 shadow-lg z-10"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => navigateToProduct('next')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-700 rounded-full p-2 shadow-lg z-10"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  ) : null;
                })()}
              </div>

              {/* Informações do Produto */}
              <div className="p-4 pb-6">
                <div className="mb-4">
                  <div className="mb-3">
                    <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
                  </div>
                
                {/* Preços */}
                <div className="mb-3">
                  <div className="flex items-end gap-2">
                    {/* Preço em Dólares - Principal */}
                    <div className="flex items-end gap-1" style={{ color: store.themeColor || '#E11D48' }}>
                      <span className="text-sm font-medium">{store.currency || 'Gs.'}</span>
                      <span className="text-3xl font-bold">
                        {(() => {
                          const priceStr = String(product.price || '0');
                          const price = parseFloat(priceStr);
                          return new Intl.NumberFormat('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }).format(price);
                        })()}
                      </span>
                    </div>
                    
                    {/* Preço em Reais - Secundário */}
                    <div className="flex items-end gap-1 text-gray-600">
                      <span className="text-xs font-medium">R$</span>
                      <span className="text-lg font-medium">
                        {(() => {
                          const priceUSD = Number(product.price || 0);
                          const rate = store.customUsdBrlRate ? Number(store.customUsdBrlRate) : 5.47;
                          const priceBRL = priceUSD * rate;
                          return priceBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Descrição */}
                {product.description && (
                  <div className="mb-4">
                    <p className="text-gray-700 leading-relaxed">{product.description}</p>
                  </div>
                )}
                </div>

                <Separator className="mb-4" />

              {/* Produtos Similares */}
              {(() => {
                const similarProducts = store.products?.filter(p => 
                  p.id !== product.id && 
                  p.isActive && 
                  p.category === product.category
                ).slice(0, 4) || [];
                
                return similarProducts.length > 0 ? (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Produtos similares</h3>
                    
                    <div className="grid grid-cols-4 gap-2">
                      {similarProducts.map((similarProduct) => (
                        <div 
                          key={similarProduct.id} 
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setCurrentImageIndex(0);
                            onClose();
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('openProductModal', {
                                detail: { product: similarProduct, store }
                              }));
                            }, 100);
                          }}
                        >
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-1">
                            {similarProduct.imageUrl ? (
                              <img 
                                src={similarProduct.imageUrl} 
                                alt={similarProduct.name}
                                className="w-full h-full object-cover hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <div className="w-4 h-4 bg-gray-300 rounded"></div>
                              </div>
                            )}
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-medium text-gray-900 line-clamp-1 mb-1">
                              {similarProduct.name}
                            </p>
                            <p className="text-xs font-bold" style={{ color: store.themeColor || '#E11D48' }}>
                              {store.currency || 'Gs.'} {(() => {
                                const price = parseFloat(String(similarProduct.price || '0'));
                                return new Intl.NumberFormat('pt-BR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                }).format(price);
                              })()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Barra de Ação - Ícones pequenos com funções abaixo */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-center gap-6">
                  <div className="flex flex-col items-center gap-1">
                    <Button
                      onClick={() => toggleLike(product.id)}
                      variant="outline"
                      size="sm"
                      className="flex items-center justify-center w-12 h-12 rounded-full border-red-200 hover:bg-red-50"
                    >
                      <Heart className={`h-5 w-5 ${isProductLiked(product.id) ? 'text-red-500 fill-red-500' : 'text-red-500'}`} />
                    </Button>
                    <span className="text-xs text-red-500 font-medium">Curtir</span>
                  </div>
                  
                  <div className="flex flex-col items-center gap-1">
                    <Button
                      onClick={() => handleSaveProduct(product.id)}
                      variant="outline"
                      size="sm"
                      className={`flex items-center justify-center w-12 h-12 rounded-full ${isAuthenticated ? 'border-blue-200 hover:bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <Bookmark className={`h-5 w-5 ${isAuthenticated ? 'text-blue-600' : 'text-gray-400'}`} />
                    </Button>
                    <span className={`text-xs font-medium ${isAuthenticated ? 'text-blue-600' : 'text-gray-400'}`}>Salvar</span>
                  </div>
                  
                  <div className="flex flex-col items-center gap-1">
                    <Button
                      onClick={handleShare}
                      variant="outline"
                      size="sm"
                      className="flex items-center justify-center w-12 h-12 rounded-full border-gray-200 hover:bg-gray-50"
                    >
                      <Share2 className="h-5 w-5 text-gray-700" />
                    </Button>
                    <span className="text-xs text-gray-700 font-medium">Compartilhar</span>
                  </div>
                  
                  {store.whatsapp && (
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        onClick={handleContact}
                        size="sm"
                        className="flex items-center justify-center w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white"
                      >
                        <MessageCircle className="h-5 w-5" />
                      </Button>
                      <span className="text-xs text-[#25D366] font-medium">Contato</span>
                    </div>
                  )}
                  
                  {store.latitude && store.longitude && (
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        onClick={handleDirections}
                        size="sm"
                        className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                        data-testid="button-directions-modal"
                      >
                        <MapPin className="h-5 w-5" />
                      </Button>
                      <span className="text-xs text-blue-500 font-medium">Localização</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Layout Desktop (Modal Centralizado)
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setIsClosing(true);
        setTimeout(() => {
          setIsClosing(false);
          onClose();
        }, 250);
      }
    }}>
      <DialogContent className={`max-w-4xl max-h-[90vh] p-0 bg-white overflow-hidden ${isClosing ? 'animate-modal-zoom-out' : ''}`}>
        <div className="grid grid-cols-2 h-full">
          {/* Galeria de Imagens (Esquerda) */}
          <div className="flex flex-col bg-white">
            
            {/* Nome da Loja e Badges - ACIMA DA IMAGEM */}
            <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: store.themeColor || '#E11D48' }}
                  />
                  <h2 className="text-sm font-medium text-gray-600">
                    {store.name.split(' ').slice(0, 2).join(' ')}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {product.isFeatured && (
                    <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-none text-xs">
                      🔥 Destaque
                    </Badge>
                  )}
                  {product.category && (
                    <Badge variant="secondary" className="text-xs px-2 py-1">
                      {product.category}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* IMAGEM REDUZIDA - Centro */}
            <div className="relative bg-gray-100 flex-1 min-h-0">
              {images.length > 0 ? (
                <div className="relative h-full flex items-center justify-center p-6">
                  {/* Botões de Navegação entre Produtos */}
                  {(() => {
                    const activeProducts = store?.products?.filter(p => p.isActive) || [];
                    const currentIndex = activeProducts.findIndex(p => p.id === product?.id);
                    const hasPrevious = currentIndex > 0;
                    const hasNext = currentIndex < activeProducts.length - 1;
                    
                    return (
                      <>
                        {hasPrevious && (
                          <Button
                            onClick={() => {
                              const previousProduct = activeProducts[currentIndex - 1];
                              setCurrentImageIndex(0);
                              onClose();
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('openProductModal', {
                                  detail: { product: previousProduct, store }
                                }));
                              }, 100);
                            }}
                            variant="outline"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border-gray-200 hover:bg-white shadow-lg"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {hasNext && (
                          <Button
                            onClick={() => {
                              const nextProduct = activeProducts[currentIndex + 1];
                              setCurrentImageIndex(0);
                              onClose();
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('openProductModal', {
                                  detail: { product: nextProduct, store }
                                }));
                              }, 100);
                            }}
                            variant="outline"
                            size="icon"
                            className="fixed right-6 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm border-gray-200 hover:bg-white shadow-xl"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                        )}
                        
                        {/* Indicador de Posição dos Produtos */}
                        {activeProducts.length > 1 && (
                          <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                            {currentIndex + 1} / {activeProducts.length}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div className="relative w-full max-w-md h-96 bg-white rounded-lg shadow-sm overflow-hidden">
                    <img
                      src={images[currentImageIndex]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onDoubleClick={(e) => handleDoubleTap(product.id, e)}
                    />
                    
                    {/* Indicadores - Dentro da imagem reduzida */}
                    {images.length > 1 && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                        {images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              index === currentImageIndex ? 'bg-white scale-125 shadow-lg' : 'bg-white/70 hover:bg-white'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-gray-400 text-center">
                    <div className="w-20 h-20 bg-gray-300 rounded-lg mx-auto mb-3"></div>
                    <p>Sem imagem disponível</p>
                  </div>
                </div>
              )}
            </div>

            {/* Botões de Ação - ABAIXO DA IMAGEM */}
            <div className="bg-white border-t px-4 py-4">
              <div className="flex justify-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <Button
                    onClick={() => toggleLike(product.id)}
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center w-8 h-8 rounded-full border-gray-200 hover:bg-gray-50"
                  >
                    <Heart className={`h-4 w-4 ${isProductLiked(product.id) ? 'text-red-500 fill-red-500' : 'text-red-500'}`} />
                  </Button>
                  <span className="text-xs text-gray-700 font-medium">Curtir</span>
                </div>
                
                <div className="flex flex-col items-center gap-1">
                  <Button
                    onClick={() => handleSaveProduct(product.id)}
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center w-8 h-8 rounded-full border-gray-200 hover:bg-gray-50"
                  >
                    <Bookmark className={`h-4 w-4 ${isAuthenticated ? 'text-blue-600' : 'text-gray-400'}`} />
                  </Button>
                  <span className={`text-xs font-medium ${isAuthenticated ? 'text-blue-600' : 'text-gray-400'}`}>Salvar</span>
                </div>
                
                <div className="flex flex-col items-center gap-1">
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center w-8 h-8 rounded-full border-gray-200 hover:bg-gray-50"
                  >
                    <Share2 className="h-4 w-4 text-gray-700" />
                  </Button>
                  <span className="text-xs text-gray-700 font-medium">Compartilhar</span>
                </div>
                
                {store.whatsapp && (
                  <div className="flex flex-col items-center gap-1">
                    <Button
                      onClick={handleContact}
                      size="sm"
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-[#25D366] font-medium">Contato</span>
                  </div>
                )}
                
                {store.latitude && store.longitude && (
                  <div className="flex flex-col items-center gap-1">
                    <Button
                      onClick={handleDirections}
                      size="sm"
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                      data-testid="button-directions-modal"
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-blue-500 font-medium">Localização</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detalhes do Produto (Direita) */}
          <div className="p-6 overflow-y-auto relative">
            
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-bold text-blue-600">
                {product.name}
              </DialogTitle>
            </DialogHeader>

            {/* Preços no formato iPhone */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 font-medium mb-2">A partir de</p>
              
              <div className="flex items-end gap-3">
                {/* Preço em Dólares - Principal */}
                <div className="flex items-end gap-2">
                  <span className="text-lg font-medium" style={{ color: '#A21614' }}>US$</span>
                  <span className="text-4xl font-bold" style={{ color: '#A21614' }}>
                    {(() => {
                      const priceStr = String(product.price || '0');
                      const price = parseFloat(priceStr);
                      return new Intl.NumberFormat('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(price);
                    })()}
                  </span>
                </div>
                
                {/* Preço em Reais - Secundário */}
                <div className="flex items-end gap-1 text-gray-600">
                  <span className="text-sm font-medium">R$</span>
                  <span className="text-xl font-medium">
                    {(() => {
                      const priceUSD = Number(product.price || 0);
                      const rate = store.customUsdBrlRate ? Number(store.customUsdBrlRate) : 5.47;
                      const priceBRL = priceUSD * rate;
                      return priceBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* Descrição */}
            {product.description && (
              <div className="mb-8">
                <h4 className="font-medium text-gray-900 mb-2">Descrição</h4>
                <p className="text-gray-700 leading-relaxed text-base">{product.description}</p>
              </div>
            )}

            <Separator className="mb-6" />

            {/* Produtos Similares - Fixados no alinhamento da barra de ação */}
            {(() => {
              const similarProducts = store.products?.filter(p => 
                p.id !== product.id && 
                p.isActive && 
                p.category === product.category
              ).slice(0, 5) || [];
              
              return similarProducts.length > 0 ? (
                <div className="absolute bottom-16 left-0 right-0">
                  <h4 className="font-medium text-gray-900 mb-3 px-4">Produtos similares</h4>
                  
                  <div className="px-4">
                    <div className="grid grid-cols-5 gap-3">
                      {similarProducts.map((similarProduct) => (
                        <div 
                          key={similarProduct.id} 
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setCurrentImageIndex(0);
                            onClose();
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('openProductModal', {
                                detail: { product: similarProduct, store }
                              }));
                            }, 100);
                          }}
                        >
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                            {similarProduct.imageUrl ? (
                              <img 
                                src={similarProduct.imageUrl} 
                                alt={similarProduct.name}
                                className="w-full h-full object-cover hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <div className="w-3 h-3 bg-gray-300 rounded"></div>
                              </div>
                            )}
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-medium text-gray-900 line-clamp-1 mb-1">
                              {similarProduct.name}
                            </p>
                            <p className="text-xs font-bold" style={{ color: store.themeColor || '#E11D48' }}>
                              {store.currency || 'Gs.'} {(() => {
                                const price = parseFloat(String(similarProduct.price || '0'));
                                return new Intl.NumberFormat('pt-BR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                }).format(price);
                              })()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}