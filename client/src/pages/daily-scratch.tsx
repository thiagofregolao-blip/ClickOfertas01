import { useState } from "react";
import { ArrowLeft, Gift, Sparkles, Calendar, Trophy, Info, Settings, ShoppingCart, BarChart3, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DailyScratchCard from "@/components/daily-scratch-card";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export default function DailyScratchPage() {
  const [, setLocation] = useLocation();
  const [showRules, setShowRules] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/cards")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            
            <div className="flex items-center space-x-2">
              <Gift className="w-6 h-6 text-purple-600" />
              <h1 className="text-xl font-bold text-gray-800">Raspadinha Diária</h1>
            </div>
            
            <Dialog open={showRules} onOpenChange={setShowRules}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Info className="w-4 h-4 mr-2" />
                  Como Funciona
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Como Funciona a Raspadinha Diária
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-blue-600 text-sm font-bold">1</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Uma chance por dia</h4>
                        <p className="text-sm text-gray-600">Você pode tentar uma vez por dia para ganhar prêmios incríveis!</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-purple-600 text-sm font-bold">2</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Raspe para revelar</h4>
                        <p className="text-sm text-gray-600">Use o dedo ou mouse para raspar a superfície cinza e descobrir se ganhou.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-green-600 text-sm font-bold">3</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Prêmios garantidos</h4>
                        <p className="text-sm text-gray-600">Descontos especiais, cupons exclusivos e muito mais te aguardam!</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-yellow-600 text-sm font-bold">4</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Volte amanhã</h4>
                        <p className="text-sm text-gray-600">Nova tentativa disponível todo dia! Não perca sua chance diária.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-yellow-800 mb-1">Dica Especial</h4>
                        <p className="text-sm text-yellow-700">
                          Alguns dias você pode ter mais sorte que outros! O algoritmo inteligente seleciona prêmios especiais para usuários ativos.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Raspadinha Card - Centro */}
          <div className="md:col-span-2 flex justify-center">
            <DailyScratchCard />
          </div>
          
          {/* Sidebar - Informações */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Status Diário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Hoje:</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Gift className="w-3 h-3 mr-1" />
                    Disponível
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Reset:</span>
                  <span className="text-sm font-medium text-gray-800">00:00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Timezone:</span>
                  <span className="text-sm font-medium text-gray-800">America/Asuncion</span>
                </div>
              </CardContent>
            </Card>

            {/* Prêmios Disponíveis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  Prêmios Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-green-50 to-green-100 rounded">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">50% de Desconto</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-800">R$ 25 de Desconto</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-purple-50 to-purple-100 rounded">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm font-medium text-purple-800">30% de Desconto</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  * Prêmios selecionados automaticamente pelo algoritmo inteligente
                </p>
              </CardContent>
            </Card>

            {/* Estatísticas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Suas Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tentativas:</span>
                  <span className="text-sm font-medium text-gray-800">--</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Prêmios ganhos:</span>
                  <span className="text-sm font-medium text-gray-800">--</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Taxa de sucesso:</span>
                  <span className="text-sm font-medium text-gray-800">--%</span>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  * Estatísticas serão exibidas após suas primeiras tentativas
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Footer informativo */}
        <div className="mt-12 text-center">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-white/50">
            <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center justify-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" />
              Sistema Inteligente de Prêmios
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm leading-relaxed">
              Nossa raspadinha diária utiliza um algoritmo inteligente que analisa popularidade, preços, 
              margens e novidades para selecionar os melhores prêmios automaticamente. 
              Quanto mais ativo você for na plataforma, melhores podem ser suas chances!
            </p>
          </div>
        </div>
      </div>
      
      {/* Menu do Rodapé Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around py-2 px-4">
          {/* Home */}
          <Link href="/">
            <button
              className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
              data-testid="button-mobile-home"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
              <span className="text-xs">Home</span>
            </button>
          </Link>
          
          {/* Lista de Compras */}
          <button
            onClick={() => setLocation('/shopping-list')}
            className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
            data-testid="button-mobile-shopping"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-xs">Lista</span>
          </button>
          
          {/* Comparar Preços */}
          <Link href="/price-comparison">
            <button
              className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
              data-testid="button-mobile-comparison"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-xs">Comparar</span>
            </button>
          </Link>
          
          {/* Meus Cupons */}
          <button
            onClick={() => setLocation('/my-coupons')}
            className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
            data-testid="button-mobile-coupons"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="18" rx="2" ry="2"/>
              <line x1="8" y1="2" x2="8" y2="22"/>
              <line x1="16" y1="2" x2="16" y2="22"/>
            </svg>
            <span className="text-xs">Cupons</span>
          </button>
          
          {/* Sair */}
          {isAuthenticated && (
            <button
              onClick={() => {
                window.location.href = '/api/logout';
              }}
              className="flex flex-col items-center gap-1 p-2 text-red-600 hover:text-red-700"
              data-testid="button-mobile-logout"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-xs">Sair</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}