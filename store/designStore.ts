import { create } from "zustand";
import { generateTPMS, generateLattice, generateCEM } from "@/lib/api";
import type { CEMParams } from "@/lib/api";

export type Mode = "tpms" | "lattice" | "cem";
export type Status = "idle" | "generating" | "success" | "error";
export type LogType = "info" | "success" | "error" | "warn";

export const TPMS_TYPES = ["gyroid","schwarz_p","schwarz_d","diamond","lidinoid","neovius"] as const;
export const LATTICE_TYPES = ["octet","bcc","fcc","diamond","kelvin"] as const;
export const RESOLUTIONS = ["low","medium","high"] as const;

export interface TPMSParams {
  surfaceType: string; cellSize: number; wallThickness: number;
  boundingBox: [number, number, number]; resolution: string;
}
export interface LatticeParams {
  unitCell: string; strutDiameter: number;
  boundingBox: [number, number, number]; resolution: string;
}
export interface LogEntry { timestamp: string; message: string; type: LogType; }

export interface ManufacturingAnalysis {
  material: string; process: string; orientation: string;
  wallCheck: { pass: boolean; min: number; actual: number };
  printTime: string; costRange: string; score: number;
  warnings: string[]; recommendations: string[];
}

export interface Generation {
  id: string; timestamp: number; mode: Mode;
  params: TPMSParams | LatticeParams | CEMParams;
  triangles: number; fileSize: number; engine: string; stlBase64: string;
}

export interface DesignState {
  mode: Mode;
  tpmsParams: TPMSParams;
  latticeParams: LatticeParams;
  cemParams: CEMParams | null;
  stlBase64: string | null;
  triangles: number | null;
  fileSize: number | null;
  engine: string | null;
  status: Status;
  consoleLog: LogEntry[];
  manufacturingAnalysis: ManufacturingAnalysis | null;
  analyzingManufacturing: boolean;
  generations: Generation[];
  activeGenerationId: string | null;
  historyRehydrated: boolean;

  setMode: (mode: Mode) => void;
  setTPMSParam: <K extends keyof TPMSParams>(key: K, value: TPMSParams[K]) => void;
  setLatticeParam: <K extends keyof LatticeParams>(key: K, value: LatticeParams[K]) => void;
  setCEMParams: (params: CEMParams) => void;
  applyParams: (params: {
    mode?: Mode; surfaceType?: string; unitCell?: string; cellSize?: number;
    wallThickness?: number; strutDiameter?: number;
    boundingBox?: [number, number, number]; resolution?: string;
  }) => void;
  generate: () => Promise<void>;
  generateFromCEM: (params: CEMParams) => Promise<void>;
  downloadSTL: () => void;
  reset: () => void;
  log: (message: string, type?: LogType) => void;
  setManufacturingAnalysis: (a: ManufacturingAnalysis | null) => void;
  setAnalyzingManufacturing: (v: boolean) => void;
  analyzeManufacturing: () => Promise<void>;
  saveGeneration: () => void;
  loadGeneration: (id: string) => void;
  deleteGeneration: (id: string) => void;
  rehydrateHistory: () => void;
}

const defaultTPMS: TPMSParams = { surfaceType: "gyroid", cellSize: 5, wallThickness: 0.8, boundingBox: [40,40,40], resolution: "low" };
const defaultLattice: LatticeParams = { unitCell: "octet", strutDiameter: 1.0, boundingBox: [40,40,40], resolution: "low" };

function ts(): string { return new Date().toLocaleTimeString("en-US", { hour12: false }); }
const HISTORY_KEY = "lattiform_generations";
const MAX_HISTORY = 10;

function persistHistory(g: Generation[]): void { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(g)); } catch {} }
function loadHistory(): Generation[] { try { const r = localStorage.getItem(HISTORY_KEY); return r ? JSON.parse(r) as Generation[] : []; } catch { return []; } }

export const useDesignStore = create<DesignState>((set, get) => ({
  mode: "tpms", tpmsParams: { ...defaultTPMS }, latticeParams: { ...defaultLattice },
  cemParams: null, stlBase64: null, triangles: null, fileSize: null, engine: null,
  status: "idle", consoleLog: [], manufacturingAnalysis: null, analyzingManufacturing: false,
  generations: [], activeGenerationId: null, historyRehydrated: false,

  setMode: (mode) => { set({ mode }); get().log("Mode: " + mode.toUpperCase(), "info"); },
  setTPMSParam: (key, value) => set((s) => ({ tpmsParams: { ...s.tpmsParams, [key]: value } })),
  setLatticeParam: (key, value) => set((s) => ({ latticeParams: { ...s.latticeParams, [key]: value } })),
  setCEMParams: (params) => set({ cemParams: params, mode: "cem" }),

  applyParams: (params) => {
    const state = get();
    if (params.mode) set({ mode: params.mode });
    const mode = params.mode || state.mode;
    if (mode === "tpms") {
      const u: Partial<TPMSParams> = {};
      if (params.surfaceType) u.surfaceType = params.surfaceType;
      if (params.cellSize !== undefined) u.cellSize = params.cellSize;
      if (params.wallThickness !== undefined) u.wallThickness = params.wallThickness;
      if (params.boundingBox) u.boundingBox = params.boundingBox;
      if (params.resolution) u.resolution = params.resolution;
      set((s) => ({ tpmsParams: { ...s.tpmsParams, ...u } }));
    } else if (mode === "lattice") {
      const u: Partial<LatticeParams> = {};
      if (params.unitCell) u.unitCell = params.unitCell;
      if (params.strutDiameter !== undefined) u.strutDiameter = params.strutDiameter;
      if (params.boundingBox) u.boundingBox = params.boundingBox;
      if (params.resolution) u.resolution = params.resolution;
      set((s) => ({ latticeParams: { ...s.latticeParams, ...u } }));
    }
    state.log("Parameters applied from AI", "info");
  },

  generate: async () => {
    const state = get();
    set({ status: "generating", stlBase64: null, triangles: null, fileSize: null, engine: null, manufacturingAnalysis: null, activeGenerationId: null });
    state.log("Generating " + state.mode.toUpperCase() + "...", "info");
    try {
      let result;
      if (state.mode === "cem" && state.cemParams) {
        result = await generateCEM(state.cemParams);
      } else if (state.mode === "lattice") {
        result = await generateLattice(state.latticeParams);
      } else {
        result = await generateTPMS(state.tpmsParams);
      }
      if (result.success && result.stlBase64) {
        set({ status: "success", stlBase64: result.stlBase64, triangles: result.triangles ?? null, fileSize: result.fileSize ?? null, engine: result.engine ?? null });
        get().log("Generated: " + (result.triangles ?? 0).toLocaleString() + " triangles, " + ((result.fileSize ?? 0) / 1024 / 1024).toFixed(1) + "MB", "success");
        get().saveGeneration();
        get().analyzeManufacturing();
      } else { set({ status: "error" }); get().log("Generation failed", "error"); }
    } catch (err) { set({ status: "error" }); get().log("Error: " + (err instanceof Error ? err.message : "Unknown"), "error"); }
  },

  generateFromCEM: async (params) => {
    set({ cemParams: params, mode: "cem" });
    const state = get();
    set({ status: "generating", stlBase64: null, triangles: null, fileSize: null, engine: null, manufacturingAnalysis: null, activeGenerationId: null });
    state.log("Generating CEM: " + params.name + "...", "info");
    try {
      const result = await generateCEM(params);
      if (result.success && result.stlBase64) {
        set({ status: "success", stlBase64: result.stlBase64, triangles: result.triangles ?? null, fileSize: result.fileSize ?? null, engine: result.engine ?? null });
        get().log("CEM generated: " + (result.triangles ?? 0).toLocaleString() + " triangles", "success");
        get().saveGeneration();
        get().analyzeManufacturing();
      } else { set({ status: "error" }); get().log("CEM generation failed", "error"); }
    } catch (err) { set({ status: "error" }); get().log("CEM error: " + (err instanceof Error ? err.message : "Unknown"), "error"); }
  },

  downloadSTL: () => {
    const s = get(); if (!s.stlBase64) return;
    const bytes = Uint8Array.from(atob(s.stlBase64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const name = s.mode === "cem" ? (s.cemParams?.name || "cem") : s.mode === "tpms" ? s.tpmsParams.surfaceType : s.latticeParams.unitCell;
    a.download = "lattiform_" + name.replace(/\s+/g, "_") + "_" + Date.now() + ".stl";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url); s.log("STL downloaded", "success");
  },

  reset: () => set({ mode: "tpms", tpmsParams: { ...defaultTPMS }, latticeParams: { ...defaultLattice }, cemParams: null, stlBase64: null, triangles: null, fileSize: null, engine: null, status: "idle", consoleLog: [], manufacturingAnalysis: null, analyzingManufacturing: false, activeGenerationId: null }),

  log: (message, type = "info") => set((s) => ({ consoleLog: [...s.consoleLog.slice(-99), { timestamp: ts(), message, type }] })),
  setManufacturingAnalysis: (a) => set({ manufacturingAnalysis: a }),
  setAnalyzingManufacturing: (v) => set({ analyzingManufacturing: v }),

  analyzeManufacturing: async () => {
    const s = get(); if (!s.triangles) return;
    set({ analyzingManufacturing: true, manufacturingAnalysis: null });
    s.log("Analyzing manufacturability...", "info");
    try {
      const params = s.mode === "cem" ? (s.cemParams || {}) : s.mode === "tpms" ? s.tpmsParams : s.latticeParams;
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: s.mode, params, triangles: s.triangles, fileSize: s.fileSize }) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = (await res.json()) as { analysis?: ManufacturingAnalysis; error?: string };
      if (data.analysis) { set({ manufacturingAnalysis: data.analysis, analyzingManufacturing: false });
        get().log("Score: " + data.analysis.score + "/10", data.analysis.score >= 7 ? "success" : "warn");
      } else throw new Error(data.error || "No analysis");
    } catch (err) { set({ analyzingManufacturing: false }); get().log("Analysis error: " + (err instanceof Error ? err.message : "Failed"), "error"); }
  },

  saveGeneration: () => {
    const s = get(); if (!s.stlBase64 || !s.triangles || !s.fileSize) return;
    const params = s.mode === "cem" ? (s.cemParams || {}) : s.mode === "tpms" ? { ...s.tpmsParams } : { ...s.latticeParams };
    const gen: Generation = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(), mode: s.mode, params: params as Generation["params"],
      triangles: s.triangles, fileSize: s.fileSize, engine: s.engine || "unknown", stlBase64: s.stlBase64 };
    const updated = [gen, ...s.generations].slice(0, MAX_HISTORY);
    set({ generations: updated, activeGenerationId: gen.id }); persistHistory(updated);
  },

  loadGeneration: (id) => {
    const s = get(); const gen = s.generations.find((g) => g.id === id); if (!gen) return;
    set({ mode: gen.mode, stlBase64: gen.stlBase64, triangles: gen.triangles, fileSize: gen.fileSize,
      engine: gen.engine, status: "success", activeGenerationId: gen.id, manufacturingAnalysis: null });
    if (gen.mode === "tpms") set({ tpmsParams: { ...(gen.params as TPMSParams) } });
    else if (gen.mode === "lattice") set({ latticeParams: { ...(gen.params as LatticeParams) } });
    else if (gen.mode === "cem") set({ cemParams: gen.params as CEMParams });
    s.log("Loaded from history", "info");
  },

  deleteGeneration: (id) => {
    const s = get(); const updated = s.generations.filter((g) => g.id !== id);
    set({ generations: updated, activeGenerationId: s.activeGenerationId === id ? null : s.activeGenerationId });
    persistHistory(updated);
  },

  rehydrateHistory: () => { if (get().historyRehydrated) return; set({ generations: loadHistory(), historyRehydrated: true }); },
}));
