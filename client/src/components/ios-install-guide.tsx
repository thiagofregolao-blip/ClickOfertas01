import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Share, Plus, Smartphone } from "lucide-react";

interface IOSInstallGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IOSInstallGuide({ isOpen, onClose }: IOSInstallGuideProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-blue-600" />
              Instalar no iPhone
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            Para instalar o Click Ofertas no seu iPhone:
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <div className="font-medium text-blue-900 mb-1">
                  Toque no botão de compartilhar
                </div>
                <div className="text-sm text-blue-700 flex items-center gap-2">
                  <Share className="h-4 w-4" />
                  (ícone na barra inferior do Safari)
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <div className="font-medium text-green-900 mb-1">
                  Selecione "Adicionar à Tela de Início"
                </div>
                <div className="text-sm text-green-700 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Role para baixo na lista de opções
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <div className="font-medium text-purple-900 mb-1">
                  Confirme "Adicionar"
                </div>
                <div className="text-sm text-purple-700">
                  O app aparecerá na sua tela inicial
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
            <div className="text-sm text-yellow-800">
              <strong>💡 Dica:</strong> Depois de instalado, o app abrirá em tela cheia, 
              sem as barras do navegador, como um app nativo!
            </div>
          </div>
          
          <Button 
            onClick={onClose}
            className="w-full mt-4"
            size="lg"
          >
            Entendi, vou tentar!
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}