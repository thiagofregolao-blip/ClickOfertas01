import { EmotionalState, EmotionType, InteractionRecord } from '../types-v2';

export class EmotionalAnalyzer {
  private emotionKeywords: Record<EmotionType, string[]> = {
    joy: ['feliz', 'ótimo', 'excelente', 'maravilhoso', 'perfeito', 'adorei'],
    excitement: ['animado', 'ansioso', 'mal posso esperar', 'que legal', 'incrível'],
    satisfaction: ['satisfeito', 'contente', 'bom', 'adequado', 'atende'],
    curiosity: ['interessante', 'curioso', 'quero saber', 'como funciona', 'me explica'],
    interest: ['legal', 'bacana', 'quero ver', 'mostre', 'gostei'],
    frustration: ['frustrado', 'irritado', 'chato', 'difícil', 'complicado', 'não consigo'],
    confusion: ['confuso', 'não entendi', 'como assim', 'explica melhor', 'não sei'],
    disappointment: ['decepcionado', 'esperava mais', 'não é isso', 'ruim', 'fraco'],
    anxiety: ['preocupado', 'nervoso', 'inseguro', 'será que', 'tenho medo'],
    impatience: ['demorado', 'rápido', 'urgente', 'logo', 'já'],
    neutral: ['ok', 'entendi', 'certo', 'sim', 'não'],
    contemplative: ['pensando', 'analisando', 'vendo', 'comparando', 'avaliando'],
    decisive: ['quero', 'vou levar', 'compro', 'decidi', 'é esse'],
    hesitant: ['não sei', 'talvez', 'será', 'ainda não decidi', 'em dúvida'],
    overwhelmed: ['muita coisa', 'confuso', 'não sei por onde começar', 'complicado demais']
  };

  analyzeEmotion(message: string, context?: any): EmotionalState {
    const messageLower = message.toLowerCase();
    const emotions: { emotion: EmotionType; score: number }[] = [];
    
    for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
      const matchCount = keywords.filter(kw => messageLower.includes(kw)).length;
      if (matchCount > 0) {
        emotions.push({
          emotion: emotion as EmotionType,
          score: matchCount
        });
      }
    }
    
    if (emotions.length === 0) {
      return this.neutralState();
    }
    
    emotions.sort((a, b) => b.score - a.score);
    const primaryEmotion = emotions[0];
    
    const intensity = this.calculateIntensity(message, primaryEmotion.emotion);
    const confidence = this.calculateConfidence(emotions);
    const triggers = this.identifyTriggers(message, primaryEmotion.emotion);
    
    return {
      primary: primaryEmotion.emotion,
      intensity,
      confidence,
      triggers,
      context: context || 'general conversation'
    };
  }

  private calculateIntensity(message: string, emotion: EmotionType): number {
    const intensifiers = ['muito', 'demais', 'extremamente', 'super', 'totalmente', '!!', '!!!'];
    const messageLower = message.toLowerCase();
    
    let intensity = 0.5;
    
    intensifiers.forEach(intensifier => {
      if (messageLower.includes(intensifier)) {
        intensity += 0.2;
      }
    });
    
    const exclamationCount = (message.match(/!/g) || []).length;
    intensity += Math.min(exclamationCount * 0.1, 0.3);
    
    const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;
    if (capsRatio > 0.3) {
      intensity += 0.2;
    }
    
    return Math.min(intensity, 1.0);
  }

  private calculateConfidence(emotions: { emotion: EmotionType; score: number }[]): number {
    if (emotions.length === 0) return 0.3;
    if (emotions.length === 1) return 0.9;
    
    const topScore = emotions[0].score;
    const secondScore = emotions[1]?.score || 0;
    
    const dominanceRatio = topScore / (topScore + secondScore);
    return 0.5 + (dominanceRatio * 0.4);
  }

  private identifyTriggers(message: string, emotion: EmotionType): string[] {
    const triggers: string[] = [];
    const messageLower = message.toLowerCase();
    
    const commonTriggers: Record<string, string[]> = {
      price: ['preço', 'caro', 'barato', 'custo', 'valor', 'guarani', 'r$'],
      quality: ['qualidade', 'bom', 'ruim', 'melhor', 'pior'],
      availability: ['disponível', 'estoque', 'tem', 'falta'],
      comparison: ['comparar', 'diferença', 'versus', 'vs', 'melhor que'],
      urgency: ['urgente', 'rápido', 'agora', 'hoje', 'já'],
      information: ['informação', 'detalhes', 'especificações', 'características']
    };
    
    for (const [trigger, keywords] of Object.entries(commonTriggers)) {
      if (keywords.some(kw => messageLower.includes(kw))) {
        triggers.push(trigger);
      }
    }
    
    return triggers;
  }

  private neutralState(): EmotionalState {
    return {
      primary: 'neutral',
      intensity: 0.3,
      confidence: 0.5,
      triggers: [],
      context: 'neutral interaction'
    };
  }

  suggestResponse(emotionalState: EmotionalState): string {
    const { primary, intensity } = emotionalState;
    
    const responseStrategies: Record<EmotionType, string[]> = {
      joy: [
        'Que ótimo! Fico feliz em ajudar! 😊',
        'Maravilha! Vamos encontrar mais opções incríveis para você!'
      ],
      excitement: [
        'Sua empolgação é contagiante! Vou te mostrar opções que vão te surpreender!',
        'Que legal! Vamos explorar juntos!'
      ],
      frustration: [
        'Entendo sua frustração. Vou simplificar as coisas para você.',
        'Vamos resolver isso juntos. Posso te ajudar de forma mais direta?'
      ],
      confusion: [
        'Deixa eu explicar melhor! Vou ser mais claro.',
        'Sem problemas! Vou te guiar passo a passo.'
      ],
      anxiety: [
        'Fica tranquilo! Estou aqui para te ajudar a fazer a melhor escolha.',
        'Vamos com calma. Posso te mostrar as opções mais confiáveis.'
      ],
      impatience: [
        'Vou direto ao ponto! Aqui estão as melhores opções:',
        'Entendo que você precisa de rapidez. Vamos lá:'
      ],
      hesitant: [
        'Sem pressa! Posso te ajudar a comparar as opções?',
        'Vamos analisar juntos para você decidir com mais segurança.'
      ],
      decisive: [
        'Perfeito! Você sabe o que quer. Vou te mostrar as melhores opções!',
        'Gostei da sua decisão! Vamos finalizar isso!'
      ],
      overwhelmed: [
        'Vamos simplificar! Vou te mostrar apenas o essencial.',
        'Sem problemas! Vou te guiar passo a passo para facilitar.'
      ],
      satisfaction: ['Ótimo! Continue me contando o que procura.'],
      curiosity: ['Que bom que você quer saber mais! Vou te explicar:'],
      interest: ['Legal! Vou te mostrar mais sobre isso.'],
      disappointment: ['Entendo. Vamos encontrar algo melhor para você.'],
      neutral: ['Entendi! Como posso te ajudar?'],
      contemplative: ['Ótimo! Estou aqui para ajudar na sua análise.']
    };
    
    const strategies = responseStrategies[primary] || responseStrategies.neutral;
    const index = intensity > 0.7 ? 0 : Math.floor(Math.random() * strategies.length);
    
    return strategies[index];
  }

  trackEmotionalJourney(userId: string, interactions: InteractionRecord[]): EmotionalState[] {
    return interactions
      .filter(i => i.sentiment)
      .map(i => i.sentiment!)
      .slice(0, 10);
  }

  detectEmotionalShift(previous: EmotionalState, current: EmotionalState): boolean {
    const positiveEmotions: EmotionType[] = ['joy', 'excitement', 'satisfaction', 'curiosity', 'interest', 'decisive'];
    const negativeEmotions: EmotionType[] = ['frustration', 'confusion', 'disappointment', 'anxiety', 'overwhelmed'];
    
    const wasPositive = positiveEmotions.includes(previous.primary);
    const isNegative = negativeEmotions.includes(current.primary);
    
    const wasNegative = negativeEmotions.includes(previous.primary);
    const isPositive = positiveEmotions.includes(current.primary);
    
    return (wasPositive && isNegative) || (wasNegative && isPositive);
  }
}

export const emotionalAnalyzer = new EmotionalAnalyzer();
