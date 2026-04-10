"use client";

import { useDesignStore } from "@/store/designStore";
import { Zap, Loader2 } from "lucide-react";

export default function GenerateButton() {
  const { generate, status } = useDesignStore();
  const isGenerating = status === "generating";

  return (
    <button onClick={generate} disabled={isGenerating} className="btn-primary w-full">
      {isGenerating ? (
        <>
          <Loader2 size={15} className="animate-spin" />
          Generating…
        </>
      ) : (
        <>
          <Zap size={15} />
          Generate Geometry
        </>
      )}
    </button>
  );
}
