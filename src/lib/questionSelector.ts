import type { Pool, WordItem } from "../types";

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function choosePool(): Pool {
  const r = Math.random();
  if (r < 0.7) return "current";
  if (r < 0.9) return "weak";
  return "review";
}

function poolWords(
  pool: Pool,
  params: {
    currentWords: WordItem[];
    weakWords: WordItem[];
    reviewWords: WordItem[];
  }
): WordItem[] {
  if (pool === "current") return params.currentWords;
  if (pool === "weak") return params.weakWords;
  return params.reviewWords;
}

export function selectNextWord(params: {
  currentWords: WordItem[];
  weakWords: WordItem[];
  reviewWords: WordItem[];
  recentWordIds: string[];
}): { word: WordItem; pool: Pool } {
  const firstPool = choosePool();
  const poolOrder: Pool[] = [
    firstPool,
    ...(["current", "weak", "review"] as Pool[]).filter((pool) => pool !== firstPool),
  ];

  for (const pool of poolOrder) {
    const candidates = poolWords(pool, params).filter(
      (word) => !params.recentWordIds.includes(word.id)
    );

    if (candidates.length > 0) {
      return { word: pickRandom(candidates), pool };
    }
  }

  if (params.currentWords.length > 0) {
    return { word: pickRandom(params.currentWords), pool: "current" };
  }

  const fallback = [...params.weakWords, ...params.reviewWords];

  if (fallback.length === 0) {
    throw new Error("出題できる単語がありません．");
  }

  return { word: pickRandom(fallback), pool: "weak" };
}
