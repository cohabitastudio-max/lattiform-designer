"use client";

import { useRef, useEffect } from "react";
import { useDesignStore } from "@/store/designStore";

export default function ConsoleBar() {
  const entries = useDesignStore((s) => s.consoleLog);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const last = entries[entries.length - 1];

  const colorMap: Record<string, string> = {
    info: "text-cad-text-secondary",
    success: "text-cad-success",
    error: "text-cad-error",
    warn: "text-yellow-400",
  };

  return (
    <div className="h-7 min-h-[28px] flex items-center px-3 border-t border-cad-border bg-cad-panel">
      {last ? (
        <div className="flex items-center gap-2 text-[11px] font-mono truncate">
          <span className="text-cad-text-muted">{last.timestamp}</span>
          <span className={colorMap[last.type] || "text-cad-text-secondary"}>
            {last.message}
          </span>
        </div>
      ) : (
        <span className="text-[11px] text-cad-text-muted font-mono">
          Ready
        </span>
      )}
    </div>
  );
}
