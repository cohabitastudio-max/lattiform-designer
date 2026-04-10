"use client";

import { useState, useEffect } from "react";
import { useDesignStore, TPMS_TYPES, LATTICE_TYPES } from "@/store/designStore";
import { getPresets } from "@/lib/api";
import type { Preset } from "@/lib/api";

function Select({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[] | string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-mono uppercase tracking-widest text-cad-text-muted">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-cad-input border border-cad-border rounded px-2 py-1.5 text-xs text-cad-text focus:outline-none focus:border-cad-accent">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <label className="text-[10px] font-mono uppercase tracking-widest text-cad-text-muted">{label}</label>
        <span className="text-[10px] font-mono text-cad-accent">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-cad-accent" />
    </div>
  );
}

function BBoxInputs({ value, onChange }: {
  value: [number, number, number]; onChange: (v: [number, number, number]) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-mono uppercase tracking-widest text-cad-text-muted">Bounding Box (mm)</label>
      <div className="grid grid-cols-3 gap-1">
        {(["X", "Y", "Z"] as const).map((ax, i) => (
          <div key={ax}>
            <label className="text-[9px] text-cad-text-muted">{ax}</label>
            <input type="number" min={5} max={500} value={value[i]}
              onChange={(e) => { const v = [...value] as [number, number, number]; v[i] = parseFloat(e.target.value) || 0; onChange(v); }}
              className="w-full bg-cad-input border border-cad-border rounded px-2 py-1 text-xs font-mono text-cad-text focus:outline-none focus:border-cad-accent" />
          </div>
        ))}
      </div>
    </div>
  );
}

const MATERIALS = ["PA12","PA12-GF","Ti-6Al-4V","AlSi10Mg","316L","17-4PH","Inconel625","TPU-95A","PLA","PETG","Resin"];
const PROCESSES = ["SLS","MJF","DMLS","SLM","EBM","FDM","SLA","BJ"];

export default function ParameterPanel() {
  const mode = useDesignStore((s) => s.mode);
  const setMode = useDesignStore((s) => s.setMode);
  const tpmsParams = useDesignStore((s) => s.tpmsParams);
  const setTPMSParam = useDesignStore((s) => s.setTPMSParam);
  const latticeParams = useDesignStore((s) => s.latticeParams);
  const setLatticeParam = useDesignStore((s) => s.setLatticeParam);
  const cemParams = useDesignStore((s) => s.cemParams);
  const generateFromCEM = useDesignStore((s) => s.generateFromCEM);
  const generate = useDesignStore((s) => s.generate);
  const status = useDesignStore((s) => s.status);
  const generations = useDesignStore((s) => s.generations);
  const loadGeneration = useDesignStore((s) => s.loadGeneration);
  const deleteGeneration = useDesignStore((s) => s.deleteGeneration);
  const rehydrateHistory = useDesignStore((s) => s.rehydrateHistory);

  const [tab, setTab] = useState<"params" | "presets" | "history">("params");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState("PA12");
  const [selectedProcess, setSelectedProcess] = useState("SLS");

  useEffect(() => { rehydrateHistory(); }, [rehydrateHistory]);

  const loadPresets = async () => {
    setLoadingPresets(true);
    try {
      const data = await getPresets();
      setPresets(data.presets);
    } catch { /* fallback */ }
    setLoadingPresets(false);
  };

  useEffect(() => {
    if (tab === "presets" && presets.length === 0) loadPresets();
  }, [tab]);

  const handlePreset = (preset: Preset) => {
    const p = preset.cemParams;
    generateFromCEM({
      ...p,
      envelope: p.envelope as [number, number, number],
      manufacturing: { ...(p.manufacturing || { process: selectedProcess, material: selectedMaterial, minWall: 0.6 }), process: selectedProcess, material: selectedMaterial },
    });
  };

  const isGenerating = status === "generating";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Mode selector */}
      <div className="flex border-b border-cad-border text-[10px] font-mono shrink-0">
        {(["tpms", "lattice", "cem"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={"flex-1 py-2 uppercase tracking-widest transition-colors " + (mode === m ? "text-cad-accent border-b border-cad-accent" : "text-cad-text-muted hover:text-cad-text")}>
            {m}
          </button>
        ))}
      </div>

      {/* Tab selector */}
      <div className="flex border-b border-cad-border text-[10px] font-mono shrink-0">
        {(["params", "presets", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={"flex-1 py-1.5 uppercase tracking-widest transition-colors " + (tab === t ? "text-cad-accent" : "text-cad-text-muted hover:text-cad-text")}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* ── PARAMS TAB ── */}
        {tab === "params" && (
          <>
            {/* Material & Process (universal) */}
            <div className="grid grid-cols-2 gap-2">
              <Select label="Material" value={selectedMaterial} options={MATERIALS} onChange={setSelectedMaterial} />
              <Select label="Process" value={selectedProcess} options={PROCESSES} onChange={setSelectedProcess} />
            </div>

            {mode === "tpms" && (
              <>
                <Select label="Surface Type" value={tpmsParams.surfaceType} options={TPMS_TYPES} onChange={(v) => setTPMSParam("surfaceType", v)} />
                <Slider label="Cell Size" value={tpmsParams.cellSize} min={2} max={20} step={0.5} unit="mm" onChange={(v) => setTPMSParam("cellSize", v)} />
                <Slider label="Wall Thickness" value={tpmsParams.wallThickness} min={0.2} max={3} step={0.1} unit="mm" onChange={(v) => setTPMSParam("wallThickness", v)} />
                <BBoxInputs value={tpmsParams.boundingBox} onChange={(v) => setTPMSParam("boundingBox", v)} />
                <Select label="Resolution" value={tpmsParams.resolution} options={["low","medium"]} onChange={(v) => setTPMSParam("resolution", v)} />
              </>
            )}

            {mode === "lattice" && (
              <>
                <Select label="Unit Cell" value={latticeParams.unitCell} options={LATTICE_TYPES} onChange={(v) => setLatticeParam("unitCell", v)} />
                <Slider label="Strut Diameter" value={latticeParams.strutDiameter} min={0.3} max={5} step={0.1} unit="mm" onChange={(v) => setLatticeParam("strutDiameter", v)} />
                <BBoxInputs value={latticeParams.boundingBox} onChange={(v) => setLatticeParam("boundingBox", v)} />
                <Select label="Resolution" value={latticeParams.resolution} options={["low","medium"]} onChange={(v) => setLatticeParam("resolution", v)} />
              </>
            )}

            {mode === "cem" && cemParams && (
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-cad-text-muted">CEM Active Model</div>
                <div className="bg-cad-input rounded p-2 space-y-1 text-[11px]">
                  <div className="text-cad-text font-bold">{cemParams.name}</div>
                  <div className="text-cad-text-muted">{cemParams.fill.type} · {cemParams.fill.modulation}</div>
                  <div className="text-cad-text-muted">{cemParams.envelope.join("×")}mm</div>
                </div>
                <button onClick={() => setTab("presets")}
                  className="w-full py-1.5 text-[11px] text-cad-accent border border-cad-accent/30 rounded hover:bg-cad-accent/10 transition-colors">
                  Change Preset →
                </button>
              </div>
            )}

            {mode === "cem" && !cemParams && (
              <div className="text-center py-4">
                <p className="text-[11px] text-cad-text-muted mb-3">Select a preset or use the AI chat to design a CEM model</p>
                <button onClick={() => setTab("presets")}
                  className="px-4 py-2 text-xs font-bold bg-cad-accent/20 border border-cad-accent/40 text-cad-accent rounded hover:bg-cad-accent/30 transition-colors">
                  Browse Presets →
                </button>
              </div>
            )}

            {/* Generate button */}
            {(mode !== "cem" || cemParams) && (
              <button onClick={generate} disabled={isGenerating}
                className={"w-full py-2.5 rounded text-xs font-bold transition-all " + (isGenerating ? "bg-cad-accent/30 text-cad-accent/50 cursor-not-allowed" : "bg-cad-accent text-white hover:bg-cad-accent/80")}>
                {isGenerating ? "Generating..." : "Generate"}
              </button>
            )}
          </>
        )}

        {/* ── PRESETS TAB ── */}
        {tab === "presets" && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Select label="Override Material" value={selectedMaterial} options={MATERIALS} onChange={setSelectedMaterial} />
              <Select label="Override Process" value={selectedProcess} options={PROCESSES} onChange={setSelectedProcess} />
            </div>
            {loadingPresets ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-4 h-4 border-2 border-cad-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : presets.length > 0 ? (
              presets.map((preset) => (
                <button key={preset.id} onClick={() => handlePreset(preset)}
                  className="w-full text-left p-3 rounded border border-cad-border bg-cad-input/50 hover:border-cad-accent/50 hover:bg-cad-accent/5 transition-colors mb-2 group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{preset.icon}</span>
                    <span className="text-xs font-bold text-cad-text group-hover:text-cad-accent transition-colors">{preset.name}</span>
                  </div>
                  <p className="text-[10px] text-cad-text-muted leading-relaxed">{preset.description}</p>
                  <div className="mt-1.5 text-[9px] font-mono text-cad-accent/60">
                    {preset.cemParams.fill.type} · {preset.cemParams.envelope.join("×")}mm
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-cad-text-muted">No presets loaded.</p>
                <button onClick={loadPresets} className="mt-2 text-xs text-cad-accent hover:underline">Retry</button>
              </div>
            )}
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <>
            {generations.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-xs text-cad-text-muted">No generation history yet.</p>
              </div>
            ) : (
              generations.map((g) => (
                <div key={g.id} className="border border-cad-border rounded p-2.5 mb-2 hover:border-cad-accent/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-cad-text uppercase">{g.mode}</div>
                      <div className="text-[10px] font-mono text-cad-text-muted">{g.triangles?.toLocaleString()} tri · {((g.fileSize || 0)/1024/1024).toFixed(1)}MB</div>
                      <div className="text-[10px] text-cad-text-muted">{new Date(g.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => loadGeneration(g.id)} className="px-2 py-1 text-[9px] bg-cad-accent/20 text-cad-accent rounded hover:bg-cad-accent/30">Load</button>
                      <button onClick={() => deleteGeneration(g.id)} className="px-2 py-1 text-[9px] bg-cad-error/20 text-cad-error rounded hover:bg-cad-error/30">Del</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
