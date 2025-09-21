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
      }
      
      return null;
    },
    enabled: autoCreateSession || !!sessionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Load session with messages
  const messagesQuery = useQuery({
    queryKey: ['assistant', 'messages', sessionId],
    queryFn: async () => {
      if (!sessionId) return { messages: [] };
      const response = await fetch(`/api/assistant/sessions/${sessionId}`);
      const data = await response.json();
      // Return the session data which includes messages array
      return data;
    },
    enabled: !!sessionId,
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

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!sessionId) throw new Error('No active session');

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
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsStreaming(true);

      // PATCH A: Stream compatível com POST /api/assistant/stream
      abortControllerRef.current = new AbortController();
      
      const response = await fetch('/api/assistant/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ sessionId, message: content, context: null }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) throw new Error('Falha no streaming');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // eventos SSE chegam como linhas "data: {...}\n\n"
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const chunk of parts) {
            const line = chunk.trim().replace(/^data:\s?/, '');
            try {
              const payload = JSON.parse(line);
              if (payload.type === 'chunk' && payload.text) {
                full += payload.text;
                // atualize a última mensagem do assistente na UI aqui
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last?.role === 'assistant') {
                    copy[copy.length - 1] = { ...last, content: (last.content || '') + payload.text };
                  }
                  return copy;
                });
              }
              if (payload.type === 'complete') {
                setIsStreaming(false);
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, isStreaming: false }
                    : msg
                ));
              }
            } catch {}
          }
        }
      } finally {
        reader.releaseLock();
        setIsStreaming(false);
      }
    },
    onSuccess: () => {
      // Invalidate messages to get the final server state
      queryClient.invalidateQueries({ queryKey: ['assistant', 'messages', sessionId] });
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
    
    // Ready state
    isReady: !!sessionId && !sessionQuery.isLoading,
  };
}