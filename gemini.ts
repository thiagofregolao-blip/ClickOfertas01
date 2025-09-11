import * as fs from "fs";

// Configuração API para quotas maiores - usando generativelanguage endpoint
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image-preview";
const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
const GEMINI_PRO_MODEL = "gemini-2.5-pro";

// Usar API Key para autenticação (funciona no Replit)
const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

interface VertexAIError {
  error: {
    code: number;
    message: string;
    status: string;
    details?: Array<{
      '@type': string;
      metadata?: {
        quota_limit?: string;
      };
    }>;
  };
}

// Função auxiliar para fazer chamadas Vertex AI com API Key
async function callVertexAI(model: string, body: any): Promise<any> {
  if (!API_KEY) {
    throw new Error("❌ GOOGLE_API_KEY ou GEMINI_API_KEY não configurado. Configure nos Secrets do Replit.");
  }

  // Usar endpoint generativelanguage com API Key para compatibilidade Replit
  // Mantém funcionalidade mas evita problemas de autenticação GoogleAuth
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorJson: VertexAIError = JSON.parse(errorText);
      const info = errorJson?.error?.details?.find(d => (d['@type'] || '').includes('ErrorInfo'));
      const quotaLimit = info?.metadata?.quota_limit;
      
      // Log detalhado do erro
      console.error(`❌ Vertex AI Error (${response.status}):`, {
        message: errorJson.error.message,
        status: errorJson.error.status,
        quotaLimit,
        fullError: errorJson
      });
      
      // Criar mensagem de erro específica baseada na quota
      let errorMessage = errorJson.error.message;
      if (response.status === 429) {
        if (quotaLimit?.includes('PerDay')) {
          errorMessage = "⚠️ Quota diária do Vertex AI esgotada. Reset às ~04:00 BRT. Considere solicitar aumento de quota.";
        } else if (quotaLimit?.includes('PerMinute')) {
          errorMessage = "⚠️ Limite de requisições por minuto atingido. Tentando novamente em alguns segundos...";
        } else {
          errorMessage = "⚠️ Quota do Vertex AI temporariamente esgotada. Tente novamente em alguns minutos.";
        }
      }
      
      const error = new Error(errorMessage) as any;
      error.status = response.status;
      error.quotaLimit = quotaLimit;
      error.vertexError = errorJson;
      throw error;
    } catch (parseError) {
      // Se não conseguir fazer parse do JSON, retornar erro original
      const error = new Error(`Vertex AI API error: ${response.status} ${errorText}`) as any;
      error.status = response.status;
      throw error;
    }
  }

  return response.json();
}

export async function generateImage(
    prompt: string,
    imagePath: string,
    baseImage?: string
): Promise<void> {
    // Tentar Hugging Face primeiro se disponível
    if (process.env.HUGGINGFACE_API_KEY) {
        try {
            await generateImageWithHuggingFace(prompt, imagePath);
            return;
        } catch (error) {
            console.warn('⚠️ Hugging Face falhou, tentando Gemini:', error);
        }
    }

    try {
        console.log('🚀 Gerando imagem com Vertex AI (Nano Banana) - Quotas maiores!');
        
        const body = {
            contents: [
                { role: "user", parts: [{ text: prompt }] }
            ],
            generationConfig: { 
                seed: Math.floor(Math.random() * 1000000) // Para variação nas imagens
            }
        };

        const response = await callVertexAI(GEMINI_IMAGE_MODEL, body);
        
        // Buscar por inlineData nas parts retornadas
        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error("No candidates returned from Vertex AI");
        }

        const content = candidates[0].content;
        if (!content || !content.parts) {
            throw new Error("No content parts returned from Vertex AI");
        }

        // Encontrar a parte com imagem - seguindo estrutura Vertex AI
        const parts = content.parts || [];
        const imgPart = parts.find((p: any) => p.inlineData && p.inlineData.mimeType?.startsWith("image/"));
        
        if (imgPart && imgPart.inlineData?.data) {
            const imageData = Buffer.from(imgPart.inlineData.data, "base64");
            fs.writeFileSync(imagePath, imageData);
            console.log(`✅ Imagem gerada com Vertex AI: ${imagePath} (${imageData.length} bytes, ${imgPart.inlineData.mimeType})`);
            return;
        }
        
        throw new Error("Nenhuma imagem retornada pela API do Vertex AI");
        
    } catch (error: any) {
        console.error("❌ Erro com Vertex AI:", error);
        
        // Re-lançar o erro com informações detalhadas já processadas em callVertexAI
        throw error;
    }
}

export async function summarizeArticle(text: string): Promise<string> {
    try {
        const prompt = `Please summarize the following text concisely while maintaining key points:\n\n${text}`;

        const body = {
            contents: [
                { role: "user", parts: [{ text: prompt }] }
            ]
        };

        const response = await callVertexAI(GEMINI_TEXT_MODEL, body);
        
        const text_response = response.candidates?.[0]?.content?.parts?.[0]?.text;
        return text_response || "Something went wrong";
    } catch (error) {
        console.error("❌ Erro ao resumir artigo:", error);
        return "Erro ao processar resumo";
    }
}

export interface Sentiment {
    rating: number;
    confidence: number;
}

export async function analyzeSentiment(text: string): Promise<Sentiment> {
    try {
        const prompt = `You are a sentiment analysis expert. 
Analyze the sentiment of the text and provide a rating
from 1 to 5 stars and a confidence score between 0 and 1.
Respond with JSON in this format: 
{'rating': number, 'confidence': number}

Text to analyze: ${text}`;

        const body = {
            contents: [
                { role: "user", parts: [{ text: prompt }] }
            ],
            generationConfig: {
                responseMimeType: "application/json"
            }
        };

        const response = await callVertexAI(GEMINI_PRO_MODEL, body);
        
        const rawJson = response.candidates?.[0]?.content?.parts?.[0]?.text;
        
        console.log(`Raw JSON: ${rawJson}`);

        if (rawJson) {
            const data: Sentiment = JSON.parse(rawJson);
            return data;
        } else {
            throw new Error("Empty response from model");
        }
    } catch (error) {
        throw new Error(`Failed to analyze sentiment: ${error}`);
    }
}

export interface TrendingProduct {
    productName: string;
    category: string;
    price: number;
    totalScore: number;
    searchCount: number;
    viewCount: number;
}

/**
 * Gera arte promocional automaticamente baseada nos produtos em tendência
 * Usa Gemini 2.5 Flash para criar banners atrativos para totems
 */
export async function generatePromotionalArt(
    trendingProducts: TrendingProduct[],
    outputPath: string
): Promise<void> {
    try {
        console.log('🎨 Gerando arte promocional baseada em produtos em tendência...');
        
        // Criar prompt inteligente baseado nos produtos
        const productsSummary = trendingProducts.map((p, index) => 
            `${index + 1}. ${p.productName} (${p.category}) - $${p.price} - ${p.searchCount} buscas, ${p.viewCount} visualizações`
        ).join('\n');
        
        const categories = Array.from(new Set(trendingProducts.map(p => p.category)));
        const avgPrice = Math.round(trendingProducts.reduce((sum, p) => sum + p.price, 0) / trendingProducts.length);
        
        const prompt = `Crie um banner promocional vibrante e atrativo para um totem digital de loja, com o tema "PRODUTOS EM ALTA" ou "TENDÊNCIAS DA SEMANA".

PRODUTOS EM DESTAQUE:
${productsSummary}

DIRETRIZES DO DESIGN:
- Estilo moderno, colorido e eye-catching para chamar atenção em shopping centers
- Dimensões 16:9 apropriadas para telas de totem (1920x1080)
- Cores vibrantes: gradientes em azul, roxo, laranja ou verde
- Texto em português brasileiro, fonte bold e legível
- Layout clean com hierarquia visual clara
- Elementos gráficos modernos: ícones, formas geométricas, linhas

ELEMENTOS OBRIGATÓRIOS:
- Título principal: "PRODUTOS EM ALTA" ou "TENDÊNCIAS DA SEMANA"
- Destaque para as categorias: ${categories.join(', ')}
- Indicação de preço médio: "A partir de $${avgPrice}"
- Call-to-action: "CONFIRA AGORA!" ou "PROMOÇÕES LIMITADAS"
- Logo ou marca "Click Ofertas Paraguai" discretamente posicionado

ESTILO VISUAL:
- Background: gradiente moderno ou padrão geométrico sutil
- Tipografia: Sans-serif moderna, contrastes claros
- Ícones: relacionados às categorias dos produtos
- Elementos decorativos: formas abstratas, linhas dinâmicas
- Paleta: cores energéticas que transmitam urgência e oportunidade

O banner deve ser profissional mas impactante, adequado para ambiente de varejo e capaz de atrair clientes de longe.`;

        await generateImage(prompt, outputPath);
        
        console.log(`✅ Arte promocional gerada: ${outputPath}`);
        
    } catch (error) {
        console.error('❌ Erro ao gerar arte promocional:', error);
        throw new Error(`Failed to generate promotional art: ${error}`);
    }
}

// Função para gerar imagem com Hugging Face
async function generateImageWithHuggingFace(prompt: string, imagePath: string): Promise<void> {
    try {
        console.log('🤗 Gerando imagem com Hugging Face Stable Diffusion...');
        
        const response = await fetch(
            "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
            {
                headers: {
                    Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        negative_prompt: "low quality, blurry, distorted, text, watermark",
                        num_inference_steps: 20,
                        guidance_scale: 7.5,
                        width: 1024,
                        height: 576, // 16:9 aspect ratio
                    }
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Hugging Face API error: ${response.status} ${errorText}`);
        }

        const imageBuffer = await response.arrayBuffer();
        
        // Salvar imagem no path especificado
        fs.writeFileSync(imagePath, Buffer.from(imageBuffer));
        
        console.log('✅ Imagem gerada com sucesso usando Hugging Face!');
        
    } catch (error) {
        console.error('❌ Erro ao gerar imagem com Hugging Face:', error);
        throw error;
    }
}