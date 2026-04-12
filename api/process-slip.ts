import { GoogleGenAI, Type } from "@google/genai";

interface SlipData {
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  date: string;
}

let cachedClient: GoogleGenAI | null = null;

function getClient(apiKey: string): GoogleGenAI {
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }

  return cachedClient;
}

function extractJsonPayload(text: string): string | null {
  const trimmed = text.trim();

  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  return objectMatch?.[0] ?? null;
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
    const ai = getClient(apiKey);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            {
              text: "Extract amount, type (income|expense), category, description, and date (ISO 8601) from this bank slip. Return JSON only.",
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

    const jsonText = extractJsonPayload(text);
    if (!jsonText) {
      res.status(422).json({ error: "Model returned unparseable output" });
      return;
    }

    const parsed = JSON.parse(jsonText) as Partial<SlipData>;
    if (
      typeof parsed.amount !== "number" ||
      (parsed.type !== "income" && parsed.type !== "expense") ||
      typeof parsed.category !== "string" ||
      typeof parsed.date !== "string"
    ) {
      res
        .status(422)
        .json({ error: "Model output was missing required fields" });
      return;
    }

    res.status(200).json(parsed);
  } catch (error) {
    console.error("Error processing slip with Gemini:", error);

    const message =
      error instanceof Error ? error.message : "Failed to process slip";
    res.status(500).json({ error: message });
  }
}
