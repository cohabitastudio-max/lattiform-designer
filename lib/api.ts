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
  surfaceType: string;
  cellSize: number;
  wallThickness: number;
  boundingBox: [number, number, number];
  resolution: string;
}): Promise<APIResponse> {
  const res = await fetchWithTimeout(API_BASE + "/api/tpms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      surfaceType: params.surfaceType,
      cellSize: params.cellSize,
      wallThickness: params.wallThickness,
      boundingBox: params.boundingBox,
      resolution: params.resolution,
    }),
  });
  return handleResponse(res);
}

export async function generateLattice(params: {
  unitCell: string;
  strutDiameter: number;
  boundingBox: [number, number, number];
  resolution: string;
}): Promise<APIResponse> {
  const res = await fetchWithTimeout(API_BASE + "/api/lattice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      unitCell: params.unitCell,
      strutDiameter: params.strutDiameter,
      boundingBox: params.boundingBox,
      resolution: params.resolution,
    }),
  });
  return handleResponse(res);
}

export interface CEMParams {
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
    maxOverhang?: number;
  };
  resolution: string;
}

export async function generateCEM(params: CEMParams): Promise<APIResponse> {
  const res = await fetchWithTimeout(API_BASE + "/api/cem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return handleResponse(res);
}

export async function healthCheck(): Promise<{ status: string; engine: string; capabilities?: string[] }> {
  const res = await fetchWithTimeout(API_BASE + "/health", { method: "GET" });
  return (await res.json()) as { status: string; engine: string; capabilities?: string[] };
}
