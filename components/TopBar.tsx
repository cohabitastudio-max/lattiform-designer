"use client";

import { useEffect, useState } from "react";
import { useDesignStore } from "@/store/designStore";
import { healthCheck } from "@/lib/api";

export default function TopBar() {
  const [health, setHealth] = useState<{ status: string; engine: string; capabilities?: string[] } | null>(null);
  const reset = useDesignStore((s) => s.reset);
  const downloadSTL = useDesignStore((s) => s.downloadSTL);
  const stlBase64 = useDesignStore((s) => s.stlBase64);
  const mode = useDesignStore((s) => s.mode);

  useEffect(() => {
    healthCheck().then(setHealth).catch(() => setHealth(null));
    const id = setInterval(() => { healthCheck().then(setHealth).catch(() => setHealth(null)); }, 30000);
    return () => clearInterval(id);
  }, []);

  const isOnline = health?.status === "ok";
  const hasCEM = health?.capabilities?.includes("cem");

  return (
    <div className="h-10 min-h-[40px] flex items-center justify-between px-4 border-b border-cad-border bg-cad-panel">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-cad-text tracking-wider">LATTIFORM</span>
        <div className="flex items-center gap-1.5">
          <div className={"w-1.5 h-1.5 rounded-full " + (isOnline ? "bg-cad-success" : "bg-cad-error")} />
          <span className="text-[10px] text-cad-text-muted font-mono">
            {isOnline ? health.engine : "offline"}
          </span>
        </div>
        {hasCEM && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cad-accent/20 text-cad-accent">
            CEM
          </span>
        )}
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cad-input text-cad-text-muted">
          {mode.toUpperCase()}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={reset}
          className="text-[11px] text-cad-text-muted hover:text-cad-text px-2 py-1 rounded hover:bg-cad-input transition-colors">
          Reset
        </button>
        <button onClick={downloadSTL} disabled={!stlBase64}
          className="text-[11px] text-cad-accent hover:text-cad-accent-hover px-2 py-1 rounded hover:bg-cad-input transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          Export STL
        </button>
      </div>
    </div>
  );
}
