"use client";

import { useDesignStore } from "@/store/designStore";
import { Download } from "lucide-react";

export default function DownloadButton() {
  const { downloadSTL, stlBase64 } = useDesignStore();

  return (
    <button onClick={downloadSTL} disabled={!stlBase64} className="btn-secondary w-full">
      <Download size={15} />
      Download STL
    </button>
  );
}
