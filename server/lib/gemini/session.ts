import { storage } from '../../storage.js';

export async function persistSessionAndMessage(sessionId: string, userId: string | undefined | null, message: string) {
  try {
    let session = await storage.getAssistantSession(sessionId);
    let effectiveSessionId = sessionId;
    
    if (!session) {
      session = await storage.createAssistantSession({
        userId: userId || null,
        sessionData: { createdAt: new Date().toISOString(), provider: 'gemini' },
      });
      effectiveSessionId = session.id; // Use o ID gerado pelo banco
    }
    
    await storage.createAssistantMessage({ 
      sessionId: effectiveSessionId, 
      role: 'user', 
      content: message, 
      metadata: { timestamp: new Date().toISOString(), provider: 'gemini' } 
    });
    
    return effectiveSessionId;
  } catch (error) {
    console.warn('Erro ao salvar mensagem Gemini:', error);
    return sessionId; // Fallback para o ID original
  }
}

export async function getSessionMessages(sessionId: string) {
  try {
    const messages = await storage.getAssistantMessages(sessionId);
    return messages || [];
  } catch (error) {
    console.warn('Erro ao buscar mensagens Gemini:', error);
    return [];
  }
}

export async function salvarResposta(sessionId: string, text: string) {
  try {
    // Verificar se a sessão existe, se não, usar o sessionId como está
    const session = await storage.getAssistantSession(sessionId);
    const effectiveSessionId = session ? session.id : sessionId;
    
    await storage.createAssistantMessage({
      sessionId: effectiveSessionId,
      role: 'assistant',
      content: text,
      metadata: { 
        streamed: true, 
        timestamp: new Date().toISOString(), 
        provider: 'gemini'
      }
    });
  } catch (error) {
    console.warn('Erro ao salvar resposta Gemini:', error);
  }
}