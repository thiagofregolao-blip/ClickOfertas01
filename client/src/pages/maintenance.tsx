import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Clock, Lock, Sparkles, ShoppingBag, Globe, Unlock, Settings, Wrench, Heart } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-500/10 via-transparent to-blue-500/10"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/20 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.03'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>

      <div className="relative z-10 w-full max-w-lg space-y-8">
        {/* Mascote e Header Principal */}
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-32 h-32 mb-8">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
            
            {/* Mascote Container */}
            <div className="relative w-full h-full bg-white/10 backdrop-blur-sm rounded-full border border-white/20 flex items-center justify-center">
              <img 
                src={mascoteImage} 
                alt="Click Ofertas Mascote"
                className="w-20 h-20 object-contain filter drop-shadow-2xl"
              />
            </div>
            
            {/* Status Icon */}
            <div className="absolute -top-2 -right-2">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center animate-bounce">
                <Wrench className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 backdrop-blur-sm">
              <Clock className="w-4 h-4 mr-2" />
              Sistema em Manutenção
            </Badge>
            
            <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-orange-200 to-orange-400 bg-clip-text text-transparent">
              Em Breve
            </h1>
            
            <p className="text-xl text-gray-300 leading-relaxed max-w-md mx-auto">
              Estamos preparando as <span className="text-orange-400 font-semibold">melhores ofertas</span> do Paraguai para você!
            </p>
          </div>
        </div>

        {/* Cards de Features */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Ofertas Exclusivas</h3>
                  <p className="text-gray-400">Produtos com os melhores preços do mercado</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Comparação Inteligente</h3>
                  <p className="text-gray-400">Brasil vs Paraguai em tempo real</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Experiência Premium</h3>
                  <p className="text-gray-400">Interface moderna e intuitiva</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acesso de Emergência */}
        <div className="text-center space-y-4">
          {!showPasswordField ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPasswordField(true)}
              className="text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300"
            >
              <Lock className="w-4 h-4 mr-2" />
              Acesso de emergência
            </Button>
          ) : (
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-center space-x-2 text-gray-300">
                  <Unlock className="w-5 h-5" />
                  <span className="font-medium">Acesso de Emergência</span>
                </div>
                
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <Input
                    type="password"
                    placeholder="Digite a senha de acesso"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-center bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 transition-all duration-300"
                    disabled={isLoading}
                  />
                  
                  <div className="flex space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowPasswordField(false);
                        setPassword("");
                      }}
                      className="flex-1 border-white/20 text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-300"
                      disabled={isLoading}
                    >
                      Cancelar
                    </Button>
                    
                    <Button
                      type="submit"
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg"
                      disabled={isLoading || !password.trim()}
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Verificando...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Unlock className="w-4 h-4" />
                          <span>Acessar</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer Elegante */}
        <div className="text-center space-y-6 pt-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-200"></div>
            </div>
            <span className="text-gray-300 font-medium">Sistema em atualização</span>
          </div>
          
          <div className="space-y-2">
            <p className="text-gray-400 flex items-center justify-center space-x-2">
              <span>Feito com</span>
              <Heart className="w-4 h-4 text-red-500 animate-pulse" />
              <span>para você</span>
            </p>
            <p className="text-sm text-gray-500">
              Voltaremos em breve com novidades incríveis!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}