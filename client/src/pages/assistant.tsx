import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
  Plane
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
  category: string;
  storeName: string;
}

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [spotlightProducts, setSpotlightProducts] = useState<Product[]>([]);

  // Initialize assistant session on page load
  useEffect(() => {
    initializeSession();
    loadSpotlightProducts();
  }, []);

  const initializeSession = async () => {
    try {
      const response = await fetch('/api/assistant/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'shopping_assistance',
          context: { source: 'assistant_page' }
        }),
      });

      if (response.ok) {
        const { session } = await response.json();
        setSessionId(session.id);
        
        // Add welcome message
        const welcomeMessage: Message = {
          id: 'welcome',
          role: 'assistant',
          content: 'Olá! 👋 Sou o Click Pro Assistant, seu assistente de compras inteligente. Como posso ajudar você hoje?',
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  };

  const loadSpotlightProducts = async () => {
    try {
      const response = await fetch('/api/assistant/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '',
          context: { type: 'spotlight' }
        }),
      });

      if (response.ok) {
        const { recommendations } = await response.json();
        setSpotlightProducts([...recommendations.popularPicks, ...recommendations.searchResults]);
      }
    } catch (error) {
      console.error('Error loading spotlight products:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: inputMessage,
          context: { timestamp: new Date().toISOString() }
        }),
      });

      if (response.ok) {
        const { reply } = await response.json();
        const assistantMessage: Message = {
          id: Date.now().toString() + '_assistant',
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now().toString() + '_error',
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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
                    {isLoading && (
                      <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
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
                    disabled={isLoading}
                    data-testid="input-message"
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!inputMessage.trim() || isLoading}
                    data-testid="button-send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Spotlight - Middle Column */}
          <div className="lg:col-span-4">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Produtos em Destaque
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-4">
                    {spotlightProducts.map((product) => (
                      <div
                        key={product.id}
                        className="group p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
                        data-testid={`card-product-${product.id}`}
                      >
                        <div className="flex gap-3">
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex-shrink-0 overflow-hidden">
                            {product.imageUrl ? (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingCart className="h-6 w-6 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-slate-900 dark:text-white line-clamp-2">
                              {product.name}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {product.storeName}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {product.category}
                              </Badge>
                              <span className="font-semibold text-green-600 dark:text-green-400 text-sm">
                                {product.price}
                              </span>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Heart className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
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