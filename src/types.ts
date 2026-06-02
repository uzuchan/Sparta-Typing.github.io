export type Direction = "en_to_ja" | "ja_to_en";
export type UnitType = "book" | "part" | "section" | "chapter" | "unit";
export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type HintLevel = "none" | "first_char" | "full";
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;
export type Mode = "practice" | "sparta" | "endless";
export type Pool = "current" | "weak" | "review";

export type Book = {
  id: string;
  title: string;
  description?: string;
  defaultDirection: Direction;
  createdAt: string;
  updatedAt: string;
};

export type Unit = {
  id: string;
  bookId: string;
  parentUnitId?: string;
  type: UnitType;
  name: string;
  title?: string;
  orderIndex: number;
};

export type WordItem = {
  id: string;
  bookId: string;
  unitId: string;
  headwordNo: number;
  question: string;
  answerRaw: string;
  tags?: string[];
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type WordStats = {
  wordId: string;
  seenCount: number;
  correctCount: number;
  wrongCount: number;
  masteryLevel: MasteryLevel;
  masteryRaw: number;
  streak: number;
  avgLatencyMs: number;
  lastSeenAt?: string;
  dueAt?: string;
};

export type Session = {
  id: string;
  bookId: string;
  unitId?: string;
  mode: Mode;
  direction: Direction;
  startedAt: string;
  endedAt?: string;
  targetSeconds: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  normalScore: number;
  spartaScore: number;
  maxCombo: number;
};

export type Attempt = {
  id: string;
  sessionId: string;
  wordId: string;
  isCorrect: boolean;
  elapsedMs: number;
  timeLimitMs: number;
  hintLevel: HintLevel;
  missCount: number;
  typedText: string;
  normalScore: number;
  spartaScore: number;
  quality: Quality;
  combo: number;
  isBoss: boolean;
  createdAt: string;
};

export type BookProgress = {
  bookId: string;
  blockIndex: number;
  updatedAt: string;
};

export type DailyStat = {
  date: string;
  sessionCount: number;
  totalQuestions: number;
  correctCount: number;
  masteryUpCount: number;
};

export type UserPref = {
  key: string;
  value: string;
};

export type AnswerSegment = {
  display: string;
  reading: string;
};

export type GameQuestion = {
  word: WordItem;
  stats: WordStats;
  pool: Pool;
  questionText: string;
  answerDisplay: string;
  answerReading: string;
  targetText: string;
  timeLimitMs: number;
  isBoss: boolean;
};

export type SessionSummary = {
  mode: Mode;
  bookId: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  normalScore: number;
  spartaScore: number;
  maxCombo: number;
  averageLatencyMs: number;
  noHintCorrectCount: number;
  weakWordCount: number;
  masteryUpWords: { wordId: string; question: string; from: MasteryLevel; to: MasteryLevel }[];
  wrongWordIds: string[];
  blockUnlocked: boolean;
};
