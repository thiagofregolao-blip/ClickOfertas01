import * as fs from "fs";
import { GoogleGenAI, Modality } from "@google/genai";

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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
        // Fallback para Gemini se Hugging Face não estiver disponível
        const model = "gemini-2.5-flash-image-preview";
        
        // Construir conteúdo baseado se é edição ou geração nova
        let contents: any[];
        
        if (baseImage && baseImage.startsWith('data:image/')) {
            // Modo edição: incluir imagem base + prompt
            const base64Data = baseImage.split(',')[1];
            const mimeType = baseImage.split(';')[0].split(':')[1];
            
            contents = [
                {
                    parts: [
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: mimeType
                            }
                        },
                        {
                            text: prompt
                        }
                    ]
                }
            ];
        } else {
            // Modo geração nova: estrutura completa com role/parts
            contents = [{
                role: "user",
                parts: [{ text: prompt }]
            }];
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            config: {
                // Forçar apenas imagem (evitar retorno só de texto)
                responseModalities: [Modality.IMAGE],
                generationConfig: { responseMimeType: "image/png" }
            }
        });

        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error("No candidates returned from Gemini");
        }

        const content = candidates[0].content;
        if (!content || !content.parts) {
            throw new Error("No content parts returned from Gemini");
        }

        // Verificar se realmente temos uma imagem antes de considerar sucesso
        const imagePart = content.parts?.find((p: any) => p.inlineData);
        
        if (!imagePart?.inlineData?.data) {
            console.error("❌ Gemini não retornou imagem, apenas texto ou erro");
            console.error("Response parts:", JSON.stringify(content.parts, null, 2));
            
            // Logar texto se houver (pode ser mensagem de segurança)
            const textParts = content.parts?.filter((p: any) => p.text);
            if (textParts?.length > 0) {
                console.error("Texto retornado:", textParts.map(p => p.text).join(' '));
            }
            
            throw new Error("NO_IMAGE_FROM_MODEL - Gemini retornou apenas texto");
        }

        // Salvar a imagem encontrada
        const imageData = Buffer.from(imagePart.inlineData.data, "base64");
        fs.writeFileSync(imagePath, imageData);
        console.log(`✅ Image saved as ${imagePath} (${imageData.length} bytes)`);
        return;
    } catch (error) {
        console.error("❌ Failed to generate image with Gemini:", error);
        throw new Error(`Failed to generate image: ${error}`);
    }
}

export async function summarizeArticle(text: string): Promise<string> {
    const prompt = `Please summarize the following text concisely while maintaining key points:\n\n${text}`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });

    return response.text || "Something went wrong";
}

export interface Sentiment {
    rating: number;
    confidence: number;
}

export async function analyzeSentiment(text: string): Promise<Sentiment> {
    try {
        const systemPrompt = `You are a sentiment analysis expert. 
Analyze the sentiment of the text and provide a rating
from 1 to 5 stars and a confidence score between 0 and 1.
Respond with JSON in this format: 
{'rating': number, 'confidence': number}`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        rating: { type: "number" },
                        confidence: { type: "number" },
                    },
                    required: ["rating", "confidence"],
                },
            },
            contents: text,
        });

        const rawJson = response.text;

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
        const fs = await import('fs');
        fs.default.writeFileSync(imagePath, Buffer.from(imageBuffer));
        
        console.log('✅ Imagem gerada com sucesso usando Hugging Face!');
        
    } catch (error) {
        console.error('❌ Erro ao gerar imagem com Hugging Face:', error);
        throw error;
    }
}