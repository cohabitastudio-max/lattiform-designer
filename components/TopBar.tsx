"use client";

import { Hexagon, Download, RotateCcw, Wifi, WifiOff } from "lucide-react";
import { useDesignStore } from "@/store/designStore";
import { useEffect, useState } from "react";
import { healthCheck } from "@/lib/api";

export default function TopBar() {
  const { status, downloadSTL, reset, stlBase64 } = useDesignStore();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    healthCheck()
      .then(() => mounted && setApiOnline(true))
      .catch(() => mounted && setApiOnline(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="h-12 bg-cad-panel border-b border-cad-border flex items-center justify-between px-4 select-none shrink-0">
      <div className="flex items-center gap-3">
        <Hexagon size={22} className="text-cad-accent" />
        <span className="text-sm font-semibold tracking-wide text-cad-text">
          LATTIFORM
        </span>
        <span className="text-[10px] font-mono text-cad-text-muted bg-cad-input px-2 py-0.5 rounded">
          DESIGNER v0.1
        </span>
      </div>

      <div className="flex items-center gap-2">
        {status === "generating" && (
          <span className="text-xs font-mono text-cad-accent animate-pulse">
            Generating...
          </span>
        )}
        {status === "success" && (
          <span className="text-xs font-mono text-cad-success">Ready</span>
        )}
        {status === "error" && (
          <span className="text-xs font-mono text-cad-error">Error</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 mr-2">
          {apiOnline === true && (
            <>
              <Wifi size={14} className="text-cad-success" />
              <span className="text-[10px] font-mono text-cad-success">API</span>
            </>
          )}
          {apiOnline === false && (
            <>
              <WifiOff size={14} className="text-cad-error" />
              <span className="text-[10px] font-mono text-cad-error">API</span>
            </>
          )}
          {apiOnline === null && (
            <span className="text-[10px] font-mono text-cad-text-muted">...</span>
          )}
        </div>

        <button
          onClick={reset}
          className="p-1.5 rounded hover:bg-cad-input transition-colors"
          title="Reset"
        >
          <RotateCcw size={16} className="text-cad-text-secondary" />
        </button>

        <button
          onClick={downloadSTL}
          disabled={!stlBase64}
          className="p-1.5 rounded hover:bg-cad-input transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Download STL"
        >
          <Download size={16} className="text-cad-text-secondary" />
        </button>
      </div>
    </div>
  );
}
