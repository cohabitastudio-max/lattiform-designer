import { create } from "zustand";
import {
  generateTPMS,
  generateLattice,
  type TPMSRequest,
  type LatticeRequest,
} from "@/lib/api";
import { base64ToBlob } from "@/lib/stl";

export type GeneratorMode = "tpms" | "lattice";
export type Status = "idle" | "generating" | "success" | "error";

export interface ConsoleEntry {
  id: number;
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warn";
}

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
  surfaceType: (typeof TPMS_TYPES)[number];
  cellSize: number;
  wallThickness: number;
  boundingBox: [number, number, number];
  resolution: (typeof RESOLUTIONS)[number];
}

export interface LatticeParams {
  unitCell: (typeof LATTICE_TYPES)[number];
  strutDiameter: number;
  boundingBox: [number, number, number];
  resolution: (typeof RESOLUTIONS)[number];
}

interface DesignState {
  mode: GeneratorMode;
  tpmsParams: TPMSParams;
  latticeParams: LatticeParams;
  stlBase64: string | null;
  triangles: number;
  fileSize: number;
  engine: string;
  status: Status;
  console: ConsoleEntry[];
  setMode: (m: GeneratorMode) => void;
  setTPMSParam: <K extends keyof TPMSParams>(key: K, val: TPMSParams[K]) => void;
  setLatticeParam: <K extends keyof LatticeParams>(key: K, val: LatticeParams[K]) => void;
  generate: () => Promise<void>;
  downloadSTL: () => void;
  reset: () => void;
  log: (message: string, type?: ConsoleEntry["type"]) => void;
}

let consoleId = 0;

function timestamp(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

export const useDesignStore = create<DesignState>((set, get) => ({
  mode: "tpms",

  tpmsParams: {
    surfaceType: "gyroid",
    cellSize: 8,
    wallThickness: 1.2,
    boundingBox: [30, 30, 30],
    resolution: "low",
  },

  latticeParams: {
    unitCell: "octet",
    strutDiameter: 1.0,
    boundingBox: [30, 30, 30],
    resolution: "low",
  },

  stlBase64: null,
  triangles: 0,
  fileSize: 0,
  engine: "",
  status: "idle",
  console: [],

  setMode: (m) => set({ mode: m }),

  setTPMSParam: (key, val) =>
    set((s) => ({ tpmsParams: { ...s.tpmsParams, [key]: val } })),

  setLatticeParam: (key, val) =>
    set((s) => ({ latticeParams: { ...s.latticeParams, [key]: val } })),

  generate: async () => {
    const state = get();
    const logFn = state.log;

    set({ status: "generating", stlBase64: null, triangles: 0, fileSize: 0, engine: "" });
    logFn("Starting generation...", "info");

    try {
      const start = performance.now();
      let response;

      if (state.mode === "tpms") {
        const p = state.tpmsParams;
        logFn(
          "TPMS: " + p.surfaceType + " | cell " + p.cellSize + "mm | wall " + p.wallThickness + "mm | box [" + p.boundingBox + "] | " + p.resolution,
          "info"
        );
        response = await generateTPMS(p as TPMSRequest);
      } else {
        const p = state.latticeParams;
        logFn(
          "Lattice: " + p.unitCell + " | strut " + p.strutDiameter + "mm | box [" + p.boundingBox + "] | " + p.resolution,
          "info"
        );
        response = await generateLattice(p as LatticeRequest);
      }

      const elapsed = ((performance.now() - start) / 1000).toFixed(1);
      const sizeMB = (response.fileSize / (1024 * 1024)).toFixed(1);

      set({
        status: "success",
        stlBase64: response.stlBase64,
        triangles: response.triangles,
        fileSize: response.fileSize,
        engine: response.engine,
      });

      logFn(
        "Generated " + response.triangles.toLocaleString() + " triangles | " + sizeMB + "MB | " + elapsed + "s | " + response.engine,
        "success"
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      set({ status: "error" });
      logFn("Error: " + message, "error");
    }
  },

  downloadSTL: () => {
    const { stlBase64, mode, tpmsParams, latticeParams } = get();
    if (!stlBase64) return;

    const blob = base64ToBlob(stlBase64);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const name = mode === "tpms" ? tpmsParams.surfaceType : latticeParams.unitCell;
    a.href = url;
    a.download = "lattiform-" + name + "-" + Date.now() + ".stl";
    a.click();
    URL.revokeObjectURL(url);
    get().log("STL downloaded", "info");
  },

  reset: () =>
    set({
      stlBase64: null,
      triangles: 0,
      fileSize: 0,
      engine: "",
      status: "idle",
    }),

  log: (message, type = "info") =>
    set((s) => ({
      console: [
        ...s.console.slice(-199),
        { id: ++consoleId, time: timestamp(), message, type },
      ],
    })),
}));
