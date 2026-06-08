import type { HintLevel, Quality } from "../types";

export function calcNormalScore(params: {
  isCorrect: boolean;
  elapsedMs: number;
  timeLimitMs: number;
  hintLevel: HintLevel;
  missCount: number;
}): number {
  if (!params.isCorrect) return 0;

  const ratio = params.elapsedMs / params.timeLimitMs;

  if (params.hintLevel === "full") return 1;
  if (params.hintLevel === "first_char") return 2;

  if (params.elapsedMs <= 2000 && params.missCount === 0) return 10;
  if (ratio <= 0.3 && params.missCount <= 1) return 8;
  if (ratio <= 0.5 && params.missCount <= 2) return 5;

  return 3;
}

export function calcSpartaScore(params: {
  isCorrect: boolean;
  elapsedMs: number;
  timeLimitMs: number;
  hintLevel: HintLevel;
  missCount: number;
}): number {
  if (!params.isCorrect) return 0;
  if (params.hintLevel !== "none") return 0;
  if (params.missCount > 0) return 0;

  const ratio = params.elapsedMs / params.timeLimitMs;

  if (ratio <= 0.6) return 100;
  if (ratio <= 0.8) return 80;
  if (ratio <= 1.0) return 60;
  if (ratio <= 1.25) return 20;

  return 0;
}

export function calcQuality(params: {
  isCorrect: boolean;
  normalScore: number;
  spartaScore: number;
  hintLevel: HintLevel;
  missCount: number;
}): Quality {
  if (!params.isCorrect) return 0;
  if (params.spartaScore >= 60) return 5;
  if (params.hintLevel === "full") return 1;
  if (params.hintLevel === "first_char") return 2;
  if (params.missCount === 0 && params.normalScore >= 5) return 4;
  return 3;
}

export function comboMultiplier(combo: number): number {
  if (combo >= 10) return 2.0;
  if (combo >= 5) return 1.5;
  if (combo >= 3) return 1.2;
  return 1.0;
}
