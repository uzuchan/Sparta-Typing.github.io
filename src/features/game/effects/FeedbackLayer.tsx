import { useEffect } from "react";
import { useGameStore } from "../gameStore";
import { Sparkles } from "../../../ui/icons";

export function FeedbackLayer() {
  const feedback = useGameStore((s) => s.feedback);
  const clearFeedback = useGameStore((s) => s.clearFeedback);

  useEffect(() => {
    const timers = feedback.map((f) => {
      const ttl = f.kind === "levelup" ? 1600 : 650;
      return setTimeout(() => clearFeedback(f.id), ttl);
    });
    return () => timers.forEach(clearTimeout);
  }, [feedback, clearFeedback]);

  return (
    <>
      {feedback.map((f) => {
        if (f.kind === "score") {
          return (
            <div key={f.id} className={`score-pop${f.perfect ? " perfect" : ""}`}>
              +{f.value}
            </div>
          );
        }
        if (f.kind === "levelup") {
          return (
            <div key={f.id} className="levelup-toast">
              <Sparkles size={18} />
              {f.label}
            </div>
          );
        }
        return null;
      })}
    </>
  );
}

export function ComboRing() {
  const combo = useGameStore((s) => s.combo);
  const mode = useGameStore((s) => s.mode);
  if (mode !== "practice") return null;
  let lv = "";
  if (combo >= 10) lv = "lv3";
  else if (combo >= 5) lv = "lv2";
  else if (combo >= 3) lv = "lv1";
  return <div className={`combo-ring ${lv}`} />;
}
