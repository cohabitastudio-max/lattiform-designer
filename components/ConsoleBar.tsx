"use client";

import { useDesignStore } from "@/store/designStore";
import { Terminal } from "lucide-react";
import { useEffect, useRef } from "react";

export default function ConsoleBar() {
  const entries = useDesignStore((s) => s.console);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [entries]);

  const last = entries[entries.length - 1];

  return (
    <div className="h-9 bg-cad-panel border-t border-cad-border flex items-center px-4 gap-3 shrink-0 select-none">
      <Terminal size={12} className="text-cad-text-muted shrink-0" />
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto whitespace-nowrap"
      >
        {last ? (
          <span
            className={
              "text-[11px] font-mono " +
              (last.type === "error"
                ? "text-cad-error"
                : last.type === "success"
                ? "text-cad-success"
                : last.type === "warn"
                ? "text-yellow-400"
                : "text-cad-text-muted")
            }
          >
            <span className="text-cad-text-muted mr-2">[{last.time}]</span>
            {last.message}
          </span>
        ) : (
          <span className="text-[11px] font-mono text-cad-text-muted">
            Ready
          </span>
        )}
      </div>
      <span className="text-[10px] font-mono text-cad-text-muted shrink-0">
        {entries.length} logs
      </span>
    </div>
  );
}
