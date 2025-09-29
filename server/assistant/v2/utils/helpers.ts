import { ProactiveInsight, ConversationMemory, BehaviorPattern } from '../types-v2';

export function generateProactiveInsights(memory: ConversationMemory): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];
  const patterns = memory.longTerm.behaviorPatterns;
  const recentInteractions = memory.shortTerm.lastInteractions.slice(0, 10);
  
  if (patterns.find(p => p.pattern === 'repeated_search')) {
    insights.push({
      type: 'behavioral',
      insight: 'Usuário está repetindo buscas - pode estar indeciso',
      message: 'Notei que você está pesquisando bastante. Posso te ajudar a comparar opções e decidir?',
      confidence: 0.8,
      actionable: true,
      suggestedActions: ['offer_comparison', 'simplify_options', 'provide_recommendation'],
      priority: 8
    });
  }
  
  if (patterns.find(p => p.pattern === 'price_sensitive_abandonment')) {
    insights.push({
      type: 'behavioral',
      insight: 'Usuário abandona por preço - sensível a valores',
      message: 'Vi que você está de olho no preço. Posso te mostrar as melhores ofertas disponíveis?',
      confidence: 0.75,
      actionable: true,
      suggestedActions: ['show_best_deals', 'compare_prices', 'suggest_alternatives'],
      priority: 9
    });
  }
  
  const priceInquiries = recentInteractions.filter(i => 
    i.type === 'price_inquiry' || i.content.toLowerCase().includes('preço')
  );
  
  if (priceInquiries.length >= 2) {
    insights.push({
      type: 'contextual',
      insight: 'Múltiplas consultas de preço detectadas',
      message: 'Vejo que o preço é importante para você. Posso te ajudar a encontrar o melhor custo-benefício!',
      confidence: 0.85,
      actionable: true,
      suggestedActions: ['price_comparison', 'show_discounts'],
      priority: 8
    });
  }
  
  const timeOfDay = new Date().getHours();
  if (timeOfDay >= 9 && timeOfDay <= 18) {
    const sessionTime = memory.longTerm.userProfile.engagement.averageSessionDuration;
    if (sessionTime > 10) {
      insights.push({
        type: 'temporal',
        insight: 'Sessão longa durante horário comercial',
        message: 'Está com tempo para explorar! Posso te mostrar algumas novidades que acabaram de chegar?',
        confidence: 0.6,
        actionable: true,
        suggestedActions: ['show_new_arrivals', 'featured_products'],
        priority: 5
      });
    }
  }
  
  return insights.sort((a, b) => b.priority - a.priority);
}

export function summarizeContext(memory: ConversationMemory, maxLength: number = 500): string {
  const context = memory.shortTerm.currentContext;
  const recentProducts = memory.shortTerm.recentProducts.slice(0, 3);
  const lastInteraction = memory.shortTerm.lastInteractions[0];
  
  let summary = '';
  
  if (context) {
    summary += `Contexto: ${context}. `;
  }
  
  if (recentProducts.length > 0) {
    summary += `Produtos vistos: ${recentProducts.join(', ')}. `;
  }
  
  if (lastInteraction) {
    summary += `Última ação: ${lastInteraction.type} - ${lastInteraction.content}`;
  }
  
  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3) + '...';
  }
  
  return summary;
}

export function calculateEngagementScore(memory: ConversationMemory): number {
  const profile = memory.longTerm.userProfile.engagement;
  
  const sessionScore = Math.min(profile.totalSessions / 10, 1) * 0.3;
  const durationScore = Math.min(profile.averageSessionDuration / 20, 1) * 0.3;
  const purchaseScore = Math.min((profile.totalPurchases || 0) / 5, 1) * 0.4;
  
  return sessionScore + durationScore + purchaseScore;
}

export function extractIntent(message: string): string {
  const messageLower = message.toLowerCase();
  
  if (messageLower.match(/quanto|preço|custo|valor|custa/)) {
    return 'price_inquiry';
  }
  
  if (messageLower.match(/comprar|quero|vou levar|levo/)) {
    return 'purchase_intent';
  }
  
  if (messageLower.match(/comparar|diferença|melhor|versus|vs/)) {
    return 'comparison';
  }
  
  if (messageLower.match(/procuro|busco|preciso|quero ver|tem/)) {
    return 'search';
  }
  
  if (messageLower.match(/como|funciona|especificações|detalhes|características/)) {
    return 'information';
  }
  
  if (messageLower.match(/ajuda|dúvida|não entendi|explica/)) {
    return 'help';
  }
  
  return 'general';
}

export function formatProductRecommendation(product: any): string {
  return `📦 **${product.name}**
💰 ${product.price} Gs
⭐ ${product.rating || 'N/A'} | 📍 ${product.store}
${product.description ? `\n${product.description.substring(0, 100)}...` : ''}`;
}

export function shouldTriggerProactiveMessage(
  memory: ConversationMemory,
  currentTime: Date
): boolean {
  const lastInteraction = memory.shortTerm.lastInteractions[0];
  
  if (!lastInteraction) return false;
  
  const timeSinceLastInteraction = currentTime.getTime() - lastInteraction.timestamp.getTime();
  const minutesSince = timeSinceLastInteraction / (1000 * 60);
  
  if (minutesSince > 5 && minutesSince < 30) {
    return memory.shortTerm.recentProducts.length > 0;
  }
  
  return false;
}

export function mergeContexts(contexts: any[]): string {
  const uniqueContexts = new Set(contexts.map(c => 
    typeof c === 'string' ? c : JSON.stringify(c)
  ));
  
  return Array.from(uniqueContexts).join(' | ');
}
