import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Camera, Upload } from 'lucide-react';
import { Link } from 'wouter';

interface StoryCreatorButtonProps {
  className?: string;
}

export default function StoryCreatorButton({ className }: StoryCreatorButtonProps) {
  const { user, isAuthenticated } = useAuth();

  // Só mostra para lojistas autenticados
  if (!isAuthenticated || !user?.hasStore) {
    return null;
  }

  return (
    <div className={className}>
      {/* Botão principal para criar story */}
      <Button 
        asChild 
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
        data-testid="create-story-main-button"
      >
        <Link href="/create-story" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Criar Story
        </Link>
      </Button>

      {/* Card com dicas rápidas */}
      <Card className="mt-4 border-l-4 border-l-purple-500">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2">💡 Dicas para Stories</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Camera className="h-4 w-4 mt-0.5 text-purple-500" />
              <span><strong>Fotos:</strong> Adicione info do produto (nome, preço, categoria)</span>
            </div>
            <div className="flex items-start gap-2">
              <Upload className="h-4 w-4 mt-0.5 text-pink-500" />
              <span><strong>Vídeos:</strong> Escreva uma legenda envolvente</span>
            </div>
            <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
              ⏰ Stories duram 24h e são removidos automaticamente
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Versão compacta para usar em headers/navbars
export function StoryCreatorButtonCompact({ className }: StoryCreatorButtonProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user?.hasStore) {
    return null;
  }

  return (
    <Button 
      asChild 
      size="sm"
      className={`bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white ${className}`}
      data-testid="create-story-compact-button"
    >
      <Link href="/create-story" className="flex items-center gap-1">
        <Plus className="h-3 w-3" />
        <span className="hidden sm:inline">Story</span>
      </Link>
    </Button>
  );
}