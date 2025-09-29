import { ConversationMemory, UserProfile, BehaviorPattern, InteractionRecord, ContextStack, ContextFrame } from '../types-v2';

export class ConversationMemoryManager {
  private memory: Map<string, ConversationMemory> = new Map();
  private contextStacks: Map<string, ContextStack> = new Map();
  private maxMemorySize: number = 1000;
  
  initialize(maxSize: number) {
    this.maxMemorySize = maxSize;
  }

  initializeMemory(userId: string): ConversationMemory {
    const memory: ConversationMemory = {
      shortTerm: {
        currentContext: '',
        recentProducts: [],
        lastInteractions: [],
        sessionGoals: []
      },
      longTerm: {
        userProfile: this.createDefaultProfile(userId),
        preferences: {
          categories: [],
          brands: [],
          priceRange: { min: 0, max: 10000, flexibility: 0.3 },
          features: {},
          dealBreakers: [],
          mustHaves: []
        },
        behaviorPatterns: [],
        purchaseHistory: []
      }
    };
    
    this.memory.set(userId, memory);
    this.initializeContextStack(userId);
    return memory;
  }

  getMemory(userId: string): ConversationMemory {
    return this.memory.get(userId) || this.initializeMemory(userId);
  }

  updateCurrentContext(userId: string, context: string, type: 'product' | 'category' | 'comparison' | 'problem' | 'goal' = 'product'): void {
    const memory = this.getMemory(userId);
    memory.shortTerm.currentContext = context;
    
    this.pushContext(userId, {
      id: `${type}_${Date.now()}`,
      type,
      content: context,
      relevance: 1.0,
      timestamp: new Date(),
      relationships: []
    });
  }

  addInteraction(userId: string, interaction: InteractionRecord): void {
    const memory = this.getMemory(userId);
    memory.shortTerm.lastInteractions.unshift(interaction);
    
    if (memory.shortTerm.lastInteractions.length > 50) {
      memory.shortTerm.lastInteractions = memory.shortTerm.lastInteractions.slice(0, 50);
    }
    
    this.analyzeBehaviorPatterns(userId, interaction);
  }

  addRecentProduct(userId: string, productId: string): void {
    const memory = this.getMemory(userId);
    
    memory.shortTerm.recentProducts = memory.shortTerm.recentProducts.filter(id => id !== productId);
    memory.shortTerm.recentProducts.unshift(productId);
    
    if (memory.shortTerm.recentProducts.length > 20) {
      memory.shortTerm.recentProducts = memory.shortTerm.recentProducts.slice(0, 20);
    }
  }

  private initializeContextStack(userId: string): void {
    this.contextStacks.set(userId, {
      contexts: [],
      maxSize: 10,
      currentFocus: ''
    });
  }

  private pushContext(userId: string, context: ContextFrame): void {
    const stack = this.contextStacks.get(userId);
    if (!stack) return;
    
    stack.contexts.unshift(context);
    stack.currentFocus = context.id;
    
    if (stack.contexts.length > stack.maxSize) {
      stack.contexts = stack.contexts.slice(0, stack.maxSize);
    }
    
    this.updateContextRelevance(userId);
  }

  private updateContextRelevance(userId: string): void {
    const stack = this.contextStacks.get(userId);
    if (!stack) return;
    
    const now = new Date();
    stack.contexts.forEach((context, index) => {
      const ageMinutes = (now.getTime() - context.timestamp.getTime()) / (1000 * 60);
      const temporalDecay = Math.exp(-ageMinutes / 30);
      const positionalDecay = Math.exp(-index * 0.2);
      
      context.relevance = Math.min(context.relevance, temporalDecay * positionalDecay);
    });
    
    stack.contexts = stack.contexts.filter(c => c.relevance > 0.1);
  }

  getRelevantContexts(userId: string, limit: number = 5): ContextFrame[] {
    const stack = this.contextStacks.get(userId);
    if (!stack) return [];
    
    this.updateContextRelevance(userId);
    
    return stack.contexts
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  private analyzeBehaviorPatterns(userId: string, interaction: InteractionRecord): void {
    const memory = this.getMemory(userId);
    const recentInteractions = memory.shortTerm.lastInteractions.slice(0, 10);
    
    if (this.detectRepeatedSearch(recentInteractions)) {
      this.addBehaviorPattern(userId, {
        pattern: 'repeated_search',
        frequency: this.calculatePatternFrequency(userId, 'repeated_search'),
        context: [interaction.content],
        outcomes: ['indecision', 'need_guidance'],
        confidence: 0.8,
        lastObserved: new Date()
      });
    }
    
    if (this.detectPriceAbandonment(recentInteractions)) {
      this.addBehaviorPattern(userId, {
        pattern: 'price_sensitive_abandonment',
        frequency: this.calculatePatternFrequency(userId, 'price_sensitive_abandonment'),
        context: [interaction.content],
        outcomes: ['price_comparison_needed', 'discount_opportunity'],
        confidence: 0.7,
        lastObserved: new Date()
      });
    }
  }

  private detectRepeatedSearch(interactions: InteractionRecord[]): boolean {
    const searches = interactions.filter(i => i.type === 'query');
    if (searches.length < 3) return false;
    
    const searchTerms = searches.slice(0, 3).map(s => s.content.toLowerCase());
    const uniqueTerms = new Set(searchTerms);
    
    return uniqueTerms.size <= 2;
  }

  private detectPriceAbandonment(interactions: InteractionRecord[]): boolean {
    const hasProductView = interactions.some(i => i.type === 'click');
    const hasAbandonment = interactions.some(i => i.type === 'abandon');
    const hasPriceContext = interactions.some(i => 
      i.content.toLowerCase().includes('preço') || 
      i.content.toLowerCase().includes('caro') ||
      i.content.toLowerCase().includes('barato')
    );
    
    return hasProductView && hasAbandonment && hasPriceContext;
  }

  private addBehaviorPattern(userId: string, pattern: BehaviorPattern): void {
    const memory = this.getMemory(userId);
    
    const existingIndex = memory.longTerm.behaviorPatterns.findIndex(p => p.pattern === pattern.pattern);
    
    if (existingIndex >= 0) {
      memory.longTerm.behaviorPatterns[existingIndex] = {
        ...memory.longTerm.behaviorPatterns[existingIndex],
        frequency: pattern.frequency,
        lastObserved: pattern.lastObserved,
        confidence: Math.min(1.0, memory.longTerm.behaviorPatterns[existingIndex].confidence + 0.1)
      };
    } else {
      memory.longTerm.behaviorPatterns.push(pattern);
    }
  }

  private calculatePatternFrequency(userId: string, patternType: string): number {
    const memory = this.getMemory(userId);
    const existing = memory.longTerm.behaviorPatterns.find(p => p.pattern === patternType);
    return existing ? existing.frequency + 1 : 1;
  }

  private createDefaultProfile(userId: string): UserProfile {
    return {
      id: userId,
      demographics: {
        language: 'pt-BR'
      },
      psychographics: {
        personality: {
          openness: 0.5,
          conscientiousness: 0.5,
          extraversion: 0.5,
          agreeableness: 0.5,
          neuroticism: 0.5
        },
        communicationStyle: {
          formality: 'casual',
          verbosity: 'adaptive',
          emotionalExpression: 'medium',
          questioningStyle: 'exploratory'
        },
        decisionMakingStyle: {
          speed: 'deliberate',
          riskTolerance: 'medium',
          informationNeed: 'moderate',
          socialInfluence: 'medium'
        }
      },
      engagement: {
        totalSessions: 1,
        averageSessionDuration: 0,
        preferredChannels: ['chat'],
        responsePatterns: [],
        totalPurchases: 0
      }
    };
  }

  cleanup(): void {
    const now = new Date();
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    
    for (const [userId, memory] of this.memory.entries()) {
      memory.shortTerm.lastInteractions = memory.shortTerm.lastInteractions.filter(
        interaction => (now.getTime() - interaction.timestamp.getTime()) < maxAge
      );
      
      memory.longTerm.behaviorPatterns = memory.longTerm.behaviorPatterns.filter(
        pattern => pattern.confidence > 0.3 && 
                  (now.getTime() - pattern.lastObserved.getTime()) < maxAge
      );
    }
  }

  updateBehaviorPatterns(userId: string, data: any): void {
    const memory = this.getMemory(userId);
    this.addBehaviorPattern(userId, {
      pattern: data.pattern,
      frequency: data.frequency,
      context: [],
      outcomes: [],
      confidence: data.confidence || 0.8,
      lastObserved: data.lastOccurrence || new Date()
    });
  }

  getActiveUsers(): string[] {
    return Array.from(this.memory.keys());
  }

  clearMemory(userId: string): void {
    this.memory.delete(userId);
    this.contextStacks.delete(userId);
  }
}

export const memoryManager = new ConversationMemoryManager();
