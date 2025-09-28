/**
 * Rastreamento de termos desconhecidos para melhorar canonização
 */

export type UnknownTerm = {
  term: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  contexts: string[]; // Frases onde apareceu
};

// Storage em memória (substituível por DB)
const UNKNOWN_TERMS = new Map<string, UnknownTerm>();

/**
 * Registra termo desconhecido
 * @param term - Termo não reconhecido
 * @param context - Contexto onde apareceu
 */
export function logUnknownTerm(term: string, context: string): void {
  const normalizedTerm = term.toLowerCase().trim();
  
  if (normalizedTerm.length < 3) return; // Ignora termos muito curtos
  
  const now = Date.now();
  
  if (UNKNOWN_TERMS.has(normalizedTerm)) {
    const existing = UNKNOWN_TERMS.get(normalizedTerm)!;
    existing.count++;
    existing.lastSeen = now;
    
    // Adiciona contexto se não existir
    if (!existing.contexts.includes(context)) {
      existing.contexts.push(context);
      // Limita a 5 contextos
      if (existing.contexts.length > 5) {
        existing.contexts.shift();
      }
    }
  } else {
    UNKNOWN_TERMS.set(normalizedTerm, {
      term: normalizedTerm,
      count: 1,
      firstSeen: now,
      lastSeen: now,
      contexts: [context]
    });
  }
}

/**
 * Obtém termos desconhecidos mais frequentes
 * @param limit - Número máximo de termos
 * @returns Array de termos ordenados por frequência
 */
export function getUnknownTerms(limit: number = 20): UnknownTerm[] {
  return Array.from(UNKNOWN_TERMS.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Obtém termos recentes
 * @param hoursAgo - Horas atrás para considerar
 * @returns Termos vistos recentemente
 */
export function getRecentUnknownTerms(hoursAgo: number = 24): UnknownTerm[] {
  const cutoff = Date.now() - (hoursAgo * 60 * 60 * 1000);
  
  return Array.from(UNKNOWN_TERMS.values())
    .filter(term => term.lastSeen > cutoff)
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

/**
 * Sugere mapeamentos canônicos baseados em termos frequentes
 * @returns Sugestões de mapeamento
 */
export function suggestCanonicalMappings(): Array<{
  unknownTerm: string;
  suggestedCanonical: string;
  confidence: number;
}> {
  const suggestions: Array<{
    unknownTerm: string;
    suggestedCanonical: string;
    confidence: number;
  }> = [];
  
  // Produtos conhecidos para matching fuzzy
  const knownProducts = [
    "iphone", "galaxy", "xiaomi", "tv", "notebook", "drone", "perfume",
    "blusa", "camisa", "tenis", "sapato", "geladeira", "fogao"
  ];
  
  const unknownTerms = getUnknownTerms(50);
  
  for (const unknown of unknownTerms) {
    if (unknown.count < 2) continue; // Só considera termos com 2+ ocorrências
    
    let bestMatch = "";
    let bestScore = 0;
    
    for (const known of knownProducts) {
      const score = calculateSimilarity(unknown.term, known);
      if (score > bestScore && score > 0.6) {
        bestScore = score;
        bestMatch = known;
      }
    }
    
    if (bestMatch) {
      suggestions.push({
        unknownTerm: unknown.term,
        suggestedCanonical: bestMatch,
        confidence: bestScore
      });
    }
  }
  
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calcula similaridade entre dois termos
 * @param a - Primeiro termo
 * @param b - Segundo termo
 * @returns Score 0-1
 */
function calculateSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  if (longer.length === 0) return 1.0;
  
  // Distância de Levenshtein simplificada
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calcula distância de Levenshtein
 * @param a - Primeira string
 * @param b - Segunda string
 * @returns Distância
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Limpa termos antigos
 * @param daysAgo - Remove termos mais antigos que X dias
 */
export function cleanOldUnknownTerms(daysAgo: number = 30): void {
  const cutoff = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
  
  for (const [term, data] of UNKNOWN_TERMS.entries()) {
    if (data.lastSeen < cutoff) {
      UNKNOWN_TERMS.delete(term);
    }
  }
}

/**
 * Exporta termos para análise
 * @returns Dados exportáveis
 */
export function exportUnknownTerms(): UnknownTerm[] {
  return Array.from(UNKNOWN_TERMS.values())
    .sort((a, b) => b.count - a.count);
}

/**
 * Importa termos de backup
 * @param terms - Termos a importar
 */
export function importUnknownTerms(terms: UnknownTerm[]): void {
  for (const term of terms) {
    UNKNOWN_TERMS.set(term.term, { ...term });
  }
}

/**
 * Obtém estatísticas dos termos desconhecidos
 * @returns Estatísticas
 */
export function getUnknownTermsStats(): {
  totalTerms: number;
  totalOccurrences: number;
  avgOccurrencesPerTerm: number;
  mostFrequent: string;
} {
  const terms = Array.from(UNKNOWN_TERMS.values());
  const totalTerms = terms.length;
  const totalOccurrences = terms.reduce((sum, term) => sum + term.count, 0);
  const mostFrequent = terms.sort((a, b) => b.count - a.count)[0]?.term || "";
  
  return {
    totalTerms,
    totalOccurrences,
    avgOccurrencesPerTerm: totalTerms > 0 ? totalOccurrences / totalTerms : 0,
    mostFrequent
  };
}