"use client";

import { useEffect } from "react";
import { useDesignStore } from "@/store/designStore";
import { Trash2, Clock } from "lucide-react";

export default function HistoryPanel() {
  const generations = useDesignStore((s) => s.generations);
  const activeId = useDesignStore((s) => s.activeGenerationId);
  const loadGeneration = useDesignStore((s) => s.loadGeneration);
  const deleteGeneration = useDesignStore((s) => s.deleteGeneration);
  const rehydrateHistory = useDesignStore((s) => s.rehydrateHistory);

  useEffect(() => {
    rehydrateHistory();
  }, [rehydrateHistory]);

  if (generations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="w-10 h-10 rounded-xl bg-cad-surface flex items-center justify-center mb-3">
          <Clock size={18} className="text-cad-text-dim" />
        </div>
        <p className="text-xs text-cad-text-muted text-center">
          No generations yet.
        </p>
        <p className="text-2xs text-cad-text-dim text-center mt-1">
          Generate a part to build history.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xs font-mono uppercase tracking-widest text-cad-text-dim">
          Recent
        </span>
        <span className="badge-neutral text-2xs">{generations.length}/10</span>
      </div>

      {generations.map((gen) => {
        const isActive = gen.id === activeId;
        const date = new Date(gen.timestamp);
        const timeStr = date.toLocaleTimeString("en-US", { hour12: false });
        const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        const label =
          gen.mode === "cem"
            ? (gen.params as { name?: string }).name || "CEM"
            : gen.mode === "tpms"
            ? (gen.params as { surfaceType: string }).surfaceType
            : (gen.params as { unitCell: string }).unitCell;

        return (
          <div
            key={gen.id}
            onClick={() => loadGeneration(gen.id)}
            className={
              "relative rounded-lg border px-3 py-3 cursor-pointer transition-all duration-150 " +
              (isActive
                ? "border-cad-accent/50 bg-cad-accent-muted shadow-glow-sm"
                : "border-cad-border bg-cad-surface/50 hover:border-cad-border-hover hover:bg-cad-surface")
            }
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-cad-accent animate-glow" />}
                <span className="badge-neutral text-2xs">{gen.mode.toUpperCase()}</span>
                <span className="text-xs font-medium text-cad-text">{label}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteGeneration(gen.id); }}
                className="p-1 rounded hover:bg-cad-error-muted text-cad-text-dim hover:text-cad-error transition-all duration-150"
              >
                <Trash2 size={11} />
              </button>
            </div>
            <div className="flex items-center gap-3 text-2xs text-cad-text-dim font-mono">
              <span>{dateStr} {timeStr}</span>
              <span>{gen.triangles.toLocaleString()} tri</span>
              <span>{(gen.fileSize / 1024 / 1024).toFixed(1)}MB</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
