import { useEffect } from "react";
import { useLibraryStore } from "../features/library/libraryStore";
import { navigate } from "../app/routes";
import { BookOpen, Play, Upload } from "../ui/icons";

export function HomePage() {
  const books = useLibraryStore((s) => s.books);
  const wordCounts = useLibraryStore((s) => s.wordCounts);
  const refreshBooks = useLibraryStore((s) => s.refreshBooks);

  useEffect(() => {
    void refreshBooks();
  }, [refreshBooks]);

  return (
    <section className="grid page-enter">
      <div className="card">
        <span className="eyebrow">Library</span>
        <h2 style={{ marginTop: 6 }}>単語帳</h2>
        <p className="muted">
          CSVから単語帳を登録し，10語ブロック単位で習熟度を育てます．Practice・Sparta・Endlessの3モードで挑戦できます．
        </p>
        <div className="actions">
          <button className="primary" onClick={() => navigate({ name: "import" })}>
            <Upload size={16} /> 単語帳を登録
          </button>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="card empty">
          <BookOpen size={32} />
          <h3>まだ単語帳がありません</h3>
          <p>CSVからオリジナルの単語帳を登録して始めましょう．</p>
          <button className="primary" onClick={() => navigate({ name: "import" })}>
            <Upload size={16} /> はじめる
          </button>
        </div>
      ) : (
        <div className="grid two">
          {books.map((book) => (
            <article className="card book-card" key={book.id}>
              <div>
                <h3>{book.title}</h3>
                <div className="meta">
                  <span className="chip">{wordCounts[book.id] ?? 0} words</span>
                  <span className="chip accent">
                    {book.defaultDirection === "en_to_ja" ? "英→日" : "日→英"}
                  </span>
                </div>
              </div>
              <div className="actions">
                <button className="primary" onClick={() => navigate({ name: "play", bookId: book.id })}>
                  <Play size={16} /> 開始
                </button>
                <button onClick={() => navigate({ name: "book", bookId: book.id })}>
                  詳細
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
