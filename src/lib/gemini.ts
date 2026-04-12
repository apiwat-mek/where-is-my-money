export interface SlipData {
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  date: string; // ISO string
}

export async function processSlip(
  base64Image: string,
  mimeType: string,
): Promise<SlipData | null> {
  try {
    const response = await fetch("/api/process-slip", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base64Image,
        mimeType,
      }),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as SlipData;
  } catch (error) {
    console.error("Error processing slip:", error);
    return null;
  }
}
