
/**
 * Sistema de Follow-up Inteligente
 * Gerencia acompanhamento pós-interação e nurturing de leads
 */

export interface FollowUpRule {
  id: string;
  name: string;
  trigger: FollowUpTrigger;
  timing: FollowUpTiming;
  message: FollowUpMessage;
  conditions: FollowUpCondition[];
  priority: number;
  active: boolean;
}

export interface FollowUpTrigger {
  type: "time_based" | "behavior_based" | "event_based";
  event: string;
  parameters: Record<string, any>;
}

export interface FollowUpTiming {
  delay: number; // em minutos
  maxAttempts: number;
  interval: number; // intervalo entre tentativas em minutos
  timeWindow: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
}

export interface FollowUpMessage {
  template: string;
  personalization: string[];
  tone: "casual" | "professional" | "friendly" | "urgent";
  channel: "chat" | "email" | "notification";
}

export interface FollowUpCondition {
  field: string;
  operator: "equals" | "contains" | "greater_than" | "less_than" | "exists";
  value: any;
}

export interface ScheduledFollowUp {
  id: string;
  sessionId: string;
  ruleId: string;
  scheduledFor: Date;
  attempts: number;
  lastAttempt?: Date;
  status: "pending" | "sent" | "failed" | "cancelled";
  context: Record<string, any>;
}

// Armazenamento de follow-ups agendados
const SCHEDULED_FOLLOWUPS = new Map<string, ScheduledFollowUp>();

// Regras de follow-up pré-definidas
const DEFAULT_FOLLOWUP_RULES: FollowUpRule[] = [
  {
    id: "abandoned_search",
    name: "Busca Abandonada",
    trigger: {
      type: "behavior_based",
      event: "search_abandonment",
      parameters: { inactivity_minutes: 10 }
    },
    timing: {
      delay: 10,
      maxAttempts: 2,
      interval: 30,
      timeWindow: { start: "09:00", end: "22:00" }
    },
    message: {
      template: "Oi {name}! Vi que você estava procurando por {product}. Encontrei algumas opções que podem te interessar! 😊",
      personalization: ["name", "product"],
      tone: "friendly",
      channel: "chat"
    },
    conditions: [
      { field: "stage", operator: "equals", value: "search" },
      { field: "messages_count", operator: "greater_than", value: 2 }
    ],
    priority: 8,
    active: true
  },
  {
    id: "price_hesitation",
    name: "Hesitação por Preço",
    trigger: {
      type: "behavior_based",
      event: "price_concern",
      parameters: { keywords: ["caro", "preço", "barato"] }
    },
    timing: {
      delay: 5,
      maxAttempts: 1,
      interval: 0,
      timeWindow: { start: "09:00", end: "22:00" }
    },
    message: {
      template: "Entendo sua preocupação com o preço! Que tal eu verificar se temos alguma promoção especial ou condição de pagamento que pode ajudar? 💰",
      personalization: [],
      tone: "professional",
      channel: "chat"
    },
    conditions: [
      { field: "sentiment.emotions", operator: "contains", value: "price_sensitivity" }
    ],
    priority: 9,
    active: true
  },
  {
    id: "comparison_stage",
    name: "Ajuda na Comparação",
    trigger: {
      type: "behavior_based",
      event: "comparison_delay",
      parameters: { stage_duration_minutes: 15 }
    },
    timing: {
      delay: 15,
      maxAttempts: 1,
      interval: 0,
      timeWindow: { start: "09:00", end: "22:00" }
    },
    message: {
      template: "Vejo que você está comparando algumas opções. Posso te ajudar criando uma comparação detalhada dos produtos que mais te interessaram! 📊",
      personalization: [],
      tone: "professional",
      channel: "chat"
    },
    conditions: [
      { field: "stage", operator: "equals", value: "comparison" }
    ],
    priority: 7,
    active: true
  },
  {
    id: "satisfaction_followup",
    name: "Follow-up de Satisfação",
    trigger: {
      type: "time_based",
      event: "conversation_end",
      parameters: { delay_hours: 24 }
    },
    timing: {
      delay: 1440, // 24 horas
      maxAttempts: 1,
      interval: 0,
      timeWindow: { start: "10:00", end: "18:00" }
    },
    message: {
      template: "Oi! Como foi sua experiência com os produtos que conversamos ontem? Se precisar de mais alguma coisa, estou aqui! 😊",
      personalization: [],
      tone: "friendly",
      channel: "chat"
    },
    conditions: [
      { field: "satisfaction_score", operator: "greater_than", value: 0.5 }
    ],
    priority: 5,
    active: true
  },
  {
    id: "new_arrivals",
    name: "Novos Produtos",
    trigger: {
      type: "event_based",
      event: "new_products_available",
      parameters: { category_match: true }
    },
    timing: {
      delay: 60, // 1 hora após novos produtos
      maxAttempts: 1,
      interval: 0,
      timeWindow: { start: "09:00", end: "21:00" }
    },
    message: {
      template: "Chegaram produtos novos na categoria {category} que você estava interessado! Quer dar uma olhada? ✨",
      personalization: ["category"],
      tone: "casual",
      channel: "notification"
    },
    conditions: [
      { field: "interests", operator: "exists", value: true }
    ],
    priority: 6,
    active: true
  }
];

/**
 * Agenda follow-up baseado em regras
 */
export function scheduleFollowUp(
  sessionId: string,
  triggerEvent: string,
  context: Record<string, any>
): void {
  const applicableRules = DEFAULT_FOLLOWUP_RULES.filter(rule => 
    rule.active && 
    rule.trigger.event === triggerEvent &&
    evaluateConditions(rule.conditions, context)
  );
  
  for (const rule of applicableRules) {
    const followUpId = `${sessionId}-${rule.id}-${Date.now()}`;
    const scheduledFor = new Date(Date.now() + rule.timing.delay * 60 * 1000);
    
    const scheduledFollowUp: ScheduledFollowUp = {
      id: followUpId,
      sessionId,
      ruleId: rule.id,
      scheduledFor,
      attempts: 0,
      status: "pending",
      context
    };
    
    SCHEDULED_FOLLOWUPS.set(followUpId, scheduledFollowUp);
    
    console.log(`📅 Follow-up agendado: ${rule.name} para ${scheduledFor.toLocaleString()}`);
  }
}

/**
 * Processa follow-ups pendentes
 */
export function processScheduledFollowUps(): void {
  const now = new Date();
  
  for (const [id, followUp] of SCHEDULED_FOLLOWUPS.entries()) {
    if (followUp.status === "pending" && followUp.scheduledFor <= now) {
      executeFollowUp(followUp);
    }
  }
}

/**
 * Executa um follow-up específico
 */
async function executeFollowUp(followUp: ScheduledFollowUp): Promise<void> {
  const rule = DEFAULT_FOLLOWUP_RULES.find(r => r.id === followUp.ruleId);
  if (!rule) {
    followUp.status = "failed";
    return;
  }
  
  // Verificar janela de tempo
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  if (currentTime < rule.timing.timeWindow.start || currentTime > rule.timing.timeWindow.end) {
    // Reagendar para próxima janela válida
    const nextValidTime = getNextValidTime(rule.timing.timeWindow);
    followUp.scheduledFor = nextValidTime;
    return;
  }
  
  try {
    // Personalizar mensagem
    const personalizedMessage = personalizeMessage(rule.message, followUp.context);
    
    // Enviar follow-up (aqui você integraria com o sistema de chat/notificações)
    await sendFollowUpMessage(followUp.sessionId, personalizedMessage, rule.message.channel);
    
    followUp.attempts++;
    followUp.lastAttempt = now;
    followUp.status = "sent";
    
    console.log(`✅ Follow-up enviado: ${rule.name} para sessão ${followUp.sessionId}`);
    
    // Reagendar se necessário
    if (followUp.attempts < rule.timing.maxAttempts && rule.timing.interval > 0) {
      followUp.scheduledFor = new Date(now.getTime() + rule.timing.interval * 60 * 1000);
      followUp.status = "pending";
    }
    
  } catch (error) {
    console.error(`❌ Erro ao enviar follow-up: ${error}`);
    followUp.status = "failed";
  }
}

/**
 * Personaliza mensagem de follow-up
 */
function personalizeMessage(message: FollowUpMessage, context: Record<string, any>): string {
  let personalizedMessage = message.template;
  
  for (const field of message.personalization) {
    const value = context[field] || "";
    personalizedMessage = personalizedMessage.replace(`{${field}}`, value);
  }
  
  return personalizedMessage;
}

/**
 * Envia mensagem de follow-up
 */
async function sendFollowUpMessage(
  sessionId: string, 
  message: string, 
  channel: string
): Promise<void> {
  // Aqui você integraria com o sistema real de mensagens
  // Por enquanto, apenas log
  console.log(`📨 Enviando follow-up via ${channel} para ${sessionId}: ${message}`);
  
  // Simular envio
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Avalia condições de uma regra
 */
function evaluateConditions(
  conditions: FollowUpCondition[], 
  context: Record<string, any>
): boolean {
  return conditions.every(condition => {
    const value = getNestedValue(context, condition.field);
    
    switch (condition.operator) {
      case "equals":
        return value === condition.value;
      case "contains":
        return Array.isArray(value) ? value.includes(condition.value) : 
               String(value).includes(String(condition.value));
      case "greater_than":
        return Number(value) > Number(condition.value);
      case "less_than":
        return Number(value) < Number(condition.value);
      case "exists":
        return value !== undefined && value !== null;
      default:
        return false;
    }
  });
}

/**
 * Obtém valor aninhado de um objeto
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Calcula próximo horário válido
 */
function getNextValidTime(timeWindow: { start: string; end: string }): Date {
  const now = new Date();
  const [startHour, startMinute] = timeWindow.start.split(':').map(Number);
  
  const nextValidTime = new Date(now);
  nextValidTime.setHours(startHour, startMinute, 0, 0);
  
  // Se já passou do horário hoje, agendar para amanhã
  if (nextValidTime <= now) {
    nextValidTime.setDate(nextValidTime.getDate() + 1);
  }
  
  return nextValidTime;
}

/**
 * Cancela follow-ups de uma sessão
 */
export function cancelFollowUps(sessionId: string): void {
  for (const [id, followUp] of SCHEDULED_FOLLOWUPS.entries()) {
    if (followUp.sessionId === sessionId && followUp.status === "pending") {
      followUp.status = "cancelled";
      console.log(`❌ Follow-up cancelado: ${id}`);
    }
  }
}

/**
 * Obtém estatísticas de follow-up
 */
export function getFollowUpStats(): {
  pending: number;
  sent: number;
  failed: number;
  cancelled: number;
} {
  const stats = { pending: 0, sent: 0, failed: 0, cancelled: 0 };
  
  for (const followUp of SCHEDULED_FOLLOWUPS.values()) {
    stats[followUp.status]++;
  }
  
  return stats;
}

/**
 * Limpa follow-ups antigos
 */
export function cleanupOldFollowUps(maxAgeHours: number = 168): void { // 7 dias
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  
  for (const [id, followUp] of SCHEDULED_FOLLOWUPS.entries()) {
    if (followUp.scheduledFor < cutoff && followUp.status !== "pending") {
      SCHEDULED_FOLLOWUPS.delete(id);
    }
  }
}

/**
 * Adiciona nova regra de follow-up
 */
export function addFollowUpRule(rule: FollowUpRule): void {
  DEFAULT_FOLLOWUP_RULES.push(rule);
  console.log(`➕ Nova regra de follow-up adicionada: ${rule.name}`);
}

/**
 * Atualiza regra de follow-up existente
 */
export function updateFollowUpRule(ruleId: string, updates: Partial<FollowUpRule>): boolean {
  const ruleIndex = DEFAULT_FOLLOWUP_RULES.findIndex(r => r.id === ruleId);
  if (ruleIndex === -1) return false;
  
  DEFAULT_FOLLOWUP_RULES[ruleIndex] = { ...DEFAULT_FOLLOWUP_RULES[ruleIndex], ...updates };
  console.log(`✏️ Regra de follow-up atualizada: ${ruleId}`);
  return true;
}

/**
 * Inicia processamento automático de follow-ups
 */
export function startFollowUpProcessor(intervalMinutes: number = 1): void {
  setInterval(() => {
    processScheduledFollowUps();
    cleanupOldFollowUps();
  }, intervalMinutes * 60 * 1000);
  
  console.log(`🚀 Processador de follow-up iniciado (intervalo: ${intervalMinutes} min)`);
}
