import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface SlipData {
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string; // ISO string
}

export async function processSlip(base64Image: string, mimeType: string): Promise<SlipData | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: `Analyze this bank slip image and extract the following information in JSON format:
              - amount: The total amount (number)
              - type: Either 'income' or 'expense' (based on whether it's a transfer in or out)
              - category: A suitable category (e.g., Food, Transport, Salary, Shopping, Utilities, etc.)
              - description: A brief description of the transaction
              - date: The transaction date in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
              
              If you cannot find a specific field, provide a best guess or leave it empty/null.
              Return ONLY the JSON object.`
            },
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: ['income', 'expense'] },
            category: { type: Type.STRING },
            description: { type: Type.STRING },
            date: { type: Type.STRING }
          },
          required: ["amount", "type", "category", "date"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as SlipData;
  } catch (error) {
    console.error("Error processing slip with Gemini:", error);
    return null;
  }
}
