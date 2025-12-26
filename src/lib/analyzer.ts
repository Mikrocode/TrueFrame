import crypto from "crypto";
import sharp from "sharp";
import { AnalyzerRequest, AnalyzerResponse, AnalyzerSignal } from "@/lib/types";
import { hashConfidenceKey } from "@/lib/utils";

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

export async function normalizeImageBuffer(buffer: Buffer) {
  const { data } = await sharp(buffer)
    .rotate()
    .resize({ width: 512, height: 512, fit: "inside" })
    .jpeg({ quality: 85 })
    .toBuffer({ resolveWithObject: true });

  const dataUrl = `data:image/jpeg;base64,${data.toString("base64")}`;
  return { buffer: data, dataUrl };
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

export async function analyzeRequest(
  payload: AnalyzerRequest
): Promise<AnalyzerResponse> {
  const sourceKey = payload.dataUrl ?? payload.url;
  if (!sourceKey) {
    throw new Error("Either dataUrl or url is required.");
  }

  const hashedKey = hashConfidenceKey(sourceKey);
  const confidence = computeConfidence(hashedKey);
  const label = mapConfidenceToLabel(confidence);
  const signals: AnalyzerSignal[] = [
    { type: "source", value: payload.dataUrl ? "upload" : "url" },
    { type: "c2pa", value: "unknown" },
    { type: "model_score", value: Number(confidence.toFixed(3)) }
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
  }

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
