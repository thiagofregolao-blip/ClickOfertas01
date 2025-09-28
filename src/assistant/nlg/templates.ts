/**
 * Templates de resposta com rotação automática
 */

import { nextVariant, getSession } from "../core/session.js";

// Templates para encontrar resultados
const FOUND_TEMPLATES = {
  pt: [
    "Encontrei estas opções para você:",
    "Aqui estão os produtos que encontrei:",
    "Veja o que temos disponível:",
    "Estes produtos podem te interessar:",
    "Olha só que encontrei:",
  ],
  es: [
    "Encontré estas opciones para ti:",
    "Aquí están los productos que encontré:",
    "Mira lo que tenemos disponible:",
    "Estos productos pueden interesarte:",
    "Mira lo que encontré:",
  ]
};

// Templates para não encontrar resultados
const NOT_FOUND_TEMPLATES = {
  pt: [
    "Não encontrei produtos exatos, mas que tal tentar {suggestion}?",
    "Hmm, não achei nada específico. Talvez {suggestion}?",
    "Não temos isso no momento, mas posso sugerir {suggestion}.",
    "Produto não encontrado. Que tal experimentar {suggestion}?",
    "Ops, nada por aqui. Tenta {suggestion} que pode rolar!",
  ],
  es: [
    "No encontré productos exactos, ¿qué tal probar {suggestion}?",
    "Hmm, no encontré nada específico. ¿Tal vez {suggestion}?",
    "No tenemos eso ahora, pero puedo sugerir {suggestion}.",
    "Producto no encontrado. ¿Qué tal probar {suggestion}?",
    "Ups, nada por aquí. ¡Prueba {suggestion} que puede funcionar!",
  ]
};

// Templates para saudações
const GREETING_TEMPLATES = {
  pt: [
    "Olá! Como posso ajudar você a encontrar o melhor produto hoje?",
    "Oi! Me diga o que está procurando que eu encontro as melhores ofertas!",
    "E aí! Qual produto você quer ver hoje?",
    "Opa! Pronto para encontrar aquela promoção incrível?",
    "Oi! Diga o produto e eu mostro os melhores preços!",
  ],
  es: [
    "¡Hola! ¿Cómo puedo ayudarte a encontrar el mejor producto hoy?",
    "¡Hola! Dime qué buscas y encuentro las mejores ofertas.",
    "¡Hola! ¿Qué producto quieres ver hoy?",
    "¡Hola! ¿Listo para encontrar esa promoción increíble?",
    "¡Hola! Di el producto y te muestro los mejores precios.",
  ]
};

// Templates para cross-sell
const CROSS_SELL_TEMPLATES = {
  pt: [
    "Você também pode se interessar por: {suggestions}",
    "Outros produtos relacionados: {suggestions}",
    "Que tal dar uma olhada em: {suggestions}",
    "Também temos: {suggestions}",
    "Combina bem com: {suggestions}",
  ],
  es: [
    "También puede interesarte: {suggestions}",
    "Otros productos relacionados: {suggestions}",
    "¿Qué tal echar un vistazo a: {suggestions}?",
    "También tenemos: {suggestions}",
    "Combina bien con: {suggestions}",
  ]
};

/**
 * Gera resposta para resultados encontrados
 * @param sessionId - ID da sessão
 * @param lang - Idioma
 * @param count - Número de resultados
 * @param product - Produto/categoria buscado
 * @param ask - Pergunta adicional
 * @param crossSell - Sugestões de cross-sell
 * @returns Template formatado
 */
export function sayFound(
  sessionId: string, 
  lang: "pt" | "es", 
  count: number, 
  product: string,
  ask?: string | null,
  crossSell?: string[]
): string {
  const templates = FOUND_TEMPLATES[lang];
  const variant = nextVariant(sessionId, "results_intro", templates.length);
  let response = templates[variant];
  
  // Adiciona pergunta se fornecida
  if (ask) {
    response += `\n\n${ask}`;
  }
  
  // Adiciona cross-sell se fornecido
  if (crossSell && crossSell.length > 0) {
    const crossTemplates = CROSS_SELL_TEMPLATES[lang];
    const crossVariant = nextVariant(sessionId, "cross_sell_intro", crossTemplates.length);
    const crossText = crossTemplates[crossVariant].replace("{suggestions}", crossSell.join(", "));
    response += `\n\n${crossText}`;
  }
  
  return response;
}

/**
 * Gera resposta para quando não encontra resultados
 * @param sessionId - ID da sessão
 * @param lang - Idioma
 * @param suggestion - Sugestão alternativa
 * @returns Template formatado
 */
export function sayNoResults(
  sessionId: string, 
  lang: "pt" | "es", 
  suggestion: string
): string {
  const templates = NOT_FOUND_TEMPLATES[lang];
  const variant = nextVariant(sessionId, "not_found", templates.length);
  return templates[variant].replace("{suggestion}", suggestion);
}

/**
 * Gera saudação inicial
 * @param sessionId - ID da sessão
 * @param lang - Idioma
 * @returns Template de saudação
 */
export function sayGreeting(sessionId: string, lang: "pt" | "es"): string {
  const templates = GREETING_TEMPLATES[lang];
  const variant = nextVariant(sessionId, "greeting", templates.length);
  return templates[variant];
}

/**
 * Formata produto para exibição
 * @param item - Item do catálogo
 * @returns String formatada
 */
export function formatProduct(item: any): string {
  const { title, brand, price, currency = "R$", in_stock } = item;
  
  let formatted = `🔹 **${title}**`;
  
  if (brand) {
    formatted += ` - ${brand}`;
  }
  
  formatted += "\n";
  
  if (price) {
    formatted += `   💰 ${currency} ${price.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
  
  if (in_stock !== undefined) {
    formatted += ` | ${in_stock ? "✅ Em estoque" : "❌ Fora de estoque"}`;
  }
  
  return formatted;
}

/**
 * Remove duplicatas de array mantendo ordem
 * @param arr - Array original
 * @returns Array sem duplicatas
 */
export function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/**
 * Gera template de clarificação
 * @param sessionId - ID da sessão
 * @param lang - Idioma
 * @param product - Produto ambíguo
 * @returns Template de clarificação
 */
export function sayNeedsClarification(
  sessionId: string,
  lang: "pt" | "es",
  product?: string
): string {
  const clarificationTemplates = {
    pt: [
      "Pode ser mais específico sobre o que procura?",
      "Me dá mais detalhes do produto que você quer?",
      "Qual marca ou modelo você tem em mente?",
      "Preciso de mais informações para te ajudar melhor.",
      "Conta mais sobre o que você está buscando?",
    ],
    es: [
      "¿Puedes ser más específico sobre lo que buscas?",
      "¿Me das más detalles del producto que quieres?",
      "¿Qué marca o modelo tienes en mente?",
      "Necesito más información para ayudarte mejor.",
      "¿Cuentas más sobre lo que buscas?",
    ]
  };
  
  const templates = clarificationTemplates[lang];
  const variant = nextVariant(sessionId, "clarification", templates.length);
  return templates[variant];
}

/**
 * Gera template de erro/problema
 * @param sessionId - ID da sessão
 * @param lang - Idioma
 * @returns Template de erro
 */
export function sayError(sessionId: string, lang: "pt" | "es"): string {
  const errorTemplates = {
    pt: [
      "Ops, algo deu errado. Pode tentar novamente?",
      "Tive um probleminha aqui. Repete aí?",
      "Rolou um erro. Tenta de novo, por favor?",
      "Falha no sistema. Pode repetir?",
      "Algo não funcionou. Vamos tentar mais uma vez?",
    ],
    es: [
      "Ups, algo salió mal. ¿Puedes intentar de nuevo?",
      "Tuve un problemita aquí. ¿Repites?",
      "Hubo un error. Inténtalo de nuevo, por favor.",
      "Falla en el sistema. ¿Puedes repetir?",
      "Algo no funcionó. ¿Intentamos una vez más?",
    ]
  };
  
  const templates = errorTemplates[lang];
  const variant = nextVariant(sessionId, "error", templates.length);
  return templates[variant];
}

/**
 * Gera template de agradecimento
 * @param sessionId - ID da sessão
 * @param lang - Idioma
 * @returns Template de agradecimento
 */
export function sayThanks(sessionId: string, lang: "pt" | "es"): string {
  const thanksTemplates = {
    pt: [
      "De nada! Sempre aqui para ajudar!",
      "Disponha! Foi um prazer ajudar!",
      "Fico feliz em ajudar! Volte sempre!",
      "Por nada! Até a próxima!",
      "Valeu! Precisando, é só chamar!",
    ],
    es: [
      "¡De nada! ¡Siempre aquí para ayudar!",
      "¡A tu disposición! ¡Fue un placer ayudar!",
      "¡Me alegra ayudar! ¡Vuelve siempre!",
      "¡Por nada! ¡Hasta la próxima!",
      "¡Perfecto! ¡Si necesitas algo, solo llama!",
    ]
  };
  
  const templates = thanksTemplates[lang];
  const variant = nextVariant(sessionId, "thanks", templates.length);
  return templates[variant];
}