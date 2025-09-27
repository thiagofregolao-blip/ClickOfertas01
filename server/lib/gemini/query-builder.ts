// server/lib/gemini/query-builder.ts
import { normPTBR, NUM_EXTENSO, PADROES_MODELO, PRODUTOS_REGEX, PADROES_ESCOLHA } from "./ptbr-utils.js";

/**
 * Extrai o "modelo" a partir da frase (ex.: "12", "12 pro", "13").
 * Cobre: "linha 12", "modelo 12", "versão 12", "série 12", números por extenso etc.
 */
export function extrairModeloPTBR(msg: string): string | null {
  const m = normPTBR(msg);

  // 1) Números por extenso (com ou sem variações)
  for (const [extenso, numerico] of Object.entries(NUM_EXTENSO)) {
    if (m.includes(extenso)) {
      console.log(`🔤 [extrairModelo] Detectado por extenso: "${extenso}" → "${numerico}"`);
      return numerico;
    }
  }

  // 2) Padrões com rótulo (linha/modelo/versao/serie)
  for (const padrao of PADROES_MODELO) {
    const match = m.match(padrao);
    if (match) {
      const numero = match[1];
      const sufixo = match[2] ? ` ${match[2]}` : "";
      const resultado = `${numero}${sufixo}`;
      console.log(`🎯 [extrairModelo] Detectado padrão: "${match[0]}" → "${resultado}"`);
      return resultado;
    }
  }

  // 3) Número solto (fallback) - evita capturar CEP/ano
  const numeroSolto = m.match(/\b(\d{2,4})(?:\s*(pro|plus|ultra|max|mini))?\b/);
  if (numeroSolto) {
    const numero = numeroSolto[1];
    const sufixo = numeroSolto[2] ? ` ${numeroSolto[2]}` : "";
    const resultado = `${numero}${sufixo}`;
    console.log(`🔢 [extrairModelo] Número solto: "${numeroSolto[0]}" → "${resultado}"`);
    return resultado;
  }

  return null;
}

/**
 * Detecta e extrai produto/marca da mensagem
 */
export function extrairProduto(msg: string): string | null {
  const match = msg.match(PRODUTOS_REGEX);
  if (match) {
    const produto = match[1].toLowerCase();
    console.log(`🏷️ [extrairProduto] Detectado: "${match[0]}" → "${produto}"`);
    return produto;
  }
  return null;
}

/**
 * Monta a query final combinando o texto atual com o foco anterior (produto).
 * 
 * Regras de slot filling:
 *  - Se a frase já tiver produto e modelo → retorna "produto modelo"
 *  - Se só tiver modelo e existir focoAnterior → "focoAnterior modelo"  
 *  - Se só tiver produto → retorna produto (atualiza foco)
 *  - Caso contrário → retorna a frase original
 */
export function montarConsulta(userMsg: string, focoAnterior?: string | null): string {
  const produto = extrairProduto(userMsg);
  const modelo = extrairModeloPTBR(userMsg);
  
  console.log(`🧠 [montarConsulta] Entrada: "${userMsg}"`);
  console.log(`🧠 [montarConsulta] Produto detectado: "${produto}"`);
  console.log(`🧠 [montarConsulta] Modelo detectado: "${modelo}"`);
  console.log(`🧠 [montarConsulta] Foco anterior: "${focoAnterior}"`);

  // Caso 1: Produto + Modelo na mesma frase
  if (produto && modelo) {
    const resultado = `${produto} ${modelo}`.trim();
    console.log(`✅ [montarConsulta] Produto+Modelo: "${resultado}"`);
    return resultado;
  }

  // Caso 2: Só modelo + foco anterior (SLOT FILLING)
  if (!produto && modelo && focoAnterior) {
    const resultado = `${focoAnterior} ${modelo}`.trim();
    console.log(`🎯 [montarConsulta] Slot Filling: "${resultado}"`);
    return resultado;
  }

  // Caso 3: Só produto (atualiza foco)
  if (produto && !modelo) {
    console.log(`🏷️ [montarConsulta] Só produto: "${produto}"`);
    return produto;
  }

  // Caso 4: Nada detectado, retorna original
  console.log(`🔄 [montarConsulta] Original: "${userMsg}"`);
  return userMsg;
}

/**
 * Detecta e atualiza foco a partir da frase.
 * Retorna o novo foco (ou null se nada detectado).
 */
export function detectarFoco(userMsg: string): string | null {
  const produto = extrairProduto(userMsg);
  if (produto) {
    console.log(`🎯 [detectarFoco] Novo foco: "${produto}"`);
    return produto;
  }
  return null;
}

/**
 * Verifica se a mensagem indica intenção de escolha/seleção
 */
export function ehIntencaoEscolha(msg: string): boolean {
  const m = normPTBR(msg);
  return PADROES_ESCOLHA.some(padrao => padrao.test(m));
}

/**
 * Extrai contexto semântico da mensagem
 */
export function extrairContexto(msg: string) {
  return {
    produto: extrairProduto(msg),
    modelo: extrairModeloPTBR(msg),
    ehEscolha: ehIntencaoEscolha(msg),
    normalizada: normPTBR(msg)
  };
}