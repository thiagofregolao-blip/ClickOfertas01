import { db } from "./db";
import { userMemory, type UserMemory, type InsertUserMemory, type UpdateUserMemory } from "@shared/schema";
import { eq } from "drizzle-orm";
import OpenAI from 'openai';

// Initialize OpenAI client for memory summarization
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini';

export class MemoryService {
  
  /**
   * Busca ou cria memória vazia para o usuário
   */
  static async getUserMemory(userId: string, name?: string): Promise<UserMemory> {
    try {
      // Procura memória existente
      const existingMemory = await db
        .select()
        .from(userMemory)
        .where(eq(userMemory.userId, userId))
        .limit(1);

      if (existingMemory.length > 0) {
        // Atualiza último acesso
        await db
          .update(userMemory)
          .set({
            lastSeen: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(userMemory.userId, userId));

        return existingMemory[0];
      }

      // Cria nova memória se não existir
      const newMemoryData: InsertUserMemory = {
        userId,
        profile: {
          name: name || '',
          preferredCity: '',
        },
        preferences: {},
        history: {
          lastIntent: '',
          lastCategories: [],
          lastProducts: [],
          lastStores: [],
          recentSearches: [],
          commonSearchTerms: [],
        },
        greetingHistory: [],
        lastSummary: null,
        visitCount: 1,
        messageCount: 0,
        lastSeen: new Date(),
      };

      const result = await db
        .insert(userMemory)
        .values([newMemoryData])
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error getting/creating user memory:', error);
      // Return default memory structure in case of error
      return {
        id: '',
        userId,
        profile: { name: name || '', preferredCity: '' },
        preferences: {},
        history: {
          lastIntent: '',
          lastCategories: [],
          lastProducts: [],
          lastStores: [],
          recentSearches: [],
          commonSearchTerms: [],
        },
        greetingHistory: [],
        lastSummary: null,
        visitCount: 1,
        messageCount: 0,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Atualiza memória do usuário
   */
  static async updateUserMemory(userId: string, updates: Partial<UpdateUserMemory>): Promise<void> {
    try {
      const updateData: any = {
        ...updates,
        updatedAt: new Date(),
      };
      
      await db
        .update(userMemory)
        .set(updateData)
        .where(eq(userMemory.userId, userId));
    } catch (error) {
      console.error('Error updating user memory:', error);
    }
  }

  /**
   * Extrai sinais de categorias e preferências do texto
   */
  static extractSignals(message: string): {
    categories: string[];
    preferredCity: 'Ciudad del Este' | 'Salto del Guairá' | 'Pedro Juan Caballero' | '';
    budget?: 'baixo' | 'medio' | 'alto';
    brands: string[];
  } {
    const text = message.toLowerCase();
    const categories: string[] = [];
    const brands: string[] = [];

    // Detectar categorias
    if (/(iphone|samsung|galaxy|xiaomi|smartphone|celular|phone)/.test(text)) {
      categories.push('eletronicos');
    }
    if (/(fone|headphone|jbl|sony|audio|soundbar|earphone)/.test(text)) {
      categories.push('audio');
    }
    if (/(perfume|parfum|cosm[eé]tico|fragr[aâ]ncia)/.test(text)) {
      categories.push('perfumes');
    }
    if (/(notebook|laptop|computer|pc|mouse|teclado)/.test(text)) {
      categories.push('informatica');
    }
    if (/(rel[oó]gio|watch|smartwatch)/.test(text)) {
      categories.push('relogios');
    }
    if (/(roupa|blusa|camisa|cal[cç]a|vestido|shorts)/.test(text)) {
      categories.push('roupas');
    }

    // Detectar cidade
    let preferredCity: 'Ciudad del Este' | 'Salto del Guairá' | 'Pedro Juan Caballero' | '' = '';
    if (/salto/i.test(text)) {
      preferredCity = 'Salto del Guairá';
    } else if (/pedro\s*juan/i.test(text)) {
      preferredCity = 'Pedro Juan Caballero';
    } else if (/cde|ciudad\s*del\s*este/i.test(text)) {
      preferredCity = 'Ciudad del Este';
    }

    // Detectar orçamento
    let budget: 'baixo' | 'medio' | 'alto' | undefined;
    if (/(barato|econômico|low\s*cost|preço\s*baixo|mais\s*barato)/.test(text)) {
      budget = 'baixo';
    } else if (/(premium|top|melhor\s*qualidade|importado|original)/.test(text)) {
      budget = 'alto';
    } else if (/(custo\s*benefício|intermediário|médio|medio)/.test(text)) {
      budget = 'medio';
    }

    // Detectar marcas
    if (/(apple|iphone|ipad|macbook)/.test(text)) brands.push('Apple');
    if (/(samsung|galaxy)/.test(text)) brands.push('Samsung');
    if (/(xiaomi|redmi)/.test(text)) brands.push('Xiaomi');
    if (/(sony)/.test(text)) brands.push('Sony');
    if (/(jbl)/.test(text)) brands.push('JBL');
    if (/(nike)/.test(text)) brands.push('Nike');
    if (/(adidas)/.test(text)) brands.push('Adidas');

    return { categories, preferredCity, budget, brands };
  }

  /**
   * Cria resumo da conversa para memória
   */
  static async summarizeForMemory(input: {
    message: string;
    reply: string;
    name?: string;
  }): Promise<string> {
    try {
      const prompt = `
Resuma a conversa abaixo em até 2 linhas, focando intenção e preferências (cidade/orçamento/categorias).
PT-BR, direto e objetivo.

Usuário: ${input.name || 'Cliente'}
Pergunta: ${input.message}
Resposta do Click: ${input.reply}

Resumo:`;

      const response = await client.chat.completions.create({
        model: CHAT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 80,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Error creating memory summary:', error);
      return `${input.name || 'Cliente'} buscou informações sobre: ${input.message.slice(0, 50)}...`;
    }
  }

  /**
   * Determina período do dia
   */
  static getTimeOfDay(date = new Date()): 'manhã' | 'tarde' | 'noite' {
    const hour = date.getHours();
    if (hour < 12) return 'manhã';
    if (hour < 18) return 'tarde';
    return 'noite';
  }

  /**
   * Templates de saudação
   */
  static readonly GREETING_TEMPLATES = [
    (ctx: { name: string; period: string; city?: string; visits: number }) =>
      `Olá, ${ctx.name}! Boa ${ctx.period}${ctx.city ? ` em ${ctx.city}` : ''} 👋`,
    
    (ctx: { name: string; period: string }) =>
      `Oi, ${ctx.name}! Tudo certo por aí nessa ${ctx.period}?`,
    
    (ctx: { name: string; city?: string }) =>
      `Bem-vindo de volta, ${ctx.name}! ${ctx.city ? `Vamos explorar ${ctx.city} hoje?` : 'Pronto pra achar boas ofertas?'}`,
    
    (ctx: { name: string }) =>
      `E aí, ${ctx.name}! Posso te mostrar as melhores ofertas de hoje?`,
    
    (ctx: { name: string; city?: string }) =>
      `Que bom te ver, ${ctx.name}! ${ctx.city ? `Tenho novidades de ${ctx.city}.` : 'Tenho novidades fresquinhas.'} ✨`,
    
    (ctx: { name: string; visits: number }) =>
      `Olá novamente, ${ctx.name}! ${ctx.visits > 5 ? 'Já virando cliente VIP por aqui! 🌟' : 'Como posso ajudar hoje?'}`,
    
    (ctx: { name: string; period: string }) =>
      `${ctx.period === 'manhã' ? 'Bom dia' : ctx.period === 'tarde' ? 'Boa tarde' : 'Boa noite'}, ${ctx.name}! Pronto para descobrir ofertas incríveis?`,
  ];

  /**
   * Gera saudação natural e não repetitiva
   */
  static makeNaturalGreeting(memory: UserMemory): {
    text: string;
    nextHistory: number[];
    nextCounters: { visitCount: number; messageCount: number };
  } {
    const name = memory.profile?.name || 'Cliente';
    const period = this.getTimeOfDay();
    const city = memory.profile?.preferredCity || '';
    const visitCount = (memory.visitCount || 0) + 1;
    
    // Evita repetir os últimos 3 templates usados
    const recentlyUsed = new Set((memory.greetingHistory || []).slice(-3));
    
    // Encontra o primeiro template não usado recentemente
    let templateIndex = 0;
    for (let i = 0; i < this.GREETING_TEMPLATES.length; i++) {
      if (!recentlyUsed.has(i)) {
        templateIndex = i;
        break;
      }
    }

    // Gera a saudação
    const template = this.GREETING_TEMPLATES[templateIndex];
    const text = template({
      name,
      period,
      city: city || undefined,
      visits: visitCount,
    });

    // Atualiza histórico de saudações (mantém apenas os últimos 8)
    const nextHistory = [...(memory.greetingHistory || []), templateIndex].slice(-8);
    
    // Atualiza contadores
    const nextCounters = {
      visitCount,
      messageCount: memory.messageCount || 0,
    };

    return {
      text,
      nextHistory,
      nextCounters,
    };
  }

  /**
   * Atualiza histórico de atividades
   */
  static async updateHistory(
    userId: string,
    message: string,
    reply: string,
    extractedSignals?: ReturnType<typeof MemoryService.extractSignals>
  ): Promise<void> {
    try {
      const memory = await this.getUserMemory(userId);
      const signals = extractedSignals || this.extractSignals(message);

      // Atualiza histórico
      const updatedHistory = {
        ...memory.history,
        lastIntent: message.slice(0, 100),
        lastCategories: signals.categories.length > 0 ? signals.categories : memory.history?.lastCategories,
        recentSearches: [
          message,
          ...(memory.history?.recentSearches || []).slice(0, 9)
        ].slice(0, 10),
      };

      // Atualiza preferências se detectadas
      const updatedPreferences = {
        ...memory.preferences,
        ...(signals.budget && { budget: signals.budget }),
        ...(signals.categories.length > 0 && {
          favoriteCategories: [
            ...signals.categories,
            ...(memory.preferences?.favoriteCategories || [])
          ].slice(0, 10)
        }),
        ...(signals.brands.length > 0 && {
          favoriteBrands: [
            ...signals.brands,
            ...(memory.preferences?.favoriteBrands || [])
          ].slice(0, 10)
        }),
      };

      // Atualiza perfil se cidade detectada
      const updatedProfile = {
        ...memory.profile,
        ...(signals.preferredCity && { preferredCity: signals.preferredCity }),
      };

      // Cria resumo da conversa
      const summary = await this.summarizeForMemory({
        message,
        reply,
        name: memory.profile?.name,
      });

      // Salva tudo
      await this.updateUserMemory(userId, {
        history: updatedHistory,
        preferences: updatedPreferences,
        profile: updatedProfile,
        lastSummary: summary,
        messageCount: (memory.messageCount || 0) + 1,
      });

    } catch (error) {
      console.error('Error updating history:', error);
    }
  }
}