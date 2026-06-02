import { useEffect, useState } from "react";
import { useLibraryStore } from "../features/library/libraryStore";
import { WordDetailModal } from "../features/stats/WordDetailModal";
import { getAnswerDisplay, getAnswerReading } from "../lib/answerParser";
import { createInitialStats, MASTERY_META } from "../lib/mastery";
import { navigate } from "../app/routes";
import { ArrowLeft, Play } from "../ui/icons";
import type { Book, WordItem, WordStats } from "../types";

export function BookPage(props: { bookId: string }) {
  const getWords = useLibraryStore((s) => s.getWords);
  const getStatsMap = useLibraryStore((s) => s.getStatsMap);
  const getProgress = useLibraryStore((s) => s.getProgress);
  const books = useLibraryStore((s) => s.books);
  const refreshBooks = useLibraryStore((s) => s.refreshBooks);

  const [book, setBook] = useState<Book | null>(null);
  const [words, setWords] = useState<WordItem[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, WordStats>>({});
  const [blockIndex, setBlockIndex] = useState(0);
  const [selected, setSelected] = useState<WordItem | null>(null);

  useEffect(() => {
    void (async () => {
      if (books.length === 0) await refreshBooks();
      const w = await getWords(props.bookId);
      const sm = await getStatsMap(w.map((x) => x.id));
      const prog = await getProgress(props.bookId);
      setWords(w);
      setStatsMap(sm);
      setBlockIndex(prog.blockIndex);
    })();
  }, [props.bookId, getWords, getStatsMap, getProgress, books.length, refreshBooks]);

  useEffect(() => {
    setBook(books.find((b) => b.id === props.bookId) ?? null);
  }, [books, props.bookId]);

  const totalBlocks = Math.max(1, Math.ceil(words.length / 10));
  const masteredCount = Object.values(statsMap).filter((s) => s.masteryLevel >= 4).length;
  const avgMastery =
    words.length === 0
      ? 0
      : words.reduce((sum, w) => sum + (statsMap[w.id]?.masteryRaw ?? 0), 0) / words.length;

  return (
    <section className="grid page-enter">
      <div className="card">
        <button className="ghost" style={{ marginBottom: 12 }} onClick={() => navigate({ name: "home" })}>
          <ArrowLeft size={16} /> Library
        </button>
        <span className="eyebrow">Book</span>
        <h2 style={{ marginTop: 6 }}>{book?.title ?? props.bookId}</h2>
        <div className="stat-row" style={{ marginTop: 12 }}>
          <div className="stat">
            <span>総単語</span>
            <b>{words.length}</b>
          </div>
          <div className="stat">
            <span>現在ブロック</span>
            <b>
              {blockIndex + 1}/{totalBlocks}
            </b>
          </div>
          <div className="stat">
            <span>習得済(Lv4+)</span>
            <b>{masteredCount}</b>
          </div>
          <div className="stat">
            <span>平均習熟</span>
            <b>{avgMastery.toFixed(2)}</b>
          </div>
        </div>
        <div className="actions" style={{ marginTop: 14 }}>
          <button className="primary" onClick={() => navigate({ name: "play", bookId: props.bookId })}>
            <Play size={16} /> モードを選んで開始
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">
          <h3>単語一覧</h3>
          <span className="muted" style={{ fontSize: "0.82rem" }}>
            行をタップで履歴・推移を表示
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>問題</th>
                <th>解答</th>
                <th>読み</th>
                <th>出題</th>
                <th>正答率</th>
                <th>習熟</th>
              </tr>
            </thead>
            <tbody>
              {words.map((word) => {
                const s = statsMap[word.id] ?? createInitialStats(word.id);
                const acc = s.seenCount === 0 ? 0 : Math.round((s.correctCount / s.seenCount) * 100);
                const meta = MASTERY_META[s.masteryLevel];
                const inBlock = Math.floor((word.headwordNo - words[0]?.headwordNo) / 10) === blockIndex;
                return (
                  <tr key={word.id} className="clickable" onClick={() => setSelected(word)}>
                    <td className="mono">
                      {word.headwordNo}
                      {inBlock && <span style={{ color: "var(--accent)" }}> ●</span>}
                    </td>
                    <td>{word.question}</td>
                    <td>{getAnswerDisplay(word.answerRaw)}</td>
                    <td className="mono">{getAnswerReading(word.answerRaw)}</td>
                    <td className="mono">{s.seenCount}</td>
                    <td className="mono">{acc}%</td>
                    <td style={{ color: meta.color }}>{meta.symbol}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <WordDetailModal
          word={selected}
          stats={statsMap[selected.id] ?? createInitialStats(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
