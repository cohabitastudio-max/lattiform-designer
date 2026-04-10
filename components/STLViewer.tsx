"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewport } from "@react-three/drei";
import * as THREE from "three";
import { useDesignStore } from "@/store/designStore";
import { base64ToGeometry } from "@/lib/stl";
import { Loader2, Box, Eye, EyeOff, Camera, Maximize2 } from "lucide-react";

function AutoFitCamera({ geometry }: { geometry: THREE.BufferGeometry | null }) {
  const { camera } = useThree();
  useEffect(() => {
    if (!geometry) return;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) return;
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 1.8;
    (camera as THREE.PerspectiveCamera).position.set(
      center.x + dist * 0.6,
      center.y + dist * 0.4,
      center.z + dist * 0.6
    );
    (camera as THREE.PerspectiveCamera).lookAt(center);
    (camera as THREE.PerspectiveCamera).near = maxDim * 0.01;
    (camera as THREE.PerspectiveCamera).far = maxDim * 20;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [geometry, camera]);
  return null;
}

function Scene({ wireframe }: { wireframe: boolean }) {
  const stlBase64 = useDesignStore((s) => s.stlBase64);
  const geometry = useMemo(() => {
    if (!stlBase64) return null;
    try {
      return base64ToGeometry(stlBase64);
    } catch {
      return null;
    }
  }, [stlBase64]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} />
      <directionalLight position={[-5, -5, -10]} intensity={0.3} />
      <hemisphereLight args={["#1e293b", "#0a0e15", 0.5]} />
      {geometry && (
        <>
          <AutoFitCamera geometry={geometry} />
          <mesh geometry={geometry}>
            <meshPhysicalMaterial
              color="#8b93a8"
              metalness={0.2}
              roughness={0.55}
              wireframe={wireframe}
              envMapIntensity={0.5}
            />
          </mesh>
        </>
      )}
      <gridHelper args={[200, 40, "#1e293b", "#141a26"]} position={[0, -0.01, 0]} />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.8}
        zoomSpeed={1.2}
        panSpeed={0.8}
        minDistance={1}
        maxDistance={500}
      />
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport axisColors={["#ef4444", "#22c55e", "#3b82f6"]} labelColor="#f1f5f9" />
      </GizmoHelper>
    </>
  );
}

function StatusOverlay() {
  const status = useDesignStore((s) => s.status);
  const stlBase64 = useDesignStore((s) => s.stlBase64);

  if (status === "generating") {
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-cad-bg/80 backdrop-blur-sm">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-cad-accent/30 border-t-cad-accent rounded-full animate-spin" />
          <div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-b-cad-secondary/40 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
        </div>
        <p className="text-sm text-cad-text font-medium mt-4">Generating geometry</p>
        <p className="text-2xs text-cad-text-dim mt-1 font-mono">Computing implicit fields & marching cubes</p>
      </div>
    );
  }

  if (!stlBase64) {
    return (
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
        <div className="w-16 h-16 rounded-2xl bg-cad-surface/50 border border-cad-border flex items-center justify-center mb-4">
          <Box size={28} className="text-cad-text-dim" />
        </div>
        <p className="text-sm text-cad-text-muted font-medium">No geometry loaded</p>
        <p className="text-2xs text-cad-text-dim mt-1">
          Configure parameters and press <kbd className="px-1.5 py-0.5 bg-cad-surface rounded text-2xs font-mono border border-cad-border mx-0.5">G</kbd> to generate
        </p>
      </div>
    );
  }

  return null;
}

function ModelInfo() {
  const status = useDesignStore((s) => s.status);
  const mode = useDesignStore((s) => s.mode);
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
      {/* Model Info — Top Left */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none animate-fade-in">
        <div className="hud-overlay px-3.5 py-2.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="badge-accent text-2xs">{mode.toUpperCase()}</span>
            <span className="text-xs font-semibold text-cad-text">{modeName}</span>
          </div>
          <div className="flex items-center gap-3 text-2xs font-mono text-cad-text-muted">
            <span>{dims[0]}×{dims[1]}×{dims[2]}mm</span>
            <span className="text-cad-text-dim">|</span>
            <span>{triangles.toLocaleString()} tri</span>
            {fileSize && (
              <>
                <span className="text-cad-text-dim">|</span>
                <span>{(fileSize / 1024 / 1024).toFixed(1)}MB</span>           </>
            )}
          </div>
          {mode === "cem" && cemParams && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="badge-neutral text-2xs">{cemParams.fill.type}</span>
              <span className="badge-neutral text-2xs">{cemParams.fill.modulation}</span>
              {cemParams.regions && cemParams.regions.length > 0 && (
                <span className="badge-neutral text-2xs">{cemParams.regions.length} regions</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MFG Score — Top Right */}
      {analysis && (
        <div className="absolute top-3 right-3 z-10 pointer-events-none animate-fade-in">
          <div className="hud-overlay px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="text-2xs font-mono text-cad-text-dim uppercase">MFG</span>
              <span className={
                "text-base font-bold font-mono " +
              (analysis.score >= 7 ? "text-cad-success" : analysis.score >= 5 ? "text-cad-warning" : "text-cad-error")
              }>
                {analysis.score}/10
              </span>
            </div>
            <div className="flex items-center gap-2 text-2xs font-mono text-cad-text-muted mt-1">
              <span>{analysis.material}</span>
              <span className="text-cad-text-dim">·</span>
              <span>{analysis.process}</span>
              <span className="text-cad-text-dim">·</span>
              <span>{analysis.costRange}</span>
            </div>
          </div>
        </div>
      )}

      {/* Engine — Bottom Left */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
        <span className="text-2xs font-mono text-cad-text-dim/40">{engine}</span>
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
    <div className="absolute bottom-3 right-3 z-10 flex gap-1.5 animate-fade-in">
      <button
        onClick={onToggleWireframe}
        title="Toggle wireframe (W)"
        className={
          "p-2 rounded-lg border transition-all duration-150 " +
          (wireframe
            ? "bg-cad-accent/20 border-cad-accent/40 text-cad-accent shadow-glow-sm"
            : "bg-cad-primary/80 backdrop-blur-sm border-cad-border text-cad-text-muted hover:text-cad-text hover:border-cad-border-hover")
        }
      >
        {wireframe ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
      <button
        onClick={onScreenshot}
        title="Screenshot (S)"
        className="p-2 rounded-lg border bg-cad-primary/80 backdrop-blur-sm border-cad-border text-cad-text-muted hover:text-cad-text hover:border-cad-border-hover transition-all duration-150"
      >
        <Camera size={14} />
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
    <div className="relative w-full h-full bg-cad-bg overflow-hidden">
      <StatusOverlay />
      <ModelInfo />
      <ViewToolbar wireframe={wireframe} onToggleWireframe={() => setWireframe((v) => !v)} onScreenshot={handleScreenshot} />
      <Canvas
        ref={canvasRef}
        camera={{ position: [60, 40, 60], fov: 45, near: 0.1, far: 10000 }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => { gl.setClearColor("#06080c"); }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene wireframe={wireframe} />
      </Canvas>
    </div>
  );
}
