"use client";

import { useDesignStore } from "@/store/designStore";
import type { CEMParams } from "@/lib/api";
import { useState } from "react";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono uppercase tracking-widest text-cad-text-muted mt-4 mb-2">
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] text-cad-text-muted">{label}</span>
      <span className="text-[11px] font-mono text-cad-text">{value}</span>
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className={"text-[10px] font-mono px-1.5 py-0.5 rounded " + color}>
      {text}
    </span>
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
      <div className="flex flex-col items-center justify-center h-full p-6">
        <p className="text-xs text-cad-text-muted text-center">
          Use the AI Chat to generate a CEM model, or switch to TPMS/Lattice mode.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>CEM Model</SectionLabel>
          <button
            onClick={() => setShowJson(!showJson)}
            className="text-[10px] text-cad-accent hover:text-cad-accent-hover transition-colors"
          >
            {showJson ? "Summary" : "JSON"}
          </button>
        </div>

        {showJson ? (
          <pre className="text-[10px] font-mono text-cad-text-secondary bg-cad-input rounded p-2 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(cemParams, null, 2)}
          </pre>
        ) : (
          <>
            <div className="bg-cad-input rounded p-2 mb-2">
              <p className="text-xs font-medium text-cad-text">{cemParams.name}</p>
              <p className="text-[10px] text-cad-text-muted font-mono mt-0.5">
                {cemParams.envelope[0]}x{cemParams.envelope[1]}x{cemParams.envelope[2]}mm
              </p>
            </div>

            <SectionLabel>Fill</SectionLabel>
            <Field label="Surface" value={cemParams.fill.type} />
            <Field label="Splitting" value={cemParams.fill.splitting} />
            <Field label="Cell Size" value={cemParams.fill.cellSizeMin + " - " + cemParams.fill.cellSizeMax + " mm"} />
            <Field label="Wall" value={cemParams.fill.wallThicknessMin + " - " + cemParams.fill.wallThicknessMax + " mm"} />
            <Field label="Modulation" value={cemParams.fill.modulation} />
            {cemParams.shellThickness > 0 && (
              <Field label="Shell" value={cemParams.shellThickness + " mm"} />
            )}

            {cemParams.regions && cemParams.regions.length > 0 && (
              <>
                <SectionLabel>Regions ({cemParams.regions.length})</SectionLabel>
                {cemParams.regions.map((r, i) => (
                  <div key={i} className="bg-cad-input rounded p-2 mb-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-cad-text">{r.name}</span>
                      <Badge
                        text={r.requirement}
                        color={
                          r.requirement === "solid"
                            ? "bg-cad-success/20 text-cad-success"
                            : r.requirement === "void" || r.requirement === "channel"
                            ? "bg-cad-error/20 text-cad-error"
                            : "bg-cad-accent/20 text-cad-accent"
                        }
                      />
                    </div>
                    {r.offset && (
                      <p className="text-[10px] text-cad-text-muted font-mono mt-0.5">
                        offset: [{r.offset.join(", ")}]
                        {r.size ? " size: [" + r.size.join(", ") + "]" : ""}
                        {r.radius ? " r: " + r.radius : ""}
                        {r.heatFlux ? " flux: " + r.heatFlux + "W/cm2" : ""}
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}

            {cemParams.manufacturing && (
              <>
                <SectionLabel>Manufacturing</SectionLabel>
                <Field label="Process" value={cemParams.manufacturing.process} />
                <Field label="Material" value={cemParams.manufacturing.material} />
                <Field label="Min Wall" value={cemParams.manufacturing.minWall + " mm"} />
              </>
            )}

            {status === "success" && triangles !== null && triangles > 0 && (
              <>
                <SectionLabel>Result</SectionLabel>
                <Field label="Triangles" value={triangles.toLocaleString()} />
                {fileSize !== null && <Field label="Size" value={(fileSize / 1024 / 1024).toFixed(1) + " MB"} />}
                {engine && <Field label="Engine" value={engine} />}
              </>
            )}
          </>
        )}
      </div>

      <div className="p-4 border-t border-cad-border space-y-2">
        <button
          onClick={() => generate()}
          disabled={status === "generating"}
          className="w-full py-2 bg-cad-accent hover:bg-cad-accent-hover text-white text-xs font-medium rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {status === "generating" ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            "Regenerate CEM"
          )}
        </button>
        <button
          onClick={downloadSTL}
          disabled={!stlBase64}
          className="w-full py-2 bg-cad-input hover:bg-cad-border text-cad-text-secondary text-xs font-medium rounded border border-cad-border transition-colors disabled:opacity-30"
        >
          Download STL
        </button>
      </div>
    </div>
  );
}
