import Dexie, { type Table } from "dexie";
import type {
  Attempt,
  Book,
  BookProgress,
  DailyStat,
  Session,
  Unit,
  UserPref,
  WordItem,
  WordStats,
} from "../types";

export class SpartaTypingDB extends Dexie {
  books!: Table<Book, string>;
  units!: Table<Unit, string>;
  wordItems!: Table<WordItem, string>;
  wordStats!: Table<WordStats, string>;
  sessions!: Table<Session, string>;
  attempts!: Table<Attempt, string>;
  bookProgress!: Table<BookProgress, string>;
  dailyStats!: Table<DailyStat, string>;
  userPrefs!: Table<UserPref, string>;

  constructor() {
    super("spartaTypingDB");

    this.version(1).stores({
      books: "id, title, createdAt, updatedAt",
      units: "id, bookId, parentUnitId, type, orderIndex",
      wordItems: "id, bookId, unitId, headwordNo, question",
      wordStats: "wordId, masteryLevel, dueAt, lastSeenAt",
      sessions: "id, bookId, startedAt, endedAt",
      attempts: "id, sessionId, wordId, createdAt",
    });

    this.version(2)
      .stores({
        books: "id, title, createdAt, updatedAt",
        units: "id, bookId, parentUnitId, type, orderIndex",
        wordItems: "id, bookId, unitId, headwordNo, question",
        wordStats: "wordId, masteryLevel, dueAt, lastSeenAt",
        sessions: "id, bookId, startedAt, endedAt, mode",
        attempts: "id, sessionId, wordId, createdAt",
        bookProgress: "bookId, blockIndex, updatedAt",
        dailyStats: "date",
        userPrefs: "key",
      })
      .upgrade(async (tx) => {
        await tx
          .table("sessions")
          .toCollection()
          .modify((s) => {
            if (!s.mode) s.mode = "practice";
            if (s.maxCombo === undefined) s.maxCombo = 0;
          });
        await tx
          .table("attempts")
          .toCollection()
          .modify((a) => {
            if (a.combo === undefined) a.combo = 0;
            if (a.isBoss === undefined) a.isBoss = false;
          });
      });
  }
}

export const db = new SpartaTypingDB();
