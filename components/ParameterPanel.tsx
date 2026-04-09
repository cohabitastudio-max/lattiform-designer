"use client";

import { useDesignStore, TPMS_TYPES, LATTICE_TYPES, RESOLUTIONS } from "@/store/designStore";
import type { Mode } from "@/store/designStore";
import GenerateButton from "./GenerateButton";
import DownloadButton from "./DownloadButton";
import { Grid3x3, Layers } from "lucide-react";
import React from "react";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono uppercase tracking-widest text-cad-text-muted mt-4 mb-2">
      {children}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <label className="text-xs text-cad-text-secondary whitespace-nowrap">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step ?? 0.1}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-20 bg-cad-input border border-cad-border rounded px-2 py-1 text-xs text-cad-text font-mono text-right focus:outline-none focus:border-cad-accent transition-colors"
        />
        {unit && (
          <span className="text-[10px] text-cad-text-muted font-mono w-6">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <label className="text-xs text-cad-text-secondary whitespace-nowrap">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-cad-input border border-cad-border rounded px-2 py-1 text-xs text-cad-text font-mono focus:outline-none focus:border-cad-accent transition-colors cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ParameterPanel() {
  const {
    mode,
    setMode,
    tpmsParams,
    latticeParams,
    setTPMSParam,
    setLatticeParam,
    triangles,
    fileSize,
    engine,
    status,
  } = useDesignStore();

  const axes = ["X", "Y", "Z"] as const;

  return (
    <div className="flex flex-col h-full bg-cad-panel">
      <div className="p-4 flex-1 overflow-y-auto">
        <SectionLabel>Generator</SectionLabel>
        <div className="flex gap-1 mb-4">
          {(["tpms", "lattice"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-medium transition-colors " +
                (mode === m
                  ? "bg-cad-accent text-white"
                  : "bg-cad-input text-cad-text-secondary hover:bg-cad-border-hover")
              }
            >
              {m === "tpms" ? <Layers size={14} /> : <Grid3x3 size={14} />}
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        {mode === "tpms" && (
          <>
            <SectionLabel>Surface Type</SectionLabel>
            <SelectInput
              label="Type"
              value={tpmsParams.surfaceType}
              options={TPMS_TYPES}
              onChange={(v) => setTPMSParam("surfaceType", v)}
            />

            <SectionLabel>Dimensions</SectionLabel>
            <NumberInput
              label="Cell Size"
              value={tpmsParams.cellSize}
              onChange={(v) => setTPMSParam("cellSize", v)}
              min={2}
              max={50}
              step={0.5}
              unit="mm"
            />
            <NumberInput
              label="Wall Thickness"
              value={tpmsParams.wallThickness}
              onChange={(v) => setTPMSParam("wallThickness", v)}
              min={0.3}
              max={10}
              step={0.1}
              unit="mm"
            />

            <SectionLabel>Bounding Box</SectionLabel>
            {axes.map((axis, i) => (
              <NumberInput
                key={axis}
                label={axis}
                value={tpmsParams.boundingBox[i]}
                onChange={(v) => {
                  const bb: [number, number, number] = [
                    tpmsParams.boundingBox[0],
                    tpmsParams.boundingBox[1],
                    tpmsParams.boundingBox[2],
                  ];
                  bb[i] = v;
                  setTPMSParam("boundingBox", bb);
                }}
                min={5}
                max={100}
                step={1}
                unit="mm"
              />
            ))}

            <SectionLabel>Quality</SectionLabel>
            <SelectInput
              label="Resolution"
              value={tpmsParams.resolution}
              options={RESOLUTIONS}
              onChange={(v) => setTPMSParam("resolution", v)}
            />

            {tpmsParams.resolution !== "low" && (
              <p className="text-xs text-yellow-400 mt-1 font-mono">
                Warning: Medium/High may timeout on free tier
              </p>
            )}
          </>
        )}

        {mode === "lattice" && (
          <>
            <SectionLabel>Unit Cell</SectionLabel>
            <SelectInput
              label="Cell"
              value={latticeParams.unitCell}
              options={LATTICE_TYPES}
              onChange={(v) => setLatticeParam("unitCell", v)}
            />

            <SectionLabel>Dimensions</SectionLabel>
            <NumberInput
              label="Strut Diameter"
              value={latticeParams.strutDiameter}
              onChange={(v) => setLatticeParam("strutDiameter", v)}
              min={0.2}
              max={10}
              step={0.1}
              unit="mm"
            />

            <SectionLabel>Bounding Box</SectionLabel>
            {axes.map((axis, i) => (
              <NumberInput
                key={axis}
                label={axis}
                value={latticeParams.boundingBox[i]}
                onChange={(v) => {
                  const bb: [number, number, number] = [
                    latticeParams.boundingBox[0],
                    latticeParams.boundingBox[1],
                    latticeParams.boundingBox[2],
                  ];
                  bb[i] = v;
                  setLatticeParam("boundingBox", bb);
                }}
                min={5}
                max={100}
                step={1}
                unit="mm"
              />
            ))}

            <SectionLabel>Quality</SectionLabel>
            <SelectInput
              label="Resolution"
              value={latticeParams.resolution}
              options={RESOLUTIONS}
              onChange={(v) => setLatticeParam("resolution", v)}
            />

            {latticeParams.resolution !== "low" && (
              <p className="text-xs text-yellow-400 mt-1 font-mono">
                Warning: Medium/High may timeout on free tier
              </p>
            )}
          </>
        )}

        {status === "success" && triangles !== null && triangles > 0 && (
          <>
            <SectionLabel>Result</SectionLabel>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-cad-text-muted">Triangles</span>
                <span className="font-mono text-cad-text">
                  {triangles.toLocaleString()}
                </span>
              </div>
              {fileSize !== null && (
                <div className="flex justify-between text-xs">
                  <span className="text-cad-text-muted">File Size</span>
                  <span className="font-mono text-cad-text">
                    {(fileSize / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              )}
              {engine && (
                <div className="flex justify-between text-xs">
                  <span className="text-cad-text-muted">Engine</span>
                  <span className="font-mono text-cad-text text-[10px]">
                    {engine}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="p-4 border-t border-cad-border space-y-2">
        <GenerateButton />
        <DownloadButton />
      </div>
    </div>
  );
}
