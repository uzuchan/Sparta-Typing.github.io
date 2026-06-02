import { useEffect, useState } from "react";
import { useGameStore } from "./gameStore";
import { formatClock } from "../../lib/time";
import { comboMultiplier } from "../../lib/scoring";
import { Clock, Flame, Heart, Trophy } from "../../ui/icons";

const RANKS = ["D", "C", "B", "A", "S", "SS"];

function spartaRank(score: number): string {
  if (score >= 1500) return RANKS[5];
  if (score >= 1000) return RANKS[4];
  if (score >= 600) return RANKS[3];
  if (score >= 300) return RANKS[2];
  if (score >= 120) return RANKS[1];
  return RANKS[0];
}

export function Hud() {
  const mode = useGameStore((s) => s.mode);
  const sessionStartedAt = useGameStore((s) => s._sessionStartedAt);
  const targetSeconds = useGameStore((s) => s.targetSeconds);
  const phase = useGameStore((s) => s.phase);
  const combo = useGameStore((s) => s.combo);
  const hp = useGameStore((s) => s.hp);
  const normalTotal = useGameStore((s) => s.normalTotal);
  const spartaTotal = useGameStore((s) => s.spartaTotal);
  const correctCount = useGameStore((s) => s.correctCount);
  const noHintStreak = useGameStore((s) => s.noHintStreak);
  const pendingEnd = useGameStore((s) => s._pendingEnd);

  const [, force] = useState(0);
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => force((n) => n + 1), 200);
    return () => clearInterval(id);
  }, [phase]);

  const remaining =
    mode === "practice"
      ? Math.max(0, targetSeconds * 1000 - (performance.now() - sessionStartedAt))
      : null;
  const danger = remaining !== null && remaining <= 10000;

  return (
    <div className="hud">
      <div className="hud-top">
        {mode === "practice" ? (
          <div className={`hud-clock${danger ? " danger" : ""}`}>
            <Clock size={20} />
            {pendingEnd ? "LAST" : formatClock(remaining ?? 0)}
          </div>
        ) : (
          <div className="hud-clock">
            <Clock size={20} />
            {formatClock(performance.now() - sessionStartedAt)}
          </div>
        )}

        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          {mode === "practice" && combo >= 3 && (
            <span className={`combo${combo % 1 === 0 ? " bump" : ""}`} key={combo}>
              <Flame size={18} />×{comboMultiplier(combo).toFixed(1)}
              <span className="muted" style={{ fontSize: "0.8rem" }}>
                {combo}
              </span>
            </span>
          )}

          {noHintStreak >= 3 && (
            <span className="nohint-badge">N{noHintStreak}</span>
          )}

          {mode === "sparta" && (
            <>
              <span className="rank-badge">
                <Trophy size={16} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                {spartaRank(spartaTotal)}
              </span>
              <span className="hp">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart
                    key={i}
                    size={20}
                    fill={i < hp ? "var(--danger)" : "none"}
                    color={i < hp ? "var(--danger)" : "var(--text-muted)"}
                    style={{ opacity: i < hp ? 1 : 0.4 }}
                  />
                ))}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="hud-scores">
        {mode === "sparta" ? (
          <div className="hud-score">
            <span>Sparta</span>
            <b>{spartaTotal}</b>
          </div>
        ) : (
          <div className="hud-score">
            <span>Normal</span>
            <b>{normalTotal}</b>
          </div>
        )}
        <div className={`hud-score${mode === "sparta" ? "" : " dim"}`}>
          <span>{mode === "sparta" ? "Normal" : "Sparta"}</span>
          <b>{mode === "sparta" ? normalTotal : spartaTotal}</b>
        </div>
        <div className="hud-score">
          <span>Correct</span>
          <b>{correctCount}</b>
        </div>
      </div>
    </div>
  );
}
