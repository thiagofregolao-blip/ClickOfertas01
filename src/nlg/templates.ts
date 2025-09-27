// src/nlg/templates.ts
import { PersonaConfig } from "../persona/salesPersona";
import { RNG, pickWithRng as pick } from "../utils/rng";
import { resolveAccessoryCategory } from "../logic/crossSell";

type Dict<T> = Record<string, T>;

export interface MsgCtx {
  persona: PersonaConfig;
  rng: RNG;
  produto?: string;
  categoria?: string;
  modelo?: string;
  marca?: string;
  count?: number;
  faltando?: Array<"modelo" | "marca" | "armazenamento">;
  acessorios?: string[];
}

export const greet: string[] = [
  "Oi! {emoji} Bora achar a melhor oferta pra você?",
  "E aí! {emoji} Me diz o que procura que eu garimpo aqui.",
  "Bem-vindo(a)! {emoji} Posso buscar por iPhone, drone, perfume e muito mais."
];

export const found: string[] = [
  "Ótimo! Encontrei {count} {cat} para \"{query}\". Dá uma olhada 👇",
  "Boa escolha! Separei {count} opções de {cat} pra \"{query}\". {emoji}",
  "{emoji} Achei {count} resultado(s) que combinam com \"{query}\"."
];

export const noResults: string[] = [
  "Hmm, não achei nada pra \"{query}\". {emoji} Quer tentar outra marca ou modelo?",
  "Por aqui não rolou com \"{query}\". Tenta especificar {hint} que eu encontro rapidinho!",
  "Zerado pra \"{query}\". {emoji} Se quiser, me diz {hint}."
];

const clarify: Dict<string[]> = {
  modelo: [
    "Prefere {produto} **{lista}**?",
    "Tem algum {produto} **{lista}** em mente?",
    "Quer ir de **{lista}** no {produto}?"
  ],
  marca: [
    "Curte **Apple**, **Samsung** ou outra marca?",
    "Tem marca preferida? (Apple, Samsung, Xiaomi…)",
    "Posso filtrar por marca: **Apple**/**Samsung**/**Motorola**?"
  ],
  armazenamento: [
    "Busca **64GB**, **128GB** ou **256GB**?",
    "Qual capacidade agrada mais: **128GB**/**256GB**?",
    "Quer espaço de **128GB** ou **256GB**?"
  ]
};

const crossSell: Dict<string[]> = {
  celular: [
    "Aproveita e já quer **capinha** e **película**? Posso sugerir kits.",
    "Quer incluir **carregador turbo** ou **fones BT** junto? {emoji}",
    "Precisa de **cabo extra** ou **power bank** pra completar?"
  ],
  drone: [
    "Pra drone, **bateria extra** e **hélices sobressalentes** salvam o dia. Te mostro?",
    "Quer um **case rígido** ou **cartão SD** junto? {emoji}",
    "Posso sugerir **protetor de hélices** e **hub de carga**."
  ],
  perfume: [
    "Curte **kit presente** com nécessaire? {emoji}",
    "Prefere **EDT** ou **EDP**? Posso sugerir ambos.",
    "Quer ver **miniaturas** pra viagem junto?"
  ],
  tv: [
    "Que tal uma **soundbar** pra completar? {emoji}",
    "Precisa de **suporte de parede** ou **cabo HDMI**?",
    "Posso sugerir **controle universal** e **extensão filtrada**."
  ],
  roupa: [
    "Quer um **cinto** ou **bolsa** pra combinar? {emoji}",
    "Que tal **meia-calça** ou **lenço** pra completar o look?",
    "Posso sugerir **organizador de armário** pra manter tudo em ordem."
  ]
};

export function tGreet(ctx: MsgCtx) {
  const emojiCount = ctx.persona.humor === "alto" ? 2 : 1;
  const emoji = Array(emojiCount).fill(0).map(() => pick(ctx.persona.emojiPack, ctx.rng)).join(" ");
  return pick(greet, ctx.rng)
    .replace("{emoji}", emoji);
}

export function tFound(ctx: MsgCtx & { query: string }) {
  const cat = ctx.categoria ?? ctx.produto ?? "itens";
  const emojiCount = ctx.persona.humor === "alto" ? 2 : 1;
  const emoji = Array(emojiCount).fill(0).map(() => pick(ctx.persona.emojiPack, ctx.rng)).join(" ");
  return pick(found, ctx.rng)
    .replace("{count}", String(ctx.count ?? 0))
    .replace("{cat}", cat)
    .replace("{query}", ctx.modelo ? `${ctx.produto} ${ctx.modelo}` : ctx.produto ?? ctx.categoria ?? ctx.marca ?? "produto")
    .replace("{emoji}", emoji);
}

export function tNoResults(ctx: MsgCtx & { query: string }) {
  const need = ctx.faltando?.[0] ?? "mais detalhes";
  const hint = need === "modelo" ? "o **modelo** (ex.: 12, 13 Pro)" :
              need === "marca" ? "a **marca** (ex.: Apple, Samsung)" :
              "a **capacidade** (ex.: 128GB)";
  return pick(noResults, ctx.rng)
    .replace("{query}", ctx.produto ?? ctx.categoria ?? ctx.marca ?? "termo")
    .replace("{hint}", hint)
    .replace("{emoji}", pick(ctx.persona.emojiPack, ctx.rng));
}

export function tClarify(ctx: MsgCtx) {
  if (!ctx.faltando?.length) return null;
  const q = ctx.faltando[0];
  const base = pick(clarify[q], ctx.rng);
  const lista =
    q === "modelo" ? "12, 13, 15…" :
    q === "marca" ? "Apple, Samsung, Xiaomi…" :
    "64GB, 128GB, 256GB";
  return base
    .replace(/{produto}/g, ctx.produto ?? "o produto")
    .replace(/{lista}/g, lista);
}

export function tCrossSell(ctx: MsgCtx) {
  // 🛡️ DEFESA: Usar resolver de categoria para cross-sell
  const accessoryCat = resolveAccessoryCategory({ produto: ctx.produto, categoria: ctx.categoria });
  const key = accessoryCat ?? "";
  const bank = crossSell[key];
  if (!bank) return null;
  
  const emojiCount = ctx.persona.humor === "alto" ? 2 : 1;
  const emoji = Array(emojiCount).fill(0).map(() => pick(ctx.persona.emojiPack, ctx.rng)).join(" ");
  
  let text = pick(bank, ctx.rng).replace("{emoji}", emoji);
  
  // Se temos acessórios específicos, personalizar a mensagem
  if (ctx.acessorios && ctx.acessorios.length > 0) {
    const items = ctx.acessorios.slice(0, 2).map(item => `**${item}**`).join(" e ");
    text = text.replace(/\*\*[^*]+\*\*/g, items);
  }
  
  return text;
}