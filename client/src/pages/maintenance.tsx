import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Clock, Lock, Sparkles, ShoppingBag, Globe, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import mascoteImage from "@/assets/mascote-click.png";

interface MaintenancePageProps {
  onAccessGranted: () => void;
}

export default function MaintenancePage({ onAccessGranted }: MaintenancePageProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const { toast } = useToast();

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/maintenance/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      if (response.ok) {
        localStorage.setItem('maintenance_bypass', 'true');
        toast({
          title: "Acesso liberado!",
          description: "Bem-vindo de volta!",
        });
        onAccessGranted();
      } else {
        toast({
          title: "Senha incorreta",
          description: "Tente novamente com a senha correta.",
          variant: "destructive",
        });
        setPassword("");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível verificar a senha.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Efeito para animações
  useEffect(() => {
    const elements = document.querySelectorAll('.animate-fade-in');
    elements.forEach((el, index) => {
      setTimeout(() => {
        el.classList.add('opacity-100');
      }, index * 200);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-20 h-20 bg-orange-300 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-pink-300 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-red-300 rounded-full blur-xl"></div>
        <div className="absolute bottom-40 right-1/3 w-28 h-28 bg-orange-400 rounded-full blur-xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto text-center space-y-8">
        {/* Mascote */}
        <div className="animate-fade-in opacity-0 transition-opacity duration-1000">
          <div className="relative mx-auto w-32 h-32 mb-6">
            <img 
              src={mascoteImage} 
              alt="Click Ofertas Mascote" 
              className="w-full h-full object-contain drop-shadow-2xl animate-bounce"
            />
            <div className="absolute -top-2 -right-2">
              <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Título Principal */}
        <div className="animate-fade-in opacity-0 transition-opacity duration-1000 delay-200">
          <Badge 
            variant="secondary" 
            className="mb-4 px-4 py-2 text-sm font-medium bg-orange-100 text-orange-800 border-orange-200"
          >
            <Clock className="w-4 h-4 mr-2" />
            Em Breve
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
            Click Ofertas
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-700 mb-6">
            Paraguai
          </h2>
        </div>

        {/* Mensagem Principal */}
        <Card className="animate-fade-in opacity-0 transition-opacity duration-1000 delay-400 bg-white/80 backdrop-blur-sm border-orange-200 shadow-xl">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold text-gray-800">
                  🚀 Estamos Chegando!
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Estamos preparando as <span className="font-semibold text-orange-600">melhores ofertas do Paraguai</span> para você! 
                  Em breve você terá acesso a produtos incríveis com os melhores preços da fronteira.
                </p>
              </div>

              {/* Features Preview */}
              <div className="grid md:grid-cols-3 gap-4 py-6">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-orange-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800">Produtos Exclusivos</h4>
                  <p className="text-sm text-gray-600">Perfumes, eletrônicos e muito mais</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Globe className="w-6 h-6 text-red-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800">Comparação Brasil</h4>
                  <p className="text-sm text-gray-600">Compare preços em tempo real</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-pink-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800">Raspadinhas</h4>
                  <p className="text-sm text-gray-600">Ganhe descontos especiais</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acesso para Colaboradores */}
        <div className="animate-fade-in opacity-0 transition-opacity duration-1000 delay-600">
          {!showPasswordField ? (
            <Button
              onClick={() => setShowPasswordField(true)}
              variant="outline"
              className="text-gray-600 hover:text-gray-800 border-gray-300 hover:border-gray-400"
              size="sm"
            >
              <Lock className="w-4 h-4 mr-2" />
              Acesso para Colaboradores
            </Button>
          ) : (
            <Card className="bg-gray-50 border-gray-200 max-w-md mx-auto">
              <CardContent className="p-6">
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Digite a senha de acesso:
                    </label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha de acesso"
                      className="text-center"
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={isLoading || !password.trim()}
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Unlock className="w-4 h-4 mr-2" />
                      )}
                      {isLoading ? "Verificando..." : "Acessar"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPasswordField(false);
                        setPassword("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="animate-fade-in opacity-0 transition-opacity duration-1000 delay-800 text-center text-gray-500">
          <p className="text-sm">
            © 2025 Click Ofertas Paraguai. Todos os direitos reservados.
          </p>
        </div>
      </div>

      <style jsx>{`
        .animate-fade-in {
          transition: opacity 1s ease-in-out;
        }
      `}</style>
    </div>
  );
}