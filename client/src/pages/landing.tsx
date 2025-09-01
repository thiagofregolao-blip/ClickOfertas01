import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, ShoppingBag, TrendingUp, Users, Globe } from "lucide-react";
import { useAppVersion } from "@/hooks/use-mobile";
import { useState } from "react";

/**
 * Página de Aterrissagem - Click Ofertas Paraguai
 * Design inspirado na Shopee - Split screen com área promocional e login
 */
export default function Landing() {
  const { versionName, version } = useAppVersion();
  
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Debug: Mostra versão atual */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-2 left-2 z-50 bg-black/80 text-white text-xs px-2 py-1 rounded">
          {versionName}
        </div>
      )}

      {/* Header simples */}
      <div className="lg:hidden w-full bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-6 h-6 text-orange-500" />
            <span className="font-bold text-lg">Click Ofertas</span>
          </div>
          <Button 
            variant="link" 
            onClick={() => window.location.href = '/cards'}
            className="text-orange-500"
          >
            Precisa de ajuda?
          </Button>
        </div>
      </div>

      {/* Lado Esquerdo - Área Promocional (estilo Shopee) */}
      <div className="flex-1 bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 relative overflow-hidden">
        {/* Logo no desktop */}
        <div className="hidden lg:block absolute top-6 left-6">
          <div className="flex items-center space-x-2 text-white">
            <FileText className="w-8 h-8" />
            <span className="font-bold text-xl">Click Ofertas</span>
            <span className="text-orange-100">Entre</span>
          </div>
        </div>

        {/* Conteúdo promocional central */}
        <div className="flex items-center justify-center h-full p-8 lg:p-16">
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
      </div>

      {/* Lado Direito - Formulário de Login */}
      <div className="w-full lg:w-96 bg-white flex flex-col justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm mx-auto">
          {/* Título do formulário */}
          <div className="mb-8">
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
            <div className="text-center mt-8">
              <span className="text-gray-600">Novo na Click Ofertas? </span>
              <Button variant="link" className="p-0 h-auto text-orange-500 font-medium">
                Cadastrar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
