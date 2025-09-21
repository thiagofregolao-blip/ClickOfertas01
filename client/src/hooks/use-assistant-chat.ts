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
        
        // Capture personalized greeting if provided
        if (data.greeting) {
          setPersonalizedGreeting(data.greeting);
        }
        
        setSessionId(session.id);
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

      // Send message to API with SSE streaming
      abortControllerRef.current = new AbortController();
      
      const response = await fetch('/api/assistant/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          sessionId,
          message: content,
          context: null
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle SSE streaming response
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // Keep the last line in buffer (might be incomplete)
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (!data) continue;

              try {
                const parsed = JSON.parse(data);
                
                if (parsed.type === 'start') {
                  // Streaming started
                  console.log('🚀 SSE streaming started');
                } else if (parsed.type === 'chunk' && parsed.text) {
                  // New text chunk
                  assistantContent += parsed.text;
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: assistantContent }
                      : msg
                  ));
                } else if (parsed.type === 'complete') {
                  // Streaming complete
                  console.log('✅ SSE streaming complete');
                  setIsStreaming(false);
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, isStreaming: false, content: assistantContent }
                      : msg
                  ));
                } else if (parsed.type === 'end') {
                  // Connection ended
                  break;
                } else if (parsed.type === 'error') {
                  // Error occurred
                  console.error('❌ SSE streaming error:', parsed.message);
                  throw new Error(parsed.message);
                }
              } catch (e) {
                // Ignore parsing errors for partial chunks
                console.warn('Failed to parse SSE data:', data);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
        setIsStreaming(false);
        // Ensure final message state is correct
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, isStreaming: false, content: assistantContent }
            : msg
        ));
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
    
    // Ready state
    isReady: !!sessionId && !sessionQuery.isLoading,
  };
}