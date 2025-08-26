import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Share, Download, Star, CheckCircle } from "lucide-react";
import { useAppVersion } from "@/hooks/use-mobile";
import { useState } from "react";
import LoginPage from "@/components/login-page";

/**
 * Página de Aterrissagem - Click Ofertas Paraguai
 * 
 * Apresenta as duas versões da aplicação:
 * - Mobile: Instagram-style, otimizado para smartphones
 * - Desktop: Layout tradicional, otimizado para computadores
 */
export default function Landing() {
  const { versionName, version } = useAppVersion();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Debug: Mostra versão atual */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-2 left-2 z-50 bg-black/80 text-white text-xs px-2 py-1 rounded">
          {versionName}
        </div>
      )}
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <FileText className="text-primary text-2xl" />
              <h1 className="text-xl font-bold text-gray-900">Click Ofertas Paraguai</h1>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => window.location.href = '/cards'}
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-white"
                data-testid="button-nav-stores"
              >
                Ver Lojas
              </Button>
              <Button 
                onClick={() => setIsLoginModalOpen(true)}
                className="bg-primary text-white hover:bg-blue-600"
                data-testid="button-login"
              >
                Acessar Painel
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Crie panfletos digitais
            <span className="text-primary block">em minutos</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transforme sua loja em uma vitrine digital. Cadastre produtos, personalize o design 
            e compartilhe ofertas que convertem em vendas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => setIsLoginModalOpen(true)}
              className="bg-primary text-white hover:bg-blue-600 px-8 py-4 text-lg"
              data-testid="button-start"
            >
              Começar Gratuitamente
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => window.location.href = '/cards'}
              className="px-8 py-4 text-lg border-2"
              data-testid="button-stores"
            >
              Ver Panfletos das Lojas
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Criação Rápida</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Cadastre produtos e gere panfletos profissionais em questão de minutos.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <Share className="w-6 h-6 text-secondary" />
              </div>
              <CardTitle>Compartilhamento Fácil</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Link público para WhatsApp, Instagram e redes sociais. Alcance mais clientes.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Download className="w-6 h-6 text-accent" />
              </div>
              <CardTitle>Download PNG & PDF</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Baixe como imagem ou imprima em PDF. Perfeito para compartilhar ou colar na loja.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Perfeito para pequenos comércios do Paraguai
            </h2>
            <p className="text-xl text-gray-600">
              Desenvolvido especialmente para lojistas que precisam divulgar ofertas rapidamente
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-secondary mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Moeda Configurável</h3>
                  <p className="text-gray-600">Suporte para Guaranis (Gs.), Dólares (US$) e outras moedas</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-secondary mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">WhatsApp Integrado</h3>
                  <p className="text-gray-600">Links diretos para contato via WhatsApp no panfleto</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-secondary mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Design Responsivo</h3>
                  <p className="text-gray-600">Otimizado para celular e carregamento rápido em 3G/4G</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-secondary mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Produtos em Destaque</h3>
                  <p className="text-gray-600">Marque ofertas especiais com selo visual chamativo</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-secondary mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Cores Personalizadas</h3>
                  <p className="text-gray-600">Aplique as cores da sua marca em todo o panfleto</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-secondary mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Sem Conhecimento Técnico</h3>
                  <p className="text-gray-600">Interface simples, não precisa ser designer</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-primary rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">
            Comece a divulgar suas ofertas hoje mesmo
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Junte-se aos comerciantes que já estão vendendo mais com panfletos digitais
          </p>
          <Button 
            size="lg"
            onClick={() => setIsLoginModalOpen(true)}
            className="bg-white text-primary hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
            data-testid="button-cta"
          >
            Criar Meu Panfleto Grátis
          </Button>
        </div>
      </div>

      {/* Login Modal - Para Lojistas */}
      <LoginPage 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        mode="store"
      />
    </div>
  );
}
