import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Download, Share2, QrCode, CheckCircle, XCircle, ArrowLeft, Trash2, Settings, ShoppingCart, BarChart3, LogOut } from "lucide-react";
import { formatBrazilianPrice, formatPriceWithCurrency } from "@/lib/priceUtils";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";

interface CouponWithDetails {
  id: string;
  couponCode: string;
  
  // 🎯 DADOS DA PROMOÇÃO (novos campos para promoções)
  promotionName?: string;
  promotionImageUrl?: string;
  promotionDescription?: string;
  
  originalPrice: string;
  discountPrice: string;
  discountPercentage: string;
  qrCode: string;
  expiresAt: string;
  isRedeemed: boolean;
  redeemedAt?: string;
  createdAt: string;
  product?: {  // ❗ Agora opcional (null para promoções)
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

export default function MyCoupons() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedCoupon, setSelectedCoupon] = useState<CouponWithDetails | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Buscar cupons do usuário
  const { data: coupons = [], isLoading: couponsLoading, error } = useQuery<CouponWithDetails[]>({
    queryKey: ["/api/coupons/user"],
    enabled: !!isAuthenticated,
    retry: false,
  });

  // Mutation para excluir cupom
  const deleteCouponMutation = useMutation({
    mutationFn: async (couponId: string) => {
      const response = await fetch(`/api/coupons/${couponId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`${response.status}: ${error}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cupom excluído!",
        description: "O cupom foi removido permanentemente.",
      });
      // Atualizar lista de cupons
      queryClient.invalidateQueries({ queryKey: ["/api/coupons/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir cupom",
        description: String(error?.message || 'Tente novamente.'),
        variant: "destructive",
      });
    }
  });

  // Função para baixar PDF do cupom
  const downloadPDF = (coupon: CouponWithDetails) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('🎉 CUPOM DE DESCONTO', 20, 30);
    
    // Informações da loja
    doc.setFontSize(14);
    doc.text(`Loja: ${coupon.store.name}`, 20, 50);
    
    // Produto/Promoção
    doc.setFontSize(12);
    const itemName = coupon.promotionName || coupon.product?.name || 'Promoção Especial';
    doc.text(`Produto: ${itemName}`, 20, 70);
    
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
    
    // Status
    if (coupon.isRedeemed) {
      doc.text(`UTILIZADO em: ${new Date(coupon.redeemedAt!).toLocaleString('pt-BR')}`, 20, 190);
    }
    
    // QR Code (como imagem)
    if (coupon.qrCode) {
      doc.addImage(coupon.qrCode, 'PNG', 120, 80, 60, 60);
    }
    
    // Instruções
    doc.setFontSize(10);
    doc.text('Apresente este cupom na loja para resgatar o desconto', 20, 220);
    
    doc.save(`cupom-${coupon.couponCode}.pdf`);
    
    toast({
      title: "PDF baixado!",
      description: "Cupom salvo no seu dispositivo",
    });
  };
  
  // Função para compartilhar no WhatsApp
  const shareOnWhatsApp = (coupon: CouponWithDetails) => {
    const currency = coupon.store.currency || 'Gs.';
    const message = `🎉 *CUPOM DE DESCONTO*\n\n` +
      `📱 *${coupon.promotionName || coupon.product?.name || 'Promoção Especial'}*\n` +
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

  // Se não estiver autenticado, redirecionar
  if (!isLoading && !isAuthenticated) {
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

  if (isLoading || couponsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando seus cupons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b shadow-sm text-white p-4" style={{background: 'linear-gradient(to bottom right, #F04940, #FA7D22)'}}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between w-full">
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
              <h1 className="text-2xl font-bold">🎫 Meus Cupons</h1>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                try {
                  const response = await fetch('/api/coupons/user/all', { 
                    method: 'DELETE',
                    credentials: 'include'
                  });
                  if (response.ok) {
                    toast({ title: "✅ Todos os cupons excluídos", description: "Limpeza realizada com sucesso" });
                    queryClient.invalidateQueries({ queryKey: ["/api/coupons/user"] });
                  } else {
                    throw new Error('Erro ao excluir cupons');
                  }
                } catch (error) {
                  toast({ title: "❌ Erro", description: "Falha ao excluir cupons", variant: "destructive" });
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              🧹 Excluir Todos (TESTE)
            </Button>
          </div>
          <p className="text-white/90 mt-2">
            {coupons.length === 0 ? 'Nenhum cupom encontrado' : `${coupons.length} cupom${coupons.length > 1 ? 's' : ''} disponível${coupons.length > 1 ? 'eis' : ''}`}
          </p>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-4xl mx-auto p-4">
        {coupons.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <QrCode size={64} className="mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum cupom ainda</h3>
              <p className="text-gray-600 mb-6">
                Raspe cards de ofertas especiais para ganhar cupons de desconto!
              </p>
              <Button 
                onClick={() => setLocation('/')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Explorar Ofertas
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 mt-6 md:grid-cols-2 lg:grid-cols-3">
            {coupons.map((coupon) => {
              const isExpired = new Date(coupon.expiresAt) <= new Date();
              const currency = coupon.store.currency || 'Gs.';
              
              return (
                <Card 
                  key={coupon.id} 
                  className={`overflow-hidden transition-all duration-200 hover:shadow-lg ${
                    coupon.isRedeemed ? 'opacity-75 bg-gray-50' : 
                    isExpired ? 'opacity-75 bg-red-50 border-red-200' : 
                    'bg-white border-green-200 shadow-sm hover:shadow-md cursor-pointer'
                  }`}
                  onClick={() => !coupon.isRedeemed && !isExpired && setSelectedCoupon(coupon)}
                >
                  <CardContent className="p-4">
                    {/* Status Badge e botão excluir */}
                    <div className="flex justify-between items-start mb-3">
                      <Badge 
                        className={
                          coupon.isRedeemed ? 'bg-gray-500' :
                          isExpired ? 'bg-red-500' : 
                          'bg-green-500'
                        }
                      >
                        {coupon.isRedeemed ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Utilizado
                          </>
                        ) : isExpired ? (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Expirado
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 mr-1" />
                            Ativo
                          </>
                        )}
                      </Badge>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">
                          {new Date(coupon.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Tem certeza que deseja excluir este cupom?')) {
                              deleteCouponMutation.mutate(coupon.id);
                            }
                          }}
                          disabled={deleteCouponMutation.isPending}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Imagem do produto/promoção */}
                    {(coupon.promotionImageUrl || coupon.product?.imageUrl) && (
                      <img
                        src={coupon.promotionImageUrl || coupon.product?.imageUrl}
                        alt={coupon.promotionName || coupon.product?.name || 'Promoção'}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                    )}

                    {/* Info do produto */}
                    <h3 className="font-bold text-sm mb-1 line-clamp-2">
                      {coupon.promotionName || coupon.product?.name || 'Promoção Especial'}
                    </h3>
                    <p className="text-xs text-gray-600 mb-2">
                      {coupon.store.name}
                    </p>

                    {/* Desconto destacado */}
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-3 mb-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">
                          🔥 {coupon.discountPercentage}% OFF
                        </div>
                        <div className="text-xs text-gray-500 line-through">
                          De: {formatPriceWithCurrency(coupon.originalPrice, currency)}
                        </div>
                        <div className="text-sm font-bold text-green-600">
                          Por: {formatPriceWithCurrency(coupon.discountPrice, currency)}
                        </div>
                      </div>
                    </div>

                    {/* Código do cupom */}
                    <div className="bg-gray-100 rounded p-2 mb-3">
                      <div className="text-xs text-gray-600 text-center">Código:</div>
                      <div className="font-mono text-sm text-center font-bold">
                        {coupon.couponCode}
                      </div>
                    </div>

                    {/* Timer/Status */}
                    {!coupon.isRedeemed && (
                      <div className="text-xs text-center mb-3">
                        {isExpired ? (
                          <span className="text-red-600 font-semibold">
                            Expirado em {new Date(coupon.expiresAt).toLocaleString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-orange-600 font-semibold">
                            Válido até {new Date(coupon.expiresAt).toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Ações */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadPDF(coupon);
                        }}
                        className="flex-1"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          shareOnWhatsApp(coupon);
                        }}
                        className="flex-1 bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                      >
                        <Share2 className="w-3 h-3 mr-1" />
                        WhatsApp
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal detalhado do cupom */}
      {selectedCoupon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">🎫 Detalhes do Cupom</h2>
                <button 
                  onClick={() => setSelectedCoupon(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* QR Code */}
              <div className="text-center mb-4">
                <img 
                  src={selectedCoupon.qrCode} 
                  alt="QR Code do cupom" 
                  className="mx-auto w-48 h-48 border border-gray-300 rounded"
                />
              </div>

              {/* Info do cupom */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold">{selectedCoupon.product?.name || 'Promoção Especial'}</h3>
                  <p className="text-gray-600">{selectedCoupon.store.name}</p>
                </div>

                <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 mb-2">
                      🔥 {selectedCoupon.discountPercentage}% DE DESCONTO!
                    </div>
                    <div className="text-sm text-gray-500 line-through">
                      De: {formatPriceWithCurrency(selectedCoupon.originalPrice, selectedCoupon.store.currency || 'Gs.')}
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      Por: {formatPriceWithCurrency(selectedCoupon.discountPrice, selectedCoupon.store.currency || 'Gs.')}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-100 p-3 rounded">
                  <div className="text-sm text-gray-600">Código do cupom:</div>
                  <div className="font-mono text-lg font-bold">{selectedCoupon.couponCode}</div>
                </div>

                <div className="text-center text-sm text-gray-600">
                  Válido até: {new Date(selectedCoupon.expiresAt).toLocaleString('pt-BR')}
                </div>

                {/* Ações */}
                <div className="flex gap-3">
                  <Button 
                    onClick={() => downloadPDF(selectedCoupon)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                  <Button 
                    onClick={() => shareOnWhatsApp(selectedCoupon)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Menu do Rodapé Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around py-2 px-4">
          {/* Home */}
          <Link href="/">
            <button
              className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
              data-testid="button-mobile-home"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
              <span className="text-xs">Home</span>
            </button>
          </Link>
          
          {/* Lista de Compras */}
          <button
            onClick={() => setLocation('/shopping-list')}
            className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
            data-testid="button-mobile-shopping"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-xs">Lista</span>
          </button>
          
          {/* Comparar Preços */}
          <Link href="/price-comparison">
            <button
              className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
              data-testid="button-mobile-comparison"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-xs">Comparar</span>
            </button>
          </Link>
          
          {/* Configurações */}
          <button
            onClick={() => setLocation('/settings')}
            className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
            data-testid="button-mobile-settings"
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs">Config</span>
          </button>
          
          {/* Sair */}
          {isAuthenticated && (
            <button
              onClick={() => {
                window.location.href = '/api/logout';
              }}
              className="flex flex-col items-center gap-1 p-2 text-red-600 hover:text-red-700"
              data-testid="button-mobile-logout"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-xs">Sair</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}