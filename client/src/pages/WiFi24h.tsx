import { Button } from "@/components/ui/button";
import { Wifi, ShoppingBag, Clock, Shield, Calendar } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { WifiSettings, WifiPlan } from "@shared/schema";

/**
 * Landing Page Wi-Fi 24h - Click Ofertas Paraguai
 * Venda de acesso Wi-Fi por 24h para turistas
 */
export default function WiFi24h() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [selectedCountry, setSelectedCountry] = useState<'brazil' | 'paraguay' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Buscar planos ativos
  const { data: wifiPlans, isLoading: plansLoading } = useQuery<WifiPlan[]>({
    queryKey: ['/api/wifi-plans/active'],
    queryFn: async () => {
      const response = await fetch('/api/wifi-plans/active');
      if (!response.ok) throw new Error('Failed to fetch plans');
      return await response.json();
    }
  });

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `R$ ${numPrice.toFixed(2).replace('.', ',')}`;
  };

  const handleCountrySelect = (country: 'brazil' | 'paraguay') => {
    setSelectedCountry(country);
    toast({
      title: country === 'brazil' ? "Brasil selecionado" : "Paraguay seleccionado",
      description: country === 'brazil' 
        ? "Bem-vindo! Vamos te ajudar a ficar conectado no Paraguai." 
        : "¡Bienvenido! Te ayudaremos a mantenerte conectado.",
    });
  };

  const handlePlanSelect = (planId: string) => {
    const plan = wifiPlans?.find(p => p.id === planId);
    if (!plan) return;
    
    setSelectedPlan(planId);
    toast({
      title: `${plan.name} selecionado`,
      description: `Você escolheu o acesso Wi-Fi por ${formatPrice(plan.price)}`,
    });
  };

  const handleContinue = async () => {
    if (!selectedCountry) {
      toast({
        title: "Selecione seu país",
        description: "Por favor, informe de onde você é para continuar.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedPlan) {
      toast({
        title: "Selecione um plano",
        description: "Por favor, escolha um plano de Wi-Fi para continuar.",
        variant: "destructive"
      });
      return;
    }

    const plan = wifiPlans?.find(p => p.id === selectedPlan);
    if (!plan) {
      toast({
        title: "Plano não encontrado",
        description: "O plano selecionado não está mais disponível.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Navigate to payment flow with country and plan parameters
      const paymentUrl = `/wifi-24h/payment?country=${selectedCountry}&planId=${selectedPlan}`;
      setLocation(paymentUrl);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao redirecionar para pagamento. Tente novamente.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <Wifi className="h-8 w-8 text-orange-500" />
              <h1 className="text-2xl font-bold text-gray-900">
                Wi-Fi <span className="text-orange-500">24h</span>
              </h1>
            </div>
          </div>
          
          {/* Suporte */}
          <div>
            <a 
              href="#" 
              className="text-base text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              Suporte
            </a>
          </div>
        </div>
      </header>

      {/* Main Content - Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#F04940] to-[#FA7D22] flex-1">
        <div className="absolute inset-0 bg-black/10"></div>
        
        {/* Pattern Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 animate-pulse">
            <Wifi className="h-16 w-16 text-white" />
          </div>
          <div className="absolute top-40 right-20 animate-pulse delay-1000">
            <ShoppingBag className="h-12 w-12 text-white" />
          </div>
          <div className="absolute bottom-40 left-20 animate-pulse delay-500">
            <Shield className="h-14 w-14 text-white" />
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-full p-6 text-center">
          
          {/* Hero Message */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-white/15 backdrop-blur-sm rounded-3xl p-2 mb-6 inline-block">
              <div className="bg-white/20 rounded-2xl px-4 py-2">
                <Clock className="h-5 w-5 text-white inline mr-2" />
                <span className="text-white font-medium">Acesso 24 horas</span>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
              Não fique sem internet ao fazer suas
              <span className="block text-yellow-300">compras no Paraguai</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-4 font-medium">
              Escolha seu plano de Wi-Fi ilimitado
            </p>
            
            {/* Mercado Pago Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6" data-testid="badge-mercadopago">
              <Shield className="h-4 w-4 text-green-300" />
              <span className="text-white text-sm font-medium">Pagamento seguro via Mercado Pago</span>
            </div>
            
            {/* Plans Selection - Dynamic */}
            {plansLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            ) : wifiPlans && wifiPlans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto">
                {wifiPlans.map((plan, index) => {
                  const Icon = plan.durationHours <= 24 ? Clock : Calendar;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => handlePlanSelect(plan.id)}
                      className={`bg-black/20 backdrop-blur-md rounded-2xl p-6 border-2 transition-all duration-300 ${
                        selectedPlan === plan.id
                          ? 'border-yellow-300 bg-black/30 scale-105' 
                          : 'border-white/30 hover:bg-black/25 hover:scale-102'
                      }`}
                      data-testid={`button-plan-${index}`}
                    >
                      <div className="text-center">
                        <Icon className="h-8 w-8 text-yellow-300 mx-auto mb-3" />
                        <div className="text-3xl font-bold text-white mb-1">
                          {formatPrice(plan.price)}
                        </div>
                        <div className="text-white/80 text-sm mb-2">{plan.name}</div>
                        {plan.description && (
                          <div className="text-white/70 text-xs">{plan.description}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-white/80 text-center py-8">
                Nenhum plano disponível no momento
              </div>
            )}
          </div>

          {/* Country Selection */}
          <div className="bg-black/15 backdrop-blur-md rounded-3xl p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-white mb-6">
              De onde você é?
            </h2>
            
            <div className="grid grid-cols-1 gap-4 mb-6">
              {/* Brasil */}
              <button
                onClick={() => handleCountrySelect('brazil')}
                className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                  selectedCountry === 'brazil'
                    ? 'border-yellow-300 bg-black/30' 
                    : 'border-white/30 bg-black/10 hover:bg-black/20'
                }`}
                data-testid="button-country-brazil"
              >
                <div className="flex items-center justify-center gap-4">
                  <span className="text-4xl">🇧🇷</span>
                  <div className="text-left">
                    <div className="text-xl font-bold text-white">Brasil</div>
                    <div className="text-white/80">Brasileiro</div>
                  </div>
                </div>
              </button>

              {/* Paraguay */}
              <button
                onClick={() => handleCountrySelect('paraguay')}
                className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                  selectedCountry === 'paraguay'
                    ? 'border-yellow-300 bg-black/30' 
                    : 'border-white/30 bg-black/10 hover:bg-black/20'
                }`}
                data-testid="button-country-paraguay"
              >
                <div className="flex items-center justify-center gap-4">
                  <span className="text-4xl">🇵🇾</span>
                  <div className="text-left">
                    <div className="text-xl font-bold text-white">Paraguay</div>
                    <div className="text-white/80">Paraguayo</div>
                  </div>
                </div>
              </button>
            </div>

            {/* Payment Info */}
            <div className="mb-4 text-center">
              <p className="text-white/80 text-sm" data-testid="text-payment-methods">
                💳 Aceitamos Pix, cartão e outras formas de pagamento
              </p>
              <p className="text-white/70 text-xs mt-1" data-testid="text-payment-processor">
                Processamento seguro pelo Mercado Pago
              </p>
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              disabled={!selectedCountry || isLoading}
              size="lg"
              className="w-full h-14 text-lg font-semibold bg-white text-orange-600 hover:bg-gray-50 disabled:opacity-50"
              data-testid="button-continue"
            >
              {isLoading ? "Carregando..." : "Continuar →"}
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mt-12">
            <div className="text-center bg-black/10 backdrop-blur-sm rounded-2xl p-6">
              <Clock className="h-8 w-8 text-yellow-300 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-2">24 Horas</h3>
              <p className="text-white/80 text-sm">Acesso completo por um dia inteiro</p>
            </div>
            
            <div className="text-center bg-black/10 backdrop-blur-sm rounded-2xl p-6">
              <Shield className="h-8 w-8 text-yellow-300 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-2">Pagamento Seguro</h3>
              <p className="text-white/80 text-sm">Mercado Pago - Pix, cartão e mais</p>
            </div>
            
            <div className="text-center bg-black/10 backdrop-blur-sm rounded-2xl p-6">
              <ShoppingBag className="h-8 w-8 text-yellow-300 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-2">Para Compras</h3>
              <p className="text-white/80 text-sm">Ideal para pesquisar preços e ofertas</p>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 px-4">
        <div className="max-w-7xl mx-auto text-center text-gray-600 text-sm">
          <p>© 2024 Click Ofertas Paraguay - Wi-Fi 24h</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="#" className="hover:text-orange-500 transition-colors">Termos</a>
            <a href="#" className="hover:text-orange-500 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-orange-500 transition-colors">Ajuda</a>
          </div>
        </div>
      </footer>
    </div>
  );
}