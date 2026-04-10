"use client";

import { useDesignStore } from "@/store/designStore";
import type { CEMParams } from "@/lib/api";
import { useState } from "react";
import { Zap, Download, Code2, LayoutList, Loader2 } from "lucide-react";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="section-label">{children}</div>;
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-cad-text-muted">{label}</span>
      <span className="text-xs font-mono text-cad-text">{value}</span>
    </div>
  );
}

export default function CEMEditor() {
  const cemParams = useDesignStore((s) => s.cemParams);
  const status = useDesignStore((s) => s.status);
  const generate = useDesignStore((s) => s.generate);
  const downloadSTL = useDesignStore((s) => s.downloadSTL);
  const stlBase64 = useDesignStore((s) => s.stlBase64);
  const triangles = useDesignStore((s) => s.triangles);
  const fileSize = useDesignStore((s) => s.fileSize);
  const engine = useDesignStore((s) => s.engine);
  const [showJson, setShowJson] = useState(false);

  if (!cemParams) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <div className="w-10 h-10 rounded-xl bg-cad-surface flex items-center justify-center mb-3">
          <Code2 size={18} className="text-cad-text-dim" />
        </div>
        <p className="text-xs text-cad-text-muted text-center">
          Use the AI Agent to generate a CEM model.
        </p>
        <p className="text-2xs text-cad-text-dim text-center mt-1">
          Or switch to TPMS / Lattice mode.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mt-4 mb-2">
          <SectionLabel>CEM Model</SectionLabel>
          <button
            onClick={() => setShowJson(!showJson)}
            className="flex items-center gap-1 text-2xs text-cad-accent hover:text-cad-accent-hover transition-colors"
          >
            {showJson ? <LayoutList size={11} /> : <Code2 size={11} />}
            {showJson ? "Summary" : "JSON"}
          </button>
        </div>

        {showJson ? (
          <pre className="text-2xs font-mono text-cad-text-secondary bg-cad-input rounded-lg p-3 overflow-x-auto whitespace-pre-wrap border border-cad-border">
            {JSON.stringify(cemParams, null, 2)}
          </pre>
        ) : (
          <>
            {/* Header Card */}
            <div className="card-base mb-3">
              <p className="text-sm font-semibold text-cad-text">{cemParams.name}</p>
              <p className="text-2xs text-cad-text-muted font-mono mt-1">
                {cemParams.envelope[0]} × {cemParams.envelope[1]} × {cemParams.envelope[2]} mm
              </p>
            </div>

            {/* Fill */}
            <SectionLabel>Fill ttern</SectionLabel>
            <div className="card-base space-y-0.5">
              <Field label="Surface" value={cemParams.fill.type} />
              <Field label="Splitting" value={cemParams.fill.splitting} />
              <Field label="Cell Size" value={cemParams.fill.cellSizeMin + " – " + cemParams.fill.cellSizeMax + " mm"} />
              <Field label="Wall" value={cemParams.fill.wallThicknessMin + " – " + cemParams.fill.wallThicknessMax + " mm"} />
              <Field label="Modulation" value={cemParams.fill.modulation} />
              {cemParams.shellThickness > 0 && (
                <Field label="Shell" value={cemParams.shellThickness + " mm"} />
              )}
            </div>

            {/* Regions */}
            {cemParams.regions && cemParams.regions.length > 0 && (
              <>
                <SectionLabel>Regions ({cemParams.regions.length})</SectionLabel>
                <div className="space-y-2">
                  {cemParams.regions.map((r, i) => (
                    <div key={i} className="card-base">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-cad-text">{r.name}</span>
                        <span
                          className={
                            r.requirement === "solid"
                              ? "badge-success"
                              : r.requirement === "void" || r.requirement === "channel"
                              ? "badge-error"
                              : "badge-accent"
                          }
                        >
                          {r.requirement}
                        </span>
                      </div>
                      {r.offset && (
                        <p className="text-2xs text-cad-text-dim font-mono">
                          offset: [{r.offset.join(", ")}]
                          {r.size ? " size: [" + r.size.join(", ") + "]" : ""}
                          {r.radius ? " r: " + r.radius : ""}
                          {r.heatFlux ? " flux: " + r.heatFlux + " W/cm²" : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Manufacturing */}
            {cemParams.manufacturing && (
              <>
                <SectionLabel>Manufacturing</SectionLabel>
                <div className="card-base space-y-0.5">
                  <Field label="Process" value={cemParams.manufacturing.process} />
                  <Field label="Material" value={cemParams.manufacturing.material} />
                  <Field label="Min Wall" value={cemParams.manufacturing.minWall + " mm"} />
                </div>
              </>
            )}

            {/* Result */}
            {status === "success" && triangles !== null && triangles > 0 && (
              <>
                <SectionLabel>Result</SectionLabel>
                <div className="card-base space-y-0.5">
                  <Field label="Triangles" value={triangles.toLocaleString()} />
                  {fileSize !== null && <Field label="Size" value={(fileSize / 1024 / 1024).toFixed(1) + " MB"} />}
                  {engine && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-cad-text-muted">Engine</span>
                      <span className="badge-accent">{engine}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="pt-4 space-y-2">
        <button
          onClick={() => generate()}
          disabled={status === "generating"}
          className="btn-primary w-full"
        >
          {status === "generating" ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Zap size={15} />
            {stlBase64 ? "Regenerate CEM" : "Generate CEM"}
            </>
          )}
        </button>
        <button
          onClick={downloadSTL}
          disabled={!stlBase64}
          className="btn-secondary w-full"
        >
          <Download size={15} />
          Download STL
        </button>
      </div>
    </div>
  );
}
