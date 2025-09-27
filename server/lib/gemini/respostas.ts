export function gerarSaudacao(nome: string, horaLocal?: number) {
  const hora = horaLocal ?? new Date().getHours();
  const base = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  return `${base}, ${nome}! 👋`;
}

export function saudacaoInicial(mensagens: any[]) {
  return mensagens.length <= 1;
}

export function detectarIntencaoFollowUp(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('gostei') || m.includes('quero esse')) return 'confirmar';
  if (m.includes('não gostei') || m.includes('mostra outros')) return 'rejeitar';
  if (m.includes('128gb') || m.includes('mais barato')) return 'refinar';
  return null;
}

export function responderFollowUp(tipo: string) {
  switch (tipo) {
    case 'confirmar': return 'Ótima escolha! Posso te ajudar a finalizar ou mostrar acessórios 🛍️';
    case 'rejeitar': return 'Sem problemas! Vou buscar outras opções que talvez te agradem mais 🔄';
    case 'refinar': return 'Entendi! Vou ajustar a busca com base no que você quer 🔍';
    default: return 'Se quiser refinar ou ver mais, é só me dizer 😉';
  }
}

export function gerarRespostaConversacional(query: string, produtos: any[], memoria: any) {
  if (produtos.length === 0) return 'Não achei nada com esse termo. Me dá mais detalhes que eu busco certinho 🙂';
  const segmento = detectarSegmento(query, produtos);
  const marcaFavorita = memoria?.marca_preferida;

  const frases = [
    `Olha só, ${segmento} é comigo mesmo! Separei umas opções que estão com preço ótimo 💸`,
    `Você vai curtir essas sugestões de ${segmento}. Se quiser algo mais específico, me dá um toque 😉`,
    `Tem bastante coisa boa rolando em ${segmento}. Dá uma olhada e me diz o que achou 👀`,
    `Separei umas opções de ${segmento} que estão fazendo sucesso. Se tiver uma marca em mente, me fala que eu afino a busca 🔍`
  ];

  if (marcaFavorita) {
    frases.push(`Como você curte ${marcaFavorita}, achei umas opções que podem te agradar 😎`);
  }

  return frases[Math.floor(Math.random() * frases.length)];
}

export function gerarPerguntaLeve(query: string) {
  if (/iphone/i.test(query)) return 'Prefere linha 13 ou 15?';
  if (/drone/i.test(query)) return 'Quer um modelo compacto ou com câmera parruda?';
  if (/perfume/i.test(query)) return 'Tem alguma marca favorita (Dior, Calvin Klein...)?';
  return '';
}

function detectarSegmento(query: string, produtos: any[]) {
  if (/perfume/i.test(query)) return 'perfumes';
  if (/iphone|celular|smartphone/i.test(query)) return 'celulares';
  if (/drone/i.test(query)) return 'drones';
  return 'produtos';
}