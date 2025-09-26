/** Utilitários para extrair e validar o JSON de produtos enviado pela IA misturado no texto. */

export interface ProductItem {
  id: string;
  title: string;
  name?: string;
  category: string;
  priceUSD: number;
  premium: boolean;
  storeName: string;
  storeSlug: string;
  imageUrl: string;
}

export interface ParsedAssistantPayload {
  type: 'products';
  query: string;
  products: ProductItem[];
  focusedProduct: ProductItem | null;
  recommendations: ProductItem[];
}

/** Encontra o primeiro objeto JSON que comece com {"type":"products" ...} */
export function extractProductsJson(message: string): string {
  if (typeof message !== 'string') {
    throw new Error('A mensagem deve ser string.');
  }
  
  const startIdx = message.indexOf('{"type":"products"');
  if (startIdx === -1) {
    throw new Error('Bloco {"type":"products"...} não encontrado na mensagem.');
  }

  // Varredura balanceada de chaves para achar o fim correto do JSON
  let depth = 0;
  let endIdx = -1;
  
  for (let i = startIdx; i < message.length; i++) {
    const ch = message[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }
  
  if (endIdx === -1) {
    throw new Error('JSON de produtos parece incompleto (chaves não balanceadas).');
  }
  
  const jsonSlice = message.slice(startIdx, endIdx + 1);
  return jsonSlice;
}

/** Remove o JSON de produtos da mensagem, retornando apenas o texto limpo */
export function removeProductsJsonFromText(message: string): string {
  try {
    const startIdx = message.indexOf('{"type":"products"');
    if (startIdx === -1) {
      return message; // Não há JSON para remover
    }

    // Encontrar o fim do JSON usando a mesma lógica
    let depth = 0;
    let endIdx = -1;
    
    for (let i = startIdx; i < message.length; i++) {
      const ch = message[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
    
    if (endIdx === -1) {
      return message; // JSON incompleto, manter como está
    }
    
    // Remover o bloco JSON e limpar espaços extras
    const beforeJson = message.slice(0, startIdx).trim();
    const afterJson = message.slice(endIdx + 1).trim();
    
    return [beforeJson, afterJson].filter(Boolean).join(' ').trim();
  } catch {
    return message; // Em caso de erro, retornar mensagem original
  }
}

/** Valida minimally o payload retornado pela IA. */
export function validatePayload(payload: any): { errors: string[], valid: ProductItem[] } {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload inválido.');
  }
  
  if (payload.type !== 'products') {
    throw new Error('type diferente de "products".');
  }

  if (!Array.isArray(payload.products)) {
    throw new Error('Campo "products" deve ser array.');
  }

  const errors: string[] = [];
  const valid: ProductItem[] = [];
  
  for (const p of payload.products) {
    const errs: string[] = [];
    
    if (!p || typeof p !== 'object') {
      errors.push('Item não é objeto.');
      continue;
    }
    
    if (!p.id) errs.push('id ausente');
    if (!p.title) errs.push('title ausente');
    if (!p.category) errs.push('category ausente');
    if (typeof p.priceUSD !== 'number') errs.push('priceUSD deve ser number');
    if (!p.storeName) errs.push('storeName ausente');
    if (!p.imageUrl) errs.push('imageUrl ausente');

    if (errs.length) {
      errors.push(`Produto ${p.id || '(sem id)'} com problemas: ${errs.join(', ')}`);
      continue;
    }
    
    valid.push(p);
  }

  return { errors, valid };
}

/** Normaliza campos e garante valores seguros. */
export function normalizePayload(payload: any, baseUrl?: string): ParsedAssistantPayload {
  const out: ParsedAssistantPayload = {
    type: 'products',
    query: String(payload.query || '').trim(),
    products: [],
    focusedProduct: payload.focusedProduct || null,
    recommendations: Array.isArray(payload.recommendations) ? payload.recommendations : []
  };

  // Normalizar URLs relativas
  const absolutize = (url: string): string => {
    try {
      if (!url) return url;
      // se já é absoluta
      if (/^https?:\/\//i.test(url)) return url;
      if (!baseUrl) return url; // sem baseUrl, deixa como veio
      const u = new URL(url, baseUrl);
      return u.href;
    } catch {
      return url;
    }
  };

  out.products = payload.products.map((p: any): ProductItem => ({
    id: String(p.id),
    title: String(p.title),
    name: p.name ? String(p.name) : String(p.title),
    category: String(p.category),
    priceUSD: Number(p.priceUSD),
    premium: Boolean(p.premium),
    storeName: String(p.storeName),
    storeSlug: p.storeSlug ? String(p.storeSlug) : '',
    imageUrl: absolutize(p.imageUrl)
  }));

  // Se focusedProduct = null mas há produtos, define o 1º como foco (opcional)
  if (!out.focusedProduct && out.products.length > 0) {
    out.focusedProduct = out.products[0];
  }

  return out;
}

/** Pipeline completo: extrai, parseia, valida, normaliza. */
export function parseAssistantProducts(message: string, baseUrl?: string): ParsedAssistantPayload {
  const jsonText = extractProductsJson(message);
  
  let raw: any;
  try {
    raw = JSON.parse(jsonText);
  } catch (e) {
    // Tenta limpar possíveis lixos (caracteres não imprimíveis)
    const cleaned = jsonText.replace(/\u0000/g, '');
    raw = JSON.parse(cleaned);
  }

  const { errors, valid } = validatePayload(raw);
  if (errors.length) {
    // Loga tudo e segue só com válidos
    console.warn('[assistantParser] Produtos com erro:', errors);
  }
  
  const safeRaw = { ...raw, products: valid };
  const normalized = normalizePayload(safeRaw, baseUrl);
  
  return normalized;
}

/** Verifica se a mensagem contém JSON de produtos */
export function hasProductsJson(message: string): boolean {
  return message.includes('{"type":"products"');
}