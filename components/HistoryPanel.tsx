"use client";

import { useEffect } from "react";
import { useDesignStore } from "@/store/designStore";

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
      <div className="flex flex-col items-center justify-center h-full p-6">
        <p className="text-xs text-cad-text-muted text-center">
          No generations yet. Generate a part to build history.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 space-y-2">
      <p className="text-[10px] font-mono uppercase tracking-widest text-cad-text-muted mb-1">
        Recent ({generations.length}/10)
      </p>
      {generations.map((gen) => {
        const isActive = gen.id === activeId;
        const date = new Date(gen.timestamp);
        const timeStr = date.toLocaleTimeString("en-US", { hour12: false });
        const dateStr = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        const label =
          gen.mode === "tpms"
            ? (gen.params as { surfaceType: string }).surfaceType
            : (gen.params as { unitCell: string }).unitCell;

        return (
          <div
            key={gen.id}
            className={
              "relative rounded border px-3 py-2.5 cursor-pointer transition-colors " +
              (isActive
                ? "border-cad-accent bg-cad-accent/10"
                : "border-cad-border bg-cad-input hover:border-cad-border-hover")
            }
            onClick={() => loadGeneration(gen.id)}
          >
            {isActive && (
              <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-cad-accent" />
            )}
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-cad-text">
                {gen.mode.toUpperCase()} / {label}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteGeneration(gen.id);
                }}
                className="text-[10px] text-cad-text-muted hover:text-cad-error transition-colors"
              >
                x
              </button>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-cad-text-muted font-mono">
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
