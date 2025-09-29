import { Button } from "@/components/ui/button";
import { Wifi, ShoppingBag, Clock, Shield, Calendar } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

/**
 * Landing Page Wi-Fi 24h - Click Ofertas Paraguai
 * Venda de acesso Wi-Fi por 24h para turistas
 */
type PlanType = 'daily' | 'monthly';

export default function WiFi24h() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [selectedCountry, setSelectedCountry] = useState<'brazil' | 'paraguay' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('daily');
  const [isLoading, setIsLoading] = useState(false);

  const handleCountrySelect = (country: 'brazil' | 'paraguay') => {
    setSelectedCountry(country);
    toast({
      title: country === 'brazil' ? "Brasil selecionado" : "Paraguay seleccionado",
      description: country === 'brazil' 
        ? "Bem-vindo! Vamos te ajudar a ficar conectado no Paraguai." 
        : "¡Bienvenido! Te ayudaremos a mantenerte conectado.",
    });
  };

  const handlePlanSelect = (plan: PlanType) => {
    setSelectedPlan(plan);
    const planText = plan === 'daily' ? '24 horas' : 'mensal';
    const price = plan === 'daily' ? 'R$ 5,00' : 'R$ 9,90';
    toast({
      title: `Plano ${planText} selecionado`,
      description: `Você escolheu o acesso Wi-Fi por ${price}`,
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

    setIsLoading(true);
    
    try {
      // Navigate to payment flow with country and plan parameters
      const paymentUrl = `/wifi-24h/payment?country=${selectedCountry}&plan=${selectedPlan}`;
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
            
            <p className="text-xl md:text-2xl text-white/90 mb-6 font-medium">
              Escolha seu plano de Wi-Fi ilimitado
            </p>
            
            {/* Plans Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto">
              {/* Daily Plan */}
              <button
                onClick={() => handlePlanSelect('daily')}
                className={`bg-black/20 backdrop-blur-md rounded-2xl p-6 border-2 transition-all duration-300 ${
                  selectedPlan === 'daily'
                    ? 'border-yellow-300 bg-black/30 scale-105' 
                    : 'border-white/30 hover:bg-black/25 hover:scale-102'
                }`}
                data-testid="button-plan-daily"
              >
                <div className="text-center">
                  <Clock className="h-8 w-8 text-yellow-300 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white mb-1">R$ 5</div>
                  <div className="text-white/80 text-sm mb-2">24 horas</div>
                  <div className="text-white/70 text-xs">Ideal para viagens</div>
                </div>
              </button>

              {/* Monthly Plan */}
              <button
                onClick={() => handlePlanSelect('monthly')}
                className={`bg-black/20 backdrop-blur-md rounded-2xl p-6 border-2 transition-all duration-300 ${
                  selectedPlan === 'monthly'
                    ? 'border-yellow-300 bg-black/30 scale-105' 
                    : 'border-white/30 hover:bg-black/25 hover:scale-102'
                }`}
                data-testid="button-plan-monthly"
              >
                <div className="text-center">
                  <Calendar className="h-8 w-8 text-yellow-300 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white mb-1">R$ 9,90</div>
                  <div className="text-white/80 text-sm mb-2">30 dias</div>
                  <div className="text-white/70 text-xs">Melhor custo-benefício</div>
                </div>
              </button>
            </div>
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
              <h3 className="text-white font-semibold mb-2">Seguro</h3>
              <p className="text-white/80 text-sm">Conexão protegida e confiável</p>
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