/**
 * 🎯 SHARED SEARCH INTELLIGENCE MODULE
 * 
 * This module contains the intelligent search logic extracted from intelligent-vendor.ts
 * to be reused across different API endpoints (/api/click/suggest, /api/search, etc.)
 * 
 * Key Features:
 * - Smart entity extraction (brands, models, categories)
 * - Automatic category inference from brands
 * - Relevance scoring with category validation
 * - Strict filtering mode for specific searches
 */

export interface SearchEntities {
  brands: string[];
  models: string[];
  categories: string[];
  priceRange?: { min?: number; max?: number };
  inferredCategories?: string[];
}

export interface ProductForScoring {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  price?: number;
}

/**
 * Brand patterns with associated categories for auto-inference
 */
const BRAND_PATTERNS: Record<string, { patterns: string[], categories: string[] }> = {
  'apple': { 
    patterns: ['apple', 'iphone', 'ipad', 'macbook'], 
    categories: ['celular', 'smartphone', 'tablet', 'notebook'] 
  },
  'samsung': { 
    patterns: ['samsung', 'galaxy'], 
    categories: ['celular', 'smartphone', 'tv', 'eletronicos'] 
  },
  'xiaomi': { 
    patterns: ['xiaomi', 'redmi', 'poco'], 
    categories: ['celular', 'smartphone', 'eletronicos'] 
  },
  'motorola': { 
    patterns: ['motorola', 'moto'], 
    categories: ['celular', 'smartphone'] 
  },
  'lg': { 
    patterns: ['lg'], 
    categories: ['celular', 'smartphone', 'tv', 'eletronicos'] 
  },
  'sony': { 
    patterns: ['sony', 'playstation', 'ps5', 'ps4'], 
    categories: ['eletronicos', 'games', 'console'] 
  },
  'dell': { 
    patterns: ['dell'], 
    categories: ['notebook', 'computador', 'laptop'] 
  },
  'hp': { 
    patterns: ['hp'], 
    categories: ['notebook', 'computador', 'laptop'] 
  },
  'lenovo': { 
    patterns: ['lenovo'], 
    categories: ['notebook', 'computador', 'laptop'] 
  },
  'asus': { 
    patterns: ['asus'], 
    categories: ['notebook', 'computador', 'laptop'] 
  },
  'acer': { 
    patterns: ['acer'], 
    categories: ['notebook', 'computador', 'laptop'] 
  }
};

/**
 * Normalize text: remove accents and convert to lowercase
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Extract search entities with automatic category inference
 */
export function extractSearchEntities(message: string): SearchEntities {
  const messageLower = message.toLowerCase();
  const entities: SearchEntities = {
    brands: [],
    models: [],
    categories: [],
    inferredCategories: []
  };

  // Detect brands and AUTO-INFER categories
  for (const [brand, config] of Object.entries(BRAND_PATTERNS)) {
    if (config.patterns.some(p => messageLower.includes(p))) {
      entities.brands.push(brand);
      // Auto-infer categories from brand
      config.categories.forEach(cat => {
        if (!entities.inferredCategories!.includes(cat)) {
          entities.inferredCategories!.push(cat);
        }
      });
      console.log(`🏷️ [Search Intelligence] Brand detected: "${brand}" → Inferred categories: [${config.categories.join(', ')}]`);
    }
  }

  // Detect models (numbers in the search)
  const numberPattern = /\b\d{1,4}\b/g;
  const numbers = message.match(numberPattern);
  if (numbers) {
    entities.models.push(...numbers);
  }

  // Detect specific model patterns
  const modelPatterns = [
    /iphone\s*(\d+)/gi,
    /galaxy\s*[sa]?(\d+)/gi,
    /redmi\s*(\d+)/gi,
    /moto\s*g?(\d+)/gi,
    /ps(\d+)/gi
  ];

  for (const pattern of modelPatterns) {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        entities.models.push(match[1]);
      }
    }
  }

  // Explicit categories
  const categoryPatterns = {
    'celular': ['celular', 'smartphone', 'telefone', 'iphone', 'galaxy'],
    'notebook': ['notebook', 'laptop', 'computador'],
    'tv': ['tv', 'televisão', 'televisao', 'smart tv'],
    'perfume': ['perfume', 'fragrância', 'fragrancia', 'colônia', 'colonia'],
    'roupa': ['roupa', 'blusa', 'camisa', 'camiseta', 'vestido', 'calça', 'calca'],
    'sapato': ['sapato', 'tênis', 'tenis', 'sandália', 'sandalia', 'bota'],
    'fone': ['fone', 'headphone', 'earphone', 'airpods'],
    'tablet': ['tablet', 'ipad'],
    'console': ['console', 'playstation', 'xbox', 'nintendo'],
    'drone': ['drone']
  };

  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    if (patterns.some(p => messageLower.includes(p))) {
      if (!entities.categories.includes(category)) {
        entities.categories.push(category);
      }
    }
  }

  // Merge inferred categories with explicit ones
  if (entities.inferredCategories && entities.inferredCategories.length > 0) {
    entities.inferredCategories.forEach(cat => {
      if (!entities.categories.includes(cat)) {
        entities.categories.push(cat);
      }
    });
  }

  // Price range detection
  const priceMatch = messageLower.match(/(?:até|max|máximo|maximo)\s*(?:r\$|usd?)?\s*(\d+)/i);
  if (priceMatch) {
    entities.priceRange = { max: parseInt(priceMatch[1]) };
  }

  return entities;
}

/**
 * Calculate relevance score with category validation and penalties
 */
export function calculateRelevanceScore(
  product: ProductForScoring,
  searchTerm: string,
  entities: SearchEntities,
  strictMode: boolean = false
): number {
  let score = 0;
  
  const productName = normalizeText(product.name || '');
  const productBrand = normalizeText(product.brand || '');
  const productCategory = normalizeText(product.category || '');
  const searchNormalized = normalizeText(searchTerm);

  const searchTokens = searchNormalized
    .split(/\s+/)
    .filter(token => token.length >= 3);

  console.log(`📊 [Search Intelligence] Scoring "${product.name}" | Search: "${searchTerm}" | Strict: ${strictMode}`);

  // PRIORITY 1: Exact match in name (150 points)
  if (productName.includes(searchNormalized)) {
    score += 150;
    console.log(`✅ Exact name match: +150`);
  }

  // PRIORITY 2: Token matching with higher weights
  searchTokens.forEach(token => {
    if (productName.includes(token)) {
      score += 60;
      console.log(`✅ Token "${token}" in name: +60`);
    } else if (productBrand.includes(token)) {
      score += 50;
      console.log(`✅ Token "${token}" in brand: +50`);
    } else if (productCategory.includes(token)) {
      score += 40;
      console.log(`✅ Token "${token}" in category: +40`);
    }
  });

  // PRIORITY 3: Exact number matching (120 points)
  const numberPattern = /\d+/g;
  const searchNumbers = searchTerm.match(numberPattern);
  const productNumbers = product.name.match(numberPattern);
  
  if (searchNumbers && productNumbers) {
    const exactNumberMatch = searchNumbers.some(num => productNumbers.includes(num));
    if (exactNumberMatch) {
      score += 120;
      console.log(`✅ Exact number match: +120`);
    }
  }

  // Model matching (60 points)
  if (entities.models.length > 0) {
    const modelMatch = entities.models.some(model => 
      productName.includes(normalizeText(model))
    );
    if (modelMatch) {
      score += 60;
      console.log(`✅ Model match: +60`);
    }
  }

  // Brand matching (40 points)
  if (entities.brands.length > 0) {
    const brandMatch = entities.brands.some(brand => {
      const brandNormalized = normalizeText(brand);
      return productBrand.includes(brandNormalized) || productName.includes(brandNormalized);
    });
    if (brandMatch) {
      score += 40;
      console.log(`✅ Brand match: +40`);
    }
  }

  // Category validation with bonus/penalty
  if (entities.categories.length > 0) {
    const categoryMatch = entities.categories.some(cat => 
      productCategory.includes(normalizeText(cat))
    );
    
    if (categoryMatch) {
      score += 30;
      console.log(`✅ Category match: +30`);
    } else if (strictMode) {
      // Heavy penalty for wrong category in strict mode
      score -= 100;
      console.log(`❌ Wrong category (strict mode): -100`);
    }
  }

  console.log(`📊 [Search Intelligence] Final score: ${score}`);
  return Math.max(0, score);
}

/**
 * Determine if strict category filtering should be applied
 */
export function shouldUseStrictMode(entities: SearchEntities): boolean {
  const hasSpecificBrandOrModel = entities.brands.length > 0 || entities.models.length > 0;
  const shouldEnforceCategory = hasSpecificBrandOrModel && entities.categories.length > 0;
  
  if (shouldEnforceCategory) {
    console.log(`🔒 [Search Intelligence] STRICT MODE: Enforcing category filter for brands/models`);
  }
  
  return shouldEnforceCategory;
}

/**
 * Get minimum score threshold based on mode
 */
export function getScoreThreshold(strictMode: boolean): number {
  return strictMode ? 50 : 30;
}
