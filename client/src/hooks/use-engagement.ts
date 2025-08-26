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
  const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());
  const [savedProducts, setSavedProducts] = useState<Set<string>>(new Set());

  // Curtir produto (sem autenticação necessária)
  const likeProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      return apiRequest("POST", `/api/products/${productId}/like`);
    },
    onError: (error) => {
      console.error("Error liking product:", error);
    },
  });

  // Salvar produto (requer autenticação)
  const saveProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      return apiRequest("POST", `/api/products/${productId}/save`);
    },
    onSuccess: (_, productId) => {
      // Atualizar estado local
      setSavedProducts(prev => {
        const newSet = new Set(prev);
        newSet.add(productId);
        return newSet;
      });
      
      // Invalidar cache apenas se necessário (não existe página de salvos ainda)
      // queryClient.invalidateQueries({ queryKey: ['/api/saved-products'] });
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
      return apiRequest("POST", '/api/stories/view', { storeId, productId });
    },
    onError: (error) => {
      console.error("Error recording story view:", error);
    },
  });

  // Registrar visualização de panfleto
  const recordFlyerViewMutation = useMutation({
    mutationFn: async (storeId: string) => {
      return apiRequest("POST", '/api/flyers/view', { storeId });
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

  // Função para alternar like/unlike com animação
  const toggleLike = (productId: string, event?: React.MouseEvent) => {
    const isCurrentlyLiked = likedProducts.has(productId);
    
    setLikedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId); // Descurtir
      } else {
        newSet.add(productId); // Curtir
      }
      return newSet;
    });
    
    // Criar animação de coração apenas quando curtir
    if (!isCurrentlyLiked && event) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      createHeart(x, y);
    }
    
    // Enviar para o backend
    likeProductMutation.mutate(productId);
  };

  // Double tap para curtir produto
  const handleDoubleTap = (productId: string, event: React.TouchEvent | React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ('clientX' in event ? event.clientX : event.touches[0].clientX) - rect.left;
    const y = ('clientY' in event ? event.clientY : event.touches[0].clientY) - rect.top;
    
    // Criar coração visual apenas se não estiver curtido
    if (!likedProducts.has(productId)) {
      createHeart(x, y);
    }
    
    // Alternar like/unlike
    toggleLike(productId);
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
    
    const isSaved = savedProducts.has(productId);
    
    if (isSaved) {
      // Remover dos salvos localmente (otimistic update)
      setSavedProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
      
      toast({
        title: "Produto removido!",
        description: "O produto foi removido dos seus salvos.",
      });
    } else {
      // Salvar produto
      saveProductMutation.mutate(productId);
    }
  };

  // Registrar view de story
  const recordStoryView = (storeId: string, productId?: string) => {
    recordStoryViewMutation.mutate({ storeId, productId });
  };

  // Registrar view de panfleto
  const recordFlyerView = (storeId: string) => {
    recordFlyerViewMutation.mutate(storeId);
  };

  // Função para verificar se um produto foi curtido
  const isProductLiked = (productId: string) => {
    return likedProducts.has(productId);
  };
  
  // Função para verificar se um produto foi salvo
  const isProductSaved = (productId: string) => {
    return savedProducts.has(productId);
  };

  return {
    hearts,
    handleDoubleTap,
    handleSaveProduct,
    recordStoryView,
    recordFlyerView,
    isLiking: likeProductMutation.isPending,
    isSaving: saveProductMutation.isPending,
    isProductLiked,
    isProductSaved,
    likedProducts,
    savedProducts,
    toggleLike,
  };
}