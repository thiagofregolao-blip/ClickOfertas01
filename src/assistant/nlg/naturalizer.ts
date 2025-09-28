/**
 * Naturalização opcional via LLM (OpenAI/Gemini)
 */

import type { NaturalizationInput } from "../types.js";

// Tons disponíveis para naturalização
const TONE_PROMPTS = {
  vendedor_descontraido: "Responda como um vendedor descontraído e amigável, usando linguagem casual e empolgante. Use emojis ocasionalmente.",
  consultivo: "Responda como um consultor especializado, sendo educado e profissional. Forneça informações detalhadas.",
  empatico: "Responda com empatia e compreensão, sendo gentil e oferecendo alternativas úteis.",
  entusiasmado: "Responda com entusiasmo e energia, mostrando empolgação com os produtos encontrados.",
  amigavel: "Responda de forma amigável e acolhedora, como um amigo ajudando outro.",
};

/**
 * Naturaliza uma resposta draft usando LLM
 * @param input - Contexto para naturalização
 * @param tone - Tom desejado
 * @returns Resposta naturalizada ou draft original
 */
export async function naturalize(
  input: NaturalizationInput, 
  tone: keyof typeof TONE_PROMPTS = "vendedor_descontraido"
): Promise<string> {
  // Se LLM está desabilitado, retorna draft original
  if (process.env.USE_LLM_PARAPHRASE !== "1") {
    return input.draft;
  }
  
  try {
    // Monta prompt para LLM
    const prompt = buildNaturalizationPrompt(input, tone);
    
    // Tenta OpenAI primeiro
    if (process.env.OPENAI_API_KEY) {
      return await naturalizeWithOpenAI(prompt);
    }
    
    // Fallback para Gemini se disponível
    if (process.env.GEMINI_API_KEY) {
      return await naturalizeWithGemini(prompt);
    }
    
    console.warn("Nenhuma API LLM configurada para naturalização");
    return input.draft;
    
  } catch (error) {
    console.error("Erro na naturalização:", error);
    return input.draft; // Fallback seguro
  }
}

/**
 * Constrói prompt para naturalização
 * @param input - Entrada da naturalização
 * @param tone - Tom desejado
 * @returns Prompt formatado
 */
function buildNaturalizationPrompt(input: NaturalizationInput, tone: keyof typeof TONE_PROMPTS): string {
  const toneInstruction = TONE_PROMPTS[tone];
  
  let prompt = `${toneInstruction}\n\n`;
  prompt += `Contexto: Você é um assistente de compras especializado em encontrar produtos.\n`;
  
  // Adiciona contexto específico
  if (input.product) {
    prompt += `Produto buscado: ${input.product}\n`;
  }
  
  if (input.category) {
    prompt += `Categoria: ${input.category}\n`;
  }
  
  if (input.count !== undefined) {
    prompt += `Resultados encontrados: ${input.count}\n`;
  }
  
  if (input.cross && input.cross.length > 0) {
    prompt += `Sugestões relacionadas: ${input.cross.join(", ")}\n`;
  }
  
  prompt += `\nReescreva esta resposta mantendo o mesmo sentido, mas com seu tom característico:\n`;
  prompt += `"${input.draft}"\n\n`;
  prompt += `Resposta naturalizada:`;
  
  return prompt;
}

/**
 * Naturaliza usando OpenAI
 * @param prompt - Prompt para enviar
 * @returns Resposta naturalizada
 */
async function naturalizeWithOpenAI(prompt: string): Promise<string> {
  try {
    // Importação dinâmica para evitar erro se não instalado
    const { default: OpenAI } = await import("openai");
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });
    
    const naturalized = response.choices[0]?.message?.content?.trim();
    return naturalized || prompt; // Fallback se resposta vazia
    
  } catch (error) {
    console.error("Erro OpenAI naturalização:", error);
    throw error;
  }
}

/**
 * Naturaliza usando Gemini
 * @param prompt - Prompt para enviar
 * @returns Resposta naturalizada
 */
async function naturalizeWithGemini(prompt: string): Promise<string> {
  try {
    // Importação dinâmica para evitar erro se não instalado
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const naturalized = response.text()?.trim();
    
    return naturalized || prompt; // Fallback se resposta vazia
    
  } catch (error) {
    console.error("Erro Gemini naturalização:", error);
    throw error;
  }
}

/**
 * Valida se resposta naturalizada é aceitável
 * @param original - Resposta original
 * @param naturalized - Resposta naturalizada
 * @returns Se é válida
 */
function isValidNaturalization(original: string, naturalized: string): boolean {
  // Muito curta
  if (naturalized.length < 10) return false;
  
  // Muito longa (provavelmente alucinação)
  if (naturalized.length > original.length * 3) return false;
  
  // Contém texto do prompt
  if (naturalized.toLowerCase().includes("reescreva") || 
      naturalized.toLowerCase().includes("resposta naturalizada")) {
    return false;
  }
  
  return true;
}

/**
 * Obtém configuração de tom a partir do ambiente
 * @returns Tom configurado ou padrão
 */
export function getToneFromEnv(): keyof typeof TONE_PROMPTS {
  const envTone = process.env.REPLY_TONE as keyof typeof TONE_PROMPTS;
  return TONE_PROMPTS[envTone] ? envTone : "vendedor_descontraido";
}

/**
 * Lista todos os tons disponíveis
 * @returns Array de tons
 */
export function getAvailableTones(): string[] {
  return Object.keys(TONE_PROMPTS);
}

/**
 * Testa se LLM está disponível e funcionando
 * @returns Promise<boolean>
 */
export async function testLLMAvailability(): Promise<boolean> {
  if (process.env.USE_LLM_PARAPHRASE !== "1") {
    return false;
  }
  
  try {
    const testInput: NaturalizationInput = {
      intent: "test",
      draft: "Teste de conectividade LLM.",
    };
    
    const result = await naturalize(testInput, "amigavel");
    return result !== testInput.draft; // Se mudou, LLM funcionou
    
  } catch {
    return false;
  }
}