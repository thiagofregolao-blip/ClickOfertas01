import { FollowUpRule, FollowUpCondition, ConversationMemory } from '../types-v2';

export class FollowUpManager {
  private rules: FollowUpRule[] = [];
  
  constructor() {
    this.initializeRules();
  }

  private initializeRules(): void {
    this.rules = [
      {
        id: 'abandoned_search',
        name: 'Busca Abandonada',
        trigger: {
          conditions: [
            { field: 'lastInteraction.type', operator: 'equals', value: 'abandon', weight: 1.0 },
            { field: 'recentProducts.length', operator: 'greater', value: 0, weight: 0.5 }
          ],
          operator: 'AND'
        },
        timing: {
          delay: 5,
          window: 60,
          maxAttempts: 2
        },
        message: {
          template: 'Vi que você estava interessado em {product}. Ainda tem dúvidas? Posso te ajudar!',
          personalization: ['product', 'category']
        },
        priority: 8,
        active: true
      },
      {
        id: 'price_inquiry_followup',
        name: 'Follow-up de Preço',
        trigger: {
          conditions: [
            { field: 'lastInteraction.type', operator: 'equals', value: 'price_inquiry', weight: 1.0 },
            { field: 'emotionalState.primary', operator: 'equals', value: 'hesitant', weight: 0.7 }
          ],
          operator: 'AND'
        },
        timing: {
          delay: 10,
          window: 120,
          maxAttempts: 1
        },
        message: {
          template: 'Encontrei algumas opções com preços melhores para {category}. Quer ver?',
          personalization: ['category', 'priceRange']
        },
        priority: 9,
        active: true
      },
      {
        id: 'comparison_assistance',
        name: 'Ajuda na Comparação',
        trigger: {
          conditions: [
            { field: 'lastInteraction.type', operator: 'equals', value: 'comparison', weight: 1.0 },
            { field: 'recentProducts.length', operator: 'greater', value: 2, weight: 0.6 }
          ],
          operator: 'AND'
        },
        timing: {
          delay: 15,
          window: 180,
          maxAttempts: 1
        },
        message: {
          template: 'Vejo que você está comparando vários produtos. Posso te ajudar a encontrar o melhor custo-benefício?',
          personalization: ['products']
        },
        priority: 7,
        active: true
      },
      {
        id: 'purchase_intent_nudge',
        name: 'Incentivo à Compra',
        trigger: {
          conditions: [
            { field: 'emotionalState.primary', operator: 'equals', value: 'decisive', weight: 1.0 },
            { field: 'recentProducts.length', operator: 'greater', value: 0, weight: 0.8 }
          ],
          operator: 'AND'
        },
        timing: {
          delay: 5,
          window: 60,
          maxAttempts: 1
        },
        message: {
          template: 'Ótima escolha! Quer saber sobre formas de pagamento ou entrega?',
          personalization: ['product']
        },
        priority: 10,
        active: true
      },
      {
        id: 'overwhelmed_simplification',
        name: 'Simplificação para Usuário Sobrecarregado',
        trigger: {
          conditions: [
            { field: 'emotionalState.primary', operator: 'equals', value: 'overwhelmed', weight: 1.0 }
          ],
          operator: 'AND'
        },
        timing: {
          delay: 3,
          window: 30,
          maxAttempts: 1
        },
        message: {
          template: 'Vejo que tem muitas opções! Posso te mostrar apenas as 3 melhores para facilitar sua escolha?',
          personalization: []
        },
        priority: 9,
        active: true
      }
    ];
  }

  evaluateRules(memory: ConversationMemory): FollowUpRule[] {
    return this.rules
      .filter(rule => rule.active)
      .filter(rule => this.evaluateTrigger(rule, memory))
      .sort((a, b) => b.priority - a.priority);
  }

  private evaluateTrigger(rule: FollowUpRule, memory: ConversationMemory): boolean {
    const { conditions, operator } = rule.trigger;
    
    const results = conditions.map(condition => 
      this.evaluateCondition(condition, memory)
    );
    
    if (operator === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  private evaluateCondition(condition: FollowUpCondition, memory: ConversationMemory): boolean {
    const value = this.getFieldValue(condition.field, memory);
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return Array.isArray(value) && value.includes(condition.value);
      case 'greater':
        return typeof value === 'number' && value > condition.value;
      case 'less':
        return typeof value === 'number' && value < condition.value;
      case 'exists':
        return value !== undefined && value !== null;
      case 'not_exists':
        return value === undefined || value === null;
      default:
        return false;
    }
  }

  private getFieldValue(field: string, memory: ConversationMemory): any {
    const parts = field.split('.');
    let current: any = {
      lastInteraction: memory.shortTerm.lastInteractions[0],
      recentProducts: memory.shortTerm.recentProducts,
      emotionalState: memory.shortTerm.lastInteractions[0]?.sentiment,
      userProfile: memory.longTerm.userProfile
    };
    
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    
    return current;
  }

  generateMessage(rule: FollowUpRule, memory: ConversationMemory): string {
    let message = rule.message.template;
    
    rule.message.personalization.forEach(placeholder => {
      const value = this.getPersonalizationValue(placeholder, memory);
      message = message.replace(`{${placeholder}}`, value);
    });
    
    return message;
  }

  private getPersonalizationValue(placeholder: string, memory: ConversationMemory): string {
    switch (placeholder) {
      case 'product':
        return memory.shortTerm.recentProducts[0] || 'este produto';
      case 'category':
        return memory.shortTerm.currentContext || 'produtos';
      case 'priceRange':
        const range = memory.longTerm.preferences.priceRange;
        return `entre ${range.min} e ${range.max} guaranis`;
      case 'products':
        return memory.shortTerm.recentProducts.slice(0, 3).join(', ');
      default:
        return '';
    }
  }

  getActiveRules(): FollowUpRule[] {
    return this.rules.filter(r => r.active);
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.active = false;
    }
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.active = true;
    }
  }
}

export const followUpManager = new FollowUpManager();
