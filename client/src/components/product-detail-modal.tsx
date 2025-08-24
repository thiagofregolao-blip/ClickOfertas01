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
  const { isMobile, isDesktop } = useAppVersion();
  const { toast } = useToast();
  const { handleDoubleTap, handleSaveProduct, isProductLiked, toggleLike } = useEngagement();
  const { isAuthenticated } = useAuth();

  // Touch gestures para navegação de imagens
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && images.length > 1) {
      nextImage();
    }
    if (isRightSwipe && images.length > 1) {
      prevImage();
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
      setSlideDirection('left');
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
        setIsTransitioning(false);
      }, 250);
    }
  };

  const prevImage = () => {
    if (images.length > 1 && !isTransitioning) {
      setSlideDirection('right');
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
        setIsTransitioning(false);
      }, 250);
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

  // Layout Mobile (Fullscreen)
  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full h-full max-w-none max-h-none m-0 p-0 bg-white">
          <div className="relative h-full flex flex-col">
            {/* Header com botão de fechar */}
            <div className="absolute top-4 right-4 z-20">
              <Button
                onClick={onClose}
                variant="secondary"
                size="icon"
                className="rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Galeria de Imagens */}
            <div 
              className="relative h-64 bg-gray-100 flex-shrink-0 overflow-hidden"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {images.length > 0 ? (
                <>
                  <div className="relative w-full h-full overflow-hidden">
                    <img
                      src={images[currentImageIndex]}
                      alt={product.name}
                      className={`w-full h-full object-cover transition-transform duration-300 ease-in-out ${
                        isTransitioning 
                          ? slideDirection === 'left' 
                            ? 'transform -translate-x-full' 
                            : 'transform translate-x-full'
                          : 'transform translate-x-0'
                      }`}
                      onDoubleClick={(e) => handleDoubleTap(product.id, e)}
                    />
                  </div>
                  
                  {/* Navegação de imagens */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 backdrop-blur-sm"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 backdrop-blur-sm"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      
                      {/* Indicadores */}
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
                    </>
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
            </div>

            {/* Conteúdo Scrollável */}
            <div className="flex-1 overflow-y-auto p-4 pb-20">
              {/* Nome da Loja */}
              <div className="mb-2">
                <h2 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: store.themeColor || '#E11D48' }}
                  />
                  {store.name}
                </h2>
              </div>
              
              {/* Informações do Produto */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-3">
                  <h1 className="text-xl font-bold text-gray-900 flex-1">{product.name}</h1>
                  {product.isFeatured && (
                    <Badge className="ml-2 bg-gradient-to-r from-red-500 to-orange-500 text-white border-none">
                      🔥 Destaque
                    </Badge>
                  )}
                </div>
                
                {/* Preço e Categoria */}
                <div className="flex items-end justify-between mb-3">
                  <div className="flex items-end gap-1" style={{ color: store.themeColor || '#E11D48' }}>
                    <span className="text-sm font-medium">{store.currency || 'Gs.'}</span>
                    <span className="text-3xl font-bold">
                      {Number(product.price || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                  {product.category && (
                    <Badge variant="secondary">
                      {product.category}
                    </Badge>
                  )}
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
                              {store.currency || 'Gs.'} {Number(similarProduct.price || 0).toLocaleString('pt-BR', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Botões de Ação com nomes */}
              <div className="flex gap-4 justify-center py-4 mb-4">
                <div className="flex flex-col items-center gap-1">
                  <Button
                    onClick={() => toggleLike(product.id)}
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center w-12 h-12 rounded-full"
                  >
                    <Heart className={`h-5 w-5 ${isProductLiked(product.id) ? 'text-red-500 fill-red-500' : 'text-red-500'}`} />
                  </Button>
                  <span className="text-xs text-gray-600">Curtir</span>
                </div>
                
                <div className="flex flex-col items-center gap-1">
                  <Button
                    onClick={() => handleSaveProduct(product.id)}
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center w-12 h-12 rounded-full"
                  >
                    <Bookmark className={`h-5 w-5 ${isAuthenticated ? 'text-blue-600' : 'text-gray-400'}`} />
                  </Button>
                  <span className="text-xs text-gray-600">Salvar</span>
                </div>
                
                <div className="flex flex-col items-center gap-1">
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center w-12 h-12 rounded-full"
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                  <span className="text-xs text-gray-600">Compartilhar</span>
                </div>
                
                {store.whatsapp && (
                  <div className="flex flex-col items-center gap-1">
                    <Button
                      onClick={handleContact}
                      size="sm"
                      className="flex items-center justify-center w-12 h-12 rounded-full text-white"
                      style={{ backgroundColor: store.themeColor || '#E11D48' }}
                    >
                      <MessageCircle className="h-5 w-5" />
                    </Button>
                    <span className="text-xs text-gray-600">Contato</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Layout Desktop (Modal Centralizado)
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-white overflow-hidden">
        <div className="grid grid-cols-2 h-full">
          {/* Galeria de Imagens (Esquerda) */}
          <div className="relative bg-gray-100">
            {images.length > 0 ? (
              <>
                <img
                  src={images[currentImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onDoubleClick={(e) => handleDoubleTap(product.id, e)}
                />
                
                {/* Navegação de imagens */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 backdrop-blur-sm transition-all"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 backdrop-blur-sm transition-all"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    
                    {/* Indicadores */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentImageIndex ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/75'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <div className="text-gray-400 text-center">
                  <div className="w-20 h-20 bg-gray-300 rounded-lg mx-auto mb-3"></div>
                  <p>Sem imagem disponível</p>
                </div>
              </div>
            )}
          </div>

          {/* Detalhes do Produto (Direita) */}
          <div className="p-6 overflow-y-auto">
            {/* Nome da Loja */}
            <div className="mb-3">
              <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: store.themeColor || '#E11D48' }}
                />
                {store.name}
              </h3>
            </div>
            
            <DialogHeader className="mb-4">
              <div className="flex items-start justify-between">
                <DialogTitle className="text-2xl font-bold text-gray-900 flex-1">
                  {product.name}
                </DialogTitle>
                {product.isFeatured && (
                  <Badge className="ml-3 bg-gradient-to-r from-red-500 to-orange-500 text-white border-none">
                    🔥 Destaque
                  </Badge>
                )}
              </div>
            </DialogHeader>

            {/* Preço e Categoria */}
            <div className="flex items-end justify-between mb-6">
              <div className="flex items-end gap-2" style={{ color: store.themeColor || '#E11D48' }}>
                <span className="text-lg font-medium">{store.currency || 'Gs.'}</span>
                <span className="text-4xl font-bold">
                  {Number(product.price || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
              {product.category && (
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {product.category}
                </Badge>
              )}
            </div>

            {/* Descrição */}
            {product.description && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Descrição</h4>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            )}

            <Separator className="mb-6" />

            {/* Produtos Similares */}
            {(() => {
              const similarProducts = store.products?.filter(p => 
                p.id !== product.id && 
                p.isActive && 
                p.category === product.category
              ).slice(0, 4) || [];
              
              return similarProducts.length > 0 ? (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Produtos similares</h4>
                  
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
                            {store.currency || 'Gs.'} {Number(similarProduct.price || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Botões de Ação com nomes */}
            <div className="flex gap-6 justify-center">
              <div className="flex flex-col items-center gap-2">
                <Button
                  onClick={() => toggleLike(product.id)}
                  variant="outline"
                  className="flex items-center justify-center w-14 h-14 rounded-full hover:bg-red-50"
                >
                  <Heart className={`h-5 w-5 ${isProductLiked(product.id) ? 'text-red-500 fill-red-500' : 'text-red-500'}`} />
                </Button>
                <span className="text-sm text-gray-600 font-medium">Curtir</span>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <Button
                  onClick={() => handleSaveProduct(product.id)}
                  variant="outline"
                  className="flex items-center justify-center w-14 h-14 rounded-full hover:bg-blue-50"
                >
                  <Bookmark className={`h-5 w-5 ${isAuthenticated ? 'text-blue-600' : 'text-gray-400'}`} />
                </Button>
                <span className="text-sm text-gray-600 font-medium">Salvar</span>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="flex items-center justify-center w-14 h-14 rounded-full"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
                <span className="text-sm text-gray-600 font-medium">Compartilhar</span>
              </div>
              
              {store.whatsapp && (
                <div className="flex flex-col items-center gap-2">
                  <Button
                    onClick={handleContact}
                    className="flex items-center justify-center w-14 h-14 rounded-full text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: store.themeColor || '#E11D48' }}
                  >
                    <MessageCircle className="h-5 w-5" />
                  </Button>
                  <span className="text-sm text-gray-600 font-medium">Contato</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}