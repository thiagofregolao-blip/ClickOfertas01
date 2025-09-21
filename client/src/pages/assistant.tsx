import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAssistantChat } from '@/hooks/use-assistant-chat';
import ProductSpotlight from '@/components/assistant/ProductSpotlight';
import { 
  MessageCircle, 
  Sparkles, 
  Calculator, 
  MapPin, 
  Send, 
  Bot, 
  User,
  TrendingUp,
  Heart,
  ShoppingCart,
  Plane,
  Loader2
} from 'lucide-react';


export default function Assistant() {
  const [inputMessage, setInputMessage] = useState('');
  
  // Use the assistant chat hook for message management
  const {
    messages,
    sendMessage: sendChatMessage,
    isStreaming,
    isSending,
    sessionId,
    sessionLoading
  } = useAssistantChat({ autoCreateSession: true });

  // Chat context for product recommendations
  const chatContext = messages.map(msg => msg.content);

  // Handle product selection from spotlight
  const handleProductSelect = (product: any) => {
    // Send a message about the selected product to continue the conversation
    const productMessage = `Estou interessado no produto: ${product.name} por ${product.price}. Pode me dar mais informações?`;
    setInputMessage(productMessage);
    // The user can then send the message manually, or we could auto-send it
  };

  // Handle adding products to favorites
  const handleAddToFavorites = (productId: string) => {
    console.log('Adding product to favorites:', productId);
    // TODO: Implement favorites functionality
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isSending || isStreaming) return;
    
    sendChatMessage(inputMessage);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Click Pro Assistant
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Seu assistente de compras inteligente
              </p>
            </div>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-160px)]">
          
          {/* Chat Panel - Left Column */}
          <div className="lg:col-span-5">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Conversa
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 h-0 pr-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            message.role === 'user'
                              ? 'bg-blue-500 text-white ml-auto'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                          <p className="text-xs opacity-60 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        {message.role === 'user' && (
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                    {(isSending || isStreaming) && (
                      <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          {isStreaming ? (
                            <Loader2 className="h-4 w-4 text-white animate-spin" />
                          ) : (
                            <Bot className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2">
                          {isStreaming ? (
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              Digitando...
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                
                <Separator className="my-4" />
                
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    className="flex-1"
                    disabled={isSending || isStreaming || sessionLoading}
                    data-testid="input-message"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!inputMessage.trim() || isSending || isStreaming || sessionLoading}
                    data-testid="button-send"
                  >
                    {(isSending || isStreaming) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Spotlight - Middle Column */}
          <div className="lg:col-span-4">
            <ProductSpotlight
              sessionId={sessionId}
              chatContext={chatContext}
              onProductSelect={handleProductSelect}
              onAddToFavorites={handleAddToFavorites}
            />
          </div>

          {/* Actions Panel - Right Column */}
          <div className="lg:col-span-3">
            <div className="space-y-4 h-full">
              
              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calculator className="h-4 w-4" />
                    Ações Rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 h-auto py-3"
                    data-testid="button-savings-calc"
                  >
                    <Calculator className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium">Calculadora de Economia</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Compare preços Brasil vs Paraguai
                      </div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 h-auto py-3"
                    data-testid="button-trip-planner"
                  >
                    <MapPin className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium">Planejador de Viagem</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Organize sua rota de compras
                      </div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 h-auto py-3"
                    data-testid="button-flight-tracker"
                  >
                    <Plane className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium">Rastreador de Voos</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Encontre os melhores preços
                      </div>
                    </div>
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Estatísticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Produtos salvos</span>
                    <Badge variant="secondary">12</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Economia este mês</span>
                    <Badge variant="secondary" className="text-green-600">R$ 450</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Viagens planejadas</span>
                    <Badge variant="secondary">3</Badge>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}