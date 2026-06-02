import type { HintLevel } from "../types";

export function calcTimeLimitMs(readingLength: number): number {
  const seconds = 6 + readingLength * 0.45;
  const clamped = Math.min(15, Math.max(7, seconds));
  return Math.round(clamped * 1000);
}

export function getHintLevel(elapsedMs: number, timeLimitMs: number): HintLevel {
  const ratio = elapsedMs / timeLimitMs;

  if (ratio >= 0.65) return "full";
  if (ratio >= 0.35) return "first_char";
  return "none";
}

export function formatClock(ms: number): string {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
