import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, ShoppingBag, TrendingUp, Users, Globe } from "lucide-react";
import { useAppVersion } from "@/hooks/use-mobile";
import { useState } from "react";

/**
 * Página de Aterrissagem - Click Ofertas Paraguai
 * Design inspirado na Shopee - Área laranja com formulário sobreposto
 */
export default function Landing() {
  const { versionName, version } = useAppVersion();
  
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
      <div className="h-[70vh] sm:h-[80vh] lg:h-[85vh] relative overflow-hidden" style={{background: 'linear-gradient(to bottom right, #F04940, #FA7D22)'}}>

        {/* Conteúdo promocional central */}
        <div className="flex items-end justify-start h-full p-4 sm:p-8 lg:p-16 lg:pl-64 pb-16 sm:pb-24 lg:pb-32">
          <div className="text-center text-white max-w-xs sm:max-w-lg">
            {/* Título principal - Click Ofertas */}
            <div className="mb-4 sm:mb-8">
              <div className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
                <span className="block text-white drop-shadow-lg">Click Ofertas</span>
                <span className="block text-yellow-300 text-xl sm:text-2xl lg:text-3xl font-semibold">Paraguai</span>
              </div>
              <div className="text-sm sm:text-lg lg:text-xl font-medium text-white/90 mb-4">
                Sua ponte para as melhores ofertas do Paraguai
              </div>
            </div>

            {/* Descrição do que somos */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-white/20">
              <h3 className="text-lg sm:text-xl font-bold mb-3 text-yellow-300">Quem Somos</h3>
              <p className="text-sm sm:text-base text-white/95 leading-relaxed mb-4">
                Conectamos você às <strong>melhores lojas do Paraguai</strong> com ofertas exclusivas, 
                cupons digitais e comparação de preços inteligente.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
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

            {/* Call to action */}
            <div className="bg-yellow-400 text-gray-900 inline-block px-4 sm:px-8 py-2 sm:py-3 rounded-full font-bold text-sm sm:text-base shadow-lg">
              ✨ Descubra ofertas incríveis agora!
            </div>

            {/* Elementos decorativos */}
            <div className="absolute top-10 sm:top-20 left-5 sm:left-10 opacity-20 hidden sm:block">
              <ShoppingBag className="w-12 sm:w-16 h-12 sm:h-16" />
            </div>
            <div className="absolute bottom-10 sm:bottom-20 right-5 sm:right-10 opacity-20 hidden sm:block">
              <TrendingUp className="w-16 sm:w-20 h-16 sm:h-20" />
            </div>
            <div className="absolute top-1/3 right-10 sm:right-20 opacity-20 hidden lg:block">
              <Users className="w-10 sm:w-12 h-10 sm:h-12" />
            </div>
          </div>
        </div>

        {/* Formulário de Login Sobreposto */}
        <div className="absolute top-1/2 right-2 sm:right-4 lg:right-48 transform -translate-y-1/2 w-72 sm:w-80 lg:w-96 bg-white rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8">
          <div className="w-full">
            {/* Título do formulário */}
            <div className="mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Entre</h2>
            </div>

            {/* Formulário */}
            <div className="space-y-4">
              {/* Campo de usuário/email */}
              <div>
                <Input 
                  placeholder="Email/Telefone/Usuário"
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base"
                  data-testid="input-login"
                />
              </div>

              {/* Campo de senha */}
              <div className="relative">
                <Input 
                  type="password"
                  placeholder="Senha"
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base"
                  data-testid="input-password"
                />
              </div>

              {/* Botão de entrar */}
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base"
                data-testid="button-login"
              >
                ENTRE
              </Button>

              {/* Links auxiliares */}
              <div className="flex flex-col sm:flex-row justify-between text-xs sm:text-sm space-y-1 sm:space-y-0">
                <Button variant="link" className="p-0 h-auto text-orange-500 text-left">
                  Esqueci minha senha
                </Button>
                <Button variant="link" className="p-0 h-auto text-orange-500 text-left sm:text-right">
                  Login com SMS
                </Button>
              </div>

              {/* Divisor */}
              <div className="relative my-4 sm:my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-xs sm:text-sm">
                  <span className="px-2 bg-white text-gray-500">OU</span>
                </div>
              </div>

              {/* Botões de login social */}
              <div className="space-y-2 sm:space-y-3">
                <Button 
                  variant="outline"
                  className="w-full border-gray-300 py-2 sm:py-3 rounded-lg font-medium flex items-center justify-center space-x-2 text-sm sm:text-base"
                  data-testid="button-facebook"
                >
                  <div className="w-4 sm:w-5 h-4 sm:h-5 bg-blue-600 rounded"></div>
                  <span>Facebook</span>
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/api/login'}
                  className="w-full border-gray-300 py-2 sm:py-3 rounded-lg font-medium flex items-center justify-center space-x-2 text-sm sm:text-base"
                  data-testid="button-google"
                >
                  <Globe className="w-4 sm:w-5 h-4 sm:h-5 text-red-500" />
                  <span>Google</span>
                </Button>
              </div>

              {/* Link para cadastro */}
              <div className="text-center mt-4 sm:mt-6">
                <span className="text-gray-600 text-xs sm:text-sm">Novo na Click Ofertas? </span>
                <Button 
                  variant="link" 
                  onClick={() => window.location.href = '/signup'}
                  className="p-0 h-auto text-orange-500 font-medium text-xs sm:text-sm"
                  data-testid="button-signup"
                >
                  Cadastrar
                </Button>
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