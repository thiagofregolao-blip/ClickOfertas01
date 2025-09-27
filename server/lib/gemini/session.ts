import { storage } from '../../storage.js';

export async function persistSessionAndMessage(sessionId: string, userId: string | undefined | null, message: string) {
  try {
    let session = await storage.getAssistantSession(sessionId);
    if (!session) {
      session = await storage.createAssistantSession({
        id: sessionId,
        userId: userId || null,
        metadata: { createdAt: new Date().toISOString(), provider: 'gemini' },
      });
    }
    
    await storage.createAssistantMessage({ 
      sessionId, 
      role: 'user', 
      content: message, 
      metadata: { timestamp: new Date().toISOString(), provider: 'gemini' } 
    });
  } catch (error) {
    console.warn('Erro ao salvar mensagem Gemini:', error);
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
    await storage.createAssistantMessage({
      sessionId,
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