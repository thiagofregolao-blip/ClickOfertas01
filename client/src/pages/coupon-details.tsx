import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share2, CheckCircle, Clock, QrCode } from "lucide-react";
import { formatPriceWithCurrency } from "@/lib/priceUtils";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface CouponDetails {
  id: string;
  couponCode: string;
  originalPrice: string;
  discountPrice: string;
  discountPercentage: string;
  qrCode: string;
  expiresAt: string;
  isRedeemed: boolean;
  redeemedAt?: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    description?: string;
    price: string;
    imageUrl?: string;
    category?: string;
  };
  store: {
    id: string;
    name: string;
    logoUrl?: string;
    themeColor?: string;
    currency?: string;
    whatsapp?: string;
    slug?: string;
  };
}

export default function CouponDetails() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Pegar o ID do cupom da URL
  const [couponId, setCouponId] = useState<string | null>(null);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    setCouponId(id);
  }, []);

  // Buscar detalhes do cupom
  const { data: coupon, isLoading: couponLoading, error } = useQuery<CouponDetails>({
    queryKey: [`/api/coupons/${couponId}`],
    enabled: !!couponId && !!isAuthenticated,
    retry: false,
  });

  // Função para baixar PDF do cupom
  const downloadPDF = () => {
    if (!coupon) return;
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('🎉 CUPOM DE DESCONTO', 20, 30);
    
    // Informações da loja
    doc.setFontSize(14);
    doc.text(`Loja: ${coupon.store.name}`, 20, 50);
    
    // Produto
    doc.setFontSize(12);
    doc.text(`Produto: ${coupon.product.name}`, 20, 70);
    
    // Desconto
    doc.setFontSize(16);
    doc.text(`🔥 ${coupon.discountPercentage}% DE DESCONTO!`, 20, 90);
    
    // Preços
    doc.setFontSize(12);
    const currency = coupon.store.currency || 'Gs.';
    doc.text(`De: ${formatPriceWithCurrency(coupon.originalPrice, currency)}`, 20, 110);
    doc.text(`Por: ${formatPriceWithCurrency(coupon.discountPrice, currency)}`, 20, 125);
    
    // Código do cupom
    doc.setFontSize(14);
    doc.text(`Código: ${coupon.couponCode}`, 20, 150);
    
    // Validade
    const expirationDate = new Date(coupon.expiresAt).toLocaleString('pt-BR');
    doc.text(`Válido até: ${expirationDate}`, 20, 170);
    
    // QR Code (como imagem)
    if (coupon.qrCode) {
      doc.addImage(coupon.qrCode, 'PNG', 120, 80, 60, 60);
    }
    
    // Instruções
    doc.setFontSize(10);
    doc.text('Apresente este cupom na loja para resgatar o desconto', 20, 200);
    
    doc.save(`cupom-${coupon.couponCode}.pdf`);
    
    toast({
      title: "PDF baixado!",
      description: "Cupom salvo no seu dispositivo",
    });
  };
  
  // Função para compartilhar no WhatsApp
  const shareOnWhatsApp = () => {
    if (!coupon) return;
    
    const currency = coupon.store.currency || 'Gs.';
    const message = `🎉 *CUPOM DE DESCONTO*\n\n` +
      `📱 *${coupon.product.name}*\n` +
      `🏪 *${coupon.store.name}*\n\n` +
      `🔥 *${coupon.discountPercentage}% DE DESCONTO!*\n\n` +
      `💰 De: ${formatPriceWithCurrency(coupon.originalPrice, currency)}\n` +
      `💸 Por: ${formatPriceWithCurrency(coupon.discountPrice, currency)}\n\n` +
      `🎫 *Código:* ${coupon.couponCode}\n` +
      `⏰ *Válido até:* ${new Date(coupon.expiresAt).toLocaleString('pt-BR')}\n\n` +
      `📍 Apresente este cupom na loja para resgatar!`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Loading states
  if (isLoading || couponLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando cupom...</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold mb-4">Acesso Necessário</h2>
            <p className="text-gray-600 mb-6">Você precisa estar logado para ver seus cupons.</p>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="w-full"
            >
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se não encontrou o cupom
  if (error || !coupon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-4">Cupom não encontrado</h2>
            <p className="text-gray-600 mb-6">O cupom que você está procurando não existe ou não é seu.</p>
            <Button 
              onClick={() => setLocation('/')}
              className="w-full"
            >
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(coupon.expiresAt) <= new Date();
  const currency = coupon.store.currency || 'Gs.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold">🎫 Seu Cupom de Desconto</h1>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-2xl mx-auto p-4 pt-8">
        {/* Card principal do cupom */}
        <Card className="mb-6 overflow-hidden shadow-xl">
          <div className="bg-gradient-to-r from-green-500 to-blue-500 p-6 text-white text-center">
            <h2 className="text-3xl font-bold mb-2">🎉 PARABÉNS!</h2>
            <p className="text-green-100">Seu cupom foi gerado com sucesso!</p>
          </div>
          
          <CardContent className="p-8">
            {/* Status Badge */}
            <div className="text-center mb-6">
              {coupon.isRedeemed ? (
                <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  Cupom Utilizado
                </div>
              ) : isExpired ? (
                <div className="inline-flex items-center gap-2 bg-red-100 text-red-600 px-4 py-2 rounded-full">
                  <Clock className="w-4 h-4" />
                  Cupom Expirado
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-600 px-4 py-2 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  Cupom Ativo
                </div>
              )}
            </div>

            {/* Produto */}
            <div className="text-center mb-6">
              {coupon.product.imageUrl && (
                <img
                  src={coupon.product.imageUrl}
                  alt={coupon.product.name}
                  className="w-32 h-32 object-cover rounded-lg mx-auto mb-4 border-4 border-green-200"
                />
              )}
              <h3 className="text-xl font-bold text-gray-800 mb-2">{coupon.product.name}</h3>
              <p className="text-gray-600">{coupon.store.name}</p>
            </div>

            {/* Desconto destacado */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-orange-200 rounded-xl p-6 mb-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-red-600 mb-2">
                  🔥 {coupon.discountPercentage}% OFF
                </div>
                <div className="text-sm text-gray-500 line-through mb-1">
                  De: {formatPriceWithCurrency(coupon.originalPrice, currency)}
                </div>
                <div className="text-2xl font-bold text-green-600">
                  Por: {formatPriceWithCurrency(coupon.discountPrice, currency)}
                </div>
                <div className="text-sm text-green-600 mt-2 font-semibold">
                  Você economiza: {formatPriceWithCurrency((parseFloat(coupon.originalPrice) - parseFloat(coupon.discountPrice)), currency)}
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="text-center mb-6">
              <h4 className="font-bold text-gray-800 mb-4">📱 Apresente este QR Code na loja:</h4>
              <div className="inline-block p-4 bg-white border-4 border-gray-300 rounded-xl shadow-lg">
                <img 
                  src={coupon.qrCode} 
                  alt="QR Code do cupom" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
            </div>

            {/* Código do cupom */}
            <div className="bg-gray-100 border-2 border-dashed border-gray-400 rounded-lg p-4 mb-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Código do cupom:</p>
                <p className="font-mono text-2xl font-bold text-gray-800">{coupon.couponCode}</p>
              </div>
            </div>

            {/* Validade */}
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600">
                Válido até: <span className="font-semibold">{new Date(coupon.expiresAt).toLocaleString('pt-BR')}</span>
              </p>
            </div>

            {/* Ações */}
            <div className="flex gap-3">
              <Button 
                onClick={downloadPDF}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </Button>
              <Button 
                onClick={shareOnWhatsApp}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
            </div>

            {/* Instruções */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="font-bold text-blue-800 mb-2">📋 Como usar seu cupom:</h5>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Apresente este QR Code ou código na loja</li>
                <li>• Válido apenas para o produto especificado</li>
                <li>• Não pode ser usado com outras promoções</li>
                <li>• Válido até a data de expiração</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Botão para ver todos os cupons */}
        <div className="text-center">
          <Button 
            onClick={() => setLocation('/my-coupons')}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            Ver Todos os Meus Cupons
          </Button>
        </div>
      </div>
    </div>
  );
}