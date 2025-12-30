"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { AnalyzerResult } from "@/components/analyzer-result";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AnalyzerResponse } from "@/lib/types";
import { formatConfidence } from "@/lib/utils";
import { ImageIcon, Loader2, UploadCloud } from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function DemoUploader() {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzerResponse | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setResult(null);
    setError(null);
  };

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const file = fileList[0];

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File is too large. Max size is 10MB.");
      return;
    }

    reset();
    const dataUrl = await readFileAsDataUrl(file);
    setPreview(dataUrl);
  }, []);

  const onDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    await handleFiles(event.dataTransfer.files);
  };

  const onAnalyze = async () => {
    if (!preview) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaType: "image", dataUrl: preview })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Analysis failed");
      }

      const json = (await response.json()) as AnalyzerResponse;
      setResult(json);
      setPreview(json.sourceDataUrl ?? preview);
    } catch (err) {
      console.error(err);
      setError("Unable to analyze this upload right now.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-primary" />
            Upload or drop an image
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDrop={onDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            className={`relative flex min-h-[240px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
              isDragOver ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            {preview ? (
              <div className="relative h-full w-full">
                <Image
                  src={preview}
                  alt="Preview"
                  fill
                  className="rounded-lg object-contain"
                  sizes="(max-width: 768px) 100vw, 60vw"
                  priority
                />
                <Badge className="absolute left-3 top-3 bg-white/90 shadow-sm">
                  Preview
                </Badge>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <ImageIcon className="h-10 w-10" />
                <p className="text-sm">
                  Drag &amp; drop an image here, or click to browse.
                </p>
                <p className="text-xs">JPEG, PNG supported. Max 10MB.</p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3">
            <Button
              onClick={() => inputRef.current?.click()}
              type="button"
              variant="outline"
            >
              Browse files
            </Button>
            <Button
              onClick={onAnalyze}
              disabled={!preview || isLoading}
              type="button"
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing
                </>
              ) : (
                "Analyze"
              )}
            </Button>
          </div>
          {isLoading && <Progress value={70} />}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result ? (
            <div className="space-y-3">
              {preview && (
                <div className="relative h-52 w-full overflow-hidden rounded-lg border border-border">
                  <Image
                    src={preview}
                    alt="Analyzed preview"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 40vw"
                  />
                  <Badge className="absolute left-3 top-3 bg-white/90 shadow-sm">
                    Confidence {formatConfidence(result.confidence)}
                  </Badge>
                </div>
              )}
              <AnalyzerResult result={result} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
              <UploadCloud className="h-8 w-8" />
              <p className="text-sm">
                Upload an image to see the analyzer in action.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
