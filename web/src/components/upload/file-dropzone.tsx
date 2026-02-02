"use client";

import { useCallback, useState } from "react";
import { Upload, File as FileIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  accept?: string;
  label: string;
  description: string;
  onFileSelect: (file: File) => void;
}

export function FileDropzone({
  accept,
  label,
  description,
  onFileSelect,
}: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors",
        dragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25",
      )}
    >
      <Upload className="h-10 w-10 text-muted-foreground" />
      <div className="text-center">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <label>
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
        <Button variant="outline" asChild>
          <span>Browse Files</span>
        </Button>
      </label>

      {selectedFile && (
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <FileIcon className="h-4 w-4" />
          <span>{selectedFile.name}</span>
          <button
            onClick={() => setSelectedFile(null)}
            className="ml-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
