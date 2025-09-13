/**
 * Base de produtos testados que funcionam no Icecat Open Catalog
 * Organizados por categoria para facilitar a busca
 */

export interface IcecatKnownProduct {
  gtin: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  popular: boolean; // Produtos mais buscados aparecem primeiro
}

export const ICECAT_KNOWN_PRODUCTS: IcecatKnownProduct[] = [
  // ELETRÔNICOS & COMPUTADORES
  {
    gtin: "4948570114344",
    name: "Produto Eletrônico",
    brand: "Diversos",
    category: "Eletrônicos",
    description: "Produto eletrônico testado",
    popular: true
  },
  {
    gtin: "4710614535640", 
    name: "Hardware de Computador",
    brand: "Diversos",
    category: "Computadores",
    description: "Hardware/componente de computador",
    popular: true
  },
  {
    gtin: "0882780751682",
    name: "Produto HP",
    brand: "HP",
    category: "Computadores",
    description: "Produto da marca HP",
    popular: true
  },
  
  // BRINQUEDOS & LAZER
  {
    gtin: "5702016889772",
    name: "LEGO Holiday Camper Van",
    brand: "LEGO",
    category: "Brinquedos",
    description: "Kit LEGO Holiday Camper Van",
    popular: true
  },
  
  // CONSOLES & GAMES (que sabemos que funcionam)
  {
    gtin: "0711719709695", // PS5 que já testamos
    name: "PlayStation 5 Console",
    brand: "Sony",
    category: "Consoles",
    description: "Console PlayStation 5",
    popular: true
  }
];

export const PRODUCT_CATEGORIES = [
  "Todos",
  "Eletrônicos", 
  "Computadores",
  "Consoles",
  "Brinquedos",
  "Eletrodomésticos",
  "Casa & Jardim",
  "Smartphones",
  "Áudio & Video",
  "Câmeras"
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

/**
 * Busca produtos por categoria
 */
export function getProductsByCategory(category: ProductCategory): IcecatKnownProduct[] {
  if (category === "Todos") {
    return ICECAT_KNOWN_PRODUCTS.sort((a, b) => {
      // Populares primeiro
      if (a.popular && !b.popular) return -1;
      if (!a.popular && b.popular) return 1;
      // Depois por nome
      return a.name.localeCompare(b.name);
    });
  }
  
  return ICECAT_KNOWN_PRODUCTS
    .filter(p => p.category === category)
    .sort((a, b) => {
      if (a.popular && !b.popular) return -1;
      if (!a.popular && b.popular) return 1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Busca produtos por texto (nome, marca ou descrição)
 */
export function searchProducts(query: string): IcecatKnownProduct[] {
  const searchTerm = query.toLowerCase().trim();
  
  if (!searchTerm) {
    return getProductsByCategory("Todos");
  }
  
  return ICECAT_KNOWN_PRODUCTS.filter(product =>
    product.name.toLowerCase().includes(searchTerm) ||
    product.brand.toLowerCase().includes(searchTerm) ||
    product.description.toLowerCase().includes(searchTerm) ||
    product.gtin.includes(searchTerm)
  ).sort((a, b) => {
    // Populares primeiro
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    
    // Matches exatos no nome primeiro
    const aNameMatch = a.name.toLowerCase().includes(searchTerm);
    const bNameMatch = b.name.toLowerCase().includes(searchTerm);
    if (aNameMatch && !bNameMatch) return -1;
    if (!aNameMatch && bNameMatch) return 1;
    
    return a.name.localeCompare(b.name);
  });
}