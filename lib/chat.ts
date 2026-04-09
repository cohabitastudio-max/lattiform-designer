export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ParsedParams {
  mode: "tpms" | "lattice";
  surfaceType?: string;
  unitCell?: string;
  cellSize?: number;
  wallThickness?: number;
  strutDiameter?: number;
  boundingBox?: [number, number, number];
  resolution?: string;
}

export function extractParams(text: string): ParsedParams | null {
  const match = text.match(/:::params\s*([\s\S]*?)\s*:::/);
  if (!match) return null;
  try {
    const raw = match[1].trim();
    const parsed = JSON.parse(raw) as ParsedParams;
    if (!parsed.mode) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function stripParamsBlock(text: string): string {
  return text.replace(/:::params\s*[\s\S]*?\s*:::/g, "").trim();
}

export async function streamChat(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Request failed" }));
      onError((body as { error?: string }).error || `HTTP ${res.status}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError("No response stream");
      return;
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      onToken(text);
    }

    onDone();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    onError(msg);
  }
}
