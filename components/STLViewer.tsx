"use client";

import { useRef, useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewport } from "@react-three/drei";
import * as THREE from "three";
import { useDesignStore } from "@/store/designStore";
import { base64ToGeometry } from "@/lib/stl";
import { Loader2, Box } from "lucide-react";

function STLMesh() {
  const stlBase64 = useDesignStore((s) => s.stlBase64);
  const meshRef = useRef<THREE.Mesh>(null);
  const prevGeometry = useRef<THREE.BufferGeometry | null>(null);
  const { camera } = useThree();

  const geometry = useMemo(() => {
    if (!stlBase64) return null;
    try {
      return base64ToGeometry(stlBase64);
    } catch {
      return null;
    }
  }, [stlBase64]);

  useEffect(() => {
    if (prevGeometry.current && prevGeometry.current !== geometry) {
      prevGeometry.current.dispose();
    }
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

  useEffect(() => {
    return () => {
      if (prevGeometry.current) {
        prevGeometry.current.dispose();
      }
    };
  }, []);

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color="#6366f1"
        metalness={0.3}
        roughness={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, -3, -3]} intensity={0.4} />
      <gridHelper args={[200, 40, "#1e293b", "#1e293b"]} />
      <STLMesh />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={500}
      />
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport
          axisColors={["#ef4444", "#10b981", "#6366f1"]}
          labelColor="#f1f5f9"
        />
      </GizmoHelper>
    </>
  );
}

function Overlay() {
  const status = useDesignStore((s) => s.status);
  const stlBase64 = useDesignStore((s) => s.stlBase64);

  if (status === "generating") {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-cad-primary/60 z-10 pointer-events-none">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-cad-accent animate-spin" />
          <span className="text-sm font-mono text-cad-text-secondary">
            Generating geometry...
          </span>
        </div>
      </div>
    );
  }

  if (!stlBase64) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="flex flex-col items-center gap-3 text-cad-text-muted">
          <Box size={48} strokeWidth={1} />
          <span className="text-sm font-mono">
            Configure parameters and generate
          </span>
        </div>
      </div>
    );
  }

  return null;
}

export default function STLViewer() {
  return (
    <div className="relative flex-1 bg-cad-primary overflow-hidden">
      <Overlay />
      <Canvas
        camera={{ position: [60, 40, 60], fov: 45, near: 0.1, far: 10000 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor("#0b0f14");
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
