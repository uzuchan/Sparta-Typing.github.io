import { create } from "zustand";
import { db } from "../../db/db";
import { todayKey } from "../../lib/helpers";
import { createInitialStats } from "../../lib/mastery";
import type { Book, BookProgress, DailyStat, WordItem, WordStats } from "../../types";

type LibraryStore = {
  books: Book[];
  wordCounts: Record<string, number>;
  streak: number;
  refreshBooks: () => Promise<void>;
  getWords: (bookId: string) => Promise<WordItem[]>;
  getStatsMap: (wordIds: string[]) => Promise<Record<string, WordStats>>;
  getProgress: (bookId: string) => Promise<BookProgress>;
  setBlockIndex: (bookId: string, blockIndex: number) => Promise<void>;
  recordDaily: (delta: { questions: number; correct: number; masteryUp: number }) => Promise<void>;
  computeStreak: () => Promise<number>;
};

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  books: [],
  wordCounts: {},
  streak: 0,

  refreshBooks: async () => {
    const books = await db.books.orderBy("createdAt").reverse().toArray();
    const entries = await Promise.all(
      books.map(async (b) => [b.id, await db.wordItems.where("bookId").equals(b.id).count()] as const)
    );
    set({ books, wordCounts: Object.fromEntries(entries) });
    const streak = await get().computeStreak();
    set({ streak });
  },

  getWords: async (bookId) =>
    db.wordItems.where("bookId").equals(bookId).sortBy("headwordNo"),

  getStatsMap: async (wordIds) => {
    const list = await db.wordStats.bulkGet(wordIds);
    return Object.fromEntries(
      wordIds.map((id, i) => [id, list[i] ?? createInitialStats(id)])
    );
  },

  getProgress: async (bookId) => {
    const existing = await db.bookProgress.get(bookId);
    if (existing) return existing;
    const fresh: BookProgress = { bookId, blockIndex: 0, updatedAt: new Date().toISOString() };
    await db.bookProgress.put(fresh);
    return fresh;
  },

  setBlockIndex: async (bookId, blockIndex) => {
    await db.bookProgress.put({ bookId, blockIndex, updatedAt: new Date().toISOString() });
  },

  recordDaily: async ({ questions, correct, masteryUp }) => {
    const key = todayKey();
    const existing = await db.dailyStats.get(key);
    const next: DailyStat = existing
      ? {
          ...existing,
          sessionCount: existing.sessionCount + 1,
          totalQuestions: existing.totalQuestions + questions,
          correctCount: existing.correctCount + correct,
          masteryUpCount: existing.masteryUpCount + masteryUp,
        }
      : {
          date: key,
          sessionCount: 1,
          totalQuestions: questions,
          correctCount: correct,
          masteryUpCount: masteryUp,
        };
    await db.dailyStats.put(next);
    const streak = await get().computeStreak();
    set({ streak });
  },

  computeStreak: async () => {
    const all = await db.dailyStats.toArray();
    const dates = new Set(all.filter((d) => d.sessionCount > 0).map((d) => d.date));
    let streak = 0;
    const cursor = new Date();
    // allow today to be empty (streak continues from yesterday)
    if (!dates.has(todayKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (dates.has(todayKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  },
}));
