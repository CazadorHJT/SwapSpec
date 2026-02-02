"use client";

import { useState } from "react";
import * as api from "@/lib/api-client";
import { FileDropzone } from "./file-dropzone";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

const MESH_ACCEPT = ".obj,.stl,.fbx,.gltf,.glb";

export function MeshUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadMesh(file);
      toast.success(`Mesh uploaded: ${res.filename}`);
      setFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>3D Mesh Upload</CardTitle>
        <CardDescription>
          Upload engine bay scans or component meshes (.obj, .stl, .fbx, .gltf,
          .glb)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileDropzone
          accept={MESH_ACCEPT}
          label="Drop your 3D mesh file here"
          description="Supported formats: OBJ, STL, FBX, GLTF, GLB"
          onFileSelect={setFile}
        />
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? "Uploading..." : "Upload Mesh"}
        </Button>
      </CardContent>
    </Card>
  );
}
