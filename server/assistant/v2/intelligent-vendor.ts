import { GoogleGenerativeAI } from '@google/generative-ai';
import { memoryManager } from './core/memory';
import { emotionalAnalyzer } from './intelligence/emotional';
import { followUpManager } from './intelligence/followup';
import { buildSystemPrompt, buildSearchContext } from './prompts/optimized';
import { generateProactiveInsights, extractIntent } from './utils/helpers';
import { 
  IntelligentVendorResponse, 
  InteractionRecord, 
  EmotionalState,
  ProactiveInsight 
} from './types-v2';

export class IntelligentVendor {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private conversationHistories: Map<string, any[]> = new Map();

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY not found');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      }
    });

    memoryManager.initialize(1000);
  }

  async processMessage(userId: string, message: string, storeId?: number): Promise<IntelligentVendorResponse> {
    const startTime = Date.now();
    
    try {
      const memory = memoryManager.getMemory(userId);
      const emotionalState = emotionalAnalyzer.analyzeEmotion(message);
      const intent = extractIntent(message);
      const insights = generateProactiveInsights(memory);
      
      const interaction: InteractionRecord = {
        timestamp: new Date(),
        type: this.mapIntentToInteractionType(intent),
        content: message,
        context: { storeId },
        sentiment: emotionalState,
        userId
      };
      
      memoryManager.addInteraction(userId, interaction);
      memoryManager.updateCurrentContext(userId, message, this.inferContextType(intent));
      
      const systemPrompt = buildSystemPrompt(memory, emotionalState, insights);
      const searchContext = buildSearchContext(memory);
      
      let conversationHistory = this.conversationHistories.get(userId) || [];
      if (conversationHistory.length === 0) {
        conversationHistory.push({
          role: 'user',
          parts: [{ text: systemPrompt }]
        });
        conversationHistory.push({
          role: 'model',
          parts: [{ text: 'Entendido! Estou pronto para ajudar com inteligência emocional e memória conversacional. Como posso te ajudar hoje?' }]
        });
      }
      
      conversationHistory.push({
        role: 'user',
        parts: [{ text: `${searchContext}\n\nMensagem do cliente: ${message}` }]
      });
      
      if (conversationHistory.length > 20) {
        conversationHistory = [conversationHistory[0], conversationHistory[1], ...conversationHistory.slice(-18)];
      }
      
      const chat = this.model.startChat({
        history: conversationHistory.slice(0, -1)
      });
      
      const result = await chat.sendMessage(conversationHistory[conversationHistory.length - 1].parts[0].text);
      const responseText = result.response.text();
      
      conversationHistory.push({
        role: 'model',
        parts: [{ text: responseText }]
      });
      
      this.conversationHistories.set(userId, conversationHistory);
      
      const followUpRules = followUpManager.evaluateRules(memory);
      const followUpSuggestions = followUpRules.slice(0, 2).map(rule => 
        followUpManager.generateMessage(rule, memory)
      );
      
      const highPriorityInsights = insights.filter(i => i.priority >= 8).slice(0, 2);
      
      const processingTime = Date.now() - startTime;
      
      const response: IntelligentVendorResponse = {
        id: `msg_${Date.now()}_${userId}`,
        userId,
        content: responseText,
        timestamp: new Date(),
        metadata: {
          intent: { type: intent, confidence: 0.8 },
          emotionalState,
          proactiveInsights: highPriorityInsights,
          processingTime,
          confidence: 0.85
        },
        suggestions: this.extractSuggestions(responseText),
        recommendedProducts: [],
        followUpSuggestions
      };
      
      return response;
      
    } catch (error) {
      console.error('❌ Erro no IntelligentVendor:', error);
      
      return {
        id: `error_${Date.now()}`,
        userId,
        content: 'Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente?',
        timestamp: new Date(),
        metadata: {
          processingTime: Date.now() - startTime,
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestions: [],
        recommendedProducts: [],
        followUpSuggestions: []
      };
    }
  }

  async *streamMessage(userId: string, message: string, storeId?: number): AsyncGenerator<string, void, unknown> {
    try {
      const memory = memoryManager.getMemory(userId);
      const emotionalState = emotionalAnalyzer.analyzeEmotion(message);
      const intent = extractIntent(message);
      const insights = generateProactiveInsights(memory);
      
      const interaction: InteractionRecord = {
        timestamp: new Date(),
        type: this.mapIntentToInteractionType(intent),
        content: message,
        context: { storeId },
        sentiment: emotionalState,
        userId
      };
      
      memoryManager.addInteraction(userId, interaction);
      memoryManager.updateCurrentContext(userId, message, this.inferContextType(intent));
      
      const systemPrompt = buildSystemPrompt(memory, emotionalState, insights);
      const searchContext = buildSearchContext(memory);
      
      let conversationHistory = this.conversationHistories.get(userId) || [];
      if (conversationHistory.length === 0) {
        conversationHistory.push({
          role: 'user',
          parts: [{ text: systemPrompt }]
        });
        conversationHistory.push({
          role: 'model',
          parts: [{ text: 'Entendido! Como posso ajudar?' }]
        });
      }
      
      conversationHistory.push({
        role: 'user',
        parts: [{ text: `${searchContext}\n\nMensagem: ${message}` }]
      });
      
      const chat = this.model.startChat({
        history: conversationHistory.slice(0, -1)
      });
      
      const result = await chat.sendMessageStream(conversationHistory[conversationHistory.length - 1].parts[0].text);
      
      let fullResponse = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        yield chunkText;
      }
      
      conversationHistory.push({
        role: 'model',
        parts: [{ text: fullResponse }]
      });
      
      if (conversationHistory.length > 20) {
        conversationHistory = [conversationHistory[0], conversationHistory[1], ...conversationHistory.slice(-18)];
      }
      
      this.conversationHistories.set(userId, conversationHistory);
      
      const metadata = {
        emotionalState,
        intent,
        insights: insights.filter(i => i.priority >= 8).slice(0, 2)
      };
      
      yield `\n\n__METADATA__${JSON.stringify(metadata)}`;
      
    } catch (error) {
      console.error('❌ Erro no streaming:', error);
      yield 'Desculpe, ocorreu um erro. Pode tentar novamente?';
    }
  }

  private mapIntentToInteractionType(intent: string): InteractionRecord['type'] {
    const mapping: Record<string, InteractionRecord['type']> = {
      price_inquiry: 'price_inquiry',
      purchase_intent: 'purchase_intent',
      comparison: 'comparison',
      search: 'query',
      information: 'message',
      help: 'message',
      general: 'message'
    };
    
    return mapping[intent] || 'message';
  }

  private inferContextType(intent: string): 'product' | 'category' | 'comparison' | 'problem' | 'goal' {
    if (intent === 'comparison') return 'comparison';
    if (intent === 'purchase_intent') return 'product';
    if (intent === 'help') return 'problem';
    if (intent === 'search') return 'category';
    return 'goal';
  }

  private extractSuggestions(responseText: string): string[] {
    const suggestions: string[] = [];
    
    const bullets = responseText.match(/[•\-*]\s*(.+)/g);
    if (bullets) {
      suggestions.push(...bullets.slice(0, 3).map(b => b.replace(/[•\-*]\s*/, '').trim()));
    }
    
    const questions = responseText.match(/\?/g);
    if (questions && questions.length > 0) {
      const questionMatch = responseText.match(/([^.!?]+\?)/);
      if (questionMatch) {
        suggestions.push(questionMatch[1].trim());
      }
    }
    
    return suggestions.slice(0, 3);
  }

  clearUserHistory(userId: string): void {
    this.conversationHistories.delete(userId);
    memoryManager.clearMemory(userId);
  }

  getUserMemory(userId: string) {
    return memoryManager.getMemory(userId);
  }

  getEmotionalState(message: string) {
    return emotionalAnalyzer.analyzeEmotion(message);
  }
}

export const intelligentVendor = new IntelligentVendor();
