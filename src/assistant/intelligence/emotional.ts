
/**
 * Sistema de Inteligência Emocional
 * Detecta tom, emoções e adapta respostas do vendedor inteligente
 */

import type { SentimentAnalysis } from "../core/memory.js";

export interface EmotionalContext {
  sentiment: SentimentAnalysis;
  communicationStyle: CommunicationStyle;
  responseStrategy: ResponseStrategy;
  adaptations: EmotionalAdaptation[];
}

export interface CommunicationStyle {
  formality: "formal" | "casual" | "friendly";
  energy: "low" | "medium" | "high";
  patience: "low" | "medium" | "high";
  detail: "brief" | "moderate" | "detailed";
}

export interface ResponseStrategy {
  tone: "empathetic" | "enthusiastic" | "professional" | "consultative" | "reassuring";
  approach: "direct" | "gentle" | "persuasive" | "educational";
  urgency: "immediate" | "moderate" | "relaxed";
}

export interface EmotionalAdaptation {
  trigger: string;
  adaptation: string;
  confidence: number;
}

// Padrões de detecção emocional
const EMOTION_PATTERNS = {
  frustration: [
    /não\s+(encontr|ach|consig)/i,
    /difícil|complicado|confuso/i,
    /não\s+funciona|não\s+serve/i,
    /cansad[oa]|irritad[oa]/i
  ],
  excitement: [
    /adorei|amei|perfeito|incrível/i,
    /que\s+legal|que\s+bom|ótimo/i,
    /quero\s+já|preciso\s+disso/i,
    /!{2,}|wow|uau/i
  ],
  uncertainty: [
    /não\s+sei|talvez|acho\s+que/i,
    /será\s+que|dúvida|incert/i,
    /pode\s+ser|quem\s+sabe/i,
    /\?{2,}/i
  ],
  urgency: [
    /urgente|rápido|agora|já/i,
    /preciso\s+hoje|para\s+ontem/i,
    /emergência|pressa/i,
    /quanto\s+tempo/i
  ],
  price_sensitivity: [
    /caro|barato|preço|valor/i,
    /desconto|promoção|oferta/i,
    /orçamento|dinheiro|pagar/i,
    /mais\s+em\s+conta|econômico/i
  ],
  satisfaction: [
    /obrigad[oa]|valeu|legal/i,
    /ajudou|útil|bom\s+atendimento/i,
    /satisfeit[oa]|content[ea]/i,
    /recomendo|aprovado/i
  ]
};

// Estratégias de resposta por emoção
const RESPONSE_STRATEGIES: Record<string, ResponseStrategy> = {
  frustration: {
    tone: "empathetic",
    approach: "gentle",
    urgency: "immediate"
  },
  excitement: {
    tone: "enthusiastic",
    approach: "direct",
    urgency: "immediate"
  },
  uncertainty: {
    tone: "consultative",
    approach: "educational",
    urgency: "moderate"
  },
  urgency: {
    tone: "professional",
    approach: "direct",
    urgency: "immediate"
  },
  price_sensitivity: {
    tone: "consultative",
    approach: "persuasive",
    urgency: "moderate"
  },
  satisfaction: {
    tone: "enthusiastic",
    approach: "direct",
    urgency: "relaxed"
  }
};

/**
 * Analisa sentimento e emoções de uma mensagem
 */
export function analyzeSentiment(message: string): SentimentAnalysis {
  const emotions: string[] = [];
  let polarity = 0;
  let urgency: "low" | "medium" | "high" = "low";
  
  // Detectar emoções baseadas em padrões
  for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        emotions.push(emotion);
        
        // Ajustar polaridade baseada na emoção
        switch (emotion) {
          case "excitement":
          case "satisfaction":
            polarity += 0.3;
            break;
          case "frustration":
            polarity -= 0.4;
            break;
          case "uncertainty":
            polarity -= 0.1;
            break;
          case "urgency":
            urgency = "high";
            break;
          case "price_sensitivity":
            polarity -= 0.1;
            break;
        }
        break;
      }
    }
  }
  
  // Análise de palavras positivas/negativas
  const positiveWords = /bom|boa|ótimo|excelente|perfeito|legal|bacana|top/gi;
  const negativeWords = /ruim|péssimo|horrível|terrível|não\s+gost|odeio/gi;
  
  const positiveMatches = (message.match(positiveWords) || []).length;
  const negativeMatches = (message.match(negativeWords) || []).length;
  
  polarity += positiveMatches * 0.2 - negativeMatches * 0.3;
  
  // Normalizar polaridade entre -1 e 1
  polarity = Math.max(-1, Math.min(1, polarity));
  
  // Calcular confiança baseada na quantidade de indicadores
  const totalIndicators = emotions.length + positiveMatches + negativeMatches;
  const confidence = Math.min(0.9, totalIndicators * 0.2 + 0.1);
  
  return {
    polarity,
    confidence,
    emotions: [...new Set(emotions)],
    urgency
  };
}

/**
 * Determina estilo de comunicação baseado na mensagem
 */
export function determineCommunicationStyle(message: string, history: string[] = []): CommunicationStyle {
  const formalIndicators = /senhor|senhora|por\s+favor|gostaria|poderia/i;
  const casualIndicators = /oi|opa|e\s+aí|valeu|beleza|cara/i;
  const friendlyIndicators = /amigo|querido|obrigado|legal|bacana/i;
  
  let formality: CommunicationStyle["formality"] = "casual";
  if (formalIndicators.test(message)) formality = "formal";
  else if (friendlyIndicators.test(message)) formality = "friendly";
  
  // Detectar energia baseada em pontuação e palavras
  const highEnergyIndicators = /!+|wow|incrível|demais|top|show/i;
  const lowEnergyIndicators = /cansad|devagar|calma|sem\s+pressa/i;
  
  let energy: CommunicationStyle["energy"] = "medium";
  if (highEnergyIndicators.test(message)) energy = "high";
  else if (lowEnergyIndicators.test(message)) energy = "low";
  
  // Detectar paciência baseada em urgência e tom
  const impatientIndicators = /rápido|agora|já|urgente|pressa/i;
  const patientIndicators = /calma|devagar|sem\s+pressa|quando\s+der/i;
  
  let patience: CommunicationStyle["patience"] = "medium";
  if (impatientIndicators.test(message)) patience = "low";
  else if (patientIndicators.test(message)) patience = "high";
  
  // Detectar preferência por detalhes
  const detailIndicators = /explica|detalhe|como\s+funciona|especificação/i;
  const briefIndicators = /resumo|rápido|direto|só\s+o\s+básico/i;
  
  let detail: CommunicationStyle["detail"] = "moderate";
  if (detailIndicators.test(message)) detail = "detailed";
  else if (briefIndicators.test(message)) detail = "brief";
  
  return { formality, energy, patience, detail };
}

/**
 * Gera contexto emocional completo
 */
export function generateEmotionalContext(
  message: string, 
  conversationHistory: string[] = []
): EmotionalContext {
  const sentiment = analyzeSentiment(message);
  const communicationStyle = determineCommunicationStyle(message, conversationHistory);
  
  // Determinar estratégia de resposta baseada nas emoções dominantes
  let responseStrategy: ResponseStrategy = {
    tone: "professional",
    approach: "direct",
    urgency: "moderate"
  };
  
  if (sentiment.emotions.length > 0) {
    const dominantEmotion = sentiment.emotions[0];
    responseStrategy = RESPONSE_STRATEGIES[dominantEmotion] || responseStrategy;
  }
  
  // Ajustar estratégia baseada na polaridade
  if (sentiment.polarity < -0.3) {
    responseStrategy.tone = "empathetic";
    responseStrategy.approach = "gentle";
  } else if (sentiment.polarity > 0.3) {
    responseStrategy.tone = "enthusiastic";
  }
  
  // Gerar adaptações específicas
  const adaptations = generateAdaptations(sentiment, communicationStyle);
  
  return {
    sentiment,
    communicationStyle,
    responseStrategy,
    adaptations
  };
}

/**
 * Gera adaptações específicas baseadas no contexto emocional
 */
function generateAdaptations(
  sentiment: SentimentAnalysis, 
  style: CommunicationStyle
): EmotionalAdaptation[] {
  const adaptations: EmotionalAdaptation[] = [];
  
  // Adaptações baseadas em emoções
  if (sentiment.emotions.includes("frustration")) {
    adaptations.push({
      trigger: "frustration",
      adaptation: "Usar linguagem mais empática e oferecer soluções imediatas",
      confidence: 0.8
    });
  }
  
  if (sentiment.emotions.includes("excitement")) {
    adaptations.push({
      trigger: "excitement",
      adaptation: "Manter energia alta e acelerar o processo de venda",
      confidence: 0.9
    });
  }
  
  if (sentiment.emotions.includes("uncertainty")) {
    adaptations.push({
      trigger: "uncertainty",
      adaptation: "Fornecer mais informações e comparações detalhadas",
      confidence: 0.7
    });
  }
  
  if (sentiment.urgency === "high") {
    adaptations.push({
      trigger: "urgency",
      adaptation: "Priorizar opções disponíveis imediatamente",
      confidence: 0.8
    });
  }
  
  // Adaptações baseadas no estilo de comunicação
  if (style.formality === "formal") {
    adaptations.push({
      trigger: "formal_style",
      adaptation: "Usar tratamento formal e linguagem mais técnica",
      confidence: 0.7
    });
  }
  
  if (style.detail === "detailed") {
    adaptations.push({
      trigger: "detail_preference",
      adaptation: "Incluir especificações técnicas e comparações detalhadas",
      confidence: 0.8
    });
  }
  
  if (style.energy === "low") {
    adaptations.push({
      trigger: "low_energy",
      adaptation: "Usar tom mais calmo e dar tempo para decisões",
      confidence: 0.6
    });
  }
  
  return adaptations;
}

/**
 * Adapta resposta baseada no contexto emocional
 */
export function adaptResponse(
  originalResponse: string, 
  emotionalContext: EmotionalContext
): string {
  let adaptedResponse = originalResponse;
  const { sentiment, communicationStyle, responseStrategy } = emotionalContext;
  
  // Ajustar tom baseado na estratégia
  switch (responseStrategy.tone) {
    case "empathetic":
      adaptedResponse = addEmpatheticTone(adaptedResponse);
      break;
    case "enthusiastic":
      adaptedResponse = addEnthusiasticTone(adaptedResponse);
      break;
    case "consultative":
      adaptedResponse = addConsultativeTone(adaptedResponse);
      break;
    case "reassuring":
      adaptedResponse = addReassurringTone(adaptedResponse);
      break;
  }
  
  // Ajustar formalidade
  if (communicationStyle.formality === "formal") {
    adaptedResponse = makeFormal(adaptedResponse);
  } else if (communicationStyle.formality === "friendly") {
    adaptedResponse = makeFriendly(adaptedResponse);
  }
  
  // Ajustar urgência
  if (sentiment.urgency === "high") {
    adaptedResponse = addUrgency(adaptedResponse);
  }
  
  return adaptedResponse;
}

// Funções auxiliares para adaptação de tom
function addEmpatheticTone(response: string): string {
  const emphaticPrefixes = [
    "Entendo sua situação. ",
    "Compreendo perfeitamente. ",
    "Sei como é importante para você. "
  ];
  const prefix = emphaticPrefixes[Math.floor(Math.random() * emphaticPrefixes.length)];
  return prefix + response;
}

function addEnthusiasticTone(response: string): string {
  return response.replace(/\./g, "! ").replace(/!{2,}/g, "!");
}

function addConsultativeTone(response: string): string {
  const consultativePrefixes = [
    "Baseado na sua necessidade, ",
    "Considerando seu perfil, ",
    "Para sua situação específica, "
  ];
  const prefix = consultativePrefixes[Math.floor(Math.random() * consultativePrefixes.length)];
  return prefix + response;
}

function addReassurringTone(response: string): string {
  const reassuringPhrases = [
    " Pode ficar tranquilo!",
    " Estou aqui para ajudar!",
    " Vamos resolver isso juntos!"
  ];
  const phrase = reassuringPhrases[Math.floor(Math.random() * reassuringPhrases.length)];
  return response + phrase;
}

function makeFormal(response: string): string {
  return response
    .replace(/\bvocê\b/g, "o senhor/a senhora")
    .replace(/\boi\b/gi, "Olá")
    .replace(/\bvaleu\b/gi, "Obrigado");
}

function makeFriendly(response: string): string {
  const friendlyEmojis = ["😊", "👍", "✨", "🎉"];
  const emoji = friendlyEmojis[Math.floor(Math.random() * friendlyEmojis.length)];
  return response + " " + emoji;
}

function addUrgency(response: string): string {
  const urgencyPhrases = [
    " Vamos resolver isso rapidinho!",
    " Tenho opções imediatas para você!",
    " Posso agilizar isso agora mesmo!"
  ];
  const phrase = urgencyPhrases[Math.floor(Math.random() * urgencyPhrases.length)];
  return response + phrase;
}
