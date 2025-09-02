import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, ShoppingBag, TrendingUp, Users, Globe, LogIn } from "lucide-react";
import { useAppVersion } from "@/hooks/use-mobile";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Página de Aterrissagem - Click Ofertas Paraguai
 * Design inspirado na Shopee - Área laranja com formulário sobreposto
 */
export default function Landing() {
  const { versionName, version } = useAppVersion();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha email e senha",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Login realizado com sucesso",
          description: "Redirecionando..."
        });

        // Redirecionar baseado no tipo de usuário
        if (data.user?.isSuperAdmin) {
          window.location.href = '/admin-panel';
        } else if (data.user?.hasStore) {
          window.location.href = '/admin';
        } else {
          window.location.href = '/cards';
        }
      } else {
        toast({
          title: "Erro no login",
          description: data.message || "Email ou senha incorretos",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "Erro de conexão",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };
  
  return (
    <div className="min-h-screen flex flex-col">

      {/* Faixa branca superior com logo */}
      <div className="w-full bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-2">
            <FileText className="w-8 h-8 text-orange-500" />
            <span className="font-bold text-xl">Click Ofertas</span>
            <span className="text-orange-500">Entre</span>
          </div>
          <Button 
            variant="link" 
            onClick={() => window.location.href = '/cards'}
            className="text-orange-500 hidden lg:block"
          >
            Precisa de ajuda?
          </Button>
        </div>
      </div>

      {/* Área Promocional de fundo (estilo Shopee) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#F04940] to-[#FA7D22] min-h-[90vh]">
        <div className="absolute inset-0 bg-black/20"></div>
        
        {/* Layout Mobile vs Desktop */}
        <div className="relative z-10 w-full h-full">
          {/* Mobile Layout */}
          <div className="block lg:hidden">
            <div className="flex flex-col min-h-screen">
              {/* Header com logo */}
              <div className="p-6 pt-12">
                <div className="text-center text-white">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <img 
                      src="/attached_assets/logo certo 01_1756853766080.png" 
                      alt="Mascote Click Ofertas" 
                      className="w-12 h-12 object-contain"
                    />
                    <h1 className="text-3xl font-bold">Click Ofertas</h1>
                  </div>
                  <p className="text-white/90 text-sm">Paraguai</p>
                </div>
              </div>

              {/* Conteúdo principal mobile */}
              <div className="flex-1 flex flex-col justify-center px-6">
                <div className="text-center text-white mb-8">
                  <h2 className="text-2xl font-bold mb-4 leading-tight">
                    Descubra as melhores{" "}
                    <span className="text-yellow-300">ofertas</span>{" "}
                    do Paraguai
                  </h2>
                  <p className="text-white/90 text-sm mb-6">
                    Conectamos você às melhores lojas com ofertas exclusivas e cupons digitais
                  </p>
                </div>

                {/* Cards de benefícios */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                    <div className="w-8 h-8 bg-yellow-300 rounded-full mb-2 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-gray-900" />
                    </div>
                    <p className="text-white text-xs font-medium">Ofertas verificadas</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                    <div className="w-8 h-8 bg-yellow-300 rounded-full mb-2 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-gray-900" />
                    </div>
                    <p className="text-white text-xs font-medium">Cupons exclusivos</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                    <div className="w-8 h-8 bg-yellow-300 rounded-full mb-2 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-gray-900" />
                    </div>
                    <p className="text-white text-xs font-medium">BR vs PY</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                    <div className="w-8 h-8 bg-yellow-300 rounded-full mb-2 flex items-center justify-center">
                      <Users className="w-4 h-4 text-gray-900" />
                    </div>
                    <p className="text-white text-xs font-medium">Lojas confiáveis</p>
                  </div>
                </div>
              </div>

              {/* Formulário de login mobile */}
              <div className="px-6 pb-8">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Entre agora</h3>
                    <p className="text-gray-600 text-sm">Acesse as melhores ofertas</p>
                  </div>

                  <div className="space-y-4">
                    {/* Campo de Email/Telefone/Usuário */}
                    <div>
                      <Input 
                        placeholder="Email/Telefone/Usuário"
                        className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                        data-testid="input-login-mobile"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    {/* Campo de Senha */}
                    <div>
                      <Input 
                        type="password"
                        placeholder="Senha"
                        className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                        data-testid="input-password-mobile"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>

                    {/* Botão principal de login */}
                    <Button 
                      onClick={handleLogin}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-[#F04940] to-[#FA7D22] hover:from-[#E03A32] hover:to-[#E96D1D] text-white py-4 rounded-xl font-semibold text-base shadow-lg"
                      data-testid="button-login"
                    >
                      <LogIn className="w-5 h-5 mr-2" />
                      {isLoading ? 'ENTRANDO...' : 'ENTRAR'}
                    </Button>

                    {/* Links de apoio */}
                    <div className="flex flex-row justify-between text-sm mt-4">
                      <Button variant="link" className="p-0 h-auto text-[#F04940] text-left">
                        Esqueci minha senha
                      </Button>
                      <Button variant="link" className="p-0 h-auto text-[#F04940] text-right">
                        Login com SMS
                      </Button>
                    </div>

                    {/* Link para cadastro */}
                    <div className="text-center mt-6 pt-4 border-t border-gray-200">
                      <span className="text-gray-600 text-sm">Novo por aqui? </span>
                      <Button 
                        variant="link" 
                        onClick={() => window.location.href = '/signup'}
                        className="p-0 h-auto text-[#F04940] font-semibold text-sm"
                        data-testid="button-signup"
                      >
                        Criar conta grátis
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:flex items-start justify-between h-full max-w-7xl mx-auto px-8 xl:px-16 py-6 pt-8">
            {/* Conteúdo do lado esquerdo */}
            <div className="text-left text-white max-w-2xl flex-1 pr-8">
              <div className="mb-4 text-center relative">
                {/* Logo da Mascote */}
                <div className="absolute -top-12 -left-20 hidden xl:block">
                  <img 
                    src="/attached_assets/logo certo 01_1756853766080.png" 
                    alt="Mascote Click Ofertas" 
                    className="w-32 h-32 object-contain drop-shadow-2xl animate-bounce"
                  />
                </div>
                
                <h1 className="text-6xl font-bold mb-4 leading-tight">
                  Descubra as melhores{" "}
                  <span className="text-yellow-300">ofertas</span>{" "}
                  do Paraguai
                </h1>
              </div>

              {/* Descrição do que somos */}
              <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
                <h3 className="text-xl font-bold mb-3 text-yellow-300">Quem Somos</h3>
                <p className="text-base text-white/95 leading-relaxed mb-4">
                  Conectamos você às <strong>melhores lojas do Paraguai</strong> com ofertas exclusivas, 
                  cupons digitais e comparação de preços inteligente.
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
                    <span>Ofertas verificadas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
                    <span>Cupons exclusivos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
                    <span>Comparação BR vs PY</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
                    <span>Lojas confiáveis</span>
                  </div>
                </div>
              </div>


              {/* Elementos decorativos */}
              <div className="absolute top-20 left-10 opacity-20 pointer-events-none">
                <ShoppingBag className="w-16 h-16" />
              </div>
              <div className="absolute bottom-20 left-32 opacity-20 pointer-events-none">
                <TrendingUp className="w-20 h-20" />
              </div>
              <div className="absolute top-1/3 left-64 opacity-20 pointer-events-none">
                <Users className="w-12 h-12" />
              </div>
            </div>

            {/* Formulário de Login Desktop */}
            <div className="w-[360px] max-w-md bg-white rounded-xl shadow-2xl p-8 flex-shrink-0">
              <div className="w-full">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Entre</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <Input 
                      placeholder="Email/Telefone/Usuário"
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
                      data-testid="input-login-desktop"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="relative">
                    <Input 
                      type="password"
                      placeholder="Senha"
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
                      data-testid="input-password-desktop"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-lg font-medium text-lg"
                    data-testid="button-login-desktop"
                  >
                    {isLoading ? 'ENTRANDO...' : 'ENTRE'}
                  </Button>

                  <div className="flex flex-row justify-between text-base">
                    <Button variant="link" className="p-0 h-auto text-orange-500 text-left">
                      Esqueci minha senha
                    </Button>
                    <Button variant="link" className="p-0 h-auto text-orange-500 text-right">
                      Fazer login com SMS
                    </Button>
                  </div>

                  {/* Divisor */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">OU</span>
                    </div>
                  </div>

                  {/* Botões de Login Social */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <Button 
                      variant="outline" 
                      className="flex items-center justify-center gap-2 p-3 border border-gray-300 hover:bg-gray-50"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <span className="text-sm font-medium">Facebook</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex items-center justify-center gap-2 p-3 border border-gray-300 hover:bg-gray-50"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span className="text-sm font-medium">Google</span>
                    </Button>
                  </div>

                  <div className="text-center">
                    <span className="text-gray-600 text-base">Novo na Click Ofertas? </span>
                    <Button 
                      variant="link" 
                      onClick={() => window.location.href = '/signup'}
                      className="p-0 h-auto text-orange-500 font-medium text-base"
                      data-testid="button-signup-desktop"
                    >
                      Cadastrar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Rodapé estilo Shopee */}
      <footer className="bg-gray-100 py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
            {/* Atendimento ao Cliente */}
            <div>
              <h3 className="font-bold text-gray-900 mb-2 sm:mb-4 text-xs sm:text-sm">ATENDIMENTO AO CLIENTE</h3>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600">
                <li><a href="#" className="hover:text-orange-500">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-orange-500">Como Comprar</a></li>
                <li><a href="#" className="hover:text-orange-500">Métodos de Pagamento</a></li>
                <li><a href="#" className="hover:text-orange-500">Garantia Click Ofertas</a></li>
                <li><a href="#" className="hover:text-orange-500">Devolução e Reembolso</a></li>
                <li><a href="#" className="hover:text-orange-500">Fale Conosco</a></li>
                <li><a href="#" className="hover:text-orange-500">Ouvidoria</a></li>
                <li><a href="#" className="hover:text-orange-500">Preferências de cookies</a></li>
              </ul>
            </div>

            {/* Sobre a Click Ofertas */}
            <div>
              <h3 className="font-bold text-gray-900 mb-2 sm:mb-4 text-xs sm:text-sm">SOBRE A CLICK OFERTAS</h3>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600">
                <li><a href="#" className="hover:text-orange-500">Sobre Nós</a></li>
                <li><a href="#" className="hover:text-orange-500">Políticas</a></li>
                <li><a href="#" className="hover:text-orange-500">Política de Privacidade</a></li>
                <li><a href="#" className="hover:text-orange-500">Programa de Afiliados</a></li>
                <li><a href="#" className="hover:text-orange-500">Seja um Entregador</a></li>
                <li><a href="#" className="hover:text-orange-500">Ofertas Relâmpago</a></li>
                <li><a href="#" className="hover:text-orange-500">Click Ofertas Blog</a></li>
                <li><a href="#" className="hover:text-orange-500">Imprensa</a></li>
              </ul>
            </div>

            {/* Pagamento */}
            <div className="sm:col-span-2 lg:col-span-1">
              <h3 className="font-bold text-gray-900 mb-2 sm:mb-4 text-xs sm:text-sm">PAGAMENTO</h3>
              <div className="grid grid-cols-4 sm:grid-cols-3 gap-1 sm:gap-2">
                <div className="bg-white p-1 sm:p-2 rounded border text-center text-xs font-bold text-blue-600">VISA</div>
                <div className="bg-white p-1 sm:p-2 rounded border text-center text-xs font-bold text-red-500">MC</div>
                <div className="bg-white p-1 sm:p-2 rounded border text-center text-xs font-bold text-red-600">HIper</div>
                <div className="bg-white p-1 sm:p-2 rounded border text-center text-xs font-bold text-blue-500">Elo</div>
                <div className="bg-white p-1 sm:p-2 rounded border text-center text-xs font-bold text-blue-600">AME</div>
                <div className="bg-white p-1 sm:p-2 rounded border text-center text-xs font-bold text-black">BOL</div>
                <div className="bg-white p-1 sm:p-2 rounded border text-center text-xs font-bold text-green-500">PIX</div>
              </div>
            </div>

            {/* Siga-nos */}
            <div>
              <h3 className="font-bold text-gray-900 mb-2 sm:mb-4 text-xs sm:text-sm">SIGA-NOS</h3>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <div className="w-3 sm:w-4 h-3 sm:h-4 bg-purple-500 rounded"></div>
                  <span>Instagram</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-3 sm:w-4 h-3 sm:h-4 bg-red-500 rounded"></div>
                  <span>TikTok</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-3 sm:w-4 h-3 sm:h-4 bg-green-500 rounded"></div>
                  <span>WhatsApp</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-3 sm:w-4 h-3 sm:h-4 bg-blue-600 rounded"></div>
                  <span>Facebook</span>
                </li>
                <li className="flex items-center space-x-2 hidden sm:flex">
                  <div className="w-3 sm:w-4 h-3 sm:h-4 bg-blue-500 rounded"></div>
                  <span>LinkedIn</span>
                </li>
              </ul>
            </div>

            {/* Baixar App */}
            <div className="sm:col-span-2 lg:col-span-1">
              <h3 className="font-bold text-gray-900 mb-2 sm:mb-4 text-xs sm:text-sm">BAIXAR APP</h3>
              <div className="bg-white p-2 sm:p-4 rounded border mb-2 sm:mb-4">
                <div className="w-16 sm:w-20 h-16 sm:h-20 bg-black mx-auto mb-1 sm:mb-2 flex items-center justify-center text-white text-xs">
                  QR CODE
                </div>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                  <div className="w-3 sm:w-4 h-3 sm:h-4 bg-black rounded"></div>
                  <span>App Store</span>
                </div>
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                  <div className="w-3 sm:w-4 h-3 sm:h-4 bg-green-500 rounded"></div>
                  <span>Google Play</span>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-300 mt-6 sm:mt-8 lg:mt-12 pt-4 sm:pt-6 lg:pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
              <div className="text-xs sm:text-sm text-gray-500">
                © 2025 Click Ofertas. Todos os direitos reservados
              </div>
              <div className="text-xs sm:text-sm text-gray-500">
                País: Paraguai | Brasil
              </div>
            </div>
            <div className="mt-2 sm:mt-4 text-xs text-gray-400">
              CNPJ/MF nº 35.635.824/0001-12. Endereço: Av. Brigadeiro Faria Lima, 3732, São Paulo (SP), Brasil
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}