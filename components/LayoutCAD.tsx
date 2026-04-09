"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import TopBar from "@/components/TopBar";
import ParameterPanel from "@/components/ParameterPanel";
import AIPanel from "@/components/AIPanel";
import ManufacturingPanel from "@/components/ManufacturingPanel";
import ConsoleBar from "@/components/ConsoleBar";

const STLViewer = dynamic(() => import("@/components/STLViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-cad-primary">
      <div className="text-xs text-cad-text-muted">Loading 3D viewer...</div>
    </div>
  ),
});

type RightTab = "chat" | "manufacturing";

function LayoutCAD() {
  const [rightTab, setRightTab] = useState<RightTab>("chat");

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
        <div className="w-80 min-w-[320px] border-l border-cad-border flex flex-col overflow-hidden">
          <div className="flex border-b border-cad-border shrink-0">
            <button
              onClick={() => setRightTab("chat")}
              className={
                "flex-1 py-2 text-[11px] font-medium transition-colors " +
                (rightTab === "chat"
                  ? "text-cad-accent border-b-2 border-cad-accent"
                  : "text-cad-text-muted hover:text-cad-text-secondary")
              }
            >
              AI Chat
            </button>
            <button
              onClick={() => setRightTab("manufacturing")}
              className={
                "flex-1 py-2 text-[11px] font-medium transition-colors " +
                (rightTab === "manufacturing"
                  ? "text-cad-accent border-b-2 border-cad-accent"
                  : "text-cad-text-muted hover:text-cad-text-secondary")
              }
            >
              Manufacturing
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {rightTab === "chat" ? <AIPanel /> : <ManufacturingPanel />}
          </div>
        </div>
      </div>
      <ConsoleBar />
    </div>
  );
}

export default LayoutCAD;
