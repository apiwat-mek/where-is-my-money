import { GoogleGenAI, Type } from "@google/genai";

interface SlipData {
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  date: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    return;
  }

  const { base64Image, mimeType } = req.body ?? {};
  if (!base64Image || !mimeType) {
    res.status(400).json({ error: "base64Image and mimeType are required" });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
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
              Return ONLY the JSON object.`,
            },
            {
              inlineData: {
                data: base64Image,
                mimeType,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: ["income", "expense"] },
            category: { type: Type.STRING },
            description: { type: Type.STRING },
            date: { type: Type.STRING },
          },
          required: ["amount", "type", "category", "date"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      res.status(422).json({ error: "No data extracted from image" });
      return;
    }

    const parsed = JSON.parse(text) as SlipData;
    res.status(200).json(parsed);
  } catch (error) {
    console.error("Error processing slip with Gemini:", error);
    res.status(500).json({ error: "Failed to process slip" });
  }
}
