import { nanoid } from "nanoid";
import { create } from "zustand";
import { db } from "../../db/db";
import { buildQuestion } from "./engine";
import { nowIso } from "../../lib/helpers";
import {
  calcNextDueAt,
  canUnlockNextBlock,
  createInitialStats,
  isReviewDue,
  isWeakWord,
  toMasteryLevel,
  updateMasteryRaw,
} from "../../lib/mastery";
import { selectNextWord } from "../../lib/questionSelector";
import { judgeEnglishInput, judgeRomajiInput } from "../../lib/romaji";
import {
  calcNormalScore,
  calcQuality,
  calcSpartaScore,
  comboMultiplier,
} from "../../lib/scoring";
import { getHintLevel } from "../../lib/time";
import { sfx } from "../../lib/sfx";
import { useLibraryStore } from "../library/libraryStore";
import type {
  Attempt,
  Direction,
  GameQuestion,
  HintLevel,
  MasteryLevel,
  Mode,
  Session,
  SessionSummary,
  WordItem,
  WordStats,
} from "../../types";

const ENDLESS_TICK_EVERY = 5;
const ENDLESS_TIGHTEN = 0.92;

export type Phase = "idle" | "countdown" | "playing" | "paused" | "finished";

type StartParams = {
  bookId: string;
  mode: Mode;
  direction: Direction;
  targetSeconds: number;
  restrictWordIds?: string[]; // for "review only" sessions
};

type FeedbackEvent =
  | { kind: "score"; value: number; perfect: boolean; id: string }
  | { kind: "levelup"; label: string; id: string };

type GameStore = {
  phase: Phase;
  mode: Mode;
  direction: Direction;
  bookId: string;
  countdownN: number;

  words: WordItem[];
  statsMap: Record<string, WordStats>;
  blockIndex: number;
  restrictWordIds: string[] | null;

  current: GameQuestion | null;
  input: string;
  inputProgress: number;
  missCount: number;
  missFlash: boolean;
  questionFlash: boolean;
  recentWordIds: string[];

  combo: number;
  maxCombo: number;
  noHintStreak: number;
  hintLevel: HintLevel;
  endlessAnswered: number;

  targetSeconds: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  normalTotal: number;
  spartaTotal: number;

  feedback: FeedbackEvent[];
  masteryUps: SessionSummary["masteryUpWords"];
  wrongWordIds: string[];

  summary: SessionSummary | null;

  // refs (kept in store as plain values)
  _sessionId: string | null;
  _sessionStartedAt: number;
  _questionStartedAt: number;
  _pauseStartedAt: number;
  _pendingEnd: boolean;

  // actions
  init: (p: StartParams) => Promise<void>;
  startCountdown: () => void;
  beginPlaying: () => void;
  pause: () => void;
  resume: () => void;
  onChar: (ch: string) => void;
  onBackspace: () => void;
  onHintChange: (level: HintLevel) => void;
  onTimeUp: () => void;
  requestSessionEnd: () => void;
  finish: () => Promise<void>;
  abort: () => Promise<void>;
  clearFeedback: (id: string) => void;
  reset: () => void;
  _now: () => number;
};

function defaultStats(id: string): WordStats {
  return createInitialStats(id);
}

function pushFeedback(set: (fn: (s: GameStore) => Partial<GameStore>) => void, ev: Omit<FeedbackEvent, "id">) {
  const id = nanoid(6);
  set((s) => ({ feedback: [...s.feedback, { ...ev, id } as FeedbackEvent] }));
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: "idle",
  mode: "practice",
  direction: "en_to_ja",
  bookId: "",
  countdownN: 3,

  words: [],
  statsMap: {},
  blockIndex: 0,
  restrictWordIds: null,

  current: null,
  input: "",
  inputProgress: 0,
  missCount: 0,
  missFlash: false,
  questionFlash: false,
  recentWordIds: [],

  combo: 0,
  maxCombo: 0,
  noHintStreak: 0,
  hintLevel: "none",
  endlessAnswered: 0,

  targetSeconds: 180,
  totalQuestions: 0,
  correctCount: 0,
  wrongCount: 0,
  normalTotal: 0,
  spartaTotal: 0,

  feedback: [],
  masteryUps: [],
  wrongWordIds: [],

  summary: null,

  _sessionId: null,
  _sessionStartedAt: 0,
  _questionStartedAt: 0,
  _pauseStartedAt: 0,
  _pendingEnd: false,

  _now: () => performance.now(),

  init: async (p) => {
    const lib = useLibraryStore.getState();
    const allWords = await lib.getWords(p.bookId);
    const statsMap = await lib.getStatsMap(allWords.map((w) => w.id));
    const progress = await lib.getProgress(p.bookId);

    set({
      phase: "idle",
      mode: p.mode,
      direction: p.direction,
      bookId: p.bookId,
      words: allWords,
      statsMap,
      blockIndex: progress.blockIndex,
      restrictWordIds: p.restrictWordIds ?? null,
      targetSeconds: p.targetSeconds,
      combo: 0,
      maxCombo: 0,
      noHintStreak: 0,
      endlessAnswered: 0,
      totalQuestions: 0,
      correctCount: 0,
      wrongCount: 0,
      normalTotal: 0,
      spartaTotal: 0,
      masteryUps: [],
      wrongWordIds: [],
      recentWordIds: [],
      summary: null,
      _pendingEnd: false,
    });
  },

  startCountdown: () => {
    if (get().words.length === 0) return;
    set({ phase: "countdown", countdownN: 3 });
    sfx.countdown();
    const tickDown = () => {
      const n = get().countdownN - 1;
      if (n <= 0) {
        sfx.go();
        get().beginPlaying();
      } else {
        sfx.countdown();
        set({ countdownN: n });
        setTimeout(tickDown, 1000);
      }
    };
    setTimeout(tickDown, 1000);
  },

  beginPlaying: async () => {
    const state = get();
    const session: Session = {
      id: nanoid(),
      bookId: state.bookId,
      mode: state.mode,
      direction: state.direction,
      startedAt: nowIso(),
      targetSeconds: state.targetSeconds,
      totalQuestions: 0,
      correctCount: 0,
      wrongCount: 0,
      normalScore: 0,
      spartaScore: 0,
      maxCombo: 0,
    };
    await db.sessions.add(session);

    const now = performance.now();
    set({
      phase: "playing",
      _sessionId: session.id,
      _sessionStartedAt: now,
    });
    nextQuestion(set, get, []);
  },

  pause: () => {
    if (get().phase !== "playing") return;
    set({ phase: "paused", _pauseStartedAt: performance.now() });
  },

  resume: () => {
    if (get().phase !== "paused") return;
    const pausedMs = performance.now() - get()._pauseStartedAt;
    set((s) => ({
      phase: "playing",
      _sessionStartedAt: s._sessionStartedAt + pausedMs,
      _questionStartedAt: s._questionStartedAt + pausedMs,
    }));
  },

  onHintChange: (level) => {
    set({ hintLevel: level });
  },

  onChar: (ch) => {
    const s = get();
    if (s.phase !== "playing" || !s.current) return;

    const nextInput = s.input + ch;
    const judge =
      s.direction === "en_to_ja"
        ? judgeRomajiInput(s.current.answerReading, nextInput)
        : judgeEnglishInput(s.current.word.question, nextInput);

    if (judge.type === "miss") {
      sfx.miss();
      set((st) => ({ missCount: st.missCount + 1, missFlash: true }));
      setTimeout(() => set({ missFlash: false }), 180);

      return;
    }

    sfx.key();
    set({ input: nextInput, inputProgress: judge.kanaProgress });

    if (judge.completed) {
      void completeQuestion(set, get, true);
    }
  },

  onBackspace: () => {
    const s = get();
    if (s.phase !== "playing") return;
    const nextInput = s.input.slice(0, -1);

    if (!s.current || nextInput.length === 0) {
      set({ input: nextInput, inputProgress: 0 });
      return;
    }

    const judge =
      s.direction === "en_to_ja"
        ? judgeRomajiInput(s.current.answerReading, nextInput)
        : judgeEnglishInput(s.current.word.question, nextInput);

    set({
      input: nextInput,
      inputProgress: judge.type === "match" ? judge.kanaProgress : 0,
    });
  },

  onTimeUp: () => {
    const s = get();
    if (s.phase !== "playing" || !s.current) return;
    sfx.timeup();
    void completeQuestion(set, get, false);
  },

  requestSessionEnd: () => {
    set({ _pendingEnd: true });
  },

  finish: async () => {
    await finalize(set, get);
  },

  abort: async () => {
    const s = get();
    if (s._sessionId) {
      await db.sessions.update(s._sessionId, {
        endedAt: nowIso(),
        totalQuestions: s.totalQuestions,
        correctCount: s.correctCount,
        wrongCount: s.wrongCount,
        normalScore: s.normalTotal,
        spartaScore: s.spartaTotal,
        maxCombo: s.maxCombo,
      });
    }
    get().reset();
  },

  clearFeedback: (id) => {
    set((s) => ({ feedback: s.feedback.filter((f) => f.id !== id) }));
  },

  reset: () => {
    set({
      phase: "idle",
      current: null,
      input: "",
      inputProgress: 0,
      missCount: 0,
      feedback: [],
      summary: null,
      _sessionId: null,
      _pendingEnd: false,
    });
  },
}));

// ---- helpers operating on the store ----

function currentBlockWords(get: () => GameStore): WordItem[] {
  const s = get();
  if (s.restrictWordIds) {
    const set = new Set(s.restrictWordIds);
    return s.words.filter((w) => set.has(w.id));
  }
  const start = s.blockIndex * 10;
  return s.words.slice(start, start + 10);
}

function weakWordList(get: () => GameStore): WordItem[] {
  const s = get();
  return s.words.filter((w) => isWeakWord(s.statsMap[w.id] ?? defaultStats(w.id)));
}

function reviewWordList(get: () => GameStore): WordItem[] {
  const s = get();
  const now = new Date();
  return s.words.filter((w) => isReviewDue(s.statsMap[w.id] ?? defaultStats(w.id), now));
}

function nextQuestion(
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore,
  recent: string[]
) {
  const s = get();
  const endlessTighten = Math.pow(
    ENDLESS_TIGHTEN,
    Math.floor(s.endlessAnswered / ENDLESS_TICK_EVERY)
  );

  let word: WordItem;
  let pool: GameQuestion["pool"];

  if (s.restrictWordIds) {
    const pickable = currentBlockWords(get).filter((w) => !recent.includes(w.id));
    const list = pickable.length > 0 ? pickable : currentBlockWords(get);
    word = list[Math.floor(Math.random() * list.length)];
    pool = "weak";
  } else {
    const picked = selectNextWord({
      currentWords: currentBlockWords(get),
      weakWords: weakWordList(get),
      reviewWords: reviewWordList(get),
      recentWordIds: recent,
    });
    word = picked.word;
    pool = picked.pool;
  }

  const stats = s.statsMap[word.id] ?? defaultStats(word.id);
  const q = buildQuestion(word, stats, s.direction, s.mode, pool, endlessTighten);

  set({
    current: q,
    input: "",
    inputProgress: 0,
    missCount: 0,
    hintLevel: "none",
    questionFlash: false,
    _questionStartedAt: performance.now(),
  } as Partial<GameStore>);
  // store ref via set on private field
  useGameStore.setState({ _questionStartedAt: performance.now() });
}

async function completeQuestion(
  set: (fn: (s: GameStore) => Partial<GameStore>) => void,
  get: () => GameStore,
  isCorrect: boolean,
  forceEnd = false
) {
  const s = get();
  const q = s.current;
  if (!q || !s._sessionId) return;

  const elapsedMs = Math.round(performance.now() - s._questionStartedAt);
  const finalHint: HintLevel = s.mode === "sparta" ? "none" : getHintLevel(elapsedMs, q.timeLimitMs);

  const baseNormal = calcNormalScore({
    isCorrect,
    elapsedMs,
    timeLimitMs: q.timeLimitMs,
    hintLevel: finalHint,
    missCount: s.missCount,
  });

  const combo = isCorrect ? s.combo + 1 : 0;
  const mult = s.mode === "practice" ? comboMultiplier(combo) : 1;
  const normalScore = Math.round(baseNormal * mult);

  let spartaScore = calcSpartaScore({
    isCorrect,
    elapsedMs,
    timeLimitMs: q.timeLimitMs,
    hintLevel: finalHint,
    missCount: s.missCount,
  });
  if (q.isBoss && spartaScore > 0) spartaScore += 50;

  const quality = calcQuality({
    isCorrect,
    normalScore: baseNormal,
    spartaScore,
    hintLevel: finalHint,
    missCount: s.missCount,
  });

  // feedback
  if (isCorrect) {
    const perfect = (s.mode === "sparta" && spartaScore >= 80) || baseNormal >= 10;
    if (perfect) sfx.perfect();
    else sfx.correct();
    const displayScore = s.mode === "sparta" ? spartaScore : normalScore;
    if (displayScore > 0) pushFeedback(set, { kind: "score", value: displayScore, perfect } as Omit<FeedbackEvent, "id">);
    set(() => ({ questionFlash: true }));
    setTimeout(() => set(() => ({ questionFlash: false })), 180);
  }

  // mastery update
  const oldStats = s.statsMap[q.word.id] ?? defaultStats(q.word.id);
  const now = new Date();
  const newRaw = updateMasteryRaw(oldStats.masteryRaw, quality);
  const newLevel = toMasteryLevel(newRaw);
  const nextSeen = oldStats.seenCount + 1;
  const newStats: WordStats = {
    ...oldStats,
    seenCount: nextSeen,
    correctCount: oldStats.correctCount + (isCorrect ? 1 : 0),
    wrongCount: oldStats.wrongCount + (isCorrect ? 0 : 1),
    masteryRaw: newRaw,
    masteryLevel: newLevel,
    streak: isCorrect ? oldStats.streak + 1 : 0,
    avgLatencyMs:
      oldStats.seenCount === 0
        ? elapsedMs
        : Math.round((oldStats.avgLatencyMs * oldStats.seenCount + elapsedMs) / nextSeen),
    lastSeenAt: now.toISOString(),
    dueAt: calcNextDueAt(now, newLevel),
  };

  const leveledUp = newLevel > oldStats.masteryLevel;
  if (leveledUp) {
    sfx.levelup();
    pushFeedback(set, { kind: "levelup", label: `mastery → Lv${newLevel}` } as Omit<FeedbackEvent, "id">);
  }

  const attempt: Attempt = {
    id: nanoid(),
    sessionId: s._sessionId,
    wordId: q.word.id,
    isCorrect,
    elapsedMs,
    timeLimitMs: q.timeLimitMs,
    hintLevel: finalHint,
    missCount: s.missCount,
    typedText: s.input,
    normalScore,
    spartaScore,
    quality,
    combo,
    isBoss: q.isBoss,
    createdAt: now.toISOString(),
  };

  await db.transaction("rw", db.wordStats, db.attempts, async () => {
    await db.wordStats.put(newStats);
    await db.attempts.add(attempt);
  });

  const noHintStreak =
    isCorrect && finalHint === "none" ? s.noHintStreak + 1 : 0;

  const recent = [q.word.id, ...s.recentWordIds].slice(0, 3);

  const masteryUps = leveledUp
    ? [
        ...s.masteryUps,
        {
          wordId: q.word.id,
          question: q.word.question,
          from: oldStats.masteryLevel as MasteryLevel,
          to: newLevel,
        },
      ]
    : s.masteryUps;

  set((st) => ({
    statsMap: { ...st.statsMap, [q.word.id]: newStats },
    recentWordIds: recent,
    combo,
    maxCombo: Math.max(st.maxCombo, combo),
    noHintStreak,
    totalQuestions: st.totalQuestions + 1,
    correctCount: st.correctCount + (isCorrect ? 1 : 0),
    wrongCount: st.wrongCount + (isCorrect ? 0 : 1),
    normalTotal: st.normalTotal + normalScore,
    spartaTotal: st.spartaTotal + spartaScore,
    endlessAnswered: st.endlessAnswered + 1,
    wrongWordIds: isCorrect ? st.wrongWordIds : [...new Set([...st.wrongWordIds, q.word.id])],
    masteryUps,
  }));

  // termination checks
  const after = get();
  const sessionEnded =
    forceEnd ||
    after._pendingEnd ||
    (after.mode !== "endless" &&
      performance.now() - after._sessionStartedAt >= after.targetSeconds * 1000);

  if (sessionEnded) {
    await finalize(set, get);
    return;
  }

  // brief delay so flash/level-up reads, then next
  const delay = leveledUp ? 320 : 0;
  if (delay > 0) {
    setTimeout(() => nextQuestion(set as never, get, recent), delay);
  } else {
    nextQuestion(set as never, get, recent);
  }
}

async function finalize(
  set: (fn: (s: GameStore) => Partial<GameStore>) => void,
  get: () => GameStore
) {
  const s = get();
  const lib = useLibraryStore.getState();

  if (s._sessionId) {
    await db.sessions.update(s._sessionId, {
      endedAt: nowIso(),
      totalQuestions: s.totalQuestions,
      correctCount: s.correctCount,
      wrongCount: s.wrongCount,
      normalScore: s.normalTotal,
      spartaScore: s.spartaTotal,
      maxCombo: s.maxCombo,
    });
  }

  const attempts = s._sessionId
    ? await db.attempts.where("sessionId").equals(s._sessionId).toArray()
    : [];
  const avgLatency =
    attempts.length === 0
      ? 0
      : attempts.reduce((sum, a) => sum + a.elapsedMs, 0) / attempts.length;

  // block unlock check (only for normal block sessions)
  let blockUnlocked = false;
  if (!s.restrictWordIds) {
    const blockWords = s.words.slice(s.blockIndex * 10, s.blockIndex * 10 + 10);
    const blockStats = blockWords.map((w) => s.statsMap[w.id] ?? defaultStats(w.id));
    const hasNextBlock = s.words.length > (s.blockIndex + 1) * 10;
    if (hasNextBlock && canUnlockNextBlock(blockStats)) {
      blockUnlocked = true;
    }
  }

  const weakCount = Object.values(s.statsMap).filter(isWeakWord).length;

  const summary: SessionSummary = {
    mode: s.mode,
    bookId: s.bookId,
    totalQuestions: s.totalQuestions,
    correctCount: s.correctCount,
    wrongCount: s.wrongCount,
    accuracy: s.totalQuestions === 0 ? 0 : s.correctCount / s.totalQuestions,
    normalScore: s.normalTotal,
    spartaScore: s.spartaTotal,
    maxCombo: s.maxCombo,
    averageLatencyMs: avgLatency,
    noHintCorrectCount: attempts.filter((a) => a.isCorrect && a.hintLevel === "none").length,
    weakWordCount: weakCount,
    masteryUpWords: s.masteryUps,
    wrongWordIds: s.wrongWordIds,
    blockUnlocked,
  };

  await lib.recordDaily({
    questions: s.totalQuestions,
    correct: s.correctCount,
    masteryUp: s.masteryUps.length,
  });

  set(() => ({ phase: "finished", summary, current: null }));
}
