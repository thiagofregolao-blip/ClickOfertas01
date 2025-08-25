import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { SiGoogle, SiApple } from "react-icons/si";
import { X, User } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleAppleLogin = () => {
    window.location.href = '/api/auth/apple';
  };

  const handleReplitLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-auto bg-white">
        <DialogHeader className="relative">
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 p-2 hover:bg-gray-100 rounded-full transition-colors"
            data-testid="button-close-login"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Entre na sua conta
            </DialogTitle>
            <p className="text-gray-600">
              Escolha uma das opções abaixo para acessar o painel administrativo
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {/* Google Login */}
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            size="lg"
            className="w-full h-12 flex items-center justify-center gap-3 border-2 hover:bg-gray-50 transition-colors"
            data-testid="button-login-google"
          >
            <SiGoogle className="w-5 h-5 text-red-500" />
            <span className="text-gray-700 font-medium">Continuar com Google</span>
          </Button>

          {/* Apple Login */}
          <Button
            onClick={handleAppleLogin}
            variant="outline"  
            size="lg"
            className="w-full h-12 flex items-center justify-center gap-3 border-2 hover:bg-gray-50 transition-colors"
            data-testid="button-login-apple"
          >
            <SiApple className="w-6 h-6 text-gray-800" />
            <span className="text-gray-700 font-medium">Continuar com Apple</span>
          </Button>

          <div className="relative my-6">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-white px-3 text-sm text-gray-500">ou</span>
            </div>
          </div>

          {/* Replit Login (fallback) */}
          <Button
            onClick={handleReplitLogin}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium"
            data-testid="button-login-replit"
          >
            Entrar com conta Replit
          </Button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500 border-t pt-4">
          <p>
            Ao continuar, você concorda com nossos{" "}
            <a href="#" className="text-primary hover:underline">
              Termos de Serviço
            </a>{" "}
            e{" "}
            <a href="#" className="text-primary hover:underline">
              Política de Privacidade
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}