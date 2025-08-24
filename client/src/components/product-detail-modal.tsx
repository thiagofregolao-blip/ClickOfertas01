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
  const { isMobile, isDesktop } = useAppVersion();
  const { toast } = useToast();
  const { handleDoubleTap, handleSaveProduct, isProductLiked, toggleLike } = useEngagement();
  const { isAuthenticated } = useAuth();

  // Reset image index when product changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [product?.id]);

  if (!product || !store) return null;

  // Simular múltiplas fotos (usando a mesma imagem por enquanto)
  // TODO: Quando backend suportar múltiplas imagens, substituir por product.images
  const images = product.imageUrl ? [
    product.imageUrl,
    product.imageUrl, // Placeholder para múltiplas fotos
    product.imageUrl, // Placeholder para múltiplas fotos
  ] : [];

  const nextImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
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
    } else if (store.phone) {
      window.open(`tel:${store.phone}`, '_blank');
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
            <div className="relative h-80 bg-gray-100 flex-shrink-0">
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
            <div className="flex-1 overflow-y-auto p-4">
              {/* Informações do Produto */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h1 className="text-xl font-bold text-gray-900 flex-1">{product.name}</h1>
                  {product.isFeatured && (
                    <Badge className="ml-2 bg-gradient-to-r from-red-500 to-orange-500 text-white border-none">
                      🔥 Destaque
                    </Badge>
                  )}
                </div>
                
                {/* Preço */}
                <div className="mb-3">
                  <div className="flex items-end gap-1" style={{ color: store.themeColor || '#E11D48' }}>
                    <span className="text-sm font-medium">{store.currency || 'R$'}</span>
                    <span className="text-3xl font-bold">
                      {Number(product.price || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Categoria */}
                {product.category && (
                  <Badge variant="secondary" className="mb-3">
                    {product.category}
                  </Badge>
                )}

                {/* Descrição */}
                {product.description && (
                  <div className="mb-4">
                    <p className="text-gray-700 leading-relaxed">{product.description}</p>
                  </div>
                )}
              </div>

              <Separator className="mb-4" />

              {/* Informações da Loja */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: store.themeColor || '#E11D48' }}
                  />
                  {store.name}
                </h3>
                
                {store.address && (
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {store.address}
                  </p>
                )}
                
                {store.phone && (
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {store.phone}
                  </p>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Button
                  onClick={() => toggleLike(product.id)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Heart className={`h-4 w-4 ${isProductLiked(product.id) ? 'text-red-500 fill-red-500' : 'text-red-500'}`} />
                  {isProductLiked(product.id) ? 'Curtido' : 'Curtir'}
                </Button>
                
                <Button
                  onClick={() => handleSaveProduct(product.id)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Bookmark className={`h-4 w-4 ${isAuthenticated ? 'text-blue-600' : 'text-gray-400'}`} />
                  Salvar
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Compartilhar
                </Button>
                
                {(store.whatsapp || store.phone) && (
                  <Button
                    onClick={handleContact}
                    className="flex items-center gap-2"
                    style={{ backgroundColor: store.themeColor || '#E11D48' }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Contato
                  </Button>
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

            {/* Preço */}
            <div className="mb-6">
              <div className="flex items-end gap-2" style={{ color: store.themeColor || '#E11D48' }}>
                <span className="text-lg font-medium">{store.currency || 'R$'}</span>
                <span className="text-4xl font-bold">
                  {Number(product.price || 0).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Categoria */}
            {product.category && (
              <div className="mb-4">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {product.category}
                </Badge>
              </div>
            )}

            {/* Descrição */}
            {product.description && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Descrição</h4>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            )}

            <Separator className="mb-6" />

            {/* Informações da Loja */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Loja</h4>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-6 h-6 rounded-full flex-shrink-0"
                      style={{ backgroundColor: store.themeColor || '#E11D48' }}
                    />
                    <h5 className="font-semibold text-gray-900">{store.name}</h5>
                  </div>
                  
                  {store.address && (
                    <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {store.address}
                    </p>
                  )}
                  
                  {store.phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {store.phone}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Botões de Ação */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => toggleLike(product.id)}
                  variant="outline"
                  className="flex items-center gap-2 hover:bg-red-50"
                >
                  <Heart className={`h-4 w-4 ${isProductLiked(product.id) ? 'text-red-500 fill-red-500' : 'text-red-500'}`} />
                  {isProductLiked(product.id) ? 'Curtido' : 'Curtir'}
                </Button>
                
                <Button
                  onClick={() => handleSaveProduct(product.id)}
                  variant="outline"
                  className="flex items-center gap-2 hover:bg-blue-50"
                >
                  <Bookmark className={`h-4 w-4 ${isAuthenticated ? 'text-blue-600' : 'text-gray-400'}`} />
                  Salvar
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Compartilhar
                </Button>
                
                {(store.whatsapp || store.phone) && (
                  <Button
                    onClick={handleContact}
                    className="flex items-center gap-2 text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: store.themeColor || '#E11D48' }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Entrar em Contato
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