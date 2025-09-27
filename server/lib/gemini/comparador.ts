const produtosCatalogo: Record<string, any> = {
  'iphone 12': {
    modelo: 'iPhone 12',
    chip: 'A14 Bionic',
    camera: 'Dupla 12MP',
    tela: 'OLED 6.1"',
    preco: 450
  },
  'iphone 13': {
    modelo: 'iPhone 13',
    chip: 'A15 Bionic',
    camera: 'Dupla 12MP com estabilização',
    tela: 'OLED 6.1"',
    preco: 500
  },
  'iphone 14': {
    modelo: 'iPhone 14',
    chip: 'A15 Bionic',
    camera: 'Dupla 12MP avançada',
    tela: 'OLED 6.1"',
    preco: 580
  },
  'iphone 15': {
    modelo: 'iPhone 15',
    chip: 'A16 Bionic',
    camera: 'Tripla 48MP',
    tela: 'OLED 6.1" ProMotion',
    preco: 650
  },
  'iphone 16': {
    modelo: 'iPhone 16',
    chip: 'A17 Pro',
    camera: 'Tripla 48MP + IA',
    tela: 'OLED 6.1" ProMotion 120Hz',
    preco: 750
  },
  'galaxy s22': {
    modelo: 'Galaxy S22',
    chip: 'Snapdragon 8 Gen 1',
    camera: 'Tripla 50MP',
    tela: 'AMOLED 6.1" 120Hz',
    preco: 400
  },
  'galaxy s23': {
    modelo: 'Galaxy S23',
    chip: 'Snapdragon 8 Gen 2',
    camera: 'Tripla 50MP melhorada',
    tela: 'AMOLED 6.1" 120Hz',
    preco: 480
  },
  'galaxy s24': {
    modelo: 'Galaxy S24',
    chip: 'Snapdragon 8 Gen 3',
    camera: 'Tripla 50MP + IA',
    tela: 'AMOLED 6.2" 120Hz',
    preco: 550
  }
};

export function detectarComparacao(msg: string) {
  return /\b(versus|vs|comparar|diferença entre|qual melhor|compare)\b/.test(msg.toLowerCase());
}

export function extrairModelosComparacao(msg: string) {
  const modelos: string[] = [];
  const texto = msg.toLowerCase();
  
  // Buscar iPhones
  ['12', '13', '14', '15', '16'].forEach(num => {
    if (texto.includes(num) && (texto.includes('iphone') || texto.includes('linha'))) {
      modelos.push(`iphone ${num}`);
    }
  });
  
  // Buscar Galaxy
  ['s22', 's23', 's24'].forEach(modelo => {
    if (texto.includes(modelo)) {
      modelos.push(`galaxy ${modelo}`);
    }
  });
  
  return modelos;
}

export function gerarComparacao(modelos: string[]) {
  if (modelos.length < 2) return 'Me diga dois modelos que você quer comparar 😉';

  const [m1, m2] = modelos;
  const p1 = produtosCatalogo[m1];
  const p2 = produtosCatalogo[m2];

  if (!p1 || !p2) return 'Não encontrei dados suficientes para comparar esses modelos 😕';

  return `📱 Comparando ${p1.modelo} vs ${p2.modelo}:\n\n` +
    `• Chip: ${p1.chip} vs ${p2.chip}\n` +
    `• Câmera: ${p1.camera} vs ${p2.camera}\n` +
    `• Tela: ${p1.tela} vs ${p2.tela}\n` +
    `• Preço estimado: $${p1.preco} vs $${p2.preco}\n\n` +
    `Me diz qual te interessou mais que eu te mostro as ofertas! 🔥`;
}