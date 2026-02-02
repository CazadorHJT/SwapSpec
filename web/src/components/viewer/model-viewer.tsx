"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Center } from "@react-three/drei";
import { ModelLoader } from "./model-loader";

export function ModelViewer({ url }: { url: string }) {
  return (
    <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Suspense fallback={null}>
        <Center>
          <ModelLoader url={url} />
        </Center>
        <Environment preset="studio" />
      </Suspense>
      <OrbitControls makeDefault />
    </Canvas>
  );
}
