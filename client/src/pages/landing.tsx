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
      {/* Debug: Mostra versão atual */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-2 left-2 z-50 bg-black/80 text-white text-xs px-2 py-1 rounded">
          {versionName}
        </div>
      )}

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
      <div className="h-[80vh] bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 relative overflow-hidden">

        {/* Conteúdo promocional central */}
        <div className="flex items-end justify-start h-full p-8 lg:p-16 lg:pl-64 pb-32">
          <div className="text-center text-white max-w-lg">
            {/* Título principal */}
            <div className="mb-8">
              <div className="text-6xl lg:text-8xl font-bold mb-4">
                <span className="block">9.9</span>
              </div>
              <div className="text-2xl lg:text-4xl font-bold mb-2">
                SUPER
              </div>
              <div className="text-2xl lg:text-4xl font-bold">
                SHOPPING DAY
              </div>
            </div>

            {/* Badges promocionais */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold">
                +16 MILHÕES
                <div className="text-xs">EM CUPONS</div>
              </div>
              <div className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold">
                FRETE GRÁTIS
                <div className="text-xs">Confira as condições</div>
              </div>
              <div className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold">
                ACHADINHOS
                <div className="text-xs">ATÉ R$99</div>
              </div>
            </div>

            {/* Data */}
            <div className="bg-orange-600 text-white inline-block px-6 py-2 rounded-full font-bold">
              20 AGO - 10 SET
            </div>

            {/* Elementos decorativos */}
            <div className="absolute top-20 left-10 opacity-20">
              <ShoppingBag className="w-16 h-16" />
            </div>
            <div className="absolute bottom-20 right-10 opacity-20">
              <TrendingUp className="w-20 h-20" />
            </div>
            <div className="absolute top-1/3 right-20 opacity-20">
              <Users className="w-12 h-12" />
            </div>
          </div>
        </div>

        {/* Formulário de Login Sobreposto */}
        <div className="absolute top-1/2 right-8 lg:right-48 transform -translate-y-1/2 w-80 lg:w-96 bg-white rounded-xl shadow-2xl p-6 lg:p-8">
          <div className="w-full">
            {/* Título do formulário */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Entre</h2>
            </div>

            {/* Formulário */}
            <div className="space-y-4">
              {/* Campo de usuário/email */}
              <div>
                <Input 
                  placeholder="Número de telefone/Nome do usuário/Email"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  data-testid="input-login"
                />
              </div>

              {/* Campo de senha */}
              <div className="relative">
                <Input 
                  type="password"
                  placeholder="Senha"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  data-testid="input-password"
                />
              </div>

              {/* Botão de entrar */}
              <Button 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium"
                data-testid="button-login"
              >
                ENTRE
              </Button>

              {/* Links auxiliares */}
              <div className="flex justify-between text-sm">
                <Button variant="link" className="p-0 h-auto text-orange-500">
                  Esqueci minha senha
                </Button>
                <Button variant="link" className="p-0 h-auto text-orange-500">
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

              {/* Botões de login social */}
              <div className="space-y-3">
                <Button 
                  variant="outline"
                  className="w-full border-gray-300 py-3 rounded-lg font-medium flex items-center justify-center space-x-2"
                  data-testid="button-facebook"
                >
                  <div className="w-5 h-5 bg-blue-600 rounded"></div>
                  <span>Facebook</span>
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/api/login'}
                  className="w-full border-gray-300 py-3 rounded-lg font-medium flex items-center justify-center space-x-2"
                  data-testid="button-google"
                >
                  <Globe className="w-5 h-5 text-red-500" />
                  <span>Google</span>
                </Button>
              </div>

              {/* Link para cadastro */}
              <div className="text-center mt-6">
                <span className="text-gray-600">Novo na Click Ofertas? </span>
                <Button variant="link" className="p-0 h-auto text-orange-500 font-medium">
                  Cadastrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé estilo Shopee */}
      <footer className="bg-gray-100 py-12 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {/* Atendimento ao Cliente */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4 text-sm">ATENDIMENTO AO CLIENTE</h3>
              <ul className="space-y-2 text-sm text-gray-600">
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
              <h3 className="font-bold text-gray-900 mb-4 text-sm">SOBRE A CLICK OFERTAS</h3>
              <ul className="space-y-2 text-sm text-gray-600">
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
            <div>
              <h3 className="font-bold text-gray-900 mb-4 text-sm">PAGAMENTO</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-2 rounded border text-center text-xs font-bold text-blue-600">VISA</div>
                <div className="bg-white p-2 rounded border text-center text-xs font-bold text-red-500">MC</div>
                <div className="bg-white p-2 rounded border text-center text-xs font-bold text-red-600">HIper</div>
                <div className="bg-white p-2 rounded border text-center text-xs font-bold text-blue-500">Elo</div>
                <div className="bg-white p-2 rounded border text-center text-xs font-bold text-blue-600">AME</div>
                <div className="bg-white p-2 rounded border text-center text-xs font-bold text-black">BOL</div>
                <div className="bg-white p-2 rounded border text-center text-xs font-bold text-green-500">PIX</div>
              </div>
            </div>

            {/* Siga-nos */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4 text-sm">SIGA-NOS</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span>Instagram</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>TikTok</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>WhatsApp</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span>Facebook</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>LinkedIn</span>
                </li>
              </ul>
            </div>

            {/* Baixar App */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4 text-sm">BAIXAR APP CLICK OFERTAS</h3>
              <div className="bg-white p-4 rounded border mb-4">
                <div className="w-20 h-20 bg-black mx-auto mb-2 flex items-center justify-center text-white text-xs">
                  QR CODE
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-4 h-4 bg-black rounded"></div>
                  <span>App Store</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>Google Play</span>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-300 mt-12 pt-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
              <div className="text-sm text-gray-500">
                © 2025 Click Ofertas. Todos os direitos reservados
              </div>
              <div className="text-sm text-gray-500">
                País e região: Paraguai | Brasil | Argentina | Chile
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-400">
              CNPJ/MF nº 35.635.824/0001-12. Endereço: Av. Brigadeiro Faria Lima, 3732 - 22º e 23º andares, Itaim Bibi, São Paulo (SP), Brasil, 04538-132
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}