"use client";

import dynamic from "next/dynamic";
import TopBar from "./TopBar";
import ParameterPanel from "./ParameterPanel";
import AIPanel from "./AIPanel";
import ConsoleBar from "./ConsoleBar";

const STLViewer = dynamic(() => import("./STLViewer"), { ssr: false });

export default function LayoutCAD() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <ParameterPanel />
        <STLViewer />
        <AIPanel />
      </div>
      <ConsoleBar />
    </div>
  );
}
