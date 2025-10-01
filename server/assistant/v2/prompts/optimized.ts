
import { ConversationMemory, EmotionalState, ProactiveInsight } from '../types-v2';

// 🎯 MELHORIA 2: Prompt simplificado (96 → 30 linhas)
export function buildSystemPrompt(memory: ConversationMemory, emotionalState?: EmotionalState, insights?: ProactiveInsight[]): string {
  const userProfile = memory.longTerm.userProfile;
  const recentContext = memory.shortTerm.currentContext;
  
  let prompt = `Você é um Vendedor Inteligente com IA Gemini.

## PAPEL
Ajudar clientes a encontrar produtos no Paraguai com inteligência emocional.

## CONTEXTO
Sessão: ${userProfile.engagement.totalSessions}
Estilo: ${userProfile.psychographics.communicationStyle.formality}`;

  if (recentContext) {
    prompt += `\nContexto: ${recentContext}`;
  }

  // 🎯 Adaptação emocional simplificada
  if (emotionalState && emotionalState.primary !== 'neutral') {
    const emotionGuide: Record<string, string> = {
      frustration: 'Seja empático e direto',
      confusion: 'Explique de forma simples',
      anxiety: 'Seja reassegurador',
      excitement: 'Compartilhe o entusiasmo',
      hesitant: 'Ajude na decisão',
      overwhelmed: 'Simplifique as opções',
      decisive: 'Seja eficiente'
    };
    prompt += `\nEmoção: ${emotionalState.primary} - ${emotionGuide[emotionalState.primary] || 'Tom positivo'}`;
  }

  // 🎯 Insights prioritários
  if (insights && insights.length > 0) {
    prompt += `\n\nInsights: ${insights.slice(0, 2).map(i => i.message).join('; ')}`;
  }

  prompt += `\n\n## DIRETRIZES
1. Respostas em português brasileiro
2. Seja natural e empático
3. Máximo 2-3 linhas por resposta
4. Use emojis com moderação
5. Confie nos produtos do sistema
6. Sugira produtos quando relevante

Responda de forma útil e concisa!`;

  return prompt;
}

export function buildSearchContext(memory: ConversationMemory): string {
  const preferences = memory.longTerm.preferences;
  const recentInteractions = memory.shortTerm.lastInteractions.slice(0, 3);
  
  let context = 'Contexto:\n';
  
  if (preferences.categories.length > 0) {
    context += `Categorias: ${preferences.categories.join(', ')}\n`;
  }
  
  if (preferences.brands.length > 0) {
    context += `Marcas: ${preferences.brands.join(', ')}\n`;
  }
  
  if (recentInteractions.length > 0) {
    const recentQueries = recentInteractions
      .filter(i => i.type === 'query')
      .map(i =>  i.content)
      .slice(0, 2);
    
    if (recentQueries.length > 0) {
      context += `Buscas: ${recentQueries.join(', ')}\n`;
    }
  }
  
  return context;
}

export function buildProactivePrompt(insights: ProactiveInsight[]): string {
  if (insights.length === 0) return '';
  
  const highPriorityInsights = insights
    .filter(i => i.priority >= 7)
    .slice(0, 2);
  
  if (highPriorityInsights.length === 0) return '';
  
  let prompt = '\n\nINSIGHTS:\n';
  highPriorityInsights.forEach(insight => {
    prompt += `- ${insight.message}\n`;
  });
  
  return prompt;
}
