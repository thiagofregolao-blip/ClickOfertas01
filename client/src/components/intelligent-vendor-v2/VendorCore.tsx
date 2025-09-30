
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, VendorSession, Product, VendorConfig } from './types';
import { VendorAPI } from './services/VendorAPI';
import { ConversationManager } from './services/ConversationManager';
import { ProductRecommendationEngine } from './services/ProductRecommendationEngine';
import { AnalyticsService } from './services/AnalyticsService';

interface VendorCoreProps {
  sessionId?: string;
  userId?: string;
  config?: Partial<VendorConfig>;
  onSessionUpdate?: (session: VendorSession) => void;
  onProductClick?: (product: Product) => void;
  onAnalyticsEvent?: (event: any) => void;
}

export const VendorCore: React.FC<VendorCoreProps> = ({
  sessionId: initialSessionId,
  userId,
  config = {},
  onSessionUpdate,
  onProductClick,
  onAnalyticsEvent
}) => {
  const [session, setSession] = useState<VendorSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  
  const vendorAPI = useRef(new VendorAPI());
  const conversationManager = useRef(new ConversationManager());
  const recommendationEngine = useRef(new ProductRecommendationEngine());
  const analytics = useRef(new AnalyticsService());
  
  const defaultConfig: VendorConfig = {
    personality: 'friendly',
    language: 'pt',
    maxRecommendations: 6,
    enableComparison: true,
    enablePriceAlerts: true,
    enableWishlist: true,
    ...config
  };

  // Inicializar sessão
  useEffect(() => {
    const initSession = async () => {
      try {
        let sessionId = initialSessionId;
        
        if (!sessionId) {
          sessionId = `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('vendor_session_id', sessionId);
        }

        const newSession: VendorSession = {
          id: sessionId,
          userId,
          messages: [],
          context: {
            conversationStage: 'greeting',
            preferences: {}
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        setSession(newSession);
        
        // Mensagem de boas-vindas
        const welcomeMessage = await conversationManager.current.generateWelcomeMessage(defaultConfig);
        addMessage({
          id: `msg_${Date.now()}`,
          type: 'assistant',
          text: welcomeMessage,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Erro ao inicializar sessão do vendedor:', error);
      }
    };

    initSession();
  }, [initialSessionId, userId]);

  const addMessage = useCallback((message: ChatMessage) => {
    setSession(prev => {
      if (!prev) return null;
      
      const updatedSession = {
        ...prev,
        messages: [...prev.messages, message],
        updatedAt: new Date()
      };
      
      onSessionUpdate?.(updatedSession);
      return updatedSession;
    });
  }, [onSessionUpdate]);

  const updateSessionContext = useCallback((contextUpdate: Partial<VendorSession['context']>) => {
    setSession(prev => {
      if (!prev) return null;
      
      const updatedSession = {
        ...prev,
        context: { ...prev.context, ...contextUpdate },
        updatedAt: new Date()
      };
      
      onSessionUpdate?.(updatedSession);
      return updatedSession;
    });
  }, [onSessionUpdate]);

  const processUserMessage = async (userMessage: string) => {
    if (!session || !userMessage.trim()) return;

    setIsLoading(true);
    setIsTyping(true);
    setStreamingMessage('');

    try {
      // Adicionar mensagem do usuário
      const userMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        type: 'user',
        text: userMessage.trim(),
        timestamp: new Date()
      };
      addMessage(userMsg);

      // Analisar intenção e contexto
      const analysis = await conversationManager.current.analyzeMessage(
        userMessage,
        session.context,
        defaultConfig
      );

      // Atualizar contexto da sessão
      updateSessionContext({
        currentProduct: analysis.extractedProduct || session.context.currentProduct,
        currentCategory: analysis.extractedCategory || session.context.currentCategory,
        priceRange: analysis.priceRange || session.context.priceRange,
        conversationStage: analysis.suggestedStage || session.context.conversationStage,
        lastSearchQuery: analysis.searchQuery || session.context.lastSearchQuery
      });

      // 🚀 CORREÇÃO: Buscar produtos usando API V2 com SSE
      let products: Product[] = [];
      let v2Response: any = null;
      
      if (analysis.shouldSearch && analysis.searchQuery) {
        try {
          console.log(`🤖 [VendorCore] Buscando produtos via API V2 para: "${analysis.searchQuery}"`);
          
          // Usar API V2 que processa SSE corretamente
          v2Response = await vendorAPI.current.sendMessageToV2(
            session.userId || 'anonymous',
            userMessage,
            session.context.storeId
          );

          console.log(`✅ [VendorCore] Resposta V2 recebida:`, v2Response);

          // Extrair e mapear produtos da resposta V2
          const v2Products = v2Response.products || [];
          if (v2Products.length > 0) {
            console.log(`🛍️ [VendorCore] ${v2Products.length} produtos encontrados`);
            console.log(`🛍️ [VendorCore] Primeiro produto (raw):`, v2Products[0]);
            
            products = v2Products.map((p: any) => {
              const priceValue = typeof p.price === 'string' ? parseFloat(p.price) : (p.price || 0);
              
              return {
                id: p.id || `product_${Date.now()}_${Math.random()}`,
                title: p.name || p.title || 'Produto sem título',
                name: p.name || p.title || 'Produto sem título',
                price: {
                  USD: priceValue,
                  BRL: priceValue * 5.5
                },
                imageUrl: p.imageUrl || p.image || '/placeholder-product.jpg',
                storeName: p.storeName || p.store || 'Loja não informada',
                category: p.category || 'geral',
                brand: p.brand || 'Marca não informada',
                url: `/product/${p.id}`,
                description: p.description || '',
                rating: p.rating || 4.5,
                reviews: p.reviews || 100,
                availability: p.availability || 'in_stock',
                discount: p.discount || 0,
                originalPrice: p.originalPrice || priceValue,
                features: p.features || [],
                model: p.model || ''
              };
            });
            
            console.log(`🛍️ [VendorCore] Produtos mapeados (primeiro):`, products[0]);
          }

          // Aplicar recomendações inteligentes
          if (products.length > 0) {
            products = await recommendationEngine.current.rankProducts(
              products,
              session.context,
              analysis
            );
          }
        } catch (error) {
          console.error('❌ [VendorCore] Erro ao buscar produtos via API V2:', error);
          // Fallback para busca antiga se V2 falhar
          products = await vendorAPI.current.searchProducts(analysis.searchQuery, {
            category: analysis.extractedCategory,
            priceMin: analysis.priceRange?.min,
            priceMax: analysis.priceRange?.max
          });

          // Aplicar recomendações inteligentes
          products = await recommendationEngine.current.rankProducts(
            products,
            session.context,
            analysis
          );
        }
      }

      // Gerar resposta do assistente
      const response = await conversationManager.current.generateResponse(
        analysis,
        products,
        session.context,
        defaultConfig
      );

      // Usar resposta do backend V2 se disponível, senão usar a gerada localmente
      const finalResponseText = v2Response?.content || response.text;

      // Simular streaming da resposta
      await simulateStreaming(finalResponseText);

      // Adicionar mensagem do assistente com produtos
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        type: 'assistant',
        text: finalResponseText,
        timestamp: new Date(),
        products: products.length > 0 ? products.slice(0, defaultConfig.maxRecommendations) : undefined,
        metadata: {
          intent: analysis.intent,
          confidence: v2Response?.metadata?.confidence || analysis.confidence,
          searchQuery: analysis.searchQuery,
          category: analysis.extractedCategory,
          v2Response: !!v2Response,
          productsCount: products.length
        }
      };
      addMessage(assistantMsg);
      
      console.log(`✅ [VendorCore] Mensagem do assistente adicionada com ${products.length} produtos`);

      // Registrar evento de analytics
      analytics.current.trackEvent({
        type: 'search',
        query: analysis.searchQuery,
        timestamp: new Date(),
        sessionId: session.id,
        userId: session.userId,
        metadata: {
          intent: analysis.intent,
          productsFound: products.length,
          stage: session.context.conversationStage
        }
      });

    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      
      const errorMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        type: 'assistant',
        text: 'Desculpe, houve um problema. Pode tentar novamente?',
        timestamp: new Date()
      };
      addMessage(errorMsg);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      setStreamingMessage('');
    }
  };

  const simulateStreaming = async (text: string) => {
    const words = text.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      setStreamingMessage(currentText);
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
    }
  };

  const handleProductClick = (product: Product) => {
    onProductClick?.(product);
    
    // Registrar clique
    analytics.current.trackEvent({
      type: 'click',
      productId: product.id,
      timestamp: new Date(),
      sessionId: session?.id || '',
      userId: session?.userId,
      metadata: {
        productTitle: product.title,
        price: product.price?.USD,
        category: product.category
      }
    });
  };

  return {
    session,
    isLoading,
    isTyping,
    streamingMessage,
    processUserMessage,
    handleProductClick,
    config: defaultConfig
  };
};
