import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}%`;
}

export function hashConfidenceKey(input: string) {
  return input.trim().toLowerCase();
}

export function clamp01(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
