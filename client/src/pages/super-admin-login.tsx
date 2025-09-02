import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowLeft } from "lucide-react";
import logoUrl from '../assets/logo.jpg';

export default function SuperAdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Limpar qualquer sessão anterior
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (response.ok) {
        // Login bem-sucedido, redirecionar
        window.location.href = '/admin-panel';
      } else {
        const data = await response.json().catch(() => ({ message: 'Erro ao fazer login' }));
        setError(data.message || 'Email ou senha incorretos');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex flex-col items-center justify-center p-4">
      {/* Botão voltar */}
      <button
        onClick={() => setLocation('/')}
        className="absolute top-4 left-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <div className="w-full max-w-md space-y-6">
        {/* Logo e título */}
        <div className="text-center">
          <img 
            src={logoUrl} 
            alt="Click Ofertas" 
            className="w-20 h-20 mx-auto rounded-full shadow-lg mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Super Admin</h1>
          <p className="text-gray-600">Acesso restrito ao painel administrativo</p>
        </div>

        {/* Card de login */}
        <Card className="border-red-200 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-gray-900">Login Super Admin</CardTitle>
            <CardDescription>
              Digite suas credenciais de super administrador
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@clickofertas.py"
                  required
                  className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                  data-testid="input-email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                  data-testid="input-password"
                />
              </div>
              
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Entrando...
                  </div>
                ) : (
                  'Entrar como Super Admin'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Botão de logout completo */}
        <div className="text-center">
          <Button
            variant="outline"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              await fetch('/api/logout');
              toast({
                title: "Logout realizado",
                description: "Todas as sessões foram encerradas. Agora você pode fazer login como super admin.",
              });
              window.location.reload();
            }}
            className="w-full mb-4"
          >
            🚪 Logout Completo (Recomendado)
          </Button>
        </div>

        {/* Aviso de segurança */}
        <div className="text-center text-sm text-gray-500">
          <p>⚠️ Esta é uma área restrita</p>
          <p>Apenas super administradores têm acesso</p>
          <p className="text-orange-600 font-medium mt-2">💡 Se já estiver logado com outra conta, clique em "Logout Completo" primeiro</p>
        </div>
      </div>
    </div>
  );
}