const API_BASE = "https://lattiformapi.onrender.com";
const TIMEOUT = 90000;

interface APIResponse {
  success: boolean;
  engine?: string;
  stlBase64?: string;
  triangles?: number;
  fileSize?: number;
  mode?: string;
  model?: Record<string, unknown>;
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function handleResponse(res: Response): Promise<APIResponse> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = (body as { detail?: string }).detail || res.statusText;
    throw new Error(detail);
  }
  return (await res.json()) as APIResponse;
}

export async function generateTPMS(params: {
  surfaceType: string; cellSize: number; wallThickness: number;
  boundingBox: [number, number, number]; resolution: string;
}): Promise<APIResponse> {
  const res = await fetchWithTimeout(API_BASE + "/api/tpms", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ surfaceType: params.surfaceType, cellSize: params.cellSize,
      wallThickness: params.wallThickness, boundingBox: params.boundingBox, resolution: params.resolution }),
  });
  return handleResponse(res);
}

export async function generateLattice(params: {
  unitCell: string; strutDiameter: number;
  boundingBox: [number, number, number]; resolution: string;
}): Promise<APIResponse> {
  const res = await fetchWithTimeout(API_BASE + "/api/lattice", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ unitCell: params.unitCell, strutDiameter: params.strutDiameter,
      boundingBox: params.boundingBox, resolution: params.resolution }),
  });
  return handleResponse(res);
}

export interface CEMParams {
  name: string; envelope: [number, number, number]; shellThickness: number;
  fill: { type: string; splitting: string; cellSizeMin: number; cellSizeMax: number;
    wallThicknessMin: number; wallThicknessMax: number; modulation: string; };
  regions?: { name: string; requirement: string; offset?: number[]; size?: number[];
    shape?: string; radius?: number; heatFlux?: number; }[];
  manufacturing?: { process: string; material: string; minWall: number; maxOverhang?: number; };
  resolution: string;
}

export async function generateCEM(params: CEMParams): Promise<APIResponse> {
  const res = await fetchWithTimeout(API_BASE + "/api/cem", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return handleResponse(res);
}

export interface ManufacturingAnalysisResult {
  success: boolean; material: string; process: string; processName: string;
  orientation: string; wallCheck: { pass: boolean; min: number; actual: number };
  estimatedVolumeCm3: number; estimatedMassG: number;
  buildTimeH: number; printTime: string; costRange: string; costEstimateUsd: number;
  score: number; warnings: string[]; recommendations: string[];
  materialProps: { pros: string[]; cons: string[] };
}

export async function analyzeManufacturing(params: {
  material: string; process: string; envelope: number[];
  shellThickness: number; wallThickness: number; fillRatio: number; maxOverhang?: number;
}): Promise<ManufacturingAnalysisResult> {
  const res = await fetchWithTimeout(API_BASE + "/api/manufacturing", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Manufacturing analysis failed: " + res.status);
  return (await res.json()) as ManufacturingAnalysisResult;
}

export interface PatentSearchResult {
  success: boolean; query: string[];
  patents: { id: string; title: string; date: string; abstract: string; url: string }[];
  riskLevel: string; riskScore: number; riskNotes: string[];
  recommendation: string; disclaimer: string;
}

export async function searchPatents(params: {
  geometryType: string; application: string; material?: string;
}): Promise<PatentSearchResult> {
  const res = await fetchWithTimeout(API_BASE + "/api/patents", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Patent search failed: " + res.status);
  return (await res.json()) as PatentSearchResult;
}

export interface PrintQuote {
  bureau: string; url: string; badge: string;
  unitPriceUsd: number; totalPriceUsd: number; leadTimeDays: number;
}

export interface QuoteResult {
  success: boolean; partVolumeCm3: number; estimatedMassG: number;
  material: string; process: string; quantity: number;
  quotes: PrintQuote[]; cheapest: PrintQuote; fastest: PrintQuote;
  orderInstructions: { step1: string; step2: string; step3: string; step4: string; note: string };
}

export async function getPrintQuotes(params: {
  material: string; process: string; envelope: number[];
  fillRatio: number; shellThickness: number; quantity: number;
}): Promise<QuoteResult> {
  const res = await fetchWithTimeout(API_BASE + "/api/quote", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Quote failed: " + res.status);
  return (await res.json()) as QuoteResult;
}

export interface Preset {
  id: string; name: string; icon: string; description: string;
  category: string; cemParams: CEMParams;
}

export async function getPresets(): Promise<{ presets: Preset[] }> {
  const res = await fetchWithTimeout(API_BASE + "/api/presets", { method: "GET" });
  if (!res.ok) throw new Error("Presets failed");
  return (await res.json()) as { presets: Preset[] };
}

export async function healthCheck(): Promise<{ status: string; engine: string; capabilities?: string[] }> {
  const res = await fetchWithTimeout(API_BASE + "/health", { method: "GET" });
  return (await res.json()) as { status: string; engine: string; capabilities?: string[] };
}
