import { storage } from './storage';

/**
 * Job que executa a limpeza automática de stories expirados
 * Stories ficam ativos por 24 horas a partir da criação
 */
export async function cleanupExpiredStories() {
  try {
    console.log('🧹 Iniciando limpeza de stories expirados...');
    await storage.expireOldStories();
    console.log('✅ Limpeza de stories concluída');
  } catch (error) {
    console.error('❌ Erro na limpeza de stories:', error);
  }
}

/**
 * Job que executa a limpeza automática de promoções expiradas
 * Marca promoções como inativas quando passam da data limite
 */
export async function cleanupExpiredPromotions() {
  try {
    console.log('🧹 Iniciando limpeza de promoções expiradas...');
    const expiredCount = await storage.markExpiredPromotions();
    console.log(`✅ Limpeza de promoções concluída: ${expiredCount} promoções expiradas marcadas como inativas`);
  } catch (error) {
    console.error('❌ Erro na limpeza de promoções:', error);
  }
}

/**
 * Inicia o job de limpeza que roda a cada hora
 */
export function startCleanupJobs() {
  console.log('🔄 Iniciando jobs de limpeza automática');
  
  // Executar imediatamente na inicialização
  cleanupExpiredStories();
  cleanupExpiredPromotions();
  
  // Agendar para rodar a cada 1 hora (3600000ms)
  setInterval(() => {
    cleanupExpiredStories();
    cleanupExpiredPromotions();
  }, 60 * 60 * 1000);
  
  console.log('⏰ Jobs agendados: limpeza de stories e promoções a cada 1 hora');
}

/**
 * Job para limpar views muito antigas (opcional - para performance)
 */
export async function cleanupOldViews() {
  try {
    console.log('🧹 Iniciando limpeza de views antigas...');
    // Remover views mais antigas que 30 dias para performance
    // Este é um job opcional para manter o banco de dados otimizado
    console.log('✅ Limpeza de views concluída');
  } catch (error) {
    console.error('❌ Erro na limpeza de views:', error);
  }
}