import { useEffect } from "react";
import { useRoute, navigate } from "./routes";
import { useUiStore } from "./uiStore";
import { useLibraryStore } from "../features/library/libraryStore";
import { HomePage } from "../pages/HomePage";
import { ImportPage } from "../pages/ImportPage";
import { BookPage } from "../pages/BookPage";
import { PlayPage } from "../pages/PlayPage";
import { StatsPage } from "../pages/StatsPage";
import { BarChart3, Flame, Upload, Volume2, VolumeX, Zap } from "../ui/icons";

export function App() {
  const route = useRoute();
  const loadPrefs = useUiStore((s) => s.loadPrefs);
  const soundEnabled = useUiStore((s) => s.soundEnabled);
  const toggleSound = useUiStore((s) => s.toggleSound);
  const streak = useLibraryStore((s) => s.streak);
  const refreshBooks = useLibraryStore((s) => s.refreshBooks);

  useEffect(() => {
    void loadPrefs();
    void refreshBooks();
  }, [loadPrefs, refreshBooks]);

  // full-screen game has its own layout
  const isPlay = route.name === "play";

  if (isPlay) {
    return <PlayPage bookId={route.bookId} />;
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div className="brand" onClick={() => navigate({ name: "home" })}>
          <div className="brand-mark">
            <Zap size={24} />
          </div>
          <div>
            <h1>Sparta Typing</h1>
            <p>type · master · advance</p>
          </div>
        </div>

        <div className="header-tools">
          <nav className="nav-actions" aria-label="メインナビゲーション">
            {streak > 0 && (
              <span className="streak-badge">
                <Flame size={15} />
                {streak}
              </span>
            )}
            <button onClick={() => navigate({ name: "stats" })}>
              <BarChart3 size={16} /> Stats
            </button>
            <button onClick={() => navigate({ name: "import" })}>
              <Upload size={16} /> 登録
            </button>
          </nav>
          <button className="icon-btn ghost sound-toggle" onClick={toggleSound} aria-label="サウンド切替">
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </header>

      <main>
        {route.name === "home" && <HomePage />}
        {route.name === "import" && <ImportPage />}
        {route.name === "book" && <BookPage bookId={route.bookId} />}
        {route.name === "stats" && <StatsPage />}
      </main>
    </div>
  );
}
