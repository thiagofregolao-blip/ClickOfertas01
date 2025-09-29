
/**
 * Sistema de Prompts Otimizados para Naturalidade
 * Prompts contextuais e adaptativos para diferentes situações
 */

import type { EmotionalContext } from "../intelligence/emotional.js";
import type { ConversationMemory } from "../core/memory.js";

export interface PromptTemplate {
  id: string;
  name: string;
  category: "greeting" | "search" | "comparison" | "recommendation" | "followup" | "error";
  variants: PromptVariant[];
  conditions: PromptCondition[];
  priority: number;
}

export interface PromptVariant {
  text: string;
  tone: "casual" | "professional" | "friendly" | "enthusiastic" | "empathetic";
  context: string[];
  weight: number;
}

export interface PromptCondition {
  field: string;
  operator: "equals" | "contains" | "greater_than" | "exists";
  value: any;
}

// Templates de prompts otimizados
const OPTIMIZED_PROMPTS: PromptTemplate[] = [
  {
    id: "greeting_first_time",
    name: "Saudação Primeira Vez",
    category: "greeting",
    variants: [
      {
        text: "Oi! Sou o Clique, seu assistente pessoal de compras! 😊 Estou aqui para te ajudar a encontrar exatamente o que você precisa com os melhores preços. O que você está procurando hoje?",
        tone: "friendly",
        context: ["first_interaction"],
        weight: 1.0
      },
      {
        text: "Olá! Bem-vindo ao Click Ofertas! Eu sou o Clique e vou ser seu guia para encontrar as melhores ofertas. Me conta, que produto você tem em mente?",
        tone: "professional",
        context: ["first_interaction"],
        weight: 0.8
      },
      {
        text: "E aí! 👋 Clique aqui! Pronto para encontrar aquela pechincha incrível? Me fala o que você quer e eu garanto que vamos achar o melhor preço!",
        tone: "enthusiastic",
        context: ["first_interaction", "price_focused"],
        weight: 0.9
      }
    ],
    conditions: [
      { field: "messages_count", operator: "equals", value: 0 }
    ],
    priority: 10
  },
  {
    id: "greeting_returning",
    name: "Saudação Usuário Recorrente",
    category: "greeting",
    variants: [
      {
        text: "Oi de novo! 😊 Que bom te ver por aqui! Como posso ajudar hoje? Tem algum produto específico em mente?",
        tone: "friendly",
        context: ["returning_user"],
        weight: 1.0
      },
      {
        text: "Olá! Bem-vindo de volta! Vi que você já conhece nosso sistema. O que vamos procurar hoje?",
        tone: "professional",
        context: ["returning_user"],
        weight: 0.7
      },
      {
        text: "Eyyy! Voltou! 🎉 Já sabe como funciona né? Me fala logo o que você quer que eu já vou caçando as melhores ofertas!",
        tone: "enthusiastic",
        context: ["returning_user", "casual"],
        weight: 0.8
      }
    ],
    conditions: [
      { field: "messages_count", operator: "greater_than", value: 5 }
    ],
    priority: 9
  },
  {
    id: "search_results_found",
    name: "Resultados Encontrados",
    category: "search",
    variants: [
      {
        text: "Perfeito! Encontrei algumas opções incríveis de {product} para você! 🎯 Dá uma olhada:",
        tone: "enthusiastic",
        context: ["successful_search"],
        weight: 1.0
      },
      {
        text: "Ótimo! Aqui estão os {product} que encontrei com os melhores preços disponíveis:",
        tone: "professional",
        context: ["successful_search", "price_focused"],
        weight: 0.8
      },
      {
        text: "Achei! 🔍 Separei essas opções de {product} que combinam com o que você está procurando:",
        tone: "friendly",
        context: ["successful_search"],
        weight: 0.9
      },
      {
        text: "Bingo! 🎉 Olha só que {product} legais eu encontrei para você. Qual chama mais sua atenção?",
        tone: "casual",
        context: ["successful_search", "interactive"],
        weight: 0.7
      }
    ],
    conditions: [
      { field: "results_count", operator: "greater_than", value: 0 }
    ],
    priority: 8
  },
  {
    id: "search_no_results",
    name: "Nenhum Resultado",
    category: "search",
    variants: [
      {
        text: "Hmm, não encontrei exatamente o que você procura, mas tenho algumas alternativas que podem te interessar! Que tal dar uma olhada em {suggestions}?",
        tone: "empathetic",
        context: ["no_results", "helpful"],
        weight: 1.0
      },
      {
        text: "Ops! Não achei {product} no momento, mas posso sugerir {suggestions} que são bem similares e estão com ótimos preços!",
        tone: "professional",
        context: ["no_results", "alternative"],
        weight: 0.8
      },
      {
        text: "Poxa! 😅 Esse {product} específico não temos agora, mas olha só essas opções que podem te surpreender: {suggestions}",
        tone: "casual",
        context: ["no_results", "positive"],
        weight: 0.9
      }
    ],
    conditions: [
      { field: "results_count", operator: "equals", value: 0 }
    ],
    priority: 8
  },
  {
    id: "price_comparison",
    name: "Comparação de Preços",
    category: "comparison",
    variants: [
      {
        text: "Ótima pergunta! 💰 Vou fazer uma comparação detalhada dos preços para você ver qual oferece o melhor custo-benefício:",
        tone: "professional",
        context: ["price_comparison", "analytical"],
        weight: 1.0
      },
      {
        text: "Perfeito! Adoro quando vocês querem comparar preços! 📊 Deixa eu mostrar qual é a melhor pechincha:",
        tone: "enthusiastic",
        context: ["price_comparison", "savings_focused"],
        weight: 0.9
      },
      {
        text: "Claro! Vou te ajudar a escolher o melhor negócio. Aqui está a comparação que você pediu:",
        tone: "friendly",
        context: ["price_comparison", "helpful"],
        weight: 0.8
      }
    ],
    conditions: [
      { field: "intent", operator: "contains", value: "price" }
    ],
    priority: 7
  },
  {
    id: "recommendation_cross_sell",
    name: "Recomendação Cross-sell",
    category: "recommendation",
    variants: [
      {
        text: "Já que você está interessado em {product}, que tal dar uma olhada nestes produtos que combinam perfeitamente? ✨",
        tone: "friendly",
        context: ["cross_sell", "complementary"],
        weight: 1.0
      },
      {
        text: "Baseado no que você está procurando, estes outros produtos podem te interessar também:",
        tone: "professional",
        context: ["cross_sell", "recommendation"],
        weight: 0.8
      },
      {
        text: "Opa! Já que você curtiu {product}, olha só essas outras coisas que podem ser úteis para você! 🎯",
        tone: "casual",
        context: ["cross_sell", "enthusiastic"],
        weight: 0.9
      }
    ],
    conditions: [
      { field: "stage", operator: "equals", value: "recommendation" }
    ],
    priority: 6
  },
  {
    id: "followup_abandoned_search",
    name: "Follow-up Busca Abandonada",
    category: "followup",
    variants: [
      {
        text: "Oi! Vi que você estava procurando por {product} mais cedo. Encontrei algumas opções novas que podem te interessar! Quer dar uma olhada? 😊",
        tone: "friendly",
        context: ["followup", "abandoned_search"],
        weight: 1.0
      },
      {
        text: "Olá! Notei que você estava interessado em {product}. Que tal continuarmos de onde paramos?",
        tone: "professional",
        context: ["followup", "continuation"],
        weight: 0.8
      },
      {
        text: "E aí! Ainda pensando naquele {product}? Apareceram umas promoções novas que você vai gostar! 🔥",
        tone: "enthusiastic",
        context: ["followup", "promotion"],
        weight: 0.9
      }
    ],
    conditions: [
      { field: "followup_type", operator: "equals", value: "abandoned_search" }
    ],
    priority: 7
  },
  {
    id: "error_understanding",
    name: "Erro de Compreensão",
    category: "error",
    variants: [
      {
        text: "Desculpa, não entendi muito bem o que você está procurando. 😅 Pode me explicar de uma forma diferente? Ou me dá um exemplo do produto?",
        tone: "empathetic",
        context: ["misunderstanding", "clarification"],
        weight: 1.0
      },
      {
        text: "Peço desculpas, mas não consegui identificar exatamente o que você precisa. Poderia ser mais específico sobre o produto desejado?",
        tone: "professional",
        context: ["misunderstanding", "formal"],
        weight: 0.7
      },
      {
        text: "Opa! Acho que me perdi aqui! 🤔 Me ajuda reformulando o que você quer? Assim eu consigo te ajudar melhor!",
        tone: "casual",
        context: ["misunderstanding", "friendly"],
        weight: 0.8
      }
    ],
    conditions: [
      { field: "intent", operator: "equals", value: "UNCLEAR" }
    ],
    priority: 5
  }
];

/**
 * Seleciona o melhor prompt baseado no contexto
 */
export function selectOptimalPrompt(
  category: PromptTemplate["category"],
  context: Record<string, any>,
  emotionalContext?: EmotionalContext,
  memory?: ConversationMemory
): string {
  // Filtrar prompts por categoria
  const categoryPrompts = OPTIMIZED_PROMPTS.filter(p => p.category === category);
  
  // Avaliar condições e calcular scores
  const scoredPrompts = categoryPrompts.map(prompt => {
    let score = prompt.priority;
    
    // Verificar condições
    const conditionsMet = prompt.conditions.every(condition => 
      evaluateCondition(condition, context)
    );
    
    if (!conditionsMet) {
      score = 0;
    }
    
    // Ajustar score baseado no contexto emocional
    if (emotionalContext) {
      score = adjustScoreForEmotion(score, prompt, emotionalContext);
    }
    
    // Ajustar score baseado na memória conversacional
    if (memory) {
      score = adjustScoreForMemory(score, prompt, memory);
    }
    
    return { prompt, score };
  }).filter(item => item.score > 0);
  
  if (scoredPrompts.length === 0) {
    return "Como posso ajudar você hoje?"; // Fallback
  }
  
  // Ordenar por score e selecionar o melhor
  scoredPrompts.sort((a, b) => b.score - a.score);
  const bestPrompt = scoredPrompts[0].prompt;
  
  // Selecionar variante baseada no contexto
  const variant = selectBestVariant(bestPrompt, context, emotionalContext);
  
  // Personalizar o prompt
  return personalizePrompt(variant.text, context);
}

/**
 * Avalia uma condição do prompt
 */
function evaluateCondition(condition: PromptCondition, context: Record<string, any>): boolean {
  const value = context[condition.field];
  
  switch (condition.operator) {
    case "equals":
      return value === condition.value;
    case "contains":
      return Array.isArray(value) ? value.includes(condition.value) : 
             String(value || "").includes(String(condition.value));
    case "greater_than":
      return Number(value || 0) > Number(condition.value);
    case "exists":
      return value !== undefined && value !== null;
    default:
      return false;
  }
}

/**
 * Ajusta score baseado no contexto emocional
 */
function adjustScoreForEmotion(
  score: number, 
  prompt: PromptTemplate, 
  emotionalContext: EmotionalContext
): number {
  let adjustedScore = score;
  
  // Ajustar baseado no tom emocional
  const userSentiment = emotionalContext.sentiment.polarity;
  const responseStrategy = emotionalContext.responseStrategy.tone;
  
  // Bonus para prompts que combinam com a estratégia emocional
  prompt.variants.forEach(variant => {
    if (variant.tone === responseStrategy) {
      adjustedScore += 2;
    }
    
    // Ajustar baseado na polaridade do sentimento
    if (userSentiment < -0.3 && variant.tone === "empathetic") {
      adjustedScore += 3;
    } else if (userSentiment > 0.3 && variant.tone === "enthusiastic") {
      adjustedScore += 2;
    }
  });
  
  return adjustedScore;
}

/**
 * Ajusta score baseado na memória conversacional
 */
function adjustScoreForMemory(
  score: number, 
  prompt: PromptTemplate, 
  memory: ConversationMemory
): number {
  let adjustedScore = score;
  
  // Ajustar baseado no estilo de comunicação preferido
  const communicationStyle = memory.userProfile.communicationStyle;
  
  prompt.variants.forEach(variant => {
    if (communicationStyle === "formal" && variant.tone === "professional") {
      adjustedScore += 2;
    } else if (communicationStyle === "casual" && variant.tone === "casual") {
      adjustedScore += 2;
    } else if (communicationStyle === "technical" && variant.tone === "professional") {
      adjustedScore += 1;
    }
  });
  
  // Bonus para prompts que mencionam interesses do usuário
  if (memory.userProfile.interests.length > 0) {
    adjustedScore += 1;
  }
  
  return adjustedScore;
}

/**
 * Seleciona a melhor variante de um prompt
 */
function selectBestVariant(
  prompt: PromptTemplate, 
  context: Record<string, any>,
  emotionalContext?: EmotionalContext
): PromptVariant {
  let bestVariant = prompt.variants[0];
  let bestScore = 0;
  
  for (const variant of prompt.variants) {
    let score = variant.weight;
    
    // Verificar se o contexto da variante combina
    const contextMatch = variant.context.some(ctx => 
      context[ctx] === true || context.context?.includes(ctx)
    );
    
    if (contextMatch) {
      score += 2;
    }
    
    // Ajustar baseado no tom emocional
    if (emotionalContext) {
      const targetTone = emotionalContext.responseStrategy.tone;
      if (variant.tone === targetTone) {
        score += 3;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestVariant = variant;
    }
  }
  
  return bestVariant;
}

/**
 * Personaliza um prompt com dados do contexto
 */
function personalizePrompt(template: string, context: Record<string, any>): string {
  let personalized = template;
  
  // Substituir placeholders
  const placeholders = template.match(/\{([^}]+)\}/g) || [];
  
  for (const placeholder of placeholders) {
    const key = placeholder.slice(1, -1); // Remove { }
    const value = context[key] || "";
    personalized = personalized.replace(placeholder, value);
  }
  
  return personalized;
}

/**
 * Gera prompt contextual para situações específicas
 */
export function generateContextualPrompt(
  situation: string,
  context: Record<string, any>,
  emotionalContext?: EmotionalContext
): string {
  const situationPrompts: Record<string, string[]> = {
    price_concern: [
      "Entendo sua preocupação com o preço! Vou buscar as opções mais econômicas para você. 💰",
      "Preço é importante mesmo! Deixa eu encontrar as melhores ofertas disponíveis.",
      "Sem problemas! Vou focar nas opções com melhor custo-benefício para seu orçamento."
    ],
    urgency: [
      "Entendi que você precisa com urgência! Vou priorizar produtos disponíveis para entrega imediata. ⚡",
      "Urgência total! Deixa eu verificar o que temos em estoque para envio rápido.",
      "Pode deixar! Vou focar em opções que você pode ter o quanto antes."
    ],
    indecision: [
      "Vejo que você está em dúvida entre algumas opções. Que tal eu te ajudar com uma comparação detalhada? 🤔",
      "Decisões difíceis! Posso destacar os pontos principais de cada opção para facilitar sua escolha.",
      "Entendo a dificuldade! Vamos analisar juntos qual opção faz mais sentido para você."
    ],
    satisfaction: [
      "Que bom que você gostou! 😊 Posso sugerir alguns produtos relacionados que também podem te interessar.",
      "Fico feliz que tenha aprovado! Tem mais alguma coisa que posso ajudar a encontrar?",
      "Perfeito! Já que você curtiu, que tal dar uma olhada em outras ofertas especiais?"
    ]
  };
  
  const prompts = situationPrompts[situation] || ["Como posso ajudar você?"];
  
  // Selecionar prompt baseado no contexto emocional
  let selectedPrompt = prompts[0];
  
  if (emotionalContext) {
    const { responseStrategy } = emotionalContext;
    
    if (responseStrategy.tone === "empathetic" && prompts.length > 0) {
      selectedPrompt = prompts[0]; // Mais empático
    } else if (responseStrategy.tone === "enthusiastic" && prompts.length > 2) {
      selectedPrompt = prompts[2]; // Mais entusiasmado
    } else if (prompts.length > 1) {
      selectedPrompt = prompts[1]; // Meio termo
    }
  }
  
  return personalizePrompt(selectedPrompt, context);
}

/**
 * Cria prompt adaptativo baseado no histórico
 */
export function createAdaptivePrompt(
  basePrompt: string,
  memory: ConversationMemory,
  emotionalContext: EmotionalContext
): string {
  let adaptedPrompt = basePrompt;
  
  // Adicionar personalização baseada no histórico
  if (memory.userProfile.interests.length > 0) {
    const interests = memory.userProfile.interests.slice(0, 2).join(" e ");
    adaptedPrompt += ` Sei que você tem interesse em ${interests}.`;
  }
  
  // Ajustar tom baseado no contexto emocional
  if (emotionalContext.sentiment.polarity < -0.3) {
    adaptedPrompt = "Entendo que pode estar sendo frustrante. " + adaptedPrompt;
  } else if (emotionalContext.sentiment.polarity > 0.3) {
    adaptedPrompt += " 🎉";
  }
  
  // Adicionar urgência se detectada
  if (emotionalContext.sentiment.urgency === "high") {
    adaptedPrompt += " Vou priorizar opções disponíveis imediatamente!";
  }
  
  return adaptedPrompt;
}

/**
 * Valida se um prompt é apropriado para o contexto
 */
export function validatePrompt(
  prompt: string,
  context: Record<string, any>,
  emotionalContext?: EmotionalContext
): boolean {
  // Verificações básicas
  if (!prompt || prompt.length < 10) return false;
  
  // Verificar se o tom é apropriado
  if (emotionalContext) {
    const { sentiment } = emotionalContext;
    
    // Não usar tom muito entusiasmado se usuário está frustrado
    if (sentiment.polarity < -0.5 && prompt.includes("🎉")) {
      return false;
    }
    
    // Não usar linguagem muito casual se usuário prefere formal
    if (context.formality === "formal" && prompt.includes("E aí")) {
      return false;
    }
  }
  
  return true;
}
