/**
 * Formata preços no padrão brasileiro
 * Exemplos: 18 → 18,00 | 1500 → 1.500,00 | 1234.56 → 1.234,56
 */
export function formatBrazilianPrice(value: string | number): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0,00';
  
  return numValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Formata preços para exibição com moeda
 */
export function formatPriceWithCurrency(value: string | number, currency: string = 'US$'): string {
  return `${currency} ${formatBrazilianPrice(value)}`;
}