import { create } from "zustand";
import { generateTPMS, generateLattice } from "@/lib/api";

export type Mode = "tpms" | "lattice";
export type Status = "idle" | "generating" | "success" | "error";
export type LogType = "info" | "success" | "error" | "warn";

export const TPMS_TYPES = [
  "gyroid",
  "schwarz_p",
  "schwarz_d",
  "diamond",
  "lidinoid",
  "neovius",
] as const;

export const LATTICE_TYPES = [
  "octet",
  "bcc",
  "fcc",
  "diamond",
  "kelvin",
] as const;

export const RESOLUTIONS = ["low", "medium", "high"] as const;

export interface TPMSParams {
  surfaceType: string;
  cellSize: number;
  wallThickness: number;
  boundingBox: [number, number, number];
  resolution: string;
}

export interface LatticeParams {
  unitCell: string;
  strutDiameter: number;
  boundingBox: [number, number, number];
  resolution: string;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: LogType;
}

export interface ManufacturingAnalysis {
  material: string;
  process: string;
  orientation: string;
  wallCheck: { pass: boolean; min: number; actual: number };
  printTime: string;
  costRange: string;
  score: number;
  warnings: string[];
  recommendations: string[];
}

export interface DesignState {
  mode: Mode;
  tpmsParams: TPMSParams;
  latticeParams: LatticeParams;
  stlBase64: string | null;
  triangles: number | null;
  fileSize: number | null;
  engine: string | null;
  status: Status;
  consoleLog: LogEntry[];
  manufacturingAnalysis: ManufacturingAnalysis | null;
  analyzingManufacturing: boolean;

  setMode: (mode: Mode) => void;
  setTPMSParam: <K extends keyof TPMSParams>(key: K, value: TPMSParams[K]) => void;
  setLatticeParam: <K extends keyof LatticeParams>(key: K, value: LatticeParams[K]) => void;
  applyParams: (params: {
    mode?: Mode;
    surfaceType?: string;
    unitCell?: string;
    cellSize?: number;
    wallThickness?: number;
    strutDiameter?: number;
    boundingBox?: [number, number, number];
    resolution?: string;
  }) => void;
  generate: () => Promise<void>;
  downloadSTL: () => void;
  reset: () => void;
  log: (message: string, type?: LogType) => void;
  setManufacturingAnalysis: (analysis: ManufacturingAnalysis | null) => void;
  setAnalyzingManufacturing: (v: boolean) => void;
  analyzeManufacturing: () => Promise<void>;
}

const defaultTPMS: TPMSParams = {
  surfaceType: "gyroid",
  cellSize: 5,
  wallThickness: 0.8,
  boundingBox: [40, 40, 40],
  resolution: "low",
};

const defaultLattice: LatticeParams = {
  unitCell: "octet",
  strutDiameter: 1.0,
  boundingBox: [40, 40, 40],
  resolution: "low",
};

function ts(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

export const useDesignStore = create<DesignState>((set, get) => ({
  mode: "tpms",
  tpmsParams: { ...defaultTPMS },
  latticeParams: { ...defaultLattice },
  stlBase64: null,
  triangles: null,
  fileSize: null,
  engine: null,
  status: "idle",
  consoleLog: [],
  manufacturingAnalysis: null,
  analyzingManufacturing: false,

  setMode: (mode) => {
    set({ mode });
    get().log(`Mode switched to ${mode.toUpperCase()}`, "info");
  },

  setTPMSParam: (key, value) =>
    set((s) => ({ tpmsParams: { ...s.tpmsParams, [key]: value } })),

  setLatticeParam: (key, value) =>
    set((s) => ({ latticeParams: { ...s.latticeParams, [key]: value } })),

  applyParams: (params) => {
    const state = get();
    if (params.mode) {
      set({ mode: params.mode });
    }
    const mode = params.mode || state.mode;

    if (mode === "tpms") {
      const update: Partial<TPMSParams> = {};
      if (params.surfaceType) update.surfaceType = params.surfaceType;
      if (params.cellSize !== undefined) update.cellSize = params.cellSize;
      if (params.wallThickness !== undefined) update.wallThickness = params.wallThickness;
      if (params.boundingBox) update.boundingBox = params.boundingBox;
      if (params.resolution) update.resolution = params.resolution;
      set((s) => ({ tpmsParams: { ...s.tpmsParams, ...update } }));
    } else {
      const update: Partial<LatticeParams> = {};
      if (params.unitCell) update.unitCell = params.unitCell;
      if (params.strutDiameter !== undefined) update.strutDiameter = params.strutDiameter;
      if (params.boundingBox) update.boundingBox = params.boundingBox;
      if (params.resolution) update.resolution = params.resolution;
      set((s) => ({ latticeParams: { ...s.latticeParams, ...update } }));
    }
    state.log("Parameters applied from AI recommendation", "info");
  },

  generate: async () => {
    const state = get();
    set({
      status: "generating",
      stlBase64: null,
      triangles: null,
      fileSize: null,
      engine: null,
      manufacturingAnalysis: null,
    });
    state.log(`Generating ${state.mode.toUpperCase()}...`, "info");

    try {
      const result =
        state.mode === "tpms"
          ? await generateTPMS(state.tpmsParams)
          : await generateLattice(state.latticeParams);

      if (result.success && result.stlBase64) {
        set({
          status: "success",
          stlBase64: result.stlBase64,
          triangles: result.triangles ?? null,
          fileSize: result.fileSize ?? null,
          engine: result.engine ?? null,
        });
        get().log(
          `Generated: ${(result.triangles ?? 0).toLocaleString()} triangles, ${((result.fileSize ?? 0) / 1024 / 1024).toFixed(1)}MB`,
          "success"
        );
        get().analyzeManufacturing();
      } else {
        set({ status: "error" });
        get().log("Generation failed: no STL returned", "error");
      }
    } catch (err) {
      set({ status: "error" });
      const msg = err instanceof Error ? err.message : "Unknown error";
      get().log(`Generation error: ${msg}`, "error");
    }
  },

  downloadSTL: () => {
    const state = get();
    if (!state.stlBase64) return;

    const byteChars = atob(state.stlBase64);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      bytes[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const name =
      state.mode === "tpms"
        ? state.tpmsParams.surfaceType
        : state.latticeParams.unitCell;
    a.download = `lattiform_${name}_${Date.now()}.stl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    state.log("STL downloaded", "success");
  },

  reset: () => {
    set({
      mode: "tpms",
      tpmsParams: { ...defaultTPMS },
      latticeParams: { ...defaultLattice },
      stlBase64: null,
      triangles: null,
      fileSize: null,
      engine: null,
      status: "idle",
      consoleLog: [],
      manufacturingAnalysis: null,
      analyzingManufacturing: false,
    });
  },

  log: (message, type = "info") =>
    set((s) => ({
      consoleLog: [
        ...s.consoleLog.slice(-99),
        { timestamp: ts(), message, type },
      ],
    })),

  setManufacturingAnalysis: (analysis) =>
    set({ manufacturingAnalysis: analysis }),

  setAnalyzingManufacturing: (v) =>
    set({ analyzingManufacturing: v }),

  analyzeManufacturing: async () => {
    const state = get();
    if (!state.triangles) return;

    set({ analyzingManufacturing: true, manufacturingAnalysis: null });
    state.log("Analyzing manufacturability...", "info");

    try {
      const params =
        state.mode === "tpms" ? state.tpmsParams : state.latticeParams;
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: state.mode,
          params,
          triangles: state.triangles,
          fileSize: state.fileSize,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        analysis?: ManufacturingAnalysis;
        error?: string;
      };
      if (data.analysis) {
        set({
          manufacturingAnalysis: data.analysis,
          analyzingManufacturing: false,
        });
        get().log(
          `Manufacturability score: ${data.analysis.score}/10`,
          data.analysis.score >= 7 ? "success" : "warn"
        );
      } else {
        throw new Error(data.error || "No analysis returned");
      }
    } catch (err) {
      set({ analyzingManufacturing: false });
      const msg = err instanceof Error ? err.message : "Analysis failed";
      get().log(`Manufacturing analysis error: ${msg}`, "error");
    }
  },
}));
