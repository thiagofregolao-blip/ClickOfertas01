import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export function useEngagement() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [hearts, setHearts] = useState<Array<{ id: string; x: number; y: number }>>([]);

  // Curtir produto (sem autenticação necessária)
  const likeProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      return apiRequest(`/api/products/${productId}/like`, "POST");
    },
    onError: (error) => {
      console.error("Error liking product:", error);
    },
  });

  // Salvar produto (requer autenticação)
  const saveProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      return apiRequest(`/api/products/${productId}/save`, "POST");
    },
    onSuccess: () => {
      // Invalidar cache dos produtos salvos
      queryClient.invalidateQueries({ queryKey: ['/api/saved-products'] });
      toast({
        title: "Produto salvo!",
        description: "O produto foi adicionado aos seus salvos.",
      });
    },
    onError: (error) => {
      console.error("Error saving product:", error);
      toast({
        title: "Erro ao salvar",
        description: "Você precisa estar logado para salvar produtos.",
        variant: "destructive",
      });
    },
  });

  // Registrar visualização de story
  const recordStoryViewMutation = useMutation({
    mutationFn: async ({ storeId, productId }: { storeId: string; productId?: string }) => {
      return apiRequest('/api/stories/view', "POST", { storeId, productId });
    },
    onError: (error) => {
      console.error("Error recording story view:", error);
    },
  });

  // Registrar visualização de panfleto
  const recordFlyerViewMutation = useMutation({
    mutationFn: async (storeId: string) => {
      return apiRequest('/api/flyers/view', "POST", { storeId });
    },
    onError: (error) => {
      console.error("Error recording flyer view:", error);
    },
  });

  // Função para criar corações na tela
  const createHeart = (x: number, y: number) => {
    const heartId = Math.random().toString(36).substr(2, 9);
    const newHeart = { id: heartId, x, y };
    
    setHearts(prev => [...prev, newHeart]);
    
    // Remover o coração após a animação
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== heartId));
    }, 1500);
  };

  // Double tap para curtir produto
  const handleDoubleTap = (productId: string, event: React.TouchEvent | React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ('clientX' in event ? event.clientX : event.touches[0].clientX) - rect.left;
    const y = ('clientY' in event ? event.clientY : event.touches[0].clientY) - rect.top;
    
    // Criar coração visual
    createHeart(x, y);
    
    // Enviar curtida para o backend
    likeProductMutation.mutate(productId);
  };

  // Salvar produto
  const handleSaveProduct = (productId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para salvar produtos.",
        variant: "destructive",
      });
      return;
    }
    
    saveProductMutation.mutate(productId);
  };

  // Registrar view de story
  const recordStoryView = (storeId: string, productId?: string) => {
    recordStoryViewMutation.mutate({ storeId, productId });
  };

  // Registrar view de panfleto
  const recordFlyerView = (storeId: string) => {
    recordFlyerViewMutation.mutate(storeId);
  };

  return {
    hearts,
    handleDoubleTap,
    handleSaveProduct,
    recordStoryView,
    recordFlyerView,
    isLiking: likeProductMutation.isPending,
    isSaving: saveProductMutation.isPending,
  };
}