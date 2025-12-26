import crypto from "crypto";
import sharp from "sharp";
import { AnalyzerRequest, AnalyzerResponse, AnalyzerSignal } from "@/lib/types";
import { clamp01, hashConfidenceKey } from "@/lib/utils";

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;

type RateBucket = { count: number; firstSeen: number };
const rateBuckets = new Map<string, RateBucket>();

export function checkRateLimit(identifier: string) {
  const now = Date.now();
  const bucket = rateBuckets.get(identifier) ?? { count: 0, firstSeen: now };

  if (now - bucket.firstSeen > RATE_LIMIT_WINDOW_MS) {
    bucket.count = 0;
    bucket.firstSeen = now;
  }

  bucket.count += 1;
  rateBuckets.set(identifier, bucket);

  if (bucket.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil(
      (RATE_LIMIT_WINDOW_MS - (now - bucket.firstSeen)) / 1000
    );
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

export function mapConfidenceToLabel(confidence: number) {
  if (confidence >= 0.75) return "likely_ai";
  if (confidence >= 0.45) return "unclear";
  return "likely_real";
}

export function computeConfidence(key: string) {
  const digest = crypto.createHash("sha256").update(key).digest("hex");
  const slice = digest.slice(0, 8);
  const intVal = parseInt(slice, 16);
  const normalized = intVal / 0xffffffff;
  return Number(normalized.toFixed(4));
}

export function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:(?<mime>.+);base64,(?<data>.+)$/);
  if (!match?.groups?.data) {
    throw new Error("Invalid data URL");
  }
  return Buffer.from(match.groups.data, "base64");
}

type ImageSignals = {
  entropy: number;
  edgeDensity: number;
  noise: number;
  exifPresent: boolean;
};

const laplacianKernel = {
  width: 3,
  height: 3,
  kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
};

export async function normalizeImageBuffer(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata();
  const pipeline = sharp(buffer).rotate().resize({ width: 512, height: 512, fit: "inside" });
  const { data } = await pipeline
    .jpeg({ quality: 88 })
    .toBuffer({ resolveWithObject: true });

  const normalizedForStats = await sharp(data)
    .resize(256, 256, { fit: "inside", withoutEnlargement: true })
    .toBuffer();

  const stats = await sharp(normalizedForStats).stats();
  const edgeResult = await sharp(normalizedForStats)
    .grayscale()
    .convolve(laplacianKernel)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const edgeEnergy =
    edgeResult.data.reduce((sum, value) => sum + Math.abs(value), 0) /
    Math.max(1, edgeResult.data.length * 255);

  const entropy = stats.entropy ?? 0;
  const stdev = stats.channels?.[0]?.stdev ?? 0;

  const signals: ImageSignals = {
    entropy,
    edgeDensity: edgeEnergy,
    noise: stdev / 128,
    exifPresent: Boolean(metadata.exif && metadata.exif.length > 0)
  };

  const dataUrl = `data:image/jpeg;base64,${data.toString("base64")}`;
  return { buffer: data, dataUrl, signals };
}

export async function fetchImageFromUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to fetch image: ${response.status}`);
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_UPLOAD_SIZE) {
    throw new Error("Image is too large");
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.byteLength > MAX_UPLOAD_SIZE) {
    throw new Error("Image is too large");
  }

  return buffer;
}

function scoreFromSignals(signals: ImageSignals) {
  const entropyScore = clamp01(signals.entropy / 7);
  const edgeScore = clamp01(signals.edgeDensity / 0.6);
  const noiseScore = clamp01(signals.noise / 0.35);
  const exifBonus = signals.exifPresent ? 0.05 : -0.03;

  const combined = entropyScore * 0.35 + edgeScore * 0.35 + noiseScore * 0.25 + exifBonus;
  return clamp01(combined);
}

export async function analyzeRequest(payload: AnalyzerRequest): Promise<AnalyzerResponse> {
  const sourceKey = payload.dataUrl ?? payload.url;
  if (!sourceKey) {
    throw new Error("Either dataUrl or url is required.");
  }

  const hashedKey = hashConfidenceKey(sourceKey);
  const baseConfidence = computeConfidence(hashedKey);
  let signalsFromImage: ImageSignals | null = null;

  const signals: AnalyzerSignal[] = [
    { type: "source", value: payload.dataUrl ? "upload" : "url" },
    { type: "c2pa", value: "unknown" },
    { type: "base_score", value: Number(baseConfidence.toFixed(3)) }
  ];

  let imageBuffer: Buffer | undefined;
  let normalizedDataUrl: string | undefined = payload.dataUrl;

  if (payload.dataUrl) {
    imageBuffer = dataUrlToBuffer(payload.dataUrl);
  } else if (payload.url) {
    imageBuffer = await fetchImageFromUrl(payload.url);
  }

  if (imageBuffer) {
    const normalized = await normalizeImageBuffer(imageBuffer);
    normalizedDataUrl = normalized.dataUrl;
    signalsFromImage = normalized.signals;
    signals.push(
      { type: "entropy", value: Number(normalized.signals.entropy.toFixed(3)) },
      { type: "edge_density", value: Number(normalized.signals.edgeDensity.toFixed(3)) },
      { type: "noise", value: Number(normalized.signals.noise.toFixed(3)) },
      { type: "exif_present", value: normalized.signals.exifPresent ? "yes" : "no" }
    );
  }

  const imageScore = signalsFromImage ? scoreFromSignals(signalsFromImage) : baseConfidence;
  const confidence = clamp01(baseConfidence * 0.35 + imageScore * 0.65);
  signals.push({ type: "model_score", value: Number(confidence.toFixed(3)) });

  const label = mapConfidenceToLabel(confidence);

  return {
    label,
    confidence,
    signals,
    sourceDataUrl: normalizedDataUrl
  };
}

export function isOversizedRequest(contentLength: string | null) {
  if (!contentLength) return false;
  return parseInt(contentLength, 10) > MAX_UPLOAD_SIZE;
}
