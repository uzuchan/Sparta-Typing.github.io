import { useEffect, useRef, useState } from "react";
import { useGameStore } from "./gameStore";
import { useGameLoop } from "./useGameLoop";
import { useTypingInput } from "./useTypingInput";
import { WordCard } from "./WordCard";
import { Hud } from "./Hud";
import { FeedbackLayer, ComboRing } from "./effects/FeedbackLayer";
import { Countdown } from "./effects/Countdown";
import { Pause, Play, X } from "../../ui/icons";

export function GameScreen(props: { onExit: () => void }) {
  const phase = useGameStore((s) => s.phase);
  const mode = useGameStore((s) => s.mode);
  const current = useGameStore((s) => s.current);
  const direction = useGameStore((s) => s.direction);
  const missFlash = useGameStore((s) => s.missFlash);
  const onChar = useGameStore((s) => s.onChar);
  const onBackspace = useGameStore((s) => s.onBackspace);
  const pause = useGameStore((s) => s.pause);
  const resume = useGameStore((s) => s.resume);
  const abort = useGameStore((s) => s.abort);

  const screenRef = useRef<HTMLDivElement | null>(null);
  const [frame, setFrame] = useState(0);

  useGameLoop();

  // drive smooth re-renders of card fall + bar
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    const loop = () => {
      setFrame((f) => (f + 1) % 1000000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const { hiddenInputProps, focusHidden } = useTypingInput({
    enabled: phase === "playing",
    direction,
    onChar,
    onBackspace,
    onEscape: () => (phase === "paused" ? resume() : pause()),
  });

  useEffect(() => {
    if (phase === "playing") focusHidden();
  }, [phase, current, focusHidden]);

  // pause on tab blur / hide
  useEffect(() => {
    const onBlur = () => {
      if (useGameStore.getState().phase === "playing") pause();
    };
    const onVis = () => {
      if (document.hidden && useGameStore.getState().phase === "playing") pause();
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pause]);

  async function handleQuit() {
    await abort();
    props.onExit();
  }

  return (
    <div
      className={`game-screen${missFlash ? " shake" : ""}`}
      ref={screenRef}
      onClick={focusHidden}
    >
      <input {...hiddenInputProps} />

      {phase === "countdown" && <Countdown />}
      <ComboRing />
      <FeedbackLayer />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="eyebrow">{mode}</span>
        <div style={{ display: "flex", gap: 8 }}>
          {phase === "playing" && (
            <button className="icon-btn ghost" onClick={pause} aria-label="一時停止">
              <Pause size={18} />
            </button>
          )}
          <button className="icon-btn danger" onClick={handleQuit} aria-label="終了">
            <X size={18} />
          </button>
        </div>
      </div>

      <Hud />

      <div className="card-stage">{current && <WordCard q={current} frame={frame} />}</div>

      <FallBar frame={frame} />

      {phase === "paused" && (
        <div className="overlay">
          <div className="card">
            <h2>Paused</h2>
            <p className="muted">EnterまたはEscで再開します．</p>
            <div className="actions" style={{ justifyContent: "center" }}>
              <button className="primary" onClick={resume}>
                <Play size={16} /> 再開
              </button>
              <button onClick={handleQuit}>終了する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FallBar(props: { frame: number }) {
  void props.frame;
  const current = useGameStore((s) => s.current);
  const questionStartedAt = useGameStore((s) => s._questionStartedAt);
  const phase = useGameStore((s) => s.phase);

  if (!current || phase !== "playing") {
    return (
      <div className="fall-bar">
        <div style={{ width: "0%" }} />
      </div>
    );
  }
  const ratio = Math.min(1, (performance.now() - questionStartedAt) / current.timeLimitMs);
  return (
    <div className="fall-bar">
      <div style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}
