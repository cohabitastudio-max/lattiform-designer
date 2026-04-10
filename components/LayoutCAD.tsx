"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import TopBar from "@/components/TopBar";
import ParameterPanel from "@/components/ParameterPanel";
import AIPanel from "@/components/AIPanel";
import ManufacturingPanel from "@/components/ManufacturingPanel";
import ConsoleBar from "@/components/ConsoleBar";
import { MessageSquare, Factory } from "lucide-react";

const STLViewer = dynamic(() => import("@/components/STLViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full bg-cad-bg">
      <div className="w-8 h-8 border-2 border-cad-accent/30 border-t-cad-accent rounded-full animate-spin mb-3" />
      <span className="text-xs text-cad-text-dim font-mono">Initializing 3D engine</span>
    </div>
  ),
});

type RightTab = "chat" | "manufacturing";

function LayoutCAD() {
  const [rightTab, setRightTab] = useState<RightTab>("chat");

  return (
    <div className="flex flex-col h-screen bg-cad-bg overflow-hidden">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-72 min-w-[288px] border-r border-cad-border overflow-y-auto bg-cad-panel">
          <ParameterPanel />
        </div>

        {/* Viewport */}
        <div className="flex-1 relative bg-cad-bg">
          <STLViewer />
        </div>

        {/* Right Panel */}
        <div className="w-80 min-w-[320px] border-l border-cad-border flex flex-col overflow-hidden bg-cad-panel">
          {/* Tabs */}
          <div className="flex border-b border-cad-border shrink-0 relative">
            <button
              onClick={() => setRightTab("chat")}
              className={"tab-btn " + (rightTab === "chat" ? "tab-btn-active" : "tab-btn-inactive")}
            >
              <MessageSquare size={12} />
              AI Agent
            </button>
            <button
              onClick={() => setRightTab("manufacturing")}
              className={"tab-btn " + (rightTab === "manufacturing" ? "tab-btn-active" : "tab-btn-inactive")}
            >
              <Factory size={12} />
              Manufacturing
            </button>

            {/* Active tab indicator */}
            <div
              className="absolute bottom-0 h-0.5 bg-cad-accent transition-all duration-200 rounded-full shadow-glow-sm"
              style={{
                left: rightTab === "chat" ? "0%" : "50%",
                width: "50%",
              }}
            />
          </div>

          {/* Content */}
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
