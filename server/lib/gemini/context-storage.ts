// server/lib/gemini/context-storage.ts
import { storage } from "../../storage.js";

/**
 * Interface para o contexto conversacional
 */
export interface ConversationContext {
  focoAtual?: string | null;          // Produto atual no foco (ex: "iphone")
  ultimaQuery?: string | null;        // Última query executada
  ultimosModelos?: string[];          // Modelos mencionados recentemente
  acessoriosSugeridos?: string[];     // Acessórios sugeridos para evitar repetição
  rngSeed?: number;                   // Seed para RNG determinístico por sessão
  turn?: number;                      // Número do turno na sessão para rotação
  categoriaAtual?: string | null;     // Categoria atual inferida (celular, drone, perfume...)
  lastUpdated?: string;               // Timestamp da última atualização
}

/**
 * Salva o contexto conversacional na sessão do usuário
 */
export async function salvarContextoSessao(
  sessionId: string, 
  contexto: Partial<ConversationContext>
): Promise<void> {
  try {
    // Buscar sessão atual
    const session = await storage.getAssistantSession(sessionId);
    if (!session) {
      console.warn(`⚠️ [ContextStorage] Sessão não encontrada: ${sessionId}`);
      return;
    }

    // Mesclar contexto existente com novo contexto
    const sessionData = (session.sessionData || {}) as any;
    const contextAtual = sessionData.conversationContext || {};
    const novoContexto = {
      ...contextAtual,
      ...contexto,
      lastUpdated: new Date().toISOString()
    };

    // Atualizar sessionData com novo contexto
    await storage.updateAssistantSession(sessionId, {
      sessionData: {
        ...sessionData,
        conversationContext: novoContexto
      }
    });

    console.log(`💾 [ContextStorage] Contexto salvo para sessão ${sessionId}:`, novoContexto);
  } catch (error) {
    console.error('❌ [ContextStorage] Erro ao salvar contexto:', error);
  }
}

/**
 * Recupera o contexto conversacional da sessão do usuário
 */
export async function obterContextoSessao(sessionId: string): Promise<ConversationContext | null> {
  try {
    const session = await storage.getAssistantSession(sessionId);
    if (!session) {
      console.warn(`⚠️ [ContextStorage] Sessão não encontrada: ${sessionId}`);
      return null;
    }

    const sessionData = (session.sessionData || {}) as any;
    const contexto = sessionData.conversationContext || {};
    
    console.log(`🧠 [ContextStorage] Contexto recuperado para sessão ${sessionId}:`, contexto);
    return contexto;
  } catch (error) {
    console.error('❌ [ContextStorage] Erro ao obter contexto:', error);
    return null;
  }
}

/**
 * Atualiza apenas o foco atual na sessão
 */
export async function atualizarFocoSessao(sessionId: string, novoFoco: string): Promise<void> {
  await salvarContextoSessao(sessionId, { focoAtual: novoFoco });
}

/**
 * Adiciona um modelo aos modelos recentemente mencionados
 */
export async function adicionarModeloRecente(sessionId: string, modelo: string): Promise<void> {
  try {
    const contexto = await obterContextoSessao(sessionId);
    const modelosAtuais = contexto?.ultimosModelos || [];
    
    // Adicionar modelo e manter apenas os últimos 5
    const novosModelos = [modelo, ...modelosAtuais.filter(m => m !== modelo)].slice(0, 5);
    
    await salvarContextoSessao(sessionId, { ultimosModelos: novosModelos });
  } catch (error) {
    console.error('❌ [ContextStorage] Erro ao adicionar modelo recente:', error);
  }
}

/**
 * Avança e retorna índice (0..len-1) para rotação determinística por sessão
 */
export async function nextVariant(sessionId: string, key: string, len: number): Promise<number> {
  try {
    const contexto = await obterContextoSessao(sessionId) || {};
    const variantKey = `__v_${key}` as keyof ConversationContext;
    const current = (contexto as any)[variantKey] ?? -1;
    const next = (current + 1) % Math.max(1, len);
    
    await salvarContextoSessao(sessionId, { [variantKey]: next } as any);
    console.log(`🎲 [Variant] ${sessionId}:${key} ${current} → ${next} (max: ${len})`);
    return next;
  } catch (error) {
    console.error(`❌ [Variant] Erro em ${sessionId}:${key}:`, error);
    return 0; // Fallback para primeira opção
  }
}

/**
 * Limpa o contexto conversacional da sessão
 */
export async function limparContextoSessao(sessionId: string): Promise<void> {
  await salvarContextoSessao(sessionId, {
    focoAtual: null,
    ultimaQuery: null,
    ultimosModelos: [],
    turn: 0
  });
}