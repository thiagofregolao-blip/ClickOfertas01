import axios from 'axios';

// Cache simples para cotação
let cachedRate: { value: number; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora em milliseconds

/**
 * Busca a cotação atual USD → BRL
 * Usa cache de 1 hora para otimizar performance
 */
export async function getCurrentExchangeRate(): Promise<number> {
  // Verificar cache
  if (cachedRate && (Date.now() - cachedRate.timestamp) < CACHE_DURATION) {
    console.log(`💰 Usando cotação em cache: 1 USD = ${cachedRate.value} BRL`);
    return cachedRate.value;
  }

  try {
    console.log('🔄 Buscando cotação USD → BRL...');
    
    // API gratuita para cotação
    const response = await axios.get('https://api.exchangerate.host/latest', {
      params: {
        base: 'USD',
        symbols: 'BRL'
      },
      timeout: 5000
    });

    if (response.data && response.data.rates && response.data.rates.BRL) {
      const rate = response.data.rates.BRL;
      
      // Atualizar cache
      cachedRate = {
        value: rate,
        timestamp: Date.now()
      };
      
      console.log(`✅ Cotação atualizada: 1 USD = ${rate} BRL`);
      return rate;
    }
    
    throw new Error('Resposta inválida da API de cotação');
    
  } catch (error: any) {
    console.error('❌ Erro ao buscar cotação:', error.message);
    
    // Fallback para cotação padrão se API falhar
    const fallbackRate = 5.50;
    console.log(`⚠️ Usando cotação de fallback: 1 USD = ${fallbackRate} BRL`);
    
    return fallbackRate;
  }
}

/**
 * Converte valor de USD para BRL
 */
export async function convertUsdToBrl(usdAmount: number): Promise<number> {
  const rate = await getCurrentExchangeRate();
  return usdAmount * rate;
}

/**
 * Converte valor de BRL para USD
 */
export async function convertBrlToUsd(brlAmount: number): Promise<number> {
  const rate = await getCurrentExchangeRate();
  return brlAmount / rate;
}

/**
 * Formata valor monetário em BRL
 */
export function formatBRL(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
}

/**
 * Formata valor monetário em USD
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}