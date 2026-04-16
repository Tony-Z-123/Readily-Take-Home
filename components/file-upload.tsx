"use client";

import { useCallback, useState } from "react";
import { Upload, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export function FileUpload({ onFileSelect, isProcessing }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.type === "application/pdf") {
        setFileName(file.name);
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setFileName(file.name);
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  return (
    <Card
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center gap-4 border-2 border-dashed p-12 transition-colors cursor-pointer ${
        isDragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
          : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700"
      } ${isProcessing ? "pointer-events-none opacity-50" : ""}`}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileInput}
        className="absolute inset-0 opacity-0 cursor-pointer"
        disabled={isProcessing}
      />

      {fileName ? (
        <>
          <FileText className="h-12 w-12 text-blue-600" />
          <div className="text-center">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {fileName}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {isProcessing
                ? "Processing..."
                : "Drop a new file to replace"}
            </p>
          </div>
        </>
      ) : (
        <>
          <Upload className="h-12 w-12 text-neutral-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Drop a regulatory document here
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              PDF files only
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
