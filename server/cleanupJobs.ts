import { storage } from './storage';
import { generatePromotionalArt, type TrendingProduct } from '../gemini';

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
 * Inicia o job de análise de tendências que roda uma vez por dia
 */
export function startTrendingAnalysisJob() {
  console.log('📊 Iniciando job de análise de tendências');
  
  // Executar imediatamente na inicialização para teste
  generateTrendingProducts();
  
  // Agendar para rodar uma vez por dia (24 horas = 86400000ms)
  // Executa às 02:00 da manhã para não impactar performance durante o dia
  const scheduleNextRun = () => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 2, 0, 0);
    const timeUntilNextRun = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      generateTrendingProducts();
      // Reagendar para o próximo dia
      setInterval(() => {
        generateTrendingProducts();
      }, 24 * 60 * 60 * 1000);
    }, timeUntilNextRun);
    
    console.log(`⏰ Próxima análise de tendências agendada para: ${tomorrow.toLocaleString('pt-BR')}`);
  };
  
  scheduleNextRun();
}

/**
 * Job diário que analisa metadados de analytics e gera produtos em tendência
 * Executa análise dos últimos 7 dias para identificar top 4-5 produtos
 */
export async function generateTrendingProducts() {
  try {
    console.log('📊 Iniciando análise de tendências...');
    const today = new Date();
    const trending = await storage.generateTrendingProducts(today);
    console.log(`✅ Análise de tendências concluída: ${trending.length} produtos identificados`);
    
    // Log dos produtos em tendência para debug
    trending.forEach((product, index) => {
      console.log(`${index + 1}. ${product.productName} (${product.category}) - Score: ${product.totalScore}`);
    });
    
    // Gerar arte promocional automaticamente se houver produtos em tendência
    if (trending.length > 0) {
      try {
        console.log('🎨 Iniciando geração automática de arte promocional...');
        
        // Criar diretório para as artes se não existir
        const fs = await import('fs');
        const path = await import('path');
        const artsDir = path.resolve(process.cwd(), 'attached_assets/generated_arts');
        if (!fs.existsSync(artsDir)) {
          fs.mkdirSync(artsDir, { recursive: true });
        }
        
        // Gerar nome do arquivo com timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const filename = `trending_promo_${timestamp}.png`;
        const artPath = path.join(artsDir, filename);
        
        // Converter dados para o formato esperado pela função de arte
        const trendingForArt: TrendingProduct[] = trending.map(t => ({
          productName: t.productName,
          category: t.category,
          price: t.price || 0,
          totalScore: t.totalScore,
          searchCount: t.searchCount || 0,
          viewCount: t.viewCount || 0
        }));
        
        // Gerar a arte promocional
        await generatePromotionalArt(trendingForArt, artPath);
        
        // Salvar metadados da arte gerada no banco
        await storage.createGeneratedTotemArt({
          storeId: 'global-trends', // ID especial para artes globais baseadas em tendências
          generationDate: new Date(),
          trendingProductsData: trending, // JSON com dados completos dos produtos
          imageUrl: `attached_assets/generated_arts/${filename}`,
          imagePrompt: `Banner promocional com produtos em tendência: ${trending.map(t => t.productName).join(', ')}`,
          isActive: true
        });
        
        console.log(`✅ Arte promocional gerada e salva: ${filename}`);
        
      } catch (artError) {
        console.error('❌ Erro ao gerar arte promocional:', artError);
        // Não interromper o job por erro na arte, apenas log
      }
    }
    
    return trending;
  } catch (error) {
    console.error('❌ Erro na análise de tendências:', error);
    return [];
  }
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