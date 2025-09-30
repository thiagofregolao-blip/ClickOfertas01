
import { useState, useEffect, useCallback, useRef } from 'react';
import { VendorSession, Product, VendorConfig, ChatMessage } from '../types';
import { VendorAPI } from '../services/VendorAPI';
import { ConversationManager } from '../services/ConversationManager';
import { ProductRecommendationEngine } from '../services/ProductRecommendationEngine';
import { AnalyticsService } from '../services/AnalyticsService';

interface UseIntelligentVendorProps {
  sessionId?: string;
  userId?: string;
  config?: Partial<VendorConfig>;
  onSessionUpdate?: (session: VendorSession) => void;
  onProductClick?: (product: Product) => void;
  onAnalyticsEvent?: (event: any) => void;
}

interface UseIntelligentVendorReturn {
  // Estado
  session: VendorSession | null;
  isLoading: boolean;
  isTyping: boolean;
  streamingMessage: string;
  error: string | null;
  
  // Ações
  sendMessage: (message: string) => Promise<void>;
  clearSession: () => void;
  retryLastMessage: () => Promise<void>;
  
  // Dados
  messages: ChatMessage[];
  currentProducts: Product[];
  
  // Configuração
  config: VendorConfig;
  
  // Analytics
  getSessionStats: () => any;
  
  // Utilitários
  isReady: boolean;
}

export const useIntelligentVendor = ({
  sessionId: initialSessionId,
  userId,
  config = {},
  onSessionUpdate,
  onProductClick,
  onAnalyticsEvent
}: UseIntelligentVendorProps = {}): UseIntelligentVendorReturn => {
  
  // Estados
  const [session, setSession] = useState<VendorSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string>('');
  
  // Serviços
  const vendorAPI = useRef(new VendorAPI());
  const conversationManager = useRef(new ConversationManager());
  const recommendationEngine = useRef(new ProductRecommendationEngine());
  const analytics = useRef(new AnalyticsService());
  
  // Configuração padrão
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
          sessionId = `vendor_v2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('intelligent_vendor_session_id', sessionId);
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

      } catch (err) {
        console.error('Erro ao inicializar sessão do vendedor V2:', err);
        setError('Erro ao inicializar o vendedor inteligente');
      }
    };

    initSession();
  }, [initialSessionId, userId]);

  // Adicionar mensagem
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

  // Atualizar contexto da sessão
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

  // Enviar mensagem
  const sendMessage = useCallback(async (userMessage: string) => {
    if (!session || !userMessage.trim()) return;

    setIsLoading(true);
    setIsTyping(true);
    setStreamingMessage('');
    setError(null);
    setLastMessage(userMessage);

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

      // Buscar produtos se necessário
      let products: Product[] = [];
      if (analysis.shouldSearch && analysis.searchQuery) {
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

      // 🚀 USAR API V2 REAL DO BACKEND
      console.log(`🤖 [V2] Enviando mensagem para backend V2...`);
      const v2Response = await vendorAPI.current.sendMessageToV2(
        session.userId,
        userMessage,
        session.context.storeId
      );

      console.log(`✅ [V2] Resposta do backend:`, v2Response);

      // Extrair produtos da resposta V2 se houver
      const v2Products = v2Response.products || [];
      if (v2Products.length > 0) {
        console.log(`🛍️ [V2] Produtos encontrados: ${v2Products.length}`);
        products = v2Products.map((p: any) => ({
          id: p.id,
          title: p.name,
          price: parseFloat(p.price),
          image: p.imageUrl,
          category: p.category,
          brand: p.brand,
          store: p.storeName,
          url: `/product/${p.id}`,
          description: p.description,
          rating: 4.5,
          discount: 0,
          originalPrice: parseFloat(p.price),
          features: []
        }));
      }

      // Simular streaming da resposta V2
      await simulateStreaming(v2Response.content || 'Desculpe, não consegui processar sua mensagem.');

      // Adicionar mensagem do assistente com dados reais do V2
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        type: 'assistant',
        text: v2Response.content || 'Desculpe, não consegui processar sua mensagem.',
        timestamp: new Date(),
        products: products.length > 0 ? products.slice(0, defaultConfig.maxRecommendations) : undefined,
        metadata: {
          intent: analysis.intent,
          confidence: v2Response.metadata?.confidence || 0.8,
          searchQuery: analysis.searchQuery,
          category: analysis.extractedCategory,
          v2Response: true
        }
      };
      addMessage(assistantMsg);

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

      onAnalyticsEvent?.({
        type: 'message_sent',
        message: userMessage,
        response: response.text,
        productsFound: products.length
      });

    } catch (err) {
      console.error('Erro ao processar mensagem V2:', err);
      setError('Erro ao processar sua mensagem. Tente novamente.');
      
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
  }, [session, addMessage, updateSessionContext, onAnalyticsEvent]);

  // Simular streaming
  const simulateStreaming = async (text: string) => {
    const words = text.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      setStreamingMessage(currentText);
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 40));
    }
  };

  // Limpar sessão
  const clearSession = useCallback(() => {
    setSession(null);
    setError(null);
    setStreamingMessage('');
    localStorage.removeItem('intelligent_vendor_session_id');
  }, []);

  // Tentar novamente última mensagem
  const retryLastMessage = useCallback(async () => {
    if (lastMessage) {
      await sendMessage(lastMessage);
    }
  }, [lastMessage, sendMessage]);

  // Obter estatísticas da sessão
  const getSessionStats = useCallback(() => {
    if (!session) return null;
    return analytics.current.getSessionStats(session.id);
  }, [session]);

  // Dados derivados
  const messages = session?.messages || [];
  const currentProducts = messages
    .filter(m => m.type === 'assistant' && m.products)
    .slice(-1)[0]?.products || [];
  const isReady = !!session;

  return {
    // Estado
    session,
    isLoading,
    isTyping,
    streamingMessage,
    error,
    
    // Ações
    sendMessage,
    clearSession,
    retryLastMessage,
    
    // Dados
    messages,
    currentProducts,
    
    // Configuração
    config: defaultConfig,
    
    // Analytics
    getSessionStats,
    
    // Utilitários
    isReady
  };
};
