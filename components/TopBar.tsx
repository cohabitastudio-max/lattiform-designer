"use client";

import { useEffect, useState } from "react";
import { useDesignStore } from "@/store/designStore";
import { healthCheck } from "@/lib/api";
import { Activity, Download, RotateCcw, Cpu } from "lucide-react";

export default function TopBar() {
  const [health, setHealth] = useState<{ status: string; engine: string; capabilities?: string[] } | null>(null);
  const reset = useDesignStore((s) => s.reset);
  const downloadSTL = useDesignStore((s) => s.downloadSTL);
  const stlBase64 = useDesignStore((s) => s.stlBase64);
  const mode = useDesignStore((s) => s.mode);
  const status = useDesignStore((s) => s.status);

  useEffect(() => {
    healthCheck().then(setHealth).catch(() => setHealth(null));
    const id = setInterval(() => {
      healthCheck().then(setHealth).catch(() => setHealth(null));
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const isOnline = health?.status === "ok";
  const hasCEM = health?.capabilities?.includes("cem");

  return (
    <div className="h-12 min-h-[48px] flex items-center justify-between px-5 border-b border-cad-border bg-cad-panel noise-overlay">
      {/* Left */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cad-accent to-cad-secondary flex items-center justify-center shadow-glow-sm">
            <Cpu size={13} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold text-cad-text tracking-wider">LATTIFORM</span>
            <span className="text-2xs text-cad-text-dim font-mono">v2.0</span>
          </div>
        </div>

        <div className="h-4 w-px bg-cad-border" />

        <div className="flex items-center gap-1.5">
          <div className={isOnline ? "status-dot-online" : "status-dot-offline"} />
          <span className="text-2xs text-cad-text-muted font-mono">
            {isOnline ? health.engine : "offline"}
          </span>
        </div>

        {hasCEM && <span className="badge-accent">CEM</span>}

        <span className="badge-neutral">
          <Activity size={9} />
          {mode.toUpperCase()}
        </span>

        {status === "generating" && (
          <div className="flex items-center gap-1.5 animate-fade-in">
            <div className="w-3 h-3 border-[1.5px] border-cad-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-2xs text-cad-accent font-medium">Generating</span>
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        <button
          onClick={reset}
          className="btn-ghost text-xs"
          title="Reset workspace"
        >
          <RotateCcw size={13} />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          onClick={downloadSTL}
          disabled={!stlBase64}
          className="btn-ghost text-xs text-cad-accent hover:text-cad-accent-hover disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          title="Export STL file"
        >
          <Download size={13} />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </div>
  );
}
