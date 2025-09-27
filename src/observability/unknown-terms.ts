// src/observability/unknown-terms.ts
const hits = new Map<string, number>();

export function trackUnknownToken(token: string) {
  const k = token.trim();
  if (!k) return;
  hits.set(k, (hits.get(k) ?? 0) + 1);
}

export function snapshotUnknown() {
  return [...hits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100);
}

export function clearUnknownTokens() {
  hits.clear();
}

export function getUnknownStats() {
  return {
    uniqueTerms: hits.size,
    totalOccurrences: Array.from(hits.values()).reduce((a, b) => a + b, 0)
  };
}