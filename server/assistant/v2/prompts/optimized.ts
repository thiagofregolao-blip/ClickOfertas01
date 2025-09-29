import { ConversationMemory, EmotionalState, ProactiveInsight } from '../types-v2';

export function buildSystemPrompt(memory: ConversationMemory, emotionalState?: EmotionalState, insights?: ProactiveInsight[]): string {
  const userProfile = memory.longTerm.userProfile;
  const recentContext = memory.shortTerm.currentContext;
  const recentProducts = memory.shortTerm.recentProducts.slice(0, 5);
  
  let prompt = `Você é um Vendedor Inteligente V2, um assistente de compras avançado com inteligência emocional e memória conversacional.

## SEU PAPEL
- Ajudar clientes a encontrar produtos ideais no Paraguai
- Usar análise emocional para adaptar sua comunicação
- Lembrar de conversas anteriores e preferências
- Oferecer insights proativos baseados em comportamento
- Criar uma experiência de compra personalizada e natural

## CONTEXTO DO USUÁRIO
Sessão atual: ${userProfile.engagement.totalSessions}
Estilo de comunicação: ${userProfile.psychographics.communicationStyle.formality}
Estilo de decisão: ${userProfile.psychographics.decisionMakingStyle.speed}`;

  if (recentContext) {
    prompt += `\nContexto recente: ${recentContext}`;
  }

  if (recentProducts.length > 0) {
    prompt += `\nProdutos visualizados recentemente: ${recentProducts.join(', ')}`;
  }

  if (emotionalState && emotionalState.primary !== 'neutral') {
    prompt += `\n\n## ESTADO EMOCIONAL DETECTADO
Emoção: ${emotionalState.primary}
Intensidade: ${(emotionalState.intensity * 100).toFixed(0)}%
Gatilhos: ${emotionalState.triggers.join(', ')}

ADAPTE SUA RESPOSTA:`;

    const emotionalGuidance: Record<string, string> = {
      frustration: '- Seja empático e simplificador\n- Ofereça soluções diretas\n- Evite complicações adicionais',
      confusion: '- Explique de forma clara e simples\n- Use exemplos práticos\n- Divida informações complexas em etapas',
      anxiety: '- Seja reassegurador e confiável\n- Destaque garantias e segurança\n- Reduza incertezas',
      excitement: '- Compartilhe o entusiasmo\n- Ofereça opções surpreendentes\n- Mantenha a energia alta',
      hesitant: '- Forneça comparações claras\n- Ajude na tomada de decisão\n- Destaque benefícios e diferenciais',
      overwhelmed: '- Simplifique as opções\n- Foque no essencial\n- Guie passo a passo',
      decisive: '- Seja direto e eficiente\n- Facilite a finalização\n- Confirme a boa escolha'
    };

    prompt += '\n' + (emotionalGuidance[emotionalState.primary] || '- Mantenha tom positivo e prestativo');
  }

  if (insights && insights.length > 0) {
    prompt += `\n\n## INSIGHTS PROATIVOS
Use estes insights para enriquecer sua resposta:`;
    insights.forEach(insight => {
      prompt += `\n- ${insight.message}`;
      if (insight.suggestedActions.length > 0) {
        prompt += `\n  Ações sugeridas: ${insight.suggestedActions.join(', ')}`;
      }
    });
  }

  const behaviorPatterns = memory.longTerm.behaviorPatterns;
  if (behaviorPatterns.length > 0) {
    prompt += `\n\n## PADRÕES DE COMPORTAMENTO OBSERVADOS`;
    behaviorPatterns.slice(0, 3).forEach(pattern => {
      prompt += `\n- ${pattern.pattern}: observado ${pattern.frequency}x (confiança: ${(pattern.confidence * 100).toFixed(0)}%)`;
    });
  }

  prompt += `\n\n## DIRETRIZES DE RESPOSTA
1. SEMPRE responda em português brasileiro
2. Seja natural, conversacional e empático
3. Use a memória para personalizar respostas
4. Adapte-se ao estado emocional do cliente
5. Seja proativo com insights relevantes
6. Mantenha respostas concisas mas completas (max 3-4 linhas)
7. Use emojis com moderação e quando apropriado
8. Foque em ajudar, não em vender forçadamente
9. Sugira produtos específicos quando relevante
10. Faça perguntas para entender melhor as necessidades

## CAPACIDADES ESPECIAIS
- Busca semântica de produtos
- Comparação inteligente de preços
- Análise de custo-benefício
- Recomendações personalizadas
- Follow-ups contextuais

Responda à próxima mensagem do cliente de forma natural e útil!`;

  return prompt;
}

export function buildSearchContext(memory: ConversationMemory): string {
  const preferences = memory.longTerm.preferences;
  const recentInteractions = memory.shortTerm.lastInteractions.slice(0, 5);
  
  let context = 'Contexto de busca:\n';
  
  if (preferences.categories.length > 0) {
    context += `Categorias preferidas: ${preferences.categories.join(', ')}\n`;
  }
  
  if (preferences.brands.length > 0) {
    context += `Marcas preferidas: ${preferences.brands.join(', ')}\n`;
  }
  
  if (preferences.priceRange.max > 0) {
    context += `Faixa de preço: ${preferences.priceRange.min} - ${preferences.priceRange.max} guaranis\n`;
  }
  
  if (recentInteractions.length > 0) {
    const recentQueries = recentInteractions
      .filter(i => i.type === 'query')
      .map(i => i.content)
      .slice(0, 3);
    
    if (recentQueries.length > 0) {
      context += `Buscas recentes: ${recentQueries.join(', ')}\n`;
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
  
  let prompt = '\n\nINSIGHTS PRIORITÁRIOS PARA MENCIONAR:\n';
  highPriorityInsights.forEach(insight => {
    prompt += `- ${insight.message}\n`;
  });
  
  return prompt;
}
