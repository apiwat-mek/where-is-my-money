export interface SlipData {
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  date: string; // ISO string
  requiresCategorySelection?: boolean;
  originalCategory?: string;
}

export interface AcceptedCategories {
  income: string[];
  expense: string[];
}

export async function processSlip(
  base64Image: string,
  mimeType: string,
  acceptedCategories: AcceptedCategories,
): Promise<SlipData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch("/api/process-slip", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        base64Image,
        mimeType,
        acceptedCategories,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      console.error("Slip extraction failed:", response.status, errorBody);
      return null;
    }

    return (await response.json()) as SlipData;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }

    console.error("Error processing slip:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
