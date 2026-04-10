"use client";

import { useRef, useEffect } from "react";
import { useDesignStore } from "@/store/designStore";
import { Terminal } from "lucide-react";

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
    warn: "text-cad-warning",
  };

  return (
    <div
      ref={scrollRef}
      className="h-8 min-h-[32px] flex items-center px-4 border-t border-cad-border bg-cad-panel gap-2"
    >
      <Terminal size={10} className="text-cad-text-dim shrink-0" />
      {last ? (
        <div className="flex items-center gap-2 text-2xs font-mono truncate animate-fade-in">
          <span className="text-cad-text-dim">{last.timestamp}</span>
          <span className={colorMap[last.type] || "text-cad-text-secondary"}>
            {last.message}
          </span>
        </div>
      ) : (
        <span className="text-2xs text-cad-text-dim font-mono">Ready</span>
      )}
      <div className="ml-auto flex items-center gap-3 text-2xs font-mono text-cad-text-dim">
        <span title="Wireframe toggle">W</span>
        <span title="Screenshot">S</span>
        <span title="Generate">G</span>
      </div>
    </div>
  );
}
