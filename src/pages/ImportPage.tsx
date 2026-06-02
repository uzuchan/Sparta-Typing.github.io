import { useMemo, useState } from "react";
import { db } from "../db/db";
import { parseWordCsv } from "../lib/csvImport";
import { getAnswerDisplay, getAnswerReading } from "../lib/answerParser";
import { createInitialStats } from "../lib/mastery";
import { nowIso, slugify } from "../lib/helpers";
import { useLibraryStore } from "../features/library/libraryStore";
import { navigate } from "../app/routes";
import { Upload } from "../ui/icons";
import type { Book, Unit, WordItem } from "../types";

const SAMPLE_CSV = `arise,起:お/こる
sit,座:すわ/る
seat,座:すわ/らせる
live,生:せい/活:かつ/を/送:おく/る
reside,住:す/む
last,続:つづ/く
rush,急:いそ/いで/行:い/く
roam,歩:ある/き/回:まわ/る
proceed,進:すす/む
drift,漂:ただよ/う
emerge,現:あらわ/れる
disappear,姿:すがた/を/消:け/す`;

export function ImportPage() {
  const refreshBooks = useLibraryStore((s) => s.refreshBooks);

  const [bookTitle, setBookTitle] = useState("Stock4500");
  const [part, setPart] = useState("Part1");
  const [section, setSection] = useState("section3");
  const [sectionTitle, setSectionTitle] = useState("さまざまな品詞");
  const [startNo, setStartNo] = useState(1);
  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    try {
      return parseWordCsv(csv);
    } catch {
      return [];
    }
  }, [csv]);

  async function importCsv() {
    setError(null);
    try {
      const rows = parseWordCsv(csv);
      if (rows.length === 0) throw new Error("登録できる行がありません．");

      const createdAt = nowIso();
      const bookId = `${slugify(bookTitle)}-${Date.now()}`;

      const book: Book = {
        id: bookId,
        title: bookTitle.trim(),
        description: "",
        defaultDirection: "en_to_ja",
        createdAt,
        updatedAt: createdAt,
      };

      const rootUnit: Unit = {
        id: `${bookId}-root`,
        bookId,
        type: "book",
        name: bookTitle.trim(),
        title: bookTitle.trim(),
        orderIndex: 0,
      };
      const units: Unit[] = [rootUnit];
      let parentUnitId = rootUnit.id;

      if (part.trim()) {
        const partUnit: Unit = {
          id: `${bookId}-${slugify(part)}`,
          bookId,
          parentUnitId,
          type: "part",
          name: part.trim(),
          orderIndex: 1,
        };
        units.push(partUnit);
        parentUnitId = partUnit.id;
      }
      if (section.trim()) {
        const sectionUnit: Unit = {
          id: `${bookId}-${slugify(part)}-${slugify(section)}`,
          bookId,
          parentUnitId,
          type: "section",
          name: section.trim(),
          title: sectionTitle.trim(),
          orderIndex: 1,
        };
        units.push(sectionUnit);
        parentUnitId = sectionUnit.id;
      }

      const words: WordItem[] = rows.map((row, index) => {
        const headwordNo = startNo + index;
        const id = `${parentUnitId}-${String(headwordNo).padStart(4, "0")}`;
        return {
          id,
          bookId,
          unitId: parentUnitId,
          headwordNo,
          question: row.question,
          answerRaw: row.answerRaw,
          createdAt,
          updatedAt: createdAt,
        };
      });

      const stats = words.map((w) => createInitialStats(w.id));

      await db.transaction(
        "rw",
        [db.books, db.units, db.wordItems, db.wordStats, db.bookProgress],
        async () => {
          await db.books.add(book);
          await db.units.bulkAdd(units);
          await db.wordItems.bulkAdd(words);
          await db.wordStats.bulkAdd(stats);
          await db.bookProgress.put({ bookId, blockIndex: 0, updatedAt: createdAt });
        }
      );

      await refreshBooks();
      navigate({ name: "book", bookId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました．");
    }
  }

  return (
    <section className="grid page-enter">
      <div className="card">
        <span className="eyebrow">Import</span>
        <h2 style={{ marginTop: 6 }}>CSV登録</h2>
        <div className="grid two" style={{ marginTop: 12 }}>
          <label>
            Book title
            <input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} />
          </label>
          <label>
            Part
            <input value={part} onChange={(e) => setPart(e.target.value)} />
          </label>
          <label>
            Section
            <input value={section} onChange={(e) => setSection(e.target.value)} />
          </label>
          <label>
            Section title
            <input value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} />
          </label>
          <label>
            Start No
            <input type="number" value={startNo} onChange={(e) => setStartNo(Number(e.target.value))} />
          </label>
        </div>

        <label style={{ marginTop: 12 }}>
          CSV（形式：英単語,日本語解答）
          <textarea value={csv} onChange={(e) => setCsv(e.target.value)} />
        </label>

        <p className="muted" style={{ fontSize: "0.82rem" }}>
          解答は <code>表示:読み/表示:読み</code> 形式．例 <code>起:お/こる</code> は表示「起こる」読み「おこる」．
        </p>

        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

        <div className="actions">
          <button className="primary" onClick={importCsv}>
            <Upload size={16} /> 登録
          </button>
          <button onClick={() => navigate({ name: "home" })}>戻る</button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">
          <h3>プレビュー</h3>
          <span className="chip accent">{preview.length} words</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>問題</th>
                <th>解答表示</th>
                <th>入力読み</th>
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 25).map((row, index) => (
                <tr key={`${row.question}-${index}`}>
                  <td className="mono">{startNo + index}</td>
                  <td>{row.question}</td>
                  <td>{getAnswerDisplay(row.answerRaw)}</td>
                  <td className="mono">{getAnswerReading(row.answerRaw)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
