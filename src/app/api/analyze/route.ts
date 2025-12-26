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
    payload = (await req.json()) as AnalyzerRequest;
  } catch (error) {
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
