export async function buscarOfertas(args: { query: string; maxResultados?: number }) {
  const { query, maxResultados = 12 } = args || {};
  
  const q = String(query || "").toLowerCase().trim();
  if (!q) return [];
  
  try {
    const { searchSuggestions } = await import('../tools.js');
    const searchResult = await searchSuggestions(q);
    
    let products = searchResult.products || [];
    
    // Ranking simples por preço
    products.sort((a: any, b: any) => (a.price?.USD || 0) - (b.price?.USD || 0));
    const sorted = products.slice(0, Math.max(1, Math.min(50, maxResultados)));
    
    return sorted;
  } catch (error) {
    console.error('Erro na busca Gemini:', error);
    return [];
  }
}