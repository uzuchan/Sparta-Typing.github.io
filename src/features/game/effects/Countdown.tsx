import { useGameStore } from "../gameStore";

const MODE_NAME: Record<string, string> = {
  practice: "Practice",
  sparta: "Sparta",
  endless: "Endless",
};

export function Countdown() {
  const n = useGameStore((s) => s.countdownN);
  const mode = useGameStore((s) => s.mode);

  return (
    <div className="countdown">
      <div className="countdown-inner">
        <div className="mode-name">{MODE_NAME[mode]}</div>
        <div className="num" key={n}>
          {n > 0 ? n : "GO"}
        </div>
      </div>
    </div>
  );
}
