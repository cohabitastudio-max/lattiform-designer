"use client";

import { useDesignStore } from "@/store/designStore";
import { Download } from "lucide-react";

export default function DownloadButton() {
  const { downloadSTL, stlBase64 } = useDesignStore();

  return (
    <button
      onClick={downloadSTL}
      disabled={!stlBase64}
      className="w-full flex items-center justify-center gap-2 bg-cad-input hover:bg-cad-border-hover disabled:opacity-30 disabled:cursor-not-allowed text-cad-text-secondary font-medium text-sm py-2.5 rounded border border-cad-border transition-colors"
    >
      <Download size={16} />
      Download STL
    </button>
  );
}
