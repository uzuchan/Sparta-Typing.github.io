import { db } from "../../db/db";

export type BackupPayload = {
  format: "sparta-typing-backup";
  version: number;
  exportedAt: string;
  data: {
    books: unknown[];
    units: unknown[];
    wordItems: unknown[];
    wordStats: unknown[];
    sessions: unknown[];
    attempts: unknown[];
    bookProgress: unknown[];
    dailyStats: unknown[];
    userPrefs: unknown[];
  };
};

export async function exportBackup(): Promise<BackupPayload> {
  const [
    books,
    units,
    wordItems,
    wordStats,
    sessions,
    attempts,
    bookProgress,
    dailyStats,
    userPrefs,
  ] = await Promise.all([
    db.books.toArray(),
    db.units.toArray(),
    db.wordItems.toArray(),
    db.wordStats.toArray(),
    db.sessions.toArray(),
    db.attempts.toArray(),
    db.bookProgress.toArray(),
    db.dailyStats.toArray(),
    db.userPrefs.toArray(),
  ]);

  return {
    format: "sparta-typing-backup",
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      books,
      units,
      wordItems,
      wordStats,
      sessions,
      attempts,
      bookProgress,
      dailyStats,
      userPrefs,
    },
  };
}

export function downloadBackup(payload: BackupPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = payload.exportedAt.slice(0, 10);
  a.href = url;
  a.download = `sparta-typing-backup-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(payload: BackupPayload, mode: "merge" | "replace") {
  if (payload.format !== "sparta-typing-backup") {
    throw new Error("形式が正しくありません．");
  }

  const d = payload.data;

  await db.transaction(
    "rw",
    [
      db.books,
      db.units,
      db.wordItems,
      db.wordStats,
      db.sessions,
      db.attempts,
      db.bookProgress,
      db.dailyStats,
      db.userPrefs,
    ],
    async () => {
      if (mode === "replace") {
        await Promise.all([
          db.books.clear(),
          db.units.clear(),
          db.wordItems.clear(),
          db.wordStats.clear(),
          db.sessions.clear(),
          db.attempts.clear(),
          db.bookProgress.clear(),
          db.dailyStats.clear(),
          db.userPrefs.clear(),
        ]);
      }

      await db.books.bulkPut(d.books as never[]);
      await db.units.bulkPut(d.units as never[]);
      await db.wordItems.bulkPut(d.wordItems as never[]);
      await db.wordStats.bulkPut(d.wordStats as never[]);
      await db.sessions.bulkPut(d.sessions as never[]);
      await db.attempts.bulkPut(d.attempts as never[]);
      await db.bookProgress.bulkPut(d.bookProgress as never[]);
      await db.dailyStats.bulkPut(d.dailyStats as never[]);
      await db.userPrefs.bulkPut(d.userPrefs as never[]);
    }
  );
}
