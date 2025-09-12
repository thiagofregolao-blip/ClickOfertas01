import * as fs from "fs";
import { GoogleAuth } from "google-auth-library";
import { GoogleGenAI, Modality } from "@google/genai";
import * as crypto from "crypto";

// Configuração Vertex AI para quotas maiores - autenticação OAuth2 correta
const PROJECT_ID = process.env.GCLOUD_PROJECT;
const LOCATION = "us-central1";
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
const GEMINI_PRO_MODEL = "gemini-2.5-pro";

// Configuração para API direta do Gemini (fallback do Vertex AI)
const GEMINI_DIRECT_IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation";
const geminiAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Função para normalizar e validar private_key
function normalizeAndValidatePrivateKey(key: string): string {
  if (!key) throw new Error('Private key vazia');
  
  // Remover espaços e aspas ao redor
  let normalized = key.trim();
  
  // Detectar se é um fragmento de JSON e extrair apenas a private_key
  if (normalized.includes('"client_email"') || normalized.includes('"type"')) {
    console.log('🔍 Detectado fragmento de JSON na private_key, extraindo...');
    try {
      // Tentar extrair a private_key do JSON
      const match = normalized.match(/"private_key":\s*"([^"]+)"/);
      if (match) {
        normalized = match[1];
        console.log('✅ Private key extraída do JSON');
      } else {
        // Procurar por padrão de chave PEM diretamente
        const pemMatch = normalized.match(/(-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----)/);
        if (pemMatch) {
          normalized = pemMatch[1];
          console.log('✅ Chave PEM extraída do texto');
        }
      }
    } catch (error) {
      console.warn('⚠️ Falha ao extrair chave do JSON, continuando com normalização padrão');
    }
  }
  
  // Remover aspas (simples, duplas, backticks) se existirem
  if ((normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'")) ||
      (normalized.startsWith('`') && normalized.endsWith('`'))) {
    normalized = normalized.slice(1, -1);
  }
  
  // Normalização robusta conforme Opção C
  normalized = normalized
    .replace(/\\n/g, '\n')   // transforma \n literais em quebras reais
    .replace(/\r/g, '');     // remove CR em Windows
  
  // Garantir quebra de linha final
  if (!normalized.endsWith('\n')) {
    normalized += '\n';
  }
  
  // Teste de validação com crypto.createPrivateKey
  try {
    crypto.createPrivateKey({ key: normalized });
    console.log('✅ Private key passou na validação crypto.createPrivateKey()');
    
    // Log seguro para debug
    const keyFingerprint = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 8);
    console.log(`✅ Chave válida (fingerprint: ${keyFingerprint})`);
    
    return normalized;
  } catch (error: any) {
    console.error('❌ Private key ainda inválida após normalização:', {
      message: error.message,
      hasBeginHeader: normalized.includes('-----BEGIN'),
      hasEndFooter: normalized.includes('-----END'),
      length: normalized.length
    });
    
    // Log de debug detalhado
    console.log('🔍 Debug da chave:');
    console.log('- Primeira linha:', normalized.split('\n')[0]);
    console.log('- Última linha:', normalized.split('\n').slice(-2, -1)[0]);
    console.log('- Total de linhas:', normalized.split('\n').length);
    
    throw new Error(`Private key inválida após normalização: ${error.message}`);
  }
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
    
    // Verificar qual Service Account está sendo usada
    const credentials = await auth.getCredentials();
    console.log("🔑 Usando Service Account:", credentials.client_email || "desconhecida");
    
    const { token } = await client.getAccessToken();
    
    if (!token) {
      throw new Error("❌ Falha ao obter token OAuth2 da Service Account");
    }

    // Endpoint Vertex AI correto (OAuth2 Bearer token)
    const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${model}:generateContent`;

    console.log(`🚀 Chamando Vertex AI: ${model} em ${PROJECT_ID}`);
    console.log(`🎯 URL: ${url}`);

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
        
        // Fallback: tentar com API direta do Gemini
        try {
            console.log('🔄 Fallback: Tentando com API direta do Gemini...');
            await generateImageWithGeminiDirect(prompt, imagePath);
            return;
        } catch (fallbackError: any) {
            console.error("❌ Erro com API direta do Gemini:", fallbackError);
            
            // Re-lançar o erro original do Vertex AI se o fallback também falhar
            throw error;
        }
    }
}

// Função de fallback usando API direta do Gemini (sem Vertex AI)
async function generateImageWithGeminiDirect(prompt: string, imagePath: string): Promise<void> {
    try {
        console.log('🎨 Gerando imagem com API direta do Gemini (fallback)');
        
        const response = await geminiAI.models.generateContent({
            model: GEMINI_DIRECT_IMAGE_MODEL,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.TEXT, Modality.IMAGE],
            },
        });

        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error("No candidates returned from Gemini Direct API");
        }

        const content = candidates[0].content;
        if (!content || !content.parts) {
            throw new Error("No content parts returned from Gemini Direct API");
        }

        // Procurar pela imagem nas parts
        for (const part of content.parts) {
            if (part.text) {
                console.log('📝 Resposta texto:', part.text);
            } else if (part.inlineData && part.inlineData.data) {
                const imageData = Buffer.from(part.inlineData.data, "base64");
                fs.writeFileSync(imagePath, imageData);
                console.log(`✅ Imagem gerada com API direta: ${imagePath} (${imageData.length} bytes)`);
                return;
            }
        }
        
        throw new Error("Nenhuma imagem retornada pela API direta do Gemini");
        
    } catch (error: any) {
        throw new Error(`Falha na API direta do Gemini: ${error.message}`);
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
 * Busca imagem de produto no Pexels API
 */
async function searchProductImageOnPexels(productName: string): Promise<string | null> {
    try {
        if (!process.env.PEXELS_API_KEY) {
            console.warn('⚠️ PEXELS_API_KEY não configurado, usando prompt sem imagem de referência');
            return null;
        }

        // Extrair keywords principais do nome do produto para busca mais efetiva
        const searchTerm = productName
            .toLowerCase()
            .replace(/\d+gb|\d+tb|\d+\s*tb|\d+\s*gb/gi, '') // Remove capacidades de armazenamento
            .replace(/\b\d+\w*\b/g, '') // Remove números e versões
            .replace(/[^a-zA-Z\s]/g, '') // Remove caracteres especiais
            .trim();

        console.log(`🔍 Buscando imagem no Pexels para: "${searchTerm}"`);

        const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm)}&per_page=5&orientation=landscape`, {
            headers: {
                'Authorization': process.env.PEXELS_API_KEY
            }
        });

        if (!response.ok) {
            console.warn(`⚠️ Erro na busca Pexels: ${response.status}`);
            return null;
        }

        const data = await response.json();
        
        if (data.photos && data.photos.length > 0) {
            // Pegar a primeira imagem de alta qualidade
            const photo = data.photos[0];
            console.log(`✅ Imagem encontrada no Pexels: ${photo.src.medium}`);
            return photo.src.large; // URL da imagem em alta resolução
        }

        console.warn(`⚠️ Nenhuma imagem encontrada no Pexels para: ${searchTerm}`);
        return null;
        
    } catch (error) {
        console.warn(`⚠️ Erro ao buscar imagem no Pexels: ${error}`);
        return null;
    }
}

/**
 * Compõe banner promocional usando imagem real do produto + texto sobreposto
 */
async function composePromotionalBanner(
    productName: string,
    price: number,
    productImageUrl: string,
    outputPath: string
): Promise<void> {
    const sharp = await import('sharp');
    
    try {
        console.log('🎨 Compondo banner com imagem real do produto...');

        // Baixar imagem do produto
        const imageResponse = await fetch(productImageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Erro ao baixar imagem: ${imageResponse.status}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();

        // Dimensões do banner (16:9)
        const bannerWidth = 1920;
        const bannerHeight = 1080;

        // Criar gradiente de fundo (azul para laranja)
        const gradientSvg = `
        <svg width="${bannerWidth}" height="${bannerHeight}">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#1e40af;stop-opacity:0.9" />
                    <stop offset="100%" style="stop-color:#ea580c;stop-opacity:0.9" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#grad)" />
        </svg>`;

        // Redimensionar imagem do produto para caber no banner
        const productImage = sharp.default(Buffer.from(imageBuffer))
            .resize(800, 600, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });

        // Criar SVG com textos sobrepostos
        const textOverlaySvg = `
        <svg width="${bannerWidth}" height="${bannerHeight}">
            <!-- Título do produto -->
            <text x="100" y="150" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="start">
                ${productName.toUpperCase()}
            </text>
            
            <!-- Preço -->
            <text x="100" y="250" font-family="Arial, sans-serif" font-size="96" font-weight="bold" fill="#ffd700" text-anchor="start">
                $${price}
            </text>
            
            <!-- Limited Time Offer -->
            <text x="100" y="350" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#ff4444" text-anchor="start">
                LIMITED TIME OFFER
            </text>
            
            <!-- Call to Action -->
            <text x="100" y="450" font-family="Arial, sans-serif" font-size="42" font-weight="bold" fill="white" text-anchor="start">
                RUSH TO THE SECTION
            </text>
            <text x="100" y="510" font-family="Arial, sans-serif" font-size="42" font-weight="bold" fill="white" text-anchor="start">
                AND GET YOURS!
            </text>
            
            <!-- Logo/Brand -->
            <text x="${bannerWidth - 50}" y="${bannerHeight - 50}" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="end" opacity="0.8">
                Click Ofertas Paraguai
            </text>
        </svg>`;

        // Compor o banner final
        const finalBanner = await sharp.default(Buffer.from(gradientSvg))
            .composite([
                // Imagem do produto no lado direito
                {
                    input: await productImage.png().toBuffer(),
                    left: bannerWidth - 850,
                    top: 240,
                    blend: 'over'
                },
                // Texto sobreposto
                {
                    input: Buffer.from(textOverlaySvg),
                    left: 0,
                    top: 0,
                    blend: 'over'
                }
            ])
            .png()
            .toFile(outputPath);

        console.log(`✅ Banner composto com sucesso: ${outputPath}`);
        
    } catch (error) {
        console.error('❌ Erro ao compor banner:', error);
        throw error;
    }
}

/**
 * Gera arte promocional focada em produto específico
 * NOVA VERSÃO: Usa composição de imagem real do Pexels + texto sobreposto
 */
export async function generatePromotionalArt(
    trendingProducts: TrendingProduct[],
    outputPath: string,
    customPrompt?: string
): Promise<void> {
    try {
        console.log('🎨 Gerando arte promocional baseada em produtos em tendência...');
        
        // Focar no primeiro produto da lista (mais em tendência)
        const mainProduct = trendingProducts[0];
        
        if (!mainProduct) {
            throw new Error('Nenhum produto fornecido para geração');
        }

        // Buscar imagem real do produto no Pexels
        const productImageUrl = await searchProductImageOnPexels(mainProduct.productName);

        if (productImageUrl && !customPrompt) {
            // NOVA ABORDAGEM: Composição de imagem real + texto
            console.log('🖼️ Usando imagem real do Pexels para composição...');
            await composePromotionalBanner(
                mainProduct.productName,
                mainProduct.price,
                productImageUrl,
                outputPath
            );
        } else {
            // FALLBACK: Geração por IA (quando não há imagem ou prompt customizado)
            console.log('🤖 Usando geração por IA como fallback...');
            
            const prompt = customPrompt || `Create a promotional banner for ${mainProduct.productName}.
Product: ${mainProduct.productName} 
Price: $${mainProduct.price}
Style: Modern ${mainProduct.category.toLowerCase()} product banner
Colors: Vibrant blue and orange gradient background
Text elements: 
- "${mainProduct.productName}"
- "$${mainProduct.price}"
- "LIMITED TIME OFFER"
- "RUSH TO THE SECTION AND GET YOURS!"
Layout: Professional retail banner, eye-catching design`;

            await generateImage(prompt, outputPath);
        }
        
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