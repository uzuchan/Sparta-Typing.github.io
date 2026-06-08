import { useGameStore } from "./gameStore";
import { kanaToRomajiCandidates } from "../../lib/romaji";
import { MASTERY_META } from "../../lib/mastery";
import type { GameQuestion } from "../../types";

function romajiRemainder(answerReading: string, input: string): string {
  // show what romaji is being typed for the current kana (partial)
  const candidates = kanaToRomajiCandidates(answerReading);
  const match = candidates.find((c) => c.startsWith(input.toLowerCase()));
  if (!match) return "";
  return match.slice(input.length, input.length + 4);
}

export function WordCard(props: { q: GameQuestion; frame: number }) {
  const { q } = props;
  void props.frame;
  const input = useGameStore((s) => s.input);
  const missFlash = useGameStore((s) => s.missFlash);
  const questionFlash = useGameStore((s) => s.questionFlash);
  const hintLevel = useGameStore((s) => s.hintLevel);
  const direction = useGameStore((s) => s.direction);
  const mode = useGameStore((s) => s.mode);
  const questionStartedAt = useGameStore((s) => s._questionStartedAt);

  // derive fall ratio for animation via inline style updated by parent tick
  // (parent passes nothing; we compute via rAF-free reading of elapsed)
  const elapsed = performance.now() - questionStartedAt;
  const fall = Math.min(1, elapsed / q.timeLimitMs);

  const meta = MASTERY_META[q.stats.masteryLevel];

  // target characters
  const target = q.targetText;
  const doneLen = computeDoneLength(q, input, direction);
  const isSparta = mode === "sparta";

  const upcomingHidden = (idx: number): boolean => {
    if (isSparta && idx >= doneLen) return true;
    // ヒントが進むほど未入力文字が見える．noneでは隠す，first_charで先頭以降を薄く，fullで全部見せる
    if (idx < doneLen) return false;
    if (hintLevel === "full") return false;
    if (hintLevel === "first_char") return idx > 0;
    return idx >= doneLen; // none → 未入力は隠す（最初の1文字だけ薄く出す）
  };

  return (
    <div
      className={`word-card${q.isBoss ? " boss" : ""}`}
      style={{ ["--fall" as string]: String(fall) }}
    >
      {q.isBoss && <div className="boss-tag">◆ BOSS WORD</div>}
      <div className="pool-tag">{poolLabel(q.pool)}</div>

      <p className={`question${questionFlash ? " flash" : ""}`}>{q.questionText}</p>

      {!isSparta && (
        <div className="sub-display">
          {direction === "en_to_ja" ? q.answerDisplay : q.word.question}
        </div>
      )}

      <div className="target">
        {[...target].map((ch, i) => {
          let cls = "ch ";
          if (i < doneLen) cls += "done";
          else if (i === doneLen) cls += missFlash ? "cursor miss" : "cursor";
          else if (upcomingHidden(i)) cls += "hidden-hint";
          else cls += "upcoming";
          const hiddenText = isSparta
            ? i >= doneLen
            : i > doneLen && hintLevel === "none" && i !== doneLen;
          return (
            <span key={i} className={cls}>
              {hiddenText ? "" : ch}
            </span>
          );
        })}
      </div>

      {direction === "en_to_ja" && (
        <div className="romaji-progress">
          {input}
          {!isSparta && (
            <span style={{ opacity: 0.4 }}>{romajiRemainder(q.answerReading, currentKanaInput(input))}</span>
          )}
        </div>
      )}

      <div className="mastery-line">
        <span style={{ color: meta.color, fontSize: "1rem" }}>{meta.symbol}</span>
        {meta.label} · Lv{q.stats.masteryLevel}
      </div>
    </div>
  );
}

function currentKanaInput(input: string): string {
  // crude: last few latin chars represent the in-progress kana
  return input.slice(-3);
}

function poolLabel(pool: GameQuestion["pool"]): string {
  if (pool === "weak") return "weak";
  if (pool === "review") return "review";
  return "current";
}

// estimate how many target characters are "done" based on input length proportion
function computeDoneLength(
  q: GameQuestion,
  input: string,
  direction: GameQuestion["word"] extends never ? never : "en_to_ja" | "ja_to_en"
): number {
  if (input.length === 0) return 0;
  if (direction === "ja_to_en") {
    // english: 1:1 char mapping
    return Math.min(input.length, q.targetText.length);
  }
  // japanese: approximate kana completed by matching romaji prefix per kana
  const reading = q.answerReading;
  const candidates = kanaToRomajiCandidates(reading);
  // find how many leading kana are fully represented
  let best = 0;
  for (let k = reading.length; k >= 1; k--) {
    const prefixKana = reading.slice(0, k);
    const prefixCands = kanaToRomajiCandidates(prefixKana);
    if (prefixCands.some((c) => c === input.toLowerCase())) {
      best = k;
      break;
    }
  }
  if (best > 0) return best;
  // partial: estimate proportion
  const anyCand = candidates.find((c) => c.startsWith(input.toLowerCase()));
  if (!anyCand) return 0;
  const ratio = input.length / anyCand.length;
  return Math.floor(ratio * reading.length);
}
