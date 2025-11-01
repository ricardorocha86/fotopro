import { GoogleGenAI, Modality } from "@google/genai";
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

export const generateImage = async (prompt: string, selfieDataUrl: string): Promise<string> => {
    const aiInstance = getAI();
    const selfieBase64 = getBase64Data(selfieDataUrl);

    if (!selfieBase64) {
        throw new Error("Failed to extract Base64 data from selfie.");
    }

    try {
        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: selfieBase64,
                            mimeType: 'image/jpeg',
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        throw new Error("No image data found in API response.");

    } catch (error) {
        console.error("Error generating image with Gemini:", error);
        throw error;
    }
};
