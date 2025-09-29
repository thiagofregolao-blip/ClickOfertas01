import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wifi, Check, Copy, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

/**
 * Página de Sucesso Wi-Fi 24h
 * Exibe voucher e instruções após pagamento aprovado
 */
export default function WiFiSuccess() {
  const { toast } = useToast();
  const [paymentId, setPaymentId] = useState<string | null>(null);

  // Get payment ID from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('payment_id') || urlParams.get('external_reference');
    setPaymentId(id);
  }, []);

  // Fetch payment details
  const { data: payment, isLoading, refetch } = useQuery({
    queryKey: ['/api/wifi-payments', paymentId],
    enabled: !!paymentId,
    refetchInterval: payment?.status === 'pending' ? 5000 : false // Poll if pending
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência.`,
    });
  };

  const downloadVoucher = () => {
    if (!payment) return;
    
    const voucherData = `
=== Wi-Fi 24h - Click Ofertas Paraguay ===

Usuário: ${payment.voucherCode}
Senha: ${payment.voucherCode.slice(-8)}
Válido até: ${new Date(payment.voucherExpiresAt).toLocaleString('pt-BR')}

Instruções:
1. Conecte-se à rede Wi-Fi "ClickOfertas-Guest"
2. Abra o navegador
3. Digite os dados acima quando solicitado
4. Aproveite sua internet!

Suporte: WhatsApp (067) 99999-9999
    `.trim();

    const blob = new Blob([voucherData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wifi-voucher-${payment.voucherCode}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download iniciado",
      description: "Arquivo do voucher baixado com sucesso!",
    });
  };

  if (isLoading || !paymentId) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-[#F04940] to-[#FA7D22]">
        <div className="bg-white/15 backdrop-blur-md rounded-3xl p-8 text-center">
          <RefreshCw className="h-8 w-8 text-white animate-spin mx-auto mb-4" />
          <p className="text-white">Carregando dados do pagamento...</p>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-[#F04940] to-[#FA7D22]">
        <div className="bg-white/15 backdrop-blur-md rounded-3xl p-8 text-center max-w-md">
          <div className="text-white mb-6">
            <h1 className="text-2xl font-bold mb-2">Pagamento não encontrado</h1>
            <p>Não foi possível localizar os dados do seu pagamento.</p>
          </div>
          <Button 
            onClick={() => window.location.href = '/wifi-24h'}
            className="bg-white text-orange-600 hover:bg-gray-50"
          >
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  if (payment.status === 'pending') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-[#F04940] to-[#FA7D22]">
        <div className="bg-white/15 backdrop-blur-md rounded-3xl p-8 text-center max-w-md">
          <RefreshCw className="h-12 w-12 text-yellow-300 animate-spin mx-auto mb-6" />
          <div className="text-white mb-6">
            <h1 className="text-2xl font-bold mb-2">Aguardando pagamento</h1>
            <p>Seu pagamento está sendo processado. Esta página será atualizada automaticamente.</p>
          </div>
          <Button 
            onClick={() => refetch()}
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            Verificar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (payment.status !== 'approved') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-[#F04940] to-[#FA7D22]">
        <div className="bg-white/15 backdrop-blur-md rounded-3xl p-8 text-center max-w-md">
          <div className="text-white mb-6">
            <h1 className="text-2xl font-bold mb-2">Pagamento não aprovado</h1>
            <p>Houve um problema com seu pagamento. Status: {payment.status}</p>
          </div>
          <Button 
            onClick={() => window.location.href = '/wifi-24h'}
            className="bg-white text-orange-600 hover:bg-gray-50"
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const username = payment.voucherCode;
  const password = payment.voucherCode.slice(-8);
  const expiresAt = new Date(payment.voucherExpiresAt);
  const isExpired = expiresAt < new Date();

  return (
    <div className="min-h-[100dvh] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-gradient-to-br from-[#F04940] to-[#FA7D22]">
      
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20 py-4 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Check className="h-8 w-8 text-green-400" />
            <Wifi className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Pagamento Aprovado!</h1>
          <p className="text-white/80">Seu acesso Wi-Fi está pronto</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-md mx-auto space-y-6">
          
          {/* Voucher Card */}
          <div className="bg-white/15 backdrop-blur-md rounded-3xl p-6">
            <div className="text-center mb-6">
              <div className="bg-green-500/20 rounded-full p-3 w-16 h-16 mx-auto mb-4">
                <Wifi className="h-10 w-10 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Seus Dados de Acesso
              </h2>
              <p className="text-white/80 text-sm">
                Guarde essas informações para conectar-se
              </p>
            </div>

            <div className="space-y-4">
              {/* Username */}
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white/70 text-sm font-medium">Usuário</label>
                    <div className="text-white font-mono text-lg">{username}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(username, 'Usuário')}
                    className="text-white hover:bg-white/10"
                    data-testid="button-copy-username"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Password */}
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-white/70 text-sm font-medium">Senha</label>
                    <div className="text-white font-mono text-lg">{password}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(password, 'Senha')}
                    className="text-white hover:bg-white/10"
                    data-testid="button-copy-password"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Validity */}
              <div className="bg-white/10 rounded-xl p-4">
                <label className="text-white/70 text-sm font-medium">Válido até</label>
                <div className={`font-medium ${isExpired ? 'text-red-400' : 'text-green-400'}`}>
                  {expiresAt.toLocaleString('pt-BR')}
                </div>
                {isExpired && (
                  <div className="text-red-400 text-xs mt-1">
                    ⚠️ Voucher expirado
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white/15 backdrop-blur-md rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              Como conectar-se:
            </h3>
            
            <div className="space-y-3 text-white text-sm">
              <div className="flex gap-3">
                <div className="bg-yellow-400 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <strong>Conecte-se à rede Wi-Fi:</strong><br />
                  Procure por "ClickOfertas-Guest" ou "WiFi-Paraguay"
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="bg-yellow-400 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <strong>Abra o navegador:</strong><br />
                  Uma página de login aparecerá automaticamente
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="bg-yellow-400 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <strong>Digite seus dados:</strong><br />
                  Use o usuário e senha mostrados acima
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="bg-yellow-400 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <strong>Pronto!</strong><br />
                  Aproveite sua internet por 24 horas
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={downloadVoucher}
              className="w-full bg-white/20 text-white border-white/30 hover:bg-white/30"
              variant="outline"
              data-testid="button-download"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Voucher
            </Button>

            <Button
              onClick={() => window.location.href = '/'}
              className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300"
              data-testid="button-continue-shopping"
            >
              Continuar Comprando
            </Button>
          </div>

          {/* Support */}
          <div className="text-center">
            <p className="text-white/70 text-sm mb-2">
              Problemas para conectar?
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
    </div>
  );
}