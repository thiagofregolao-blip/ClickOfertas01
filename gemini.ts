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

// ========== GERAÇÃO DE IMAGENS COM IA (FALLBACK) ==========

/**
 * Função de geração de imagens com IA - usado apenas como fallback
 * Corrigida conforme feedback: URL correta do Vertex AI GenerateContent
 */
export async function generateImage(prompt: string, imagePath: string): Promise<void> {
    // Garantir que pasta de saída existe
    const path = await import('path');
    const fs = await import('fs');
    fs.mkdirSync(path.dirname(imagePath), { recursive: true });
    
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
        console.log('🚀 Gerando imagem com Vertex AI GenerateContent...');
        
        const body = {
            contents: [
                { role: "user", parts: [{ text: prompt }] }
            ],
            generationConfig: { 
                seed: Math.floor(Math.random() * 1000000)
            }
        };

        const response = await callVertexAI(GEMINI_IMAGE_MODEL, body);
        
        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error("No candidates returned from Vertex AI");
        }

        const content = candidates[0].content;
        if (!content || !content.parts) {
            throw new Error("No content parts returned from Vertex AI");
        }

        // Encontrar a parte com imagem
        const parts = content.parts || [];
        const imgPart = parts.find((p: any) => p.inlineData && p.inlineData.mimeType?.startsWith("image/"));
        
        if (imgPart && imgPart.inlineData?.data) {
            const imageData = Buffer.from(imgPart.inlineData.data, "base64");
            fs.writeFileSync(imagePath, imageData);
            console.log(`✅ Imagem gerada com Vertex AI: ${imagePath} (${imageData.length} bytes)`);
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
 * CORRIGIDO: Banner promocional LIMPO apenas com texto - SEM APIs externas
 * ZERO distorção garantida + melhorias de qualidade profissional
 * 
 * CORREÇÕES IMPLEMENTADAS:
 * ✅ Preço formatado em BRL (Real brasileiro)
 * ✅ Fonte segura (sans-serif) ao invés de Arial
 * ✅ Garantia de criação da pasta de saída  
 * ✅ Ícone SVG ao invés de emoji problemático
 * ✅ Quebra de linha responsiva para nomes longos
 * ✅ Faixa translúcida para melhor contraste
 */
async function composeTextOnlyBanner(
    productName: string,
    price: number,
    category: string,
    outputPath: string
): Promise<void> {
    const sharp = await import('sharp');
    const path = await import('path');
    const fs = await import('fs');
    
    try {
        console.log('✨ Compondo banner profissional sem APIs externas...');

        // ✅ CORREÇÃO: Garantir que pasta de saída existe
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });

        // Dimensões do banner (16:9)
        const bannerWidth = 1920;
        const bannerHeight = 1080;

        // ✅ CORREÇÃO: Formatação de preço em Real brasileiro
        const preco = new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
        }).format(price);

        // Criar gradiente de fundo elegante (azul para laranja)
        const gradientSvg = `
        <svg width="${bannerWidth}" height="${bannerHeight}">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#1e40af;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#ea580c;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:rgba(255,255,255,0.1)" />
                    <stop offset="50%" style="stop-color:rgba(255,255,255,0.3)" />
                    <stop offset="100%" style="stop-color:rgba(255,255,255,0.1)" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#grad)" />
            <rect width="100%" height="100%" fill="url(#shine)" />
        </svg>`;

        // ✅ CORREÇÃO: Quebrar nome do produto em 2 linhas se muito longo
        const words = productName.split(' ');
        let line1 = '', line2 = '';
        
        if (words.length > 2 && productName.length > 25) {
            const mid = Math.ceil(words.length / 2);
            line1 = words.slice(0, mid).join(' ').toUpperCase();
            line2 = words.slice(mid).join(' ').toUpperCase();
        } else {
            line1 = productName.length > 30 ? productName.substring(0, 30) + '...' : productName.toUpperCase();
        }

        // ✅ CORREÇÃO: SVG com textos profissionais e fonte segura
        const textOverlaySvg = `
        <svg width="${bannerWidth}" height="${bannerHeight}">
            <!-- ✅ Faixa translúcida para melhor contraste -->
            <rect x="50" y="80" width="${bannerWidth * 0.5}" height="500" fill="rgba(0,0,0,0.4)" rx="20"/>
            
            <!-- Categoria no topo -->
            <text x="100" y="140" font-family="sans-serif" font-size="36" font-weight="normal" fill="rgba(255,255,255,0.9)" text-anchor="start">
                ${category.toUpperCase()}
            </text>
            
            <!-- Título do produto (linha 1) -->
            <text x="100" y="220" font-family="sans-serif" font-size="64" font-weight="bold" fill="white" text-anchor="start">
                ${line1}
            </text>
            
            <!-- Título do produto (linha 2, se existe) -->
            ${line2 ? `<text x="100" y="290" font-family="sans-serif" font-size="64" font-weight="bold" fill="white" text-anchor="start">${line2}</text>` : ''}
            
            <!-- ✅ CORREÇÃO: Preço destacado em BRL formatado -->
            <text x="100" y="${line2 ? 380 : 320}" font-family="sans-serif" font-size="96" font-weight="bold" fill="#ffd700" text-anchor="start" stroke="rgba(0,0,0,0.3)" stroke-width="2">
                ${preco}
            </text>
            
            <!-- Limited Time Offer -->
            <text x="100" y="${line2 ? 480 : 420}" font-family="sans-serif" font-size="42" font-weight="bold" fill="#ff4444" text-anchor="start" stroke="white" stroke-width="1">
                OFERTA POR TEMPO LIMITADO
            </text>
            
            <!-- Call to Action duplo -->
            <text x="100" y="${line2 ? 540 : 500}" font-family="sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="start" stroke="rgba(0,0,0,0.5)" stroke-width="1">
                CORRA PARA A SEÇÃO
            </text>
            <text x="100" y="${line2 ? 580 : 550}" font-family="sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="start" stroke="rgba(0,0,0,0.5)" stroke-width="1">
                E GARANTA O SEU!
            </text>
            
            <!-- ✅ CORREÇÃO: Ícone decorativo SVG (ao invés de emoji problemático) -->
            <circle cx="1500" cy="400" r="180" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" stroke-width="4"/>
            
            <!-- Ícone de smartphone em SVG estável -->
            <rect x="1450" y="350" width="100" height="160" rx="15" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="4"/>
            <rect x="1465" y="365" width="70" height="110" rx="5" fill="rgba(255,255,255,0.2)"/>
            <circle cx="1500" cy="490" r="8" fill="rgba(255,255,255,0.7)"/>
            
            <!-- Logo/Brand -->
            <text x="${bannerWidth - 50}" y="${bannerHeight - 50}" font-family="sans-serif" font-size="28" fill="rgba(255,255,255,0.9)" text-anchor="end">
                Click Ofertas Paraguai
            </text>
        </svg>`;

        // Compor o banner final
        await sharp.default(Buffer.from(gradientSvg))
            .composite([
                {
                    input: Buffer.from(textOverlaySvg),
                    left: 0,
                    top: 0,
                    blend: 'over'
                }
            ])
            .png()
            .toFile(outputPath);

        console.log(`✅ Banner profissional composto: ${outputPath}`);
        
    } catch (error) {
        console.error('❌ Erro ao compor banner:', error);
        throw error;
    }
}

/**
 * Compõe banner promocional usando imagem real do produto + texto sobreposto
 * (Só usado quando PEXELS_API_KEY está disponível)
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

// ========== NOVO SISTEMA: TOTEMS DE PRODUTOS ==========

/**
 * NOVA FUNCIONALIDADE: Compor totem profissional para produto específico
 * Usa dados reais do produto + imagem já cadastrada no sistema
 * 
 * CARACTERÍSTICAS:
 * ✅ Imagem real do produto (imageUrl do banco)
 * ✅ Dados reais: nome, preço em BRL, categoria
 * ✅ Layout profissional 1920x1080 para totem
 * ✅ Design responsivo com quebra de linha
 * ✅ Call-to-action específico da loja
 */
export async function composeProductTotem(
    product: {
        id: string;
        name: string;
        price: number;
        imageUrl?: string;
        category?: string;
        description?: string;
    },
    store: {
        name: string;
        themeColor?: string;
        currency?: string;
    },
    outputPath: string
): Promise<void> {
    const sharp = await import('sharp');
    const path = await import('path');
    const fs = await import('fs');
    
    try {
        console.log(`🏪 Compondo totem para produto: ${product.name}`);

        // Garantir que pasta de saída existe
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });

        // Dimensões do totem (16:9)
        const totemWidth = 1080;
        const totemHeight = 1920;

        // Formatação de preço em Real brasileiro
        const preco = new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
        }).format(product.price);

        // Cor tema da loja ou padrão
        const primaryColor = store.themeColor || '#E11D48';
        const accentColor = '#ffd700';

        // Função para escapar caracteres XML
        const escapeXml = (text: string) => {
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };

        // Quebrar nome do produto em múltiplas linhas se necessário
        const words = product.name.split(' ');
        let line1 = '', line2 = '', line3 = '';
        
        if (words.length > 4 && product.name.length > 40) {
            const third = Math.ceil(words.length / 3);
            line1 = escapeXml(words.slice(0, third).join(' ').toUpperCase());
            line2 = escapeXml(words.slice(third, third * 2).join(' ').toUpperCase());
            line3 = escapeXml(words.slice(third * 2).join(' ').toUpperCase());
        } else if (words.length > 2 && product.name.length > 25) {
            const mid = Math.ceil(words.length / 2);
            line1 = escapeXml(words.slice(0, mid).join(' ').toUpperCase());
            line2 = escapeXml(words.slice(mid).join(' ').toUpperCase());
        } else {
            line1 = escapeXml(product.name.length > 35 ? product.name.substring(0, 35) + '...' : product.name.toUpperCase());
        }

        let productImageBuffer: Buffer | null = null;
        
        // Baixar e validar imagem do produto se disponível
        if (product.imageUrl) {
            try {
                console.log(`📥 Baixando imagem do produto: ${product.imageUrl}`);
                const imageResponse = await fetch(product.imageUrl);
                if (imageResponse.ok) {
                    const imageArrayBuffer = await imageResponse.arrayBuffer();
                    productImageBuffer = Buffer.from(imageArrayBuffer);
                    console.log(`✅ Imagem baixada: ${productImageBuffer.length} bytes`);
                    
                    // Validar se é uma imagem válida
                    try {
                        const testImage = sharp.default(productImageBuffer);
                        const metadata = await testImage.metadata();
                        console.log(`📊 Metadata da imagem: ${metadata.width}x${metadata.height}, formato: ${metadata.format}`);
                        
                        // Verificar se tem dimensões válidas
                        if (!metadata.width || !metadata.height || metadata.width < 50 || metadata.height < 50) {
                            console.warn(`⚠️ Imagem muito pequena ou inválida, usando layout sem imagem`);
                            productImageBuffer = null;
                        }
                    } catch (sharpError) {
                        console.warn(`⚠️ Erro ao validar imagem com Sharp: ${sharpError}`);
                        productImageBuffer = null;
                    }
                } else {
                    console.warn(`⚠️ Falha ao baixar imagem: status ${imageResponse.status}`);
                }
            } catch (error) {
                console.warn(`⚠️ Erro ao baixar imagem do produto: ${error}`);
            }
        }

        // Criar gradiente de fundo com cor da loja
        const gradientSvg = `
        <svg width="${totemWidth}" height="${totemHeight}">
            <defs>
                <linearGradient id="storeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:0.9" />
                    <stop offset="100%" style="stop-color:#000000;stop-opacity:0.8" />
                </linearGradient>
                <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:rgba(255,255,255,0.1)" />
                    <stop offset="50%" style="stop-color:rgba(255,255,255,0.2)" />
                    <stop offset="100%" style="stop-color:rgba(255,255,255,0.1)" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#storeGrad)" />
            <rect width="100%" height="100%" fill="url(#shine)" />
        </svg>`;

        // LAYOUT VERTICAL NATIVO:
        // Layout otimizado para tela vertical (1080×1920) sem rotação
        let hasImage = productImageBuffer !== null;
        let textAreaWidth = hasImage ? 500 : 700;    // Largura para tela vertical
        let textStartX = hasImage ? 80 : 150;        // Posição X centralizada
        const imageAreaX = hasImage ? 600 : 0;       // Imagem na direita/baixo
        const imageAreaWidth = 400;                  // Menor para caber na vertical
        const imageAreaHeight = 600;

        // SVG COM LAYOUT VERTICAL NATIVO
        // Layout otimizado para tela vertical (1080×1920) sem rotação no frontend
        const productInfoSvg = `
        <svg width="${totemWidth}" height="${totemHeight}">
            <!-- Faixa translúcida para contraste -->
            <rect x="40" y="400" width="${textAreaWidth}" height="1000" fill="rgba(0,0,0,0.75)" rx="25"/>
            
            <!-- Categoria -->
            <text x="${textStartX}" y="500" font-family="Arial, sans-serif" font-size="36" font-weight="normal" fill="rgba(255,255,255,0.9)" text-anchor="start">
                ${escapeXml((product.category || 'PRODUTO').toUpperCase())}
            </text>
            
            <!-- Nome do produto (linha 1) -->
            <text x="${textStartX}" y="600" font-family="Arial, sans-serif" font-size="${line3 ? '48' : '58'}" font-weight="bold" fill="white" text-anchor="start">
                ${line1}
            </text>
            
            <!-- Nome do produto (linha 2) -->
            ${line2 ? `<text x="${textStartX}" y="${line3 ? '670' : '690'}" font-family="Arial, sans-serif" font-size="${line3 ? '48' : '58'}" font-weight="bold" fill="white" text-anchor="start">${line2}</text>` : ''}
            
            <!-- Nome do produto (linha 3) -->
            ${line3 ? `<text x="${textStartX}" y="740" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="start">${line3}</text>` : ''}
            
            <!-- Preço destacado -->
            <text x="${textStartX}" y="${line3 ? 880 : line2 ? 850 : 820}" font-family="Arial, sans-serif" font-size="86" font-weight="bold" fill="${accentColor}" text-anchor="start" stroke="rgba(0,0,0,0.4)" stroke-width="3">
                ${preco}
            </text>
            
            <!-- Call to Action da loja -->
            <text x="${textStartX}" y="${line3 ? 1000 : line2 ? 970 : 940}" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="start" stroke="rgba(0,0,0,0.5)" stroke-width="1">
                DISPONÍVEL NA
            </text>
            <text x="${textStartX}" y="${line3 ? 1050 : line2 ? 1020 : 990}" font-family="Arial, sans-serif" font-size="38" font-weight="bold" fill="${accentColor}" text-anchor="start" stroke="rgba(0,0,0,0.5)" stroke-width="1">
                ${escapeXml(store.name.toUpperCase())}
            </text>
            
            <!-- Logo/Brand no rodapé -->
            <text x="${totemWidth - 40}" y="${totemHeight - 80}" font-family="Arial, sans-serif" font-size="28" fill="rgba(255,255,255,0.8)" text-anchor="end">
                Click Ofertas Paraguai
            </text>
        </svg>`;

        // Começar composição com o fundo
        let composition = sharp.default(Buffer.from(gradientSvg));

        // Adicionar imagem do produto se disponível
        if (productImageBuffer && hasImage) {
            try {
                console.log(`🔄 Processando imagem do produto...`);
                
                // Redimensionar imagem do produto preservando aspect ratio
                const productImageProcessed = await sharp.default(productImageBuffer)
                    .rotate() // Auto-rotacionar baseado em EXIF se necessário
                    .resize(imageAreaWidth, imageAreaHeight, { 
                        fit: 'contain', 
                        background: { r: 0, g: 0, b: 0, alpha: 0 },
                        withoutEnlargement: true,
                        position: 'centre' // Centralizar na área
                    })
                    .png({ compressionLevel: 9, adaptiveFiltering: true })
                    .toBuffer();

                console.log(`📐 Imagem processada: ${productImageProcessed.length} bytes`);

                composition = composition.composite([
                    {
                        input: productImageProcessed,
                        left: Math.round(imageAreaX),
                        top: 300,  // Posição ajustada para layout vertical
                        blend: 'over'
                    }
                ]);
                
                console.log(`🖼️ Imagem do produto adicionada ao totem com sucesso`);
            } catch (error) {
                console.warn(`⚠️ Erro ao processar imagem do produto: ${error}`);
                // Continuar sem a imagem mas ajustar layout
                hasImage = false;
                textAreaWidth = totemWidth * 0.8;
                textStartX = totemWidth * 0.1;
                console.log(`🔧 Layout ajustado para modo sem imagem`);
            }
        }

        // Adicionar informações do produto
        composition = composition.composite([
            {
                input: Buffer.from(productInfoSvg),
                left: 0,
                top: 0,
                blend: 'over'
            }
        ]);

        // Salvar o totem final garantindo dimensões exatas
        await composition
            .resize(totemWidth, totemHeight, { 
                fit: 'cover', 
                position: 'centre' 
            })
            .png({ compressionLevel: 9, adaptiveFiltering: true })
            .toFile(outputPath);

        // Verificar dimensões finais
        const finalImage = sharp.default(outputPath);
        const finalMetadata = await finalImage.metadata();
        console.log(`✅ Totem do produto composto: ${outputPath}`);
        console.log(`📐 Dimensões finais: ${finalMetadata.width}x${finalMetadata.height}`);
        
    } catch (error) {
        console.error('❌ Erro ao compor totem do produto:', error);
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
            // PRIMEIRA OPÇÃO: Composição com imagem real do Pexels
            console.log('🖼️ Usando imagem real do Pexels para composição...');
            await composePromotionalBanner(
                mainProduct.productName,
                mainProduct.price,
                productImageUrl,
                outputPath
            );
        } else if (!customPrompt) {
            // SEGUNDA OPÇÃO: Banner profissional sem APIs externas - ZERO distorção
            console.log('✨ Gerando banner profissional sem APIs externas...');
            await composeTextOnlyBanner(
                mainProduct.productName,
                mainProduct.price,
                mainProduct.category,
                outputPath
            );
        } else {
            // TERCEIRA OPÇÃO: Prompt customizado (para casos específicos)
            console.log('🤖 Usando prompt customizado...');
            await generateImage(customPrompt, outputPath);
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