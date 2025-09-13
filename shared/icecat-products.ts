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

  // REDES & CONECTIVIDADE (TP-LINK) - Muito populares no Paraguay
  {
    gtin: "0840030707681",
    name: "TP-Link EP25P4 Smart Plug",
    brand: "TP-Link",
    category: "Redes",
    description: "Tomada inteligente TP-Link com monitoramento de energia",
    popular: true
  },
  {
    gtin: "6935364098865",
    name: "Roteador TP-Link Archer",
    brand: "TP-Link", 
    category: "Redes",
    description: "Roteador wireless TP-Link série Archer",
    popular: true
  },
  {
    gtin: "6935364089641",
    name: "Switch TP-Link",
    brand: "TP-Link",
    category: "Redes", 
    description: "Switch de rede TP-Link",
    popular: false
  },

  // ARMAZENAMENTO & MEMÓRIA (KINGSTON) - Essenciais para lojas
  {
    gtin: "0740617248920",
    name: "Kingston USB Flash Drive",
    brand: "Kingston",
    category: "Armazenamento",
    description: "Pen drive Kingston USB 3.0",
    popular: true
  },
  {
    gtin: "0740617266948", 
    name: "Kingston MicroSD Card",
    brand: "Kingston",
    category: "Armazenamento",
    description: "Cartão MicroSD Kingston",
    popular: true
  },
  {
    gtin: "0740617268393",
    name: "Kingston SSD",
    brand: "Kingston",
    category: "Armazenamento",
    description: "SSD Kingston SATA",
    popular: true
  },

  // PERIFÉRICOS (LOGITECH) - Muito demandados
  {
    gtin: "5099206070561",
    name: "Logitech MX Master",
    brand: "Logitech",
    category: "Periféricos",
    description: "Mouse wireless Logitech MX Master",
    popular: true
  },
  {
    gtin: "5099206055075",
    name: "Logitech Keyboard", 
    brand: "Logitech",
    category: "Periféricos",
    description: "Teclado wireless Logitech",
    popular: true
  },
  {
    gtin: "5099206089709",
    name: "Logitech Webcam",
    brand: "Logitech", 
    category: "Periféricos",
    description: "Webcam Logitech HD",
    popular: true
  },

  // ÁUDIO (MARCAS POPULARES) - Alta demanda no Paraguay
  {
    gtin: "6925281982286",
    name: "JBL Go Speaker",
    brand: "JBL",
    category: "Áudio",
    description: "Caixa de som bluetooth JBL Go",
    popular: true
  },
  {
    gtin: "4548736094454",
    name: "Sony Headphones",
    brand: "Sony", 
    category: "Áudio",
    description: "Fone de ouvido Sony",
    popular: true
  },

  // BRINQUEDOS & LAZER (LEGO) - Sempre populares
  {
    gtin: "5702016889772",
    name: "LEGO Holiday Camper Van",
    brand: "LEGO",
    category: "Brinquedos",
    description: "Kit LEGO Holiday Camper Van",
    popular: true
  },
  {
    gtin: "5702016914429",
    name: "LEGO Creator 3-in-1",
    brand: "LEGO",
    category: "Brinquedos", 
    description: "Set LEGO Creator 3-em-1",
    popular: true
  },
  {
    gtin: "5702016367812",
    name: "LEGO Star Wars",
    brand: "LEGO",
    category: "Brinquedos",
    description: "Set LEGO Star Wars",
    popular: true
  },

  // CONSOLES & GAMES - Altíssima demanda
  {
    gtin: "0711719709695",
    name: "PlayStation 5 Console",
    brand: "Sony",
    category: "Consoles",
    description: "Console PlayStation 5",
    popular: true
  },
  {
    gtin: "0045496596439", 
    name: "Nintendo Switch Game",
    brand: "Nintendo",
    category: "Games",
    description: "Jogo para Nintendo Switch",
    popular: true
  },

  // ELETROPORTÁTEIS (PHILIPS) - Populares em fronteiras
  {
    gtin: "8710103814799",
    name: "Philips Hair Dryer",
    brand: "Philips",
    category: "Eletroportáteis",
    description: "Secador de cabelo Philips",
    popular: true
  },
  {
    gtin: "8710103715641",
    name: "Philips Electric Toothbrush",
    brand: "Philips",
    category: "Eletroportáteis", 
    description: "Escova de dente elétrica Philips",
    popular: false
  },

  // SMARTPHONES & ACESSÓRIOS - Categoria #1 no Paraguay
  {
    gtin: "8806092346185",
    name: "Samsung Galaxy Accessory",
    brand: "Samsung",
    category: "Smartphones",
    description: "Acessório Samsung Galaxy",
    popular: true
  },
  {
    gtin: "0194252056417",
    name: "Apple Lightning Cable",
    brand: "Apple",
    category: "Smartphones", 
    description: "Cabo Lightning Apple",
    popular: true
  },

  // CARREGADORES & POWER BANKS - Sempre em alta
  {
    gtin: "6971536922831",
    name: "Anker PowerBank",
    brand: "Anker",
    category: "Acessórios",
    description: "Power bank Anker",
    popular: true
  },
  {
    gtin: "6941812709979",
    name: "Fast Charger",
    brand: "Diversos",
    category: "Acessórios",
    description: "Carregador rápido USB-C",
    popular: true
  }
];

export const PRODUCT_CATEGORIES = [
  "Todos",
  "Smartphones",      // #1 categoria mais popular no Paraguay
  "Acessórios",       // Carregadores, power banks, capas, cabos
  "Redes",           // TP-Link, roteadores, switches, access points
  "Armazenamento",   // Kingston, SanDisk, pen drives, SSD, cartões
  "Periféricos",     // Logitech, mouses, teclados, webcams
  "Áudio",           // JBL, Sony, fones, caixas de som, bluetooth
  "Consoles",        // PlayStation, Xbox, Nintendo Switch
  "Games",           // Jogos para consoles
  "Brinquedos",      // LEGO, jogos, brinquedos eletrônicos
  "Eletroportáteis", // Philips, secadores, escovas, produtos pessoais
  "Eletrônicos",     // Categoria geral
  "Computadores"     // PCs, laptops, componentes
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

/**
 * Busca produtos por categoria
 */
export function getProductsByCategory(category: ProductCategory): IcecatKnownProduct[] {
  if (category === "Todos") {
    return [...ICECAT_KNOWN_PRODUCTS].sort((a, b) => {
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