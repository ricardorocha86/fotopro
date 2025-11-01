import { GoogleGenAI } from "@google/genai";

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

const SYSTEM_INSTRUCTION = "Você é um escritor talentoso de contos românticos para adultos. Suas histórias são apaixonadas, detalhadas e evocativas, com personagens bem desenvolvidos e cenários vívidos. Evite clichês e crie narrativas únicas e cativantes. A história deve ser bem estruturada, com começo, meio e fim. O tom deve ser sensual e romântico, mas de bom gosto.";

export const generateStory = async (userPrompt: string): Promise<string> => {
    const aiInstance = getAI();

    try {
        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.8,
                topP: 0.95,
            },
        });

        return response.text;

    } catch (error) {
        console.error("Error generating story with Gemini:", error);
        throw new Error("Falha ao gerar a história. A resposta da IA pode estar bloqueada ou ocorreu um erro de rede.");
    }
};