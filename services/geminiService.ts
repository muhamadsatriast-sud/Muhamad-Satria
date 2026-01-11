
import { GoogleGenAI, Type } from "@google/genai";
import { Priority } from "../types";

// Analyze complaint priority using Gemini AI with structured JSON output
export const analyzeComplaintPriority = async (complaint: string, itemName: string, roomName: string): Promise<{ priority: Priority; reasoning: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analisis tingkat urgensi perbaikan rumah sakit untuk data berikut:
      Item: ${itemName}
      Ruangan: ${roomName}
      Komplain: ${complaint}
      
      Tentukan prioritas antara: Rendah, Sedang, Tinggi, Kritis.
      Berikan alasan singkat dalam bahasa Indonesia.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            priority: {
              type: Type.STRING,
              description: 'Priority level: Rendah, Sedang, Tinggi, or Kritis',
            },
            reasoning: {
              type: Type.STRING,
              description: 'Brief reason for the priority assignment',
            },
          },
          required: ["priority", "reasoning"],
        },
      },
    });

    // Access the text property directly and trim whitespace for robust JSON parsing
    const text = response.text?.trim();
    if (!text) {
      throw new Error("Empty response from AI");
    }

    const data = JSON.parse(text);
    // Map response string to Priority enum
    let priority = Priority.MEDIUM;
    if (data.priority.includes('Rendah')) priority = Priority.LOW;
    if (data.priority.includes('Sedang')) priority = Priority.MEDIUM;
    if (data.priority.includes('Tinggi')) priority = Priority.HIGH;
    if (data.priority.includes('Kritis')) priority = Priority.CRITICAL;

    return { priority, reasoning: data.reasoning };
  } catch (error) {
    console.error("AI Analysis error:", error);
    return { priority: Priority.MEDIUM, reasoning: "Gagal menganalisis otomatis." };
  }
};
