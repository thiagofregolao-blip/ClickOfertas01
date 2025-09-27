export function gerarSaudacao(nome: string, horaLocal?: number) {
  const hora = horaLocal ?? new Date().getHours();
  const base = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  return `${base}, ${nome}! 👋`;
}

export function saudacaoInicial(mensagens: any[]) {
  return mensagens.length <= 1;
}

export function classificarIntencao(msg: string) {
  const texto = msg.toLowerCase();
  if (/qual seu nome|quem é você|quem está falando/.test(texto)) return 'pergunta_sobre_ia';
  if (/que horas são|hora agora/.test(texto)) return 'pergunta_hora';
  if (/^(bom dia|boa tarde|boa noite|oi|olá)$/i.test(texto.trim())) return 'saudacao';
  return null;
}

export function responderPorIntencao(tipo: string | null, nome: string, horaLocal?: number) {
  switch (tipo) {
    case 'pergunta_sobre_ia':
      return `Sou seu assistente de compras, ${nome}! Sempre pronto pra te ajudar a encontrar o que quiser 🛍️`;
    case 'pergunta_hora':
      const hora = horaLocal ? `${horaLocal}:00` : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `Agora são ${hora} aqui! Quer aproveitar pra ver as ofertas da manhã? ☀️`;
    case 'saudacao':
      return `${gerarSaudacao(nome, horaLocal)} Me diz o que você está procurando hoje.`;
    default:
      return null;
  }
}

export function interpretarFraseProduto(msg: string, memoria: any) {
  const texto = msg.toLowerCase();

  const produto = /\b(iphone|galaxy|drone|perfume|notebook|laptop|celular|smartphone|tablet|fone|mouse|teclado|monitor|tv|smartwatch|airpods)\b/.exec(texto)?.[0];
  const modelo = /\b(12|13|14|15|16|s22|s23|s24|128gb|256gb|512gb|1tb|pro|max|mini|se|plus|ultra)\b/.exec(texto)?.[0];
  const marca = /\b(apple|samsung|xiaomi|dior|calvin klein|lg|motorola|dell|asus|nike|adidas|sony|hp|lenovo|acer)\b/.exec(texto)?.[0];
  const tipo = /\b(masculino|feminino|compacto|potente|boa câmera|câmera|bateria|barato|caro|novo|usado|original|importado|nacional|gamer|profissional|básico)\b/.exec(texto)?.[0];

  let query = '';
  if (produto) query += produto;
  if (modelo) query += ` ${modelo}`;
  if (marca) query += ` ${marca}`;
  if (tipo) query += ` ${tipo}`;

  // fallback: usar última busca se não tiver produto explícito
  if (!produto && memoria?.ultimaBusca) query = `${memoria.ultimaBusca} ${texto}`;

  return query.trim() || null;
}

export function interpretarRefinamento(message: string, memoria: any) {
  // Usar nova função semântica primeiro
  const querySemantica = interpretarFraseProduto(message, memoria);
  if (querySemantica) return querySemantica;
  
  // Fallback para lógica antiga
  const msg = message.toLowerCase();
  const ultimaBusca = memoria?.ultimaBusca?.toLowerCase();
  if (ultimaBusca?.includes('iphone') && /\b(12|13|15)\b/.test(msg)) {
    return `iphone ${msg.match(/\b(12|13|15)\b/)![0]}`;
  }
  return null;
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
  const segmento = detectarSegmento(query);
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
  if (/iphone/i.test(query)) return 'Prefere linha 12, 13 ou 15?';
  if (/drone/i.test(query)) return 'Quer um modelo compacto ou com câmera parruda?';
  if (/perfume/i.test(query)) return 'Tem alguma marca favorita (Dior, Calvin Klein...)?';
  if (/notebook|laptop/i.test(query)) return 'Quer um modelo gamer, profissional ou básico?';
  return '';
}

export function gerarFollowUp(query: string) {
  if (/iphone/i.test(query)) return 'Prefere linha 12, 13 ou 15?';
  if (/drone/i.test(query)) return 'Quer um modelo compacto ou com câmera parruda?';
  if (/perfume/i.test(query)) return 'Tem alguma marca favorita (Dior, Calvin Klein...)?';
  if (/notebook|laptop/i.test(query)) return 'Quer um modelo gamer, profissional ou básico?';
  return '';
}

function detectarSegmento(query: string) {
  if (/perfume/i.test(query)) return 'perfumes';
  if (/iphone|celular|smartphone/i.test(query)) return 'celulares';
  if (/drone/i.test(query)) return 'drones';
  if (/notebook|laptop/i.test(query)) return 'notebooks';
  return 'produtos';
}