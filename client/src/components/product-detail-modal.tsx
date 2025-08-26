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

  useEffect(() => {
    if (!isOpen || !product) return;
    setCurrentImageIndex(0);
    setNextImageIndex(1);
    setIsClosing(false);
  }, [isOpen, product]);

  if (!product || !store) return null;

  // Lista de imagens válidas
  const imageUrls = [product.imageUrl, product.imageUrl2, product.imageUrl3]
    .filter(Boolean) as string[];

  if (imageUrls.length === 0) {
    imageUrls.push("https://via.placeholder.com/400x400?text=Sem+Imagem");
  }

  const nextImage = () => {
    if (isTransitioning || imageUrls.length <= 1) return;
    
    setIsTransitioning(true);
    setSlideDirection('left');
    const newIndex = (currentImageIndex + 1) % imageUrls.length;
    setNextImageIndex(newIndex);
    
    setTimeout(() => {
      setCurrentImageIndex(newIndex);
      setSlideDirection('right');
      setIsTransitioning(false);
    }, 150);
  };

  const previousImage = () => {
    if (isTransitioning || imageUrls.length <= 1) return;
    
    setIsTransitioning(true);
    setSlideDirection('right');
    const newIndex = currentImageIndex === 0 ? imageUrls.length - 1 : currentImageIndex - 1;
    setNextImageIndex(newIndex);
    
    setTimeout(() => {
      setCurrentImageIndex(newIndex);
      setSlideDirection('left');
      setIsTransitioning(false);
    }, 150);
  };

  // Handlers de eventos mobile
  let touchStartX = 0;
  let touchEndX = 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX = e.changedTouches[0].screenX;
    const distance = touchStartX - touchEndX;
    const threshold = 100;

    if (Math.abs(distance) > threshold) {
      if (distance > 0) {
        nextImage();
      } else {
        previousImage();
      }
    }
  };

  // Lógica de formatação de moeda
  const formatPrice = (price: string) => {
    const numPrice = Number(price || 0);
    
    if (store.currency === 'USD' && store.displayCurrency === 'BRL' && store.customUsdBrlRate) {
      const convertedPrice = numPrice * parseFloat(store.customUsdBrlRate);
      return `R$ ${convertedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    
    const currencySymbol = store.displayCurrency === 'BRL' ? 'R$' : (store.currency || 'Gs.');
    return `${currencySymbol} ${numPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const getOriginalPriceDisplay = () => {
    if (store.currency === 'USD' && store.displayCurrency === 'BRL' && store.customUsdBrlRate) {
      const numPrice = Number(product.price || 0);
      return `USD $${numPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }
    return null;
  };

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleShare = async () => {
    const shareData = {
      title: product.name,
      text: `Confira este produto: ${product.name} - ${formatPrice(product.price)} na ${store.name}`,
      url: window.location.href
    };

    try {
      if (navigator.share && isMobile) {
        await navigator.share(shareData);
        toast({
          title: "Compartilhado!",
          description: "Produto compartilhado com sucesso",
        });
      } else {
        const text = `${shareData.title} - ${shareData.text}\n${shareData.url}`;
        await navigator.clipboard.writeText(text);
        toast({
          title: "Link copiado!",
          description: "Link do produto copiado para a área de transferência",
        });
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível compartilhar o produto",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login necessário",
        description: "Faça login para salvar produtos",
        variant: "destructive",
      });
      return;
    }
    handleSaveProduct(product.id);
  };

  const handleLike = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login necessário", 
        description: "Faça login para curtir produtos",
        variant: "destructive",
      });
      return;
    }
    toggleLike(product.id);
  };

  const handleContact = () => {
    if (!store.whatsapp) {
      toast({
        title: "WhatsApp não disponível",
        description: "Esta loja não possui WhatsApp cadastrado",
        variant: "destructive",
      });
      return;
    }

    const message = encodeURIComponent(
      `🛍️ Olá, ${store.name}! Tenho interesse no produto:\n\n*${product.name}*\n\nPreço: ${formatPrice(product.price)}\n\nPoderia me dar mais informações?`
    );
    const whatsappNumber = store.whatsapp.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  // VERSÃO MOBILE: Fullscreen Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent 
          className={`w-screen h-screen max-w-none max-h-none m-0 p-0 rounded-none bg-white transition-transform duration-300 ${
            isClosing ? 'translate-y-full' : 'translate-y-0'
          }`}
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            zIndex: 9999
          }}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b bg-white z-10">
              <h2 className="font-semibold text-lg truncate flex-1 mr-4">{product.name}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClose}
                className="shrink-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Image Section */}
            <div 
              className="relative flex-1 bg-gray-100 overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="relative w-full h-full">
                <img
                  src={imageUrls[currentImageIndex]}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  onDoubleClick={handleLike}
                />

                {/* Navigation Arrows */}
                {imageUrls.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={previousImage}
                      disabled={isTransitioning}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full w-10 h-10 p-0"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={nextImage}
                      disabled={isTransitioning}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full w-10 h-10 p-0"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </>
                )}

                {/* Image Indicators */}
                {imageUrls.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {imageUrls.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Like/Save Actions */}
                <div className="absolute top-4 right-4 flex flex-col space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    className={`rounded-full w-10 h-10 p-0 transition-colors ${
                      isProductLiked(product.id) 
                        ? 'bg-red-500/90 text-white hover:bg-red-600/90' 
                        : 'bg-black/30 text-white hover:bg-black/50'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isProductLiked(product.id) ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSave}
                    className="bg-black/30 hover:bg-black/50 text-white rounded-full w-10 h-10 p-0"
                  >
                    <Bookmark className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShare}
                    className="bg-black/30 hover:bg-black/50 text-white rounded-full w-10 h-10 p-0"
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="bg-white p-4 border-t">
              <div className="space-y-3">
                {/* Price */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-green-600">
                      {formatPrice(product.price)}
                    </span>
                    {getOriginalPriceDisplay() && (
                      <span className="text-sm text-gray-500 ml-2">
                        ({getOriginalPriceDisplay()})
                      </span>
                    )}
                  </div>
                  {product.isFeatured && (
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                      <Star className="w-3 h-3 mr-1" />
                      Destaque
                    </Badge>
                  )}
                </div>

                {/* Description */}
                {product.description && (
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {product.description}
                  </p>
                )}

                {/* Category */}
                {product.category && (
                  <div className="flex items-center text-sm text-gray-500">
                    <span>Categoria: {product.category}</span>
                  </div>
                )}

                {/* Contact Button */}
                {store.whatsapp && (
                  <Button
                    onClick={handleContact}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-lg transition-colors"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Falar com {store.name}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // VERSÃO DESKTOP: Modal centralizado
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex h-full max-h-[90vh]">
          {/* Left: Image Gallery */}
          <div className="flex-1 relative bg-gray-100">
            <div className="relative w-full h-full min-h-[500px] overflow-hidden">
              <img
                src={imageUrls[currentImageIndex]}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                onDoubleClick={handleLike}
              />

              {/* Navigation */}
              {imageUrls.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={previousImage}
                    disabled={isTransitioning}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full w-10 h-10 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={nextImage}
                    disabled={isTransitioning}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full w-10 h-10 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </>
              )}

              {/* Thumbnails */}
              {imageUrls.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {imageUrls.map((url, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-12 h-12 rounded border-2 overflow-hidden transition-all ${
                        index === currentImageIndex
                          ? 'border-white shadow-lg'
                          : 'border-white/50 hover:border-white/80'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="absolute top-4 right-4 flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={`rounded-full w-10 h-10 p-0 transition-colors ${
                    isProductLiked(product.id)
                      ? 'bg-red-500/90 text-white hover:bg-red-600/90'
                      : 'bg-black/30 text-white hover:bg-black/50'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isProductLiked(product.id) ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  className="bg-black/30 hover:bg-black/50 text-white rounded-full w-10 h-10 p-0"
                >
                  <Bookmark className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="bg-black/30 hover:bg-black/50 text-white rounded-full w-10 h-10 p-0"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right: Product Details */}
          <div className="w-80 bg-white flex flex-col">
            <DialogHeader className="p-6 pb-4">
              <div className="flex justify-between items-start">
                <DialogTitle className="text-xl font-bold text-gray-900 leading-tight pr-4">
                  {product.name}
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="shrink-0 -mr-2 -mt-2"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 px-6 pb-6 overflow-y-auto">
              <div className="space-y-4">
                {/* Price */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-3xl font-bold text-green-600">
                      {formatPrice(product.price)}
                    </span>
                    {getOriginalPriceDisplay() && (
                      <div className="text-sm text-gray-500 mt-1">
                        ({getOriginalPriceDisplay()})
                      </div>
                    )}
                  </div>
                  {product.isFeatured && (
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                      <Star className="w-3 h-3 mr-1" />
                      Destaque
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Description */}
                {product.description && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Descrição</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* Category */}
                {product.category && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Categoria</h4>
                    <Badge variant="outline">{product.category}</Badge>
                  </div>
                )}

                <Separator />

                {/* Store Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Loja</h4>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">{store.name}</span>
                    </div>
                    {store.address && (
                      <div className="flex items-start text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-400 shrink-0" />
                        <span>{store.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Button */}
                {store.whatsapp && (
                  <Button
                    onClick={handleContact}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-lg transition-colors mt-6"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Falar com {store.name}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}