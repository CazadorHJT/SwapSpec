"use client";

import { useState } from "react";
import * as api from "@/lib/api-client";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { MeshUploadForm } from "@/components/upload/mesh-upload-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadFile(file);
      toast.success(`File uploaded: ${res.filename}`);
      setFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Upload</h1>

      <Card>
        <CardHeader>
          <CardTitle>General File Upload</CardTitle>
          <CardDescription>
            Upload reference images, documents, or other files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileDropzone
            label="Drop your file here"
            description="Any file type accepted"
            onFileSelect={setFile}
          />
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? "Uploading..." : "Upload File"}
          </Button>
        </CardContent>
      </Card>

      <MeshUploadForm />
    </div>
  );
}
