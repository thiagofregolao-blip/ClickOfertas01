import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface AssistantSession {
  id: string;
  userId?: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UseAssistantChatProps {
  sessionId?: string;
  autoCreateSession?: boolean;
}

export function useAssistantChat({ 
  sessionId: initialSessionId, 
  autoCreateSession = true 
}: UseAssistantChatProps = {}) {
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [personalizedGreeting, setPersonalizedGreeting] = useState<string>('');
  const [recommended, setRecommended] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 🆔 ANTI-CORRIDA: Track do requestId mais recente
  const latestRequestIdRef = useRef<string | null>(null);
  
  // 📝 DEDUPE: Track de sequência por request
  const lastSeqByReqRef = useRef<Map<string, number>>(new Map());
  
  // 🚫 PRODUCTS GUARD: Impede fetchSuggest após SSE products
  const haveProductsInThisRequestRef = useRef<boolean>(false);

  // 🧠 MEMÓRIA CONVERSACIONAL - Sistema de Vendedor Inteligente
  const [sessionMemory, setSessionMemory] = useState<any>(null);
  const [lastShownProducts, setLastShownProducts] = useState<any[]>([]);
  const [currentFocusProductId, setCurrentFocusProductId] = useState<string | null>(null);

  // Função para salvar produtos mostrados na memória
  const updateSessionMemory = useCallback(async (products: any[], query?: string, category?: string) => {
    if (!sessionId || !products || products.length === 0) return;
    
    console.log(`🧠 [updateSessionMemory] Salvando ${products.length} produtos na memória`);
    
    const memoryUpdate = {
      lastQuery: query,
      lastCategory: category,
      lastShownProducts: products.map(p => ({
        id: p.id,
        title: p.title,
        category: p.category || category,
        price: p.price,
        storeName: p.storeName,
        storeSlug: p.storeSlug,
        imageUrl: p.imageUrl,
        source: p.id.startsWith('bank_') ? 'bank' : 'store'
      })),
      currentFocusProductId: currentFocusProductId,
      conversationContext: {
        intent: 'search',
        lastAction: 'showed_products',
      },
      timestamp: new Date().toISOString()
    };
    
    try {
      const response = await fetch(`/api/assistant/memory/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memoryUpdate)
      });
      
      if (response.ok) {
        setSessionMemory(memoryUpdate);
        setLastShownProducts(memoryUpdate.lastShownProducts);
        console.log(`✅ [updateSessionMemory] Memória atualizada com sucesso`);
      }
    } catch (error) {
      console.error('❌ [updateSessionMemory] Erro ao salvar memória:', error);
    }
  }, [sessionId, currentFocusProductId]);

  // Função para definir produto em foco
  const setProductFocus = useCallback(async (productId: string) => {
    if (!sessionId) return;
    
    console.log(`🎯 [setProductFocus] Definindo foco no produto: ${productId}`);
    
    try {
      const response = await fetch(`/api/assistant/memory/${sessionId}/focus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });
      
      if (response.ok) {
        setCurrentFocusProductId(productId);
        console.log(`✅ [setProductFocus] Foco definido com sucesso`);
      }
    } catch (error) {
      console.error('❌ [setProductFocus] Erro ao definir foco:', error);
    }
  }, [sessionId]);

  // Buscar memória da sessão ao carregar
  useEffect(() => {
    if (!sessionId) return;
    
    const loadSessionMemory = async () => {
      try {
        const response = await fetch(`/api/assistant/memory/${sessionId}`);
        if (response.ok) {
          const { memory } = await response.json();
          setSessionMemory(memory);
          setLastShownProducts(memory.lastShownProducts || []);
          setCurrentFocusProductId(memory.currentFocusProductId || null);
          console.log(`🧠 [loadSessionMemory] Memória carregada:`, {
            products: memory.lastShownProducts?.length || 0,
            focus: memory.currentFocusProductId || 'nenhum'
          });
        }
      } catch (error) {
        console.error('❌ [loadSessionMemory] Erro ao carregar memória:', error);
      }
    };
    
    loadSessionMemory();
  }, [sessionId]);

  // Get or create session
  const sessionQuery = useQuery({
    queryKey: ['assistant', 'session', sessionId],
    queryFn: async () => {
      if (sessionId) {
        const response = await fetch(`/api/assistant/sessions/${sessionId}`);
        if (response.ok) {
          return await response.json();
        }
      }
      
      if (autoCreateSession) {
        try {
          const response = await apiRequest('POST', '/api/assistant/sessions', {});
          const data = await response.json();
          // Handle both shapes: { session: { id } } or { id }
          const session = data.session || data;
        
        // PATCH B: Saudação entra como 1ª mensagem
        if (data.greeting) {
          setMessages(prev => [
            { id: `greet-${Date.now()}`, role: 'assistant', content: data.greeting, timestamp: new Date() },
            ...prev,
          ]);
        }
        
        setSessionId(session.id);

        // PATCH C: Produtos recomendados ao criar sessão
        try {
          const s = await fetch('/suggest?q=trending').then(r=>r.json());
          setRecommended((s.products || []).slice(0,3));     // coluna da direita (até 3)
          setFeed((s.products || []).slice(3));              // lista abaixo do card/chat
        } catch (error) {
          console.warn('Erro ao buscar produtos recomendados:', error);
        }
        
          return session;
        } catch (error) {
          // If session creation fails (e.g., 401), gracefully handle it
          console.warn('Failed to create assistant session:', error);
          return null;
        }
      }
      
      return null;
    },
    enabled: autoCreateSession || !!sessionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Load session with messages (suspended while streaming)
  const messagesQuery = useQuery({
    queryKey: ['assistant', 'messages', sessionId],
    queryFn: async () => {
      if (!sessionId) return { messages: [] };
      try {
        const response = await fetch(`/api/assistant/sessions/${sessionId}`);
        if (!response.ok) {
          if (response.status === 401) {
            // Handle 401 gracefully - return empty messages
            return { messages: [] };
          }
          throw new Error(`Failed to load messages: ${response.statusText}`);
        }
        const data = await response.json();
        // Return the session data which includes messages array
        return data;
      } catch (error) {
        console.warn('Failed to load assistant messages:', error);
        return { messages: [] };
      }
    },
    enabled: !!sessionId && !isStreaming, // Suspend while streaming
  });

  // Update messages when query data changes
  useEffect(() => {
    if (messagesQuery.data?.messages) {
      setMessages(messagesQuery.data.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp || msg.createdAt)
      })));
    }
  }, [messagesQuery.data]);

  // REF para mensagem de streaming ativa
  const streamingMessageIdRef = useRef<string | null>(null);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!sessionId) throw new Error('No active session');

      console.log('🚀 [Frontend] Iniciando envio de mensagem:', { content, sessionId });

      // Abortar streaming anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log('🛑 [Frontend] Stream anterior abortado');
      }

      // Reset requestId before new stream
      latestRequestIdRef.current = null;

      // Add user message immediately to UI
      const userMessage: AssistantMessage = {
        id: `temp-user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Create assistant message placeholder for streaming
      const assistantMessage: AssistantMessage = {
        id: `temp-assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      
      // Track active streaming message
      streamingMessageIdRef.current = assistantMessage.id;
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsStreaming(true);

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      
      console.log('📡 [Frontend] Fazendo fetch para /api/assistant/stream');
      
      const response = await fetch('/api/assistant/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ sessionId, message: content, context: null }),
        signal: abortControllerRef.current.signal,
        cache: 'no-store',
      });

      console.log('📡 [Frontend] Response recebida:', {
        ok: response.ok,
        status: response.status,
        contentType: response.headers.get('Content-Type'),
        hasBody: !!response.body
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is null');
      }
      
      if (response.body.locked) {
        console.error('❌ [Frontend] Response body is locked');
        throw new Error('Response body is locked');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      let eventCount = 0;

      console.log('🔄 [Frontend] Iniciando loop de leitura SSE');

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            console.log('🏁 [Frontend] Reader done');
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          
          // Parse SSE frames: look for \n\n separators
          let frameEndIndex;
          while ((frameEndIndex = buffer.indexOf('\n\n')) >= 0) {
            const frame = buffer.slice(0, frameEndIndex);
            buffer = buffer.slice(frameEndIndex + 2);
            
            // Parse each line in the frame
            for (const line of frame.split('\n')) {
              if (line.startsWith('data:')) {
                const jsonData = line.slice(5).trim(); // Remove 'data:' prefix
                
                if (!jsonData) continue; // Skip empty data lines
                
                try {
                  const event = JSON.parse(jsonData);
                  eventCount++;
                  
                  console.log(`📨 [Frontend] Event ${eventCount}:`, {
                    type: event.type,
                    requestId: event.requestId,
                    textLength: event.text?.length || 0,
                    productsCount: event.products?.length || 0
                  });
                  
                  // Handle meta event - set requestId
                  if (event.type === 'meta') {
                    latestRequestIdRef.current = event.requestId;
                    
                    // Reset flags para novo request
                    haveProductsInThisRequestRef.current = false;
                    lastSeqByReqRef.current.set(event.requestId, 0);
                    
                    console.log(`🆔 [Frontend] RequestId set to: ${event.requestId}`);
                    continue;
                  }
                  
                  // Anti-race: Skip events from old requests
                  if (latestRequestIdRef.current && event.requestId !== latestRequestIdRef.current) {
                    console.log(`🚫 [Frontend] Skipping old requestId: ${event.requestId}`);
                    continue;
                  }
                  
                  // Handle delta streaming com dedupe
                  if (event.type === 'delta' && event.text) {
                    const currentRequestId = event.requestId;
                    const seq = event.seq;
                    
                    // Check if this is the latest request
                    if (currentRequestId && currentRequestId !== latestRequestIdRef.current) {
                      continue;
                    }
                    
                    // Dedupe por sequência
                    if (currentRequestId && seq) {
                      const lastSeq = lastSeqByReqRef.current.get(currentRequestId) ?? 0;
                      if (seq <= lastSeq) {
                        continue;
                      }
                      lastSeqByReqRef.current.set(currentRequestId, seq);
                    }
                    
                    accumulatedText += event.text;
                    
                    // Update message using functional setState
                    setMessages(prev => {
                      const messageId = streamingMessageIdRef.current;
                      if (!messageId) return prev;
                      
                      return prev.map(msg => 
                        msg.id === messageId 
                          ? { ...msg, content: accumulatedText }
                          : msg
                      );
                    });
                  }
                  
                  // Handle paragraph completion
                  if (event.type === 'paragraph_done') {
                    console.log(`📝 [Frontend] Paragraph done. Length: ${accumulatedText.length}`);
                  }
                  
                  // Handle products
                  if (event.type === 'products' && event.products) {
                    const currentRequestId = event.requestId;
                    
                    // Check if this is the latest request
                    if (currentRequestId && currentRequestId !== latestRequestIdRef.current) {
                      continue;
                    }
                    
                    // Marcar que recebemos products via SSE
                    haveProductsInThisRequestRef.current = true;
                    
                    setRecommended(event.products.slice(0, 3));
                    setFeed(event.products);
                    
                    // Update memory with products
                    await updateSessionMemory(event.products, event.query);
                  }
                  
                  // Handle completion
                  if (event.type === 'complete') {
                    console.log(`✅ [Frontend] Stream complete. Final text length: ${accumulatedText.length}`);
                    setIsStreaming(false);
                    
                    // Finalize streaming message
                    setMessages(prev => {
                      const messageId = streamingMessageIdRef.current;
                      if (!messageId) return prev;
                      
                      return prev.map(msg => 
                        msg.id === messageId 
                          ? { ...msg, content: accumulatedText, isStreaming: false }
                          : msg
                      );
                    });
                    
                    streamingMessageIdRef.current = null;
                    break;
                  }
                  
                } catch (parseError) {
                  console.warn('⚠️ [Frontend] JSON parse error:', parseError, 'Data:', jsonData.slice(0, 100));
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
        setIsStreaming(false);
        streamingMessageIdRef.current = null;
        console.log(`📊 [Frontend] Stream ended. Total events: ${eventCount}, Final text: ${accumulatedText.slice(0, 100)}...`);
      }
    },
    onSuccess: () => {
      // Don't invalidate queries while streaming to avoid interference
      if (!isStreaming) {
        queryClient.invalidateQueries({ queryKey: ['assistant', 'messages', sessionId] });
      }
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      setIsStreaming(false);
      // Remove the last two messages (user and assistant messages that failed)
      setMessages(prev => prev.slice(0, -2));
    }
  });

  // Cancel streaming
  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      // Clean up any streaming message
      setMessages(prev => prev.map(msg => 
        msg.isStreaming ? { ...msg, isStreaming: false } : msg
      ));
    }
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    if (sessionId) {
      queryClient.invalidateQueries({ queryKey: ['assistant', 'messages', sessionId] });
    }
  }, [sessionId, queryClient]);

  // Send message
  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || isStreaming || !sessionId) return;
    sendMessageMutation.mutate(content.trim());
  }, [sendMessageMutation, isStreaming, sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // Session
    session: sessionQuery.data,
    sessionId,
    sessionLoading: sessionQuery.isLoading,
    sessionError: sessionQuery.error,

    // Messages
    messages,
    messagesLoading: messagesQuery.isLoading,
    messagesError: messagesQuery.error,

    // Actions
    sendMessage,
    cancelStreaming,
    clearMessages,

    // State
    isStreaming,
    isSending: sendMessageMutation.isPending,
    sendError: sendMessageMutation.error,
    
    // Personalization
    personalizedGreeting,
    
    // Products
    recommended,
    feed,
    
    // 🧠 Memory & Focus Management
    sessionMemory,
    lastShownProducts,
    currentFocusProductId,
    updateSessionMemory,
    setProductFocus,
    
    // Ready state
    isReady: !!sessionId && !sessionQuery.isLoading,
  };
}