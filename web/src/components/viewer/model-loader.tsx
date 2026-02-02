"use client";

import { useGLTF } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";

function getExtension(url: string): string {
  const clean = url.split("?")[0];
  return clean.split(".").pop()?.toLowerCase() ?? "";
}

function GlbModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function ObjModel({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url);
  return <primitive object={obj} />;
}

function StlModel({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#888" />
    </mesh>
  );
}

export function ModelLoader({ url }: { url: string }) {
  const ext = getExtension(url);

  switch (ext) {
    case "glb":
    case "gltf":
      return <GlbModel url={url} />;
    case "obj":
      return <ObjModel url={url} />;
    case "stl":
      return <StlModel url={url} />;
    default:
      return <GlbModel url={url} />;
  }
}
