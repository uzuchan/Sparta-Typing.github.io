import { useEffect, useState } from "react";
import { useGameStore } from "../features/game/gameStore";
import { GameScreen } from "../features/game/GameScreen";
import { ResultPage } from "./ResultPage";
import { useLibraryStore } from "../features/library/libraryStore";
import { useUiStore } from "../app/uiStore";
import { navigate } from "../app/routes";
import { ArrowLeft, Dumbbell, InfinityIcon, Play, Swords } from "../ui/icons";
import type { Direction, Mode } from "../types";

type Stage = "select" | "game" | "result";

const MODES: {
  mode: Mode;
  name: string;
  color: string;
  icon: typeof Dumbbell;
  desc: string;
}[] = [
  {
    mode: "practice",
    name: "Practice",
    color: "#ff8c3b",
    icon: Dumbbell,
    desc: "時間内にじっくり．コンボ倍率で得点を伸ばす基本モード．",
  },
  {
    mode: "sparta",
    name: "Sparta",
    color: "#ff3b4e",
    icon: Swords,
    desc: "答えを隠して記憶から打つモード．制限時間はPracticeと同じです．",
  },
  {
    mode: "endless",
    name: "Endless",
    color: "#38bdf8",
    icon: InfinityIcon,
    desc: "終わりなし．5問ごとに制限時間が短縮されていく耐久モード．",
  },
];

const DURATIONS = [60, 120, 180, 300];

export function PlayPage(props: { bookId: string }) {
  const phase = useGameStore((s) => s.phase);
  const summary = useGameStore((s) => s.summary);
  const init = useGameStore((s) => s.init);
  const startCountdown = useGameStore((s) => s.startCountdown);
  const reset = useGameStore((s) => s.reset);

  const setThemeMode = useUiStore((s) => s.setThemeMode);
  const books = useLibraryStore((s) => s.books);
  const refreshBooks = useLibraryStore((s) => s.refreshBooks);
  const setBlockIndex = useLibraryStore((s) => s.setBlockIndex);
  const getProgress = useLibraryStore((s) => s.getProgress);

  const [stage, setStage] = useState<Stage>("select");
  const [mode, setMode] = useState<Mode>("practice");
  const [direction, setDirection] = useState<Direction>("en_to_ja");
  const [seconds, setSeconds] = useState(120);

  useEffect(() => {
    if (books.length === 0) void refreshBooks();
  }, [books.length, refreshBooks]);

  useEffect(() => {
    setThemeMode(mode);
  }, [mode, setThemeMode]);

  useEffect(() => {
    if (phase === "finished") setStage("result");
  }, [phase]);

  const book = books.find((b) => b.id === props.bookId);

  async function start(restrictWordIds?: string[]) {
    await init({
      bookId: props.bookId,
      mode,
      direction,
      targetSeconds: seconds,
      restrictWordIds,
    });
    setStage("game");
    startCountdown();
  }

  async function handleAdvanceBlock() {
    const prog = await getProgress(props.bookId);
    await setBlockIndex(props.bookId, prog.blockIndex + 1);
    reset();
    setStage("select");
  }

  if (stage === "game" || phase === "countdown" || phase === "playing" || phase === "paused") {
    return (
      <GameScreen
        onExit={() => {
          reset();
          setStage("select");
          navigate({ name: "book", bookId: props.bookId });
        }}
      />
    );
  }

  if (stage === "result" && summary) {
    return (
      <ResultPage
        summary={summary}
        onAgain={() => {
          reset();
          void start();
        }}
        onReviewWrong={() => {
          const ids = summary.wrongWordIds;
          reset();
          void start(ids);
        }}
        onAdvanceBlock={handleAdvanceBlock}
        onHome={() => {
          reset();
          navigate({ name: "home" });
        }}
      />
    );
  }

  return (
    <section className="grid page-enter">
      <div className="card">
        <button className="ghost" style={{ marginBottom: 12 }} onClick={() => navigate({ name: "book", bookId: props.bookId })}>
          <ArrowLeft size={16} /> {book?.title ?? "Book"}
        </button>
        <span className="eyebrow">Select mode</span>
        <h2 style={{ marginTop: 6 }}>モードを選ぶ</h2>

        <div className="mode-grid" style={{ marginTop: 16 }}>
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.mode}
                className={`mode-tile${mode === m.mode ? " selected" : ""}`}
                style={{ ["--mode-color" as string]: m.color }}
                onClick={() => setMode(m.mode)}
              >
                <div className="mode-icon">
                  <Icon size={22} />
                </div>
                <h3>{m.name}</h3>
                <p>{m.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="grid two">
          <div>
            <span className="eyebrow">出題方向</span>
            <div className="actions" style={{ marginTop: 8 }}>
              <button
                className={direction === "en_to_ja" ? "primary" : ""}
                onClick={() => setDirection("en_to_ja")}
              >
                英 → 日
              </button>
              <button
                className={direction === "ja_to_en" ? "primary" : ""}
                onClick={() => setDirection("ja_to_en")}
              >
                日 → 英
              </button>
            </div>
          </div>

          {mode !== "endless" && (
            <div>
              <span className="eyebrow">制限時間</span>
              <div className="actions" style={{ marginTop: 8 }}>
                {DURATIONS.map((d) => (
                  <button key={d} className={seconds === d ? "primary" : ""} onClick={() => setSeconds(d)}>
                    {d < 60 ? `${d}s` : `${d / 60}分`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="actions" style={{ marginTop: 18 }}>
          <button className="primary" onClick={() => void start()} disabled={!book}>
            <Play size={16} /> スタート
          </button>
        </div>
        {mode === "sparta" && (
          <p className="muted" style={{ fontSize: "0.82rem" }}>
            Spartaは日本語の答えを表示しません．制限時間内に思い出して入力します．
          </p>
        )}
        {mode === "endless" && (
          <p className="muted" style={{ fontSize: "0.82rem" }}>
            Endlessは時間制限で終わりません．自分でやめるまで，5問ごとに少しずつ速くなります．
          </p>
        )}
      </div>
    </section>
  );
}
