const BASE_URL = "https://lattiformapi.onrender.com";
const TIMEOUT_MS = 90_000;

export interface TPMSRequest {
  surfaceType: string;
  cellSize: number;
  wallThickness: number;
  boundingBox: [number, number, number];
  resolution: string;
}

export interface LatticeRequest {
  unitCell: string;
  strutDiameter: number;
  boundingBox: [number, number, number];
  resolution: string;
}

export interface GenerateResponse {
  success: boolean;
  engine: string;
  stlBase64: string;
  triangles: number;
  fileSize: number;
}

export interface HealthResponse {
  status: string;
  [key: string]: unknown;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) msg = body.error;
      else if (body.message) msg = body.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function generateTPMS(
  params: TPMSRequest
): Promise<GenerateResponse> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/api/tpms`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    },
    TIMEOUT_MS
  );
  return handleResponse<GenerateResponse>(res);
}

export async function generateLattice(
  params: LatticeRequest
): Promise<GenerateResponse> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/api/lattice`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    },
    TIMEOUT_MS
  );
  return handleResponse<GenerateResponse>(res);
}

export async function healthCheck(): Promise<HealthResponse> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/health`,
    { method: "GET" },
    10_000
  );
  return handleResponse<HealthResponse>(res);
}
