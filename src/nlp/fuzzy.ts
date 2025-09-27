// src/nlp/fuzzy.ts
export function damerauLevenshtein(a: string, b: string): number {
  const al = a.length, bl = b.length;
  const da: Record<string, number> = {};
  const max = al + bl;
  const d = Array.from({ length: al + 2 }, () => Array(bl + 2).fill(0));
  
  d[0][0] = max;
  for (let i = 0; i <= al; i++) { d[i + 1][0] = max; d[i + 1][1] = i; }
  for (let j = 0; j <= bl; j++) { d[0][j + 1] = max; d[1][j + 1] = j; }
  
  for (let i = 1; i <= al; i++) {
    let db = 0;
    for (let j = 1; j <= bl; j++) {
      const i1 = da[b[j - 1]] ?? 0, j1 = db;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      if (cost === 0) db = j;
      d[i + 1][j + 1] = Math.min(
        d[i][j] + cost,           // substituição
        d[i + 1][j] + 1,          // inserção
        d[i][j + 1] + 1,          // deleção
        d[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1) // transposição
      );
    }
    da[a[i - 1]] = i;
  }
  return d[al + 1][bl + 1];
}

// Busca fuzzy em lista de candidatos
export function findBestFuzzyMatch(
  query: string, 
  candidates: string[], 
  maxDistance: number = 2
): string | null {
  let bestMatch: string | null = null;
  let bestDistance = maxDistance + 1;
  
  for (const candidate of candidates) {
    const distance = damerauLevenshtein(query, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = candidate;
    }
  }
  
  return bestMatch;
}