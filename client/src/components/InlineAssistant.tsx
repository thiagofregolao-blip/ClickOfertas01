import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export interface InlineAssistantProps {
  isExpanded?: boolean;
  onToggle?: () => void;
  messages?: any[];
  onSendMessage?: (message: string) => void;
  isStreaming?: boolean;
  isSending?: boolean;
  recommendations?: any[];
  personalizedGreeting?: string;
}

export default function InlineAssistant({ 
  isExpanded = true,
  onToggle,
  messages = [],
  onSendMessage,
  isStreaming = false,
  isSending = false,
  recommendations = [],
  personalizedGreeting = ''
}: InlineAssistantProps) {
  const [input, setInput] = useState('');
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && onSendMessage) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  // Auto-scroll para última mensagem na conversa
  const scrollToBottom = () => {
    if (messagesScrollRef.current) {
      messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
    }
  };

  // Auto-scroll quando mensagens mudam ou durante streaming
  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, personalizedGreeting]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end lg:items-center lg:justify-center p-4" data-testid="assistant-container">
      <div className="w-full max-w-4xl bg-white rounded-t-2xl lg:rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
        {/* Header with Close Button */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white grid place-content-center text-sm font-semibold">C</div>
            <div>
              <div className="font-semibold text-gray-900">Click Pro Assistant</div>
              <div className="text-xs text-gray-500">Seu assistente de compras pessoal</div>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            data-testid="button-close-assistant"
            title="Fechar assistente"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 h-full p-4">
            {/* Chat Area */}
            <div className="col-span-12 lg:col-span-8 min-h-0 flex flex-col">
              <div className="rounded-2xl border bg-gray-50 p-4 flex-1 flex flex-col">
                {/* Messages Area */}
                <div ref={messagesScrollRef} className="flex-1 overflow-y-auto mb-4 space-y-3" data-testid="assistant-messages">
                  {/* Show personalized greeting if available */}
                  {personalizedGreeting && (
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">Click Assistant</div>
                      <div className="whitespace-pre-wrap">{personalizedGreeting}</div>
                    </div>
                  )}
                  
                  {/* Show messages from props */}
                  {messages.map((message, index) => (
                    <div key={message.id || index} className={`p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white ml-auto max-w-[80%]' 
                        : 'bg-white shadow-sm mr-auto max-w-[80%]'
                    }`}>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      {message.isStreaming && <div className="text-xs opacity-70 mt-1">Digitando...</div>}
                    </div>
                  ))}
                  
                  {/* Show streaming indicator */}
                  {isStreaming && (
                    <div className="bg-white p-3 rounded-lg shadow-sm mr-auto max-w-[80%]">
                      <div className="text-sm text-gray-600 mb-1">Click Assistant</div>
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-xs text-gray-500">Digitando...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 outline-none text-sm px-2 py-1"
                    disabled={isSending}
                  />
                  <button 
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-sm font-medium" 
                    type="submit"
                    disabled={isSending || !input.trim()}
                  >
                    {isSending ? 'Enviando...' : 'Enviar'}
                  </button>
                </form>
              </div>
            </div>

            {/* Recommendations Sidebar */}
            <div className="col-span-12 lg:col-span-4">
              <div className="rounded-2xl border bg-white p-4 shadow-sm h-full" data-testid="assistant-recommendations">
                <div className="text-sm font-semibold mb-3">Produtos Recomendados</div>
                {!recommendations?.length && (
                  <div className="text-xs text-gray-500">Procurando os melhores produtos para você…</div>
                )}
                <div className="space-y-3">
                  {recommendations.slice(0,3).map((p, index) => (
                    <div key={p.id || index} className="p-3 rounded-xl border hover:shadow-sm transition cursor-pointer">
                      <div className="font-medium truncate mb-1">{p.title}</div>
                      <div className="text-xs text-gray-500 mb-2">
                        {p.category || '—'} {p.score !== undefined ? `• score ${p.score}` : ''}
                      </div>
                      <div className="text-sm">
                        {p.price?.USD ? <>USD <b>{p.price.USD}</b></> : <span className="text-gray-400">sem preço</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}