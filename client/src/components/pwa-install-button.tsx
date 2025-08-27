import { Download, Smartphone, CheckCircle, Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePWA } from "@/hooks/usePWA";
import IOSInstallGuide from "./ios-install-guide";

interface PWAInstallButtonProps {
  variant?: "button" | "card";
  className?: string;
}

export default function PWAInstallButton({ variant = "button", className = "" }: PWAInstallButtonProps) {
  const { canInstall, isInstalled, installApp, isInstalling } = usePWA();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  
  // Detectar se é iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Não mostrar se já está instalado
  if (isInstalled) {
    if (variant === "card") {
      return (
        <Card className={`border-green-200 bg-green-50 ${className}`}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">App Instalado</p>
                <p className="text-xs text-green-600">Click Ofertas está no seu dispositivo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  // No iOS, sempre mostrar o guia (mesmo sem canInstall)
  // Em outros dispositivos, só mostrar se canInstall
  if (!canInstall && !isIOS) {
    return null;
  }

  const handleInstall = () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      installApp();
    }
  };

  if (variant === "card") {
    return (
      <>
        <Card className={`border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer ${className}`} 
              onClick={handleInstall}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    {isIOS ? "Instalar no iPhone" : "Instalar App"}
                  </p>
                  <p className="text-xs text-blue-600">
                    {isIOS ? "Adicione à tela inicial do iOS" : "Acesso rápido e funcionalidade offline"}
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                disabled={isInstalling}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isInstalling ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : isIOS ? (
                  <Info className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <IOSInstallGuide 
          isOpen={showIOSGuide} 
          onClose={() => setShowIOSGuide(false)} 
        />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={handleInstall}
        disabled={isInstalling}
        variant="outline"
        size="sm"
        className={`flex items-center space-x-2 ${className}`}
        data-testid="button-install-pwa"
      >
        {isInstalling ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
        ) : isIOS ? (
          <Info className="h-4 w-4" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span>
          {isInstalling 
            ? "Instalando..." 
            : isIOS 
              ? "Como Instalar" 
              : "Instalar App"
          }
        </span>
      </Button>
      
      <IOSInstallGuide 
        isOpen={showIOSGuide} 
        onClose={() => setShowIOSGuide(false)} 
      />
    </>
  );
}