"use client";

import { useDesignStore } from "@/store/designStore";

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  let color = "bg-cad-error";
  if (score >= 7) color = "bg-cad-success";
  else if (score >= 5) color = "bg-yellow-400";
  else if (score >= 3) color = "bg-orange-400";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-cad-text-secondary">Manufacturability</span>
        <span className="text-sm font-mono font-bold text-cad-text">{score}/10</span>
      </div>
      <div className="h-2 bg-cad-input rounded-full overflow-hidden">
        <div
          className={"h-full rounded-full transition-all duration-500 " + color}
          style={{ width: pct + "%" }}
        />
      </div>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-cad-text-muted">{label}</span>
      <span className="text-[11px] font-mono text-cad-text bg-cad-input px-2 py-0.5 rounded">
        {value}
      </span>
    </div>
  );
}

function WallCheck({ pass, min, actual }: { pass: boolean; min: number; actual: number }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-cad-text-muted">Wall Check</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-cad-text-muted">
          {actual}mm / {min}mm min
        </span>
        <span
          className={
            "text-[10px] font-bold px-1.5 py-0.5 rounded " +
            (pass
              ? "bg-cad-success/20 text-cad-success"
              : "bg-cad-error/20 text-cad-error")
          }
        >
          {pass ? "PASS" : "FAIL"}
        </span>
      </div>
    </div>
  );
}

export default function ManufacturingPanel() {
  const analysis = useDesignStore((s) => s.manufacturingAnalysis);
  const analyzing = useDesignStore((s) => s.analyzingManufacturing);
  const status = useDesignStore((s) => s.status);

  if (analyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="w-5 h-5 border-2 border-cad-accent border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-cad-text-muted">Analyzing manufacturability...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <p className="text-xs text-cad-text-muted text-center">
          {status === "success"
            ? "Analysis will appear here after generation."
            : "Generate a part to see manufacturing analysis."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 space-y-3">
      <ScoreBar score={analysis.score} />

      <div className="border-t border-cad-border pt-2">
        <Badge label="Material" value={analysis.material} />
        <Badge label="Process" value={analysis.process} />
        <Badge label="Orientation" value={analysis.orientation} />
        <WallCheck
          pass={analysis.wallCheck.pass}
          min={analysis.wallCheck.min}
          actual={analysis.wallCheck.actual}
        />
        <Badge label="Print Time" value={analysis.printTime} />
        <Badge label="Est. Cost" value={analysis.costRange} />
      </div>

      {analysis.warnings.length > 0 && (
        <div className="border-t border-cad-border pt-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-cad-error mb-1.5">
            Warnings
          </p>
          {analysis.warnings.map((w, i) => (
            <div key={i} className="flex gap-1.5 mb-1">
              <span className="text-cad-error text-[11px] shrink-0">!</span>
              <span className="text-[11px] text-cad-error/80">{w}</span>
            </div>
          ))}
        </div>
      )}

      {analysis.recommendations.length > 0 && (
        <div className="border-t border-cad-border pt-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-yellow-400 mb-1.5">
            Recommendations
          </p>
          {analysis.recommendations.map((r, i) => (
            <div key={i} className="flex gap-1.5 mb-1">
              <span className="text-yellow-400 text-[11px] shrink-0">*</span>
              <span className="text-[11px] text-yellow-400/80">{r}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
