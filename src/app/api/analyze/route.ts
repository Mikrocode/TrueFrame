import { NextRequest } from "next/server";
import { analyzeRequest, checkRateLimit, isOversizedRequest } from "@/lib/analyzer";
import { AnalyzerRequest } from "@/lib/types";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function getClientId(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous"
  );
}

const BODY_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB

async function readJsonWithLimit(req: NextRequest, limitBytes: number) {
  const body = req.body;
  if (!body) {
    throw new Error("Missing request body");
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    if (value) {
      received += value.byteLength;
      if (received > limitBytes) {
        throw new RangeError("BODY_TOO_LARGE");
      }
      text += decoder.decode(value, { stream: true });
    }
  }

  text += decoder.decode();
  return JSON.parse(text || "{}");
}

export async function POST(req: NextRequest) {
  if (isOversizedRequest(req.headers.get("content-length"))) {
    return new Response("Payload too large", {
      status: 413,
      headers: CORS_HEADERS
    });
  }

  const clientId = getClientId(req);
  const rate = checkRateLimit(clientId);
  if (!rate.allowed) {
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: { ...CORS_HEADERS, "Retry-After": String(rate.retryAfter ?? 60) }
    });
  }

  let payload: AnalyzerRequest;
  try {
    payload = (await readJsonWithLimit(req, BODY_SIZE_LIMIT)) as AnalyzerRequest;
  } catch (error: any) {
    if (error instanceof RangeError && error.message === "BODY_TOO_LARGE") {
      return new Response("Payload too large", {
        status: 413,
        headers: CORS_HEADERS
      });
    }
    return new Response("Invalid JSON body", { status: 400, headers: CORS_HEADERS });
  }

  if (payload.mediaType !== "image" && payload.mediaType !== "frame") {
    return new Response("mediaType must be image or frame", {
      status: 400,
      headers: CORS_HEADERS
    });
  }

  if (!payload.dataUrl && !payload.url) {
    return new Response("Provide either dataUrl or url", {
      status: 400,
      headers: CORS_HEADERS
    });
  }

  try {
    const result = await analyzeRequest(payload);
    return Response.json(result, { status: 200, headers: CORS_HEADERS });
  } catch (error: any) {
    console.error(error);
    return new Response(error?.message || "Failed to analyze image", {
      status: 500,
      headers: CORS_HEADERS
    });
  }
}
