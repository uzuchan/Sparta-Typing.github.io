import { getAnswerDisplay, getAnswerReading } from "../../lib/answerParser";
import { calcTimeLimitMs, getHintLevel } from "../../lib/time";
import type { Direction, GameQuestion, HintLevel, Mode, Pool, WordItem, WordStats } from "../../types";

export function buildQuestion(
  word: WordItem,
  stats: WordStats,
  direction: Direction,
  mode: Mode,
  pool: Pool,
  endlessTighten = 1
): GameQuestion {
  const answerDisplay = getAnswerDisplay(word.answerRaw);
  const answerReading = getAnswerReading(word.answerRaw);
  const targetText = direction === "en_to_ja" ? answerReading : word.question;
  const questionText = direction === "en_to_ja" ? word.question : answerDisplay;

  const isBoss = mode === "sparta" && stats.masteryLevel <= 1 && stats.seenCount > 0;

  let timeLimitMs: number;
  if (mode === "endless") {
    timeLimitMs = Math.round(calcTimeLimitMs(targetText.length) * endlessTighten);
  } else {
    timeLimitMs = calcTimeLimitMs(targetText.length);
  }

  return {
    word,
    stats,
    pool,
    questionText,
    answerDisplay,
    answerReading,
    targetText,
    timeLimitMs,
    isBoss,
  };
}

export type EngineState = {
  mode: Mode;
  sessionStartedAt: number;
  questionStartedAt: number;
  targetSeconds: number;
  hintLevel: HintLevel;
  timeLimitMs: number;
};

export type EngineEvent =
  | { type: "hint"; level: HintLevel }
  | { type: "timeup" }
  | { type: "session_end" };

// Pure: derives events from elapsed time. No side effects.
export function tick(state: EngineState, now: number): EngineEvent[] {
  const events: EngineEvent[] = [];
  const elapsedQ = now - state.questionStartedAt;
  const elapsedS = now - state.sessionStartedAt;

  const level = state.mode === "sparta" ? "none" : getHintLevel(elapsedQ, state.timeLimitMs);
  if (level !== state.hintLevel) {
    events.push({ type: "hint", level });
  }

  if (elapsedQ >= state.timeLimitMs) {
    events.push({ type: "timeup" });
  }

  // Practice and Sparta use session time; Endless runs until the player exits.
  if (state.mode !== "endless" && elapsedS >= state.targetSeconds * 1000) {
    events.push({ type: "session_end" });
  }

  return events;
}
