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

export interface ParsedCEM {
  name: string;
  envelope: [number, number, number];
  shellThickness: number;
  fill: {
    type: string;
    splitting: string;
    cellSizeMin: number;
    cellSizeMax: number;
    wallThicknessMin: number;
    wallThicknessMax: number;
    modulation: string;
  };
  regions?: {
    name: string;
    requirement: string;
    offset?: number[];
    size?: number[];
    shape?: string;
    radius?: number;
    heatFlux?: number;
  }[];
  manufacturing?: {
    process: string;
    material: string;
    minWall: number;
  };
  resolution: string;
}

export function extractParams(text: string): ParsedParams | null {
  const match = text.match(/:::params\s*([\s\S]*?)\s*:::/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim()) as ParsedParams;
    if (!parsed.mode) return null;
    return parsed;
  } catch { return null; }
}

export function extractCEM(text: string): ParsedCEM | null {
  const match = text.match(/:::cem\s*([\s\S]*?)\s*:::/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim()) as ParsedCEM;
    if (!parsed.envelope || !parsed.fill) return null;
    return parsed;
  } catch { return null; }
}

export function stripBlocks(text: string): string {
  return text.replace(/:::params\s*[\s\S]*?\s*:::/g, "").replace(/:::cem\s*[\s\S]*?\s*:::/g, "").trim();
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
      onError((body as { error?: string }).error || "HTTP " + res.status);
      return;
    }
    const reader = res.body?.getReader();
    if (!reader) { onError("No response stream"); return; }
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onToken(decoder.decode(value, { stream: true }));
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : "Network error");
  }
}
