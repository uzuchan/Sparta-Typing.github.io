import { useEffect } from "react";
import { tick } from "./engine";
import { useGameStore } from "./gameStore";

export function useGameLoop() {
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    if (phase !== "playing") return;

    let raf = 0;
    const loop = () => {
      const s = useGameStore.getState();
      if (s.phase === "playing" && s.current) {
        const events = tick(
          {
            mode: s.mode,
            sessionStartedAt: s._sessionStartedAt,
            questionStartedAt: s._questionStartedAt,
            targetSeconds: s.targetSeconds,
            hintLevel: s.hintLevel,
            timeLimitMs: s.current.timeLimitMs,
          },
          performance.now()
        );

        for (const ev of events) {
          if (ev.type === "hint") s.onHintChange(ev.level);
          else if (ev.type === "session_end") s.requestSessionEnd();
          else if (ev.type === "timeup") s.onTimeUp();
        }
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);
}
