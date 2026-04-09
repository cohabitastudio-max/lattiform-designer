"use client";

import { useDesignStore } from "@/store/designStore";
import { Zap, Loader2 } from "lucide-react";

export default function GenerateButton() {
  const { generate, status } = useDesignStore();
  const isGenerating = status === "generating";

  return (
    <button
      onClick={generate}
      disabled={isGenerating}
      className="w-full flex items-center justify-center gap-2 bg-cad-accent hover:bg-cad-accent-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm py-2.5 rounded transition-colors"
    >
      {isGenerating ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Zap size={16} />
          Generate Geometry
        </>
      )}
    </button>
  );
}
