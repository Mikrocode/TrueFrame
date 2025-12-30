"use client";

import Image from "next/image";
import { useState } from "react";
import { AnalyzerResult } from "@/components/analyzer-result";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalyzerResponse, SampleImage } from "@/lib/types";
import { formatConfidence } from "@/lib/utils";
import { Loader2, Zap } from "lucide-react";

type Props = {
  image: SampleImage;
};

export function SampleCard({ image }: Props) {
  const [result, setResult] = useState<AnalyzerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaType: "image", url: image.url })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to analyze image.");
      }

      const json = (await response.json()) as AnalyzerResponse;
      setResult(json);
    } catch (err) {
      console.error(err);
      setError("Unable to analyze right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative h-56 w-full bg-muted">
        <Image
          src={image.url}
          alt={image.title}
          fill
          priority={false}
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
          unoptimized
        />
        {result && (
          <Badge className="absolute left-3 top-3 bg-white/90 text-xs font-semibold shadow-sm">
            Confidence: {formatConfidence(result.confidence)}
          </Badge>
        )}
      </div>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-primary" />
          {image.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {error && (
          <p className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AnalyzerResult result={result} isCompact />
        {!result && (
          <p className="text-sm text-muted-foreground">
            See instant analysis with our deterministic placeholder model.
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleTest}
          disabled={isLoading}
          className="w-full"
          variant="outline"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            "Test this image"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
