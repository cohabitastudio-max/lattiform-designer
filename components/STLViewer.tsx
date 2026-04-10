"use client";

import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewport } from "@react-three/drei";
import * as THREE from "three";
import { useDesignStore } from "@/store/designStore";
import { base64ToGeometry } from "@/lib/stl";
import { Loader2, Box } from "lucide-react";

function STLMesh({ wireframe }: { wireframe: boolean }) {
  const stlBase64 = useDesignStore((s) => s.stlBase64);
  const meshRef = useRef<THREE.Mesh>(null);
  const prevGeometry = useRef<THREE.BufferGeometry | null>(null);
  const { camera } = useThree();

  const geometry = useMemo(() => {
    if (!stlBase64) return null;
    try { return base64ToGeometry(stlBase64); } catch { return null; }
  }, [stlBase64]);

  useEffect(() => {
    if (prevGeometry.current && prevGeometry.current !== geometry) prevGeometry.current.dispose();
    prevGeometry.current = geometry;
    if (!geometry || !meshRef.current) return;

    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const center = new THREE.Vector3();
    box.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera as THREE.PerspectiveCamera).fov;
    const distance = maxDim / (2 * Math.tan((fov * Math.PI) / 360));

    camera.position.set(distance * 1.2, distance * 0.8, distance * 1.2);
    camera.lookAt(0, 0, 0);
    (camera as THREE.PerspectiveCamera).near = 0.1;
    (camera as THREE.PerspectiveCamera).far = maxDim * 10;
    camera.updateProjectionMatrix();
  }, [geometry, camera]);

  useEffect(() => { return () => { if (prevGeometry.current) prevGeometry.current.dispose(); }; }, []);

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color={wireframe ? "#818cf8" : "#6366f1"}
        metalness={wireframe ? 0 : 0.3}
        roughness={wireframe ? 1 : 0.6}
        wireframe={wireframe}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Scene({ wireframe }: { wireframe: boolean }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, -3, -3]} intensity={0.4} />
      <gridHelper args={[200, 40, "#1e293b", "#1e293b"]} />
      <STLMesh wireframe={wireframe} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} minDistance={1} maxDistance={500} />
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport axisColors={["#ef4444", "#10b981", "#6366f1"]} labelColor="#f1f5f9" />
      </GizmoHelper>
    </>
  );
}

function StatusOverlay() {
  const status = useDesignStore((s) => s.status);
  const stlBase64 = useDesignStore((s) => s.stlBase64);

  if (status === "generating") {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-cad-primary/60 z-10 pointer-events-none">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-cad-accent animate-spin" />
          <span className="text-sm font-mono text-cad-text-secondary">Generating geometry...</span>
        </div>
      </div>
    );
  }

  if (!stlBase64) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="flex flex-col items-center gap-3 text-cad-text-muted">
          <Box size={48} strokeWidth={1} />
          <span className="text-sm font-mono">Configure parameters and generate</span>
          <div className="flex gap-4 text-[10px] font-mono mt-2">
            <span>W wireframe</span>
            <span>S screenshot</span>
            <span>G generate</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function ModelInfo() {
  const mode = useDesignStore((s) => s.mode);
  const status = useDesignStore((s) => s.status);
  const triangles = useDesignStore((s) => s.triangles);
  const fileSize = useDesignStore((s) => s.fileSize);
  const engine = useDesignStore((s) => s.engine);
  const cemParams = useDesignStore((s) => s.cemParams);
  const tpmsParams = useDesignStore((s) => s.tpmsParams);
  const latticeParams = useDesignStore((s) => s.latticeParams);
  const analysis = useDesignStore((s) => s.manufacturingAnalysis);

  if (status !== "success" || !triangles) return null;

  const modeName = mode === "cem" ? (cemParams?.name || "CEM") : mode === "tpms" ? tpmsParams.surfaceType : latticeParams.unitCell;
  const dims = mode === "cem" && cemParams ? cemParams.envelope : mode === "tpms" ? tpmsParams.boundingBox : latticeParams.boundingBox;

  return (
    <>
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <div className="bg-cad-primary/80 backdrop-blur-sm border border-cad-border rounded px-3 py-2 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cad-accent/20 text-cad-accent">{mode.toUpperCase()}</span>
            <span className="text-xs font-medium text-cad-text">{modeName}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-cad-text-muted">
            <span>{dims[0]}x{dims[1]}x{dims[2]}mm</span>
            <span>{triangles.toLocaleString()} tri</span>
            {fileSize && <span>{(fileSize / 1024 / 1024).toFixed(1)}MB</span>}
          </div>
          {mode === "cem" && cemParams && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-cad-text-muted">
              <span>{cemParams.fill.type}</span>
              <span>{cemParams.fill.modulation}</span>
              {cemParams.regions && <span>{cemParams.regions.length} regions</span>}
            </div>
          )}
        </div>
      </div>
      {analysis && (
        <div className="absolute top-3 right-3 z-10 pointer-events-none">
          <div className="bg-cad-primary/80 backdrop-blur-sm border border-cad-border rounded px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-cad-text-muted">MFG</span>
              <span className={"text-sm font-bold font-mono " + (analysis.score >= 7 ? "text-cad-success" : analysis.score >= 5 ? "text-yellow-400" : "text-cad-error")}>
                {analysis.score}/10
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-cad-text-muted mt-0.5">
              <span>{analysis.material}</span>
              <span>{analysis.process}</span>
              <span>{analysis.costRange}</span>
            </div>
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
        <span className="text-[9px] font-mono text-cad-text-muted/50">{engine}</span>
      </div>
    </>
  );
}

function ViewToolbar({ wireframe, onToggleWireframe, onScreenshot }: {
  wireframe: boolean; onToggleWireframe: () => void; onScreenshot: () => void;
}) {
  const stlBase64 = useDesignStore((s) => s.stlBase64);
  if (!stlBase64) return null;

  return (
    <div className="absolute bottom-3 right-3 z-10 flex gap-1">
      <button onClick={onToggleWireframe}
        className={"px-2 py-1 text-[10px] font-mono rounded border transition-colors " +
          (wireframe ? "bg-cad-accent/20 border-cad-accent text-cad-accent" : "bg-cad-primary/80 border-cad-border text-cad-text-muted hover:text-cad-text")}>
        W
      </button>
      <button onClick={onScreenshot}
        className="px-2 py-1 text-[10px] font-mono rounded border bg-cad-primary/80 border-cad-border text-cad-text-muted hover:text-cad-text transition-colors">
        S
      </button>
    </div>
  );
}

export default function STLViewer() {
  const [wireframe, setWireframe] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const generate = useDesignStore((s) => s.generate);
  const status = useDesignStore((s) => s.status);

  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "lattiform_" + Date.now() + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "w" || e.key === "W") { e.preventDefault(); setWireframe((v) => !v); }
      if (e.key === "s" || e.key === "S") { e.preventDefault(); handleScreenshot(); }
      if ((e.key === "g" || e.key === "G") && status !== "generating") { e.preventDefault(); generate(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleScreenshot, generate, status]);

  return (
    <div className="relative flex-1 bg-cad-primary overflow-hidden">
      <StatusOverlay />
      <ModelInfo />
      <ViewToolbar wireframe={wireframe} onToggleWireframe={() => setWireframe((v) => !v)} onScreenshot={handleScreenshot} />
      <Canvas
        ref={canvasRef}
        camera={{ position: [60, 40, 60], fov: 45, near: 0.1, far: 10000 }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => { gl.setClearColor("#0b0f14"); }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene wireframe={wireframe} />
      </Canvas>
    </div>
  );
}
