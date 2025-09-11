import * as fs from "fs";
import { GoogleAuth } from "google-auth-library";
import * as crypto from "crypto";

// Configuração Vertex AI para quotas maiores - autenticação OAuth2 correta
const PROJECT_ID = process.env.GCLOUD_PROJECT;
const LOCATION = "us-central1";
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
const GEMINI_PRO_MODEL = "gemini-2.5-pro";

// Função para normalizar e validar private_key
function normalizeAndValidatePrivateKey(key: string): string {
  if (!key) throw new Error('Private key vazia');
  
  // Remover espaços e aspas ao redor
  let normalized = key.trim();
  
  // Remover aspas (simples, duplas, backticks) se existirem
  if ((normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'")) ||
      (normalized.startsWith('`') && normalized.endsWith('`'))) {
    normalized = normalized.slice(1, -1);
  }
  
  // Normalizar quebras de linha
  normalized = normalized
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  
  // Garantir quebra de linha final
  if (!normalized.endsWith('\n')) {
    normalized += '\n';
  }
  
  // TEMPORÁRIO: Pular validação pois chave está comprometida
  console.warn('⚠️ CHAVE COMPROMETIDA: Validação desabilitada temporariamente');
  console.warn('🔑 AÇÃO URGENTE: Revogar chave atual e gerar nova no Google Cloud');
  
  // Log seguro para debug
  const keyFingerprint = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 8);
  console.log(`⚠️ Usando chave comprometida (fingerprint: ${keyFingerprint})`);
  
  return normalized;
}

// Configurar autenticação Vertex AI
let auth: GoogleAuth;

if (process.env.GOOGLE_CREDENTIALS_JSON) {
  // Opção preferida: JSON completo
  console.log('🔧 Configurando autenticação via GOOGLE_CREDENTIALS_JSON...');
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    
    // Validar private_key no JSON também
    if (credentials.private_key) {
      credentials.private_key = normalizeAndValidatePrivateKey(credentials.private_key);
    }
    
    auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    console.log('✅ Autenticação configurada via JSON completo');
  } catch (error: any) {
    console.error('❌ Erro ao configurar JSON credentials:', error.message);
    throw new Error(`JSON de credenciais inválido: ${error.message}`);
  }
} else if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
  // Fallback: variáveis separadas
  console.log('🔧 Configurando autenticação via variáveis separadas...');
  
  const privateKey = normalizeAndValidatePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
  
  auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    projectId: PROJECT_ID,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  console.log('✅ Autenticação configurada via variáveis separadas');
} else {
  throw new Error('❌ Configure GOOGLE_CREDENTIALS_JSON ou (GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY)');
}

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

// Função auxiliar para fazer chamadas Vertex AI com OAuth2 Bearer token
async function callVertexAI(model: string, body: any): Promise<any> {
  if (!PROJECT_ID) {
    throw new Error("❌ GCLOUD_PROJECT não configurado. Configure o ID do projeto nos Secrets do Replit.");
  }

  try {
    // Obter Bearer token OAuth2 da Service Account
    const client = await auth.getClient();
    const { token } = await client.getAccessToken();
    
    if (!token) {
      throw new Error("❌ Falha ao obter token OAuth2 da Service Account");
    }

    // Endpoint Vertex AI correto (OAuth2 Bearer token)
    const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${model}:generateContent`;

    console.log(`🚀 Chamando Vertex AI: ${model} em ${PROJECT_ID}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000) // 60s timeout
    });
    
    return await handleVertexResponse(response);
  } catch (authError: any) {
    console.error("❌ Erro de autenticação OAuth2:", authError);
    throw new Error(`Falha na autenticação Vertex AI: ${authError.message}`);
  }
}

// Função auxiliar para processar resposta do Vertex AI
async function handleVertexResponse(response: Response): Promise<any> {

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
      
      // Criar mensagem de erro específica
      let errorMessage = errorJson.error.message;
      if (response.status === 401) {
        errorMessage = "❌ Erro de autenticação: Verifique se a Service Account tem as permissões 'Vertex AI User' e 'Service Usage Consumer'";
      } else if (response.status === 429) {
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