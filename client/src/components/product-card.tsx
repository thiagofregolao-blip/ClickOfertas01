import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Share2 } from "lucide-react";
import type { Product } from "@shared/schema";

// Import category icons
import perfumeIcon from "@assets/generated_images/Perfume_bottle_icon_6af6063a.png";
import electronicsIcon from "@assets/generated_images/Electronics_devices_icon_e9437aa8.png";
import fishingIcon from "@assets/generated_images/Fishing_equipment_icon_874a4bcf.png";
import generalIcon from "@assets/generated_images/General_shopping_icon_8bba1c24.png";

interface ProductCardProps {
  product: Product;
  currency: string;
  themeColor: string;
  showFeaturedBadge?: boolean;
  storeWhatsapp?: string | null;
  storeName?: string;
}

// Cores por categoria
function getCategoryColors(category?: string) {
  const colors = {
    'Perfumes': {
      bg: 'bg-pink-50',
      border: 'border-pink-200',
      accent: '#EC4899'
    },
    'Eletrônicos': {
      bg: 'bg-blue-50',
      border: 'border-blue-200', 
      accent: '#3B82F6'
    },
    'Pesca': {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      accent: '#10B981'
    },
    'Geral': {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      accent: '#6B7280'
    }
  };
  
  return colors[category as keyof typeof colors] || colors['Geral'];
}

// Ícones por categoria
function getCategoryIcon(category?: string) {
  const icons = {
    'Perfumes': perfumeIcon,
    'Eletrônicos': electronicsIcon,
    'Pesca': fishingIcon,
    'Geral': generalIcon
  };
  
  return icons[category as keyof typeof icons] || generalIcon;
}

export default function ProductCard({ 
  product, 
  currency, 
  themeColor, 
  showFeaturedBadge = false,
  storeWhatsapp,
  storeName 
}: ProductCardProps) {
  const categoryColors = getCategoryColors(product.category || undefined);
  const categoryIcon = getCategoryIcon(product.category || undefined);
  
  const handleWhatsAppShare = () => {
    if (!storeWhatsapp) return;
    
    const message = encodeURIComponent(
      `Olá! Tenho interesse no produto:\n\n*${product.name}*\n\nPreço: ${currency} ${Number(product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nPoderia me dar mais informações?`
    );
    
    const whatsappNumber = storeWhatsapp.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
  };
  
  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 bg-white h-full flex flex-col">
      {/* Nome do produto - PARTE SUPERIOR */}
      <div className="p-3 bg-gray-50 border-b">
        <h3 className="font-bold text-sm text-gray-800 line-clamp-2 text-center leading-tight">
          {product.name}
        </h3>
        {(product.isFeatured && showFeaturedBadge) && (
          <Badge variant="destructive" className="text-xs mt-2 mx-auto block w-fit">
            ⭐ Destaque
          </Badge>
        )}
      </div>

      {/* Imagem do produto - CENTRO */}
      <div className="relative flex-1 min-h-[160px] md:min-h-[200px]">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const placeholder = target.nextElementSibling as HTMLElement;
              if (placeholder) {
                placeholder.style.display = 'flex';
              }
            }}
          />
        ) : null}
        
        {/* Placeholder com ícone da categoria */}
        <div 
          className="absolute inset-0 bg-gray-100 flex items-center justify-center"
          style={{ display: product.imageUrl ? 'none' : 'flex' }}
        >
          <img 
            src={categoryIcon} 
            alt={product.category || 'Geral'}
            className="w-16 h-16 opacity-40"
          />
        </div>
        
        {/* Badge da categoria */}
        <div className="absolute top-2 left-2">
          <Badge 
            variant="secondary" 
            className="text-xs bg-white/90 text-gray-700"
          >
            <img 
              src={categoryIcon} 
              alt={product.category || 'Geral'}
              className="w-3 h-3 mr-1"
            />
            {product.category || 'Geral'}
          </Badge>
        </div>
      </div>

      {/* Descrição e preço - PARTE INFERIOR */}
      <CardContent className="p-4 bg-white">
        {/* Descrição */}
        {product.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">
            {product.description}
          </p>
        )}
        
        {/* Preço e botão WhatsApp */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-gray-900">
              {currency} {Number(product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          {/* Botão WhatsApp */}
          {storeWhatsapp && (
            <button
              onClick={handleWhatsAppShare}
              className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full transition-colors duration-200 shadow-md hover:shadow-lg"
              title="Compartilhar no WhatsApp"
            >
              <Share2 size={16} />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
