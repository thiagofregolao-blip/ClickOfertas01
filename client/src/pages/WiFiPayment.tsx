import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wifi, CreditCard, QrCode, ArrowLeft, Shield, Clock, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

/**
 * Página de Pagamento Wi-Fi 24h
 * Coleta dados do cliente e processa pagamento via Mercado Pago
 */
export default function WiFiPayment() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    country: 'brazil', // Default
    plan: 'daily' as 'daily' | 'monthly' // Default
  });

  // Get country and plan from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const country = urlParams.get('country');
    const plan = urlParams.get('plan') as 'daily' | 'monthly';
    
    setFormData(prev => ({
      ...prev,
      ...(country && { country }),
      ...(plan && { plan })
    }));
  }, []);

  // Plan configurations
  const planConfig = {
    daily: {
      price: 5.00,
      name: 'Wi-Fi 24 horas',
      description: 'Acesso Wi-Fi por 24 horas',
      duration: '24 horas'
    },
    monthly: {
      price: 9.90,
      name: 'Wi-Fi 30 dias',
      description: 'Acesso Wi-Fi por 30 dias',
      duration: '30 dias'
    }
  };

  const currentPlan = planConfig[formData.plan];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePayment = async () => {
    // Validate form
    if (!formData.customerEmail) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, informe seu email para continuar.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.customerEmail.includes('@')) {
      toast({
        title: "Email inválido",
        description: "Por favor, informe um email válido.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/wifi-payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: formData.customerName || null,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone || null,
          amount: currentPlan.price,
          plan: formData.plan,
          country: formData.country
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar pagamento');
      }

      const paymentData = await response.json();
      
      // Redirect to MercadoPago
      window.location.href = paymentData.initPoint;

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Erro no pagamento",
        description: error instanceof Error ? error.message : "Erro interno. Tente novamente.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    window.location.href = '/wifi-24h';
  };

  const isEmailValid = formData.customerEmail.includes('@') && formData.customerEmail.length > 5;
  const canProceed = isEmailValid && !isProcessing;

  return (
    <div className="min-h-[100dvh] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-gradient-to-br from-[#F04940] to-[#FA7D22]">
      
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20 py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 text-white hover:text-yellow-300 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Voltar</span>
          </button>
          
          <div className="flex items-center gap-2">
            <Wifi className="h-6 w-6 text-white" />
            <span className="text-white font-bold text-lg">Wi-Fi 24h</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-md mx-auto">
          
          {/* Purchase Summary */}
          <div className="bg-white/15 backdrop-blur-md rounded-3xl p-6 mb-6">
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold text-white mb-2">
                Finalizar Compra
              </h1>
              <p className="text-white/80">
                {formData.country === 'brazil' ? 'Acesso Wi-Fi no Paraguai' : 'Acceso Wi-Fi en Paraguay'}
              </p>
            </div>
            
            <div className="border border-white/20 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {formData.plan === 'daily' ? (
                    <Clock className="h-5 w-5 text-yellow-300" />
                  ) : (
                    <Calendar className="h-5 w-5 text-yellow-300" />
                  )}
                  <span className="text-white font-medium">{currentPlan.name}</span>
                </div>
                <span className="text-2xl font-bold text-white">R$ {currentPlan.price.toFixed(2).replace('.', ',')}</span>
              </div>
              
              <div className="text-sm text-white/70 space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Conexão segura e ilimitada</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  <span>Ativação instantânea após pagamento</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Form */}
          <div className="bg-white/15 backdrop-blur-md rounded-3xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {formData.country === 'brazil' ? 'Seus dados' : 'Tus datos'}
            </h2>
            
            <div className="space-y-4">
              {/* Email - Required */}
              <div>
                <Label htmlFor="email" className="text-white font-medium">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={formData.country === 'brazil' ? "seu@email.com" : "tu@email.com"}
                  value={formData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  className="mt-1 bg-white/20 border-white/30 text-white placeholder:text-white/60"
                  data-testid="input-email"
                />
                <p className="text-xs text-white/70 mt-1">
                  {formData.country === 'brazil' 
                    ? 'Você receberá os dados de acesso por email' 
                    : 'Recibirás los datos de acceso por email'}
                </p>
              </div>

              {/* Name - Optional */}
              <div>
                <Label htmlFor="name" className="text-white font-medium">
                  {formData.country === 'brazil' ? 'Nome (opcional)' : 'Nombre (opcional)'}
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={formData.country === 'brazil' ? "Seu nome" : "Tu nombre"}
                  value={formData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  className="mt-1 bg-white/20 border-white/30 text-white placeholder:text-white/60"
                  data-testid="input-name"
                />
              </div>

              {/* Phone - Optional */}
              <div>
                <Label htmlFor="phone" className="text-white font-medium">
                  {formData.country === 'brazil' ? 'WhatsApp (opcional)' : 'WhatsApp (opcional)'}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={formData.country === 'brazil' ? "(11) 99999-9999" : "+595 999 999 999"}
                  value={formData.customerPhone}
                  onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                  className="mt-1 bg-white/20 border-white/30 text-white placeholder:text-white/60"
                  data-testid="input-phone"
                />
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white/15 backdrop-blur-md rounded-3xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {formData.country === 'brazil' ? 'Forma de pagamento' : 'Forma de pago'}
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-white p-3 bg-white/10 rounded-xl">
                <QrCode className="h-6 w-6 text-green-400" />
                <div>
                  <div className="font-medium">PIX</div>
                  <div className="text-sm text-white/70">
                    {formData.country === 'brazil' ? 'Pagamento instantâneo' : 'Pago instantáneo'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-white p-3 bg-white/10 rounded-xl">
                <CreditCard className="h-6 w-6 text-blue-400" />
                <div>
                  <div className="font-medium">
                    {formData.country === 'brazil' ? 'Cartão de Crédito/Débito' : 'Tarjeta de Crédito/Débito'}
                  </div>
                  <div className="text-sm text-white/70">
                    {formData.country === 'brazil' ? 'Visa, Mastercard, Elo' : 'Visa, Mastercard, Elo'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <Button
            onClick={handlePayment}
            disabled={!canProceed}
            size="lg"
            className="w-full h-14 text-lg font-bold bg-yellow-400 text-gray-900 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-pay"
          >
            {isProcessing 
              ? (formData.country === 'brazil' ? "Processando..." : "Procesando...")
              : (formData.country === 'brazil' 
                  ? `Pagar R$ ${currentPlan.price.toFixed(2).replace('.', ',')}` 
                  : `Pagar R$ ${currentPlan.price.toFixed(2).replace('.', ',')}`)
            }
          </Button>

          {/* Security Notice */}
          <div className="text-center mt-6">
            <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
              <Shield className="h-4 w-4" />
              <span>
                {formData.country === 'brazil' 
                  ? 'Pagamento 100% seguro via Mercado Pago' 
                  : 'Pago 100% seguro vía Mercado Pago'}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}