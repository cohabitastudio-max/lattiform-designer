"use client";

import dynamic from "next/dynamic";
import TopBar from "@/components/TopBar";
import ParameterPanel from "@/components/ParameterPanel";
import AIPanel from "@/components/AIPanel";
import ConsoleBar from "@/components/ConsoleBar";

const STLViewer = dynamic(() => import("@/components/STLViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-cad-primary">
      <div className="text-xs text-cad-text-muted">Loading 3D viewer...</div>
    </div>
  ),
});

function LayoutCAD() {
  return (
    <div className="flex flex-col h-screen bg-cad-primary overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 min-w-[288px] border-r border-cad-border overflow-y-auto">
          <ParameterPanel />
        </div>
        <div className="flex-1 relative">
          <STLViewer />
        </div>
        <div className="w-80 min-w-[320px] border-l border-cad-border overflow-hidden">
          <AIPanel />
        </div>
      </div>
      <ConsoleBar />
    </div>
  );
}

export default LayoutCAD;
