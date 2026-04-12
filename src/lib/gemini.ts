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
      }),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as SlipData;
  } catch (error) {
    console.error("Error processing slip:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
