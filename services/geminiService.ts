import { GoogleGenAI, Modality } from "@google/genai";
import { PROFESSIONAL_PROMPTS } from '../constants';
import { GeneratedPhoto } from '../types';
import { getBase64Data } from '../utils/imageUtils';

let ai: GoogleGenAI | null = null;

const getAI = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}

const generateSinglePhoto = async (
    aiInstance: GoogleGenAI,
    base64Image: string,
    mimeType: string,
    promptData: { id: number; title: string; prompt: string }
): Promise<GeneratedPhoto> => {
    try {
        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64Image, mimeType: mimeType } },
                    { text: promptData.prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const base64Bytes = part.inlineData.data;
                const imageUrl = `data:${part.inlineData.mimeType};base64,${base64Bytes}`;
                return {
                    id: promptData.id,
                    prompt: promptData.prompt,
                    title: promptData.title,
                    imageUrl: imageUrl,
                };
            }
        }
        throw new Error("Nenhuma imagem foi gerada para o estilo: " + promptData.title);

    } catch (error) {
        console.error(`Error generating photo for prompt "${promptData.title}":`, error);
        return {
            id: promptData.id,
            prompt: promptData.prompt,
            title: promptData.title,
            imageUrl: null, // Indicate failure
        };
    }
};

export const generateProfessionalPhotos = async (
    imageDataUrl: string,
    mimeType: string
): Promise<GeneratedPhoto[]> => {
    const aiInstance = getAI();
    const base64Image = getBase64Data(imageDataUrl);

    if (!base64Image) {
        throw new Error("Falha ao processar a imagem. Verifique o formato do arquivo.");
    }

    const generationPromises = PROFESSIONAL_PROMPTS.map(promptData =>
        generateSinglePhoto(aiInstance, base64Image, mimeType, promptData)
    );

    try {
        const results = await Promise.all(generationPromises);
        return results;
    } catch (error) {
        console.error("Error generating professional photos:", error);
        throw new Error("Falha ao gerar as fotos. Verifique o console para mais detalhes.");
    }
};