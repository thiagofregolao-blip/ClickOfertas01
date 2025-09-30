
import React, { forwardRef } from 'react';
import { ChatMessage, VendorConfig } from '../types';
import { Send, Bot, User, Sparkles } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  streamingMessage?: string;
  isTyping?: boolean;
  onSendMessage: (message: string) => void;
  currentInput: string;
  onInputChange: (value: string) => void;
  config: VendorConfig;
}

export const ChatInterface = forwardRef<HTMLDivElement, ChatInterfaceProps>(({
  messages,
  streamingMessage,
  isTyping,
  onSendMessage,
  currentInput,
  onInputChange,
  config
}, ref) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentInput.trim()) {
      onSendMessage(currentInput.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getPersonalityColor = () => {
    switch (config.personality) {
      case 'professional': return 'text-blue-600 dark:text-blue-400';
      case 'casual': return 'text-green-600 dark:text-green-400';
      case 'expert': return 'text-purple-600 dark:text-purple-400';
      default: return 'text-primary dark:text-primary/80';
    }
  };

  const getPersonalityIcon = () => {
    switch (config.personality) {
      case 'professional': return <Bot className="h-4 w-4" />;
      case 'casual': return <Sparkles className="h-4 w-4" />;
      case 'expert': return <Bot className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Área de Mensagens */}
      <div 
        ref={ref}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
              
              {/* Avatar e Nome */}
              <div className={`flex items-center space-x-2 mb-1 ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}>
                {message.type === 'assistant' && (
                  <>
                    <div className={`w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center ${getPersonalityColor()}`}>
                      {getPersonalityIcon()}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Vendedor IA V2
                    </span>
                  </>
                )}
                {message.type === 'user' && (
                  <>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Você
                    </span>
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>
                  </>
                )}
              </div>

              {/* Mensagem */}
              <div className={`p-3 rounded-2xl ${
                message.type === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                
                {/* Metadata */}
                {message.metadata && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex flex-wrap gap-2 text-xs opacity-70">
                      {message.metadata.intent && (
                        <span className="bg-white/20 px-2 py-1 rounded">
                          {message.metadata.intent}
                        </span>
                      )}
                      {message.metadata.confidence && (
                        <span className="bg-white/20 px-2 py-1 rounded">
                          {Math.round(message.metadata.confidence * 100)}% confiança
                        </span>
                      )}
                      {message.metadata.category && (
                        <span className="bg-white/20 px-2 py-1 rounded">
                          {message.metadata.category}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div className={`text-xs text-gray-400 mt-1 ${
                message.type === 'user' ? 'text-right' : 'text-left'
              }`}>
                {message.timestamp.toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Mensagem em Streaming */}
        {(isTyping || streamingMessage) && (
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              <div className="flex items-center space-x-2 mb-1">
                <div className={`w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center ${getPersonalityColor()}`}>
                  {getPersonalityIcon()}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Vendedor IA V2
                </span>
              </div>
              
              <div className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                {isTyping && !streamingMessage ? (
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-xs text-primary">Pensando...</span>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">
                    {streamingMessage}
                    <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse"></span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input de Mensagem */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="flex-1 relative">
            <textarea
              value={currentInput}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-800 dark:text-white resize-none"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
              disabled={isTyping}
            />
            
            {/* Contador de caracteres */}
            {currentInput.length > 100 && (
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {currentInput.length}/500
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={!currentInput.trim() || isTyping}
            className="px-4 py-3 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
        
        {/* Dicas rápidas */}
        <div className="mt-2 flex flex-wrap gap-2">
          {['iPhone', 'Drone', 'Perfume', 'TV'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onSendMessage(`Estou procurando ${suggestion.toLowerCase()}`)}
              className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              disabled={isTyping}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';
