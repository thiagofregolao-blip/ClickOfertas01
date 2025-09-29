import { Button } from "@/components/ui/button";
import { Wifi, X, RefreshCw } from "lucide-react";

/**
 * Página de Falha Wi-Fi 24h
 * Exibida quando o pagamento falha ou é cancelado
 */
export default function WiFiFailure() {
  const handleTryAgain = () => {
    window.location.href = '/wifi-24h';
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-[#F04940] to-[#FA7D22] p-6">
      <div className="bg-white/15 backdrop-blur-md rounded-3xl p-8 text-center max-w-md w-full">
        
        {/* Error Icon */}
        <div className="bg-red-500/20 rounded-full p-4 w-20 h-20 mx-auto mb-6">
          <X className="h-12 w-12 text-red-400" />
        </div>

        {/* Error Message */}
        <div className="text-white mb-8">
          <h1 className="text-2xl font-bold mb-3">Pagamento não realizado</h1>
          <p className="text-white/80 leading-relaxed">
            Houve um problema com seu pagamento ou ele foi cancelado. 
            Não se preocupe, você pode tentar novamente.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleTryAgain}
            className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-semibold h-12"
            data-testid="button-try-again"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>

          <Button
            onClick={handleGoHome}
            variant="outline"
            className="w-full border-white/30 text-white hover:bg-white/10"
            data-testid="button-go-home"
          >
            Voltar ao Início
          </Button>
        </div>

        {/* Support */}
        <div className="mt-8 pt-6 border-t border-white/20">
          <p className="text-white/70 text-sm mb-3">
            Precisa de ajuda?
          </p>
          <Button
            variant="link"
            className="text-yellow-300 hover:text-yellow-200 p-0 h-auto"
            onClick={() => window.open('https://wa.me/5567999999999', '_blank')}
          >
            Fale conosco no WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}