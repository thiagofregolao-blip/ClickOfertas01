import { useState } from 'react';
import { useLocation } from 'wouter';
import GeminiAssistantBar from '@/components/GeminiAssistantBar';
import { ShoppingBag, Shield, Package, Sparkles } from 'lucide-react';

export default function TestAlibaba() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra Promocional */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-center py-2 px-4 text-sm font-medium">
        🎉 Abasteça seu estoque para a melhor temporada de vendas: até 20% de DESCONTO
        <button className="ml-4 underline font-semibold hover:opacity-80">
          Explore agora →
        </button>
      </div>

      {/* Header */}
      <header className="bg-gray-900 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-8">
              <button 
                onClick={() => setLocation('/')}
                className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent hover:opacity-80 transition"
              >
                Click Ofertas
              </button>

              {/* Navigation */}
              <nav className="hidden md:flex items-center space-x-6 text-sm">
                <a href="#" className="hover:text-orange-400 transition">Todas as categorias</a>
                <a href="#" className="hover:text-orange-400 transition">Seleções em destaque</a>
                <a href="#" className="hover:text-orange-400 transition">Proteções para pedidos</a>
                <a href="#" className="hover:text-orange-400 transition">Central dos Compradores</a>
                <a href="#" className="hover:text-orange-400 transition">Atendimento</a>
              </nav>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <div className="text-xs">
                <span className="opacity-75">Local de entrega:</span>
                <br />
                <span className="font-semibold">🇵🇾 PY</span>
              </div>
              <button className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 px-6 py-2 rounded-full font-semibold text-sm transition shadow-lg">
                Entrar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Fullscreen com fundo */}
      <section 
        className="relative bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=80')",
          minHeight: '75vh'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-32">
          {/* Label */}
          <div className="flex items-center space-x-2 text-white mb-4">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-base font-medium">Conheça o Click Ofertas</span>
          </div>

          {/* Título */}
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-8 leading-tight drop-shadow-2xl">
            A plataforma de compras líder no turismo de compras do Paraguai
          </h1>

          {/* Barra Gemini - Integrada inline */}
          <div className="mb-6">
            <GeminiAssistantBar />
          </div>

          {/* Tags de buscas frequentes */}
          <div className="flex items-center flex-wrap gap-3">
            <span className="text-white text-sm font-medium">Buscas frequentes:</span>
            <button className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-full text-sm hover:bg-white/30 transition">
              Eletrônicos
            </button>
            <button className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-full text-sm hover:bg-white/30 transition">
              Perfumes
            </button>
            <button className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-full text-sm hover:bg-white/30 transition">
              Celulares
            </button>
            <button className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-full text-sm hover:bg-white/30 transition">
              Roupas
            </button>
          </div>
        </div>
      </section>

      {/* Seção de Benefícios */}
      <section className="bg-gradient-to-br from-gray-800 via-gray-900 to-black py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Card 1 */}
            <div className="text-center text-white">
              <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/10">
                <ShoppingBag className="w-10 h-10 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Milhares de ofertas de negócios</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Explore produtos e fornecedores para o seu negócio com milhares de opções disponíveis
              </p>
            </div>

            {/* Card 2 */}
            <div className="text-center text-white">
              <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/10">
                <Shield className="w-10 h-10 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Qualidade e transações garantidas</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Compre de fornecedores verificados com garantia de qualidade e segurança
              </p>
            </div>

            {/* Card 3 */}
            <div className="text-center text-white">
              <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/10">
                <Package className="w-10 h-10 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">A solução completa para o turismo</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Faça e gerencie seus pedidos facilmente, desde a busca até a compra na loja física
              </p>
            </div>

            {/* Card 4 */}
            <div className="text-center text-white">
              <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/10">
                <Sparkles className="w-10 h-10 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Experiência com o comércio eletrônico personalizada</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Beneficie-se de descontos exclusivos e economia garantida em suas compras
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Voltar ao App */}
      <div className="bg-white py-8 text-center">
        <button 
          onClick={() => setLocation('/')}
          className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-8 py-3 rounded-full font-semibold shadow-lg transition"
        >
          ← Voltar ao Click Ofertas
        </button>
      </div>
    </div>
  );
}
