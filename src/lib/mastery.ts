import type { MasteryLevel, Quality, WordStats } from "../types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function updateMasteryRaw(oldMastery: number, quality: Quality): number {
  if (quality === 0) {
    return clamp(oldMastery * 0.75, 0, 5);
  }

  return clamp(oldMastery * 0.8 + quality * 0.2, 0, 5);
}

export function toMasteryLevel(raw: number): MasteryLevel {
  if (raw < 0.5) return 0;
  if (raw < 1.5) return 1;
  if (raw < 2.5) return 2;
  if (raw < 3.5) return 3;
  if (raw < 4.5) return 4;
  return 5;
}

export function calcNextDueAt(now: Date, masteryLevel: MasteryLevel): string {
  const next = new Date(now);

  switch (masteryLevel) {
    case 0:
    case 1:
      next.setMinutes(next.getMinutes() + 10);
      break;
    case 2:
      next.setDate(next.getDate() + 1);
      break;
    case 3:
      next.setDate(next.getDate() + 3);
      break;
    case 4:
      next.setDate(next.getDate() + 7);
      break;
    case 5:
      next.setDate(next.getDate() + 14);
      break;
  }

  return next.toISOString();
}

export function isWeakWord(stats: WordStats): boolean {
  const accuracy = stats.seenCount === 0 ? 1 : stats.correctCount / stats.seenCount;
  return stats.masteryLevel <= 2 || accuracy < 0.7;
}

export function isReviewDue(stats: WordStats, now: Date): boolean {
  if (!stats.dueAt) return false;
  return new Date(stats.dueAt).getTime() <= now.getTime();
}

export function canUnlockNextBlock(statsList: WordStats[]): boolean {
  if (statsList.length === 0) return false;

  const avgMastery =
    statsList.reduce((sum, stats) => sum + stats.masteryRaw, 0) / statsList.length;

  const failedWords = statsList.filter((stats) => {
    const accuracy = stats.seenCount === 0 ? 0 : stats.correctCount / stats.seenCount;
    return accuracy < 0.8 || stats.masteryLevel <= 2;
  });

  return avgMastery >= 3.0 && failedWords.length <= 2;
}

export function createInitialStats(wordId: string): WordStats {
  return {
    wordId,
    seenCount: 0,
    correctCount: 0,
    wrongCount: 0,
    masteryLevel: 0,
    masteryRaw: 0,
    streak: 0,
    avgLatencyMs: 0,
  };
}

export const MASTERY_META: Record<
  MasteryLevel,
  { label: string; symbol: string; color: string }
> = {
  0: { label: "seed", symbol: "○", color: "var(--text-muted)" },
  1: { label: "sprout", symbol: "◔", color: "#a8a29e" },
  2: { label: "leaf", symbol: "◑", color: "var(--success)" },
  3: { label: "bloom", symbol: "◕", color: "#60a5fa" },
  4: { label: "flame", symbol: "●", color: "var(--accent)" },
  5: { label: "crown", symbol: "✦", color: "var(--gold)" },
};
