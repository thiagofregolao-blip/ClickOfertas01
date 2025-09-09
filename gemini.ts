import * as fs from "fs";
import { GoogleGenAI, Modality } from "@google/genai";

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateImage(
    prompt: string,
    imagePath: string,
    baseImage?: string
): Promise<void> {
    try {
        // Use o modelo correto da documentação oficial
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
            // Modo geração nova: apenas texto
            contents = [prompt];
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: contents
        });

        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error("No candidates returned from Gemini");
        }

        const content = candidates[0].content;
        if (!content || !content.parts) {
            throw new Error("No content parts returned from Gemini");
        }

        for (const part of content.parts) {
            if (part.text) {
                console.log("Gemini text response:", part.text);
            } else if (part.inlineData && part.inlineData.data) {
                const imageData = Buffer.from(part.inlineData.data, "base64");
                fs.writeFileSync(imagePath, imageData);
                console.log(`✅ Image saved as ${imagePath}`);
                return;
            }
        }
        
        throw new Error("No image data found in Gemini response");
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