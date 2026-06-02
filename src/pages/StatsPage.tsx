import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "../db/db";
import { todayKey } from "../lib/helpers";
import { getAnswerDisplay } from "../lib/answerParser";
import { MASTERY_META, isWeakWord } from "../lib/mastery";
import { exportBackup, downloadBackup, importBackup, type BackupPayload } from "../features/stats/backup";
import { useLibraryStore } from "../features/library/libraryStore";
import { navigate } from "../app/routes";
import { ArrowLeft } from "../ui/icons";
import type { DailyStat, MasteryLevel, WordItem, WordStats } from "../types";

type WeakRow = { word: WordItem; stats: WordStats; acc: number };

export function StatsPage() {
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [dist, setDist] = useState<Record<MasteryLevel, number>>({
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  });
  const [weak, setWeak] = useState<WeakRow[]>([]);
  const [totals, setTotals] = useState({ words: 0, attempts: 0, mastered: 0 });
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const refreshBooks = useLibraryStore((s) => s.refreshBooks);

  async function handleExport() {
    setBackupMsg(null);
    try {
      const payload = await exportBackup();
      downloadBackup(payload);
      setBackupMsg("バックアップを書き出しました．");
    } catch {
      setBackupMsg("書き出しに失敗しました．");
    }
  }

  function handleImportFile(file: File, mode: "merge" | "replace") {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const payload = JSON.parse(String(reader.result)) as BackupPayload;
        await importBackup(payload, mode);
        await refreshBooks();
        setBackupMsg("復元しました．ページを再読み込みすると反映されます．");
      } catch (e) {
        setBackupMsg(e instanceof Error ? e.message : "復元に失敗しました．");
      }
    };
    reader.readAsText(file);
  }

  useEffect(() => {
    void (async () => {
      const dailyAll = await db.dailyStats.toArray();
      setDaily(dailyAll.sort((a, b) => a.date.localeCompare(b.date)));

      const stats = await db.wordStats.toArray();
      const d: Record<MasteryLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      stats.forEach((s) => {
        d[s.masteryLevel] += 1;
      });
      setDist(d);

      const words = await db.wordItems.toArray();
      const wordMap = new Map(words.map((w) => [w.id, w]));
      const attempts = await db.attempts.count();

      const weakRows: WeakRow[] = stats
        .filter((s) => s.seenCount > 0 && isWeakWord(s))
        .map((s) => {
          const word = wordMap.get(s.wordId);
          return word
            ? { word, stats: s, acc: s.correctCount / s.seenCount }
            : null;
        })
        .filter((x): x is WeakRow => x !== null)
        .sort((a, b) => a.acc - b.acc)
        .slice(0, 20);
      setWeak(weakRows);

      setTotals({
        words: words.length,
        attempts,
        mastered: stats.filter((s) => s.masteryLevel >= 4).length,
      });
    })();
  }, []);

  const last30 = buildLast30(daily);
  const chartData = last30.map((d) => ({
    date: d.date.slice(5),
    questions: d.totalQuestions,
    accuracy:
      d.totalQuestions === 0 ? 0 : Math.round((d.correctCount / d.totalQuestions) * 100),
  }));

  const maxQ = Math.max(1, ...last30.map((d) => d.totalQuestions));

  return (
    <section className="grid page-enter">
      <div className="card">
        <button className="ghost" style={{ marginBottom: 12 }} onClick={() => navigate({ name: "home" })}>
          <ArrowLeft size={16} /> Library
        </button>
        <span className="eyebrow">Stats</span>
        <h2 style={{ marginTop: 6 }}>学習の記録</h2>
        <div className="stat-row" style={{ marginTop: 12 }}>
          <div className="stat">
            <span>総単語</span>
            <b>{totals.words}</b>
          </div>
          <div className="stat">
            <span>累計回答</span>
            <b>{totals.attempts}</b>
          </div>
          <div className="stat">
            <span>習得済(Lv4+)</span>
            <b>{totals.mastered}</b>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">
          <h3>直近30日の出題数</h3>
        </div>
        {chartData.some((d) => d.questions > 0) ? (
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="qfill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} interval={4} />
                <YAxis stroke="var(--text-muted)" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="questions"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#qfill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="muted">まだ記録がありません．プレイすると日々の出題数が表示されます．</p>
        )}

        <div className="heatmap" style={{ marginTop: 18 }}>
          {last30.map((d) => {
            const intensity = d.totalQuestions / maxQ;
            return (
              <div
                key={d.date}
                className="heat-cell"
                title={`${d.date}: ${d.totalQuestions}問`}
                style={{
                  background:
                    d.totalQuestions === 0
                      ? "rgba(126,138,160,0.12)"
                      : `color-mix(in srgb, var(--accent) ${Math.round(20 + intensity * 80)}%, transparent)`,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="section-title">
          <h3>習熟度の分布</h3>
        </div>
        <div className="stat-row">
          {(Object.keys(dist) as unknown as MasteryLevel[]).map((lv) => {
            const meta = MASTERY_META[lv];
            return (
              <div className="stat" key={lv}>
                <span style={{ color: meta.color }}>
                  {meta.symbol} {meta.label}
                </span>
                <b>{dist[lv]}</b>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="section-title">
          <h3>苦手な単語 Top20</h3>
        </div>
        {weak.length === 0 ? (
          <p className="muted">苦手語はありません．素晴らしい．</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>問題</th>
                  <th>解答</th>
                  <th>出題</th>
                  <th>正答率</th>
                  <th>習熟</th>
                </tr>
              </thead>
              <tbody>
                {weak.map((row) => {
                  const meta = MASTERY_META[row.stats.masteryLevel];
                  return (
                    <tr key={row.word.id}>
                      <td>{row.word.question}</td>
                      <td>{getAnswerDisplay(row.word.answerRaw)}</td>
                      <td className="mono">{row.stats.seenCount}</td>
                      <td className="mono">{Math.round(row.acc * 100)}%</td>
                      <td style={{ color: meta.color }}>{meta.symbol}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-title">
          <h3>データのバックアップ</h3>
        </div>
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          学習データはこの端末のブラウザ内（IndexedDB）に保存されます．機種変更や別ブラウザへの移行に備えて，JSONで書き出し・復元できます．
        </p>
        <div className="actions" style={{ marginTop: 12 }}>
          <button className="primary" onClick={handleExport}>
            JSONで書き出し
          </button>
          <label
            className=""
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              border: "1px solid var(--line)",
              borderRadius: 999,
              padding: "0.65rem 1.15rem",
              minHeight: 44,
              fontWeight: 600,
            }}
          >
            追加で復元（merge）
            <input
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportFile(f, "merge");
                e.target.value = "";
              }}
            />
          </label>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              border: "1px solid rgba(248,113,113,0.3)",
              color: "#fecaca",
              background: "rgba(248,113,113,0.14)",
              borderRadius: 999,
              padding: "0.65rem 1.15rem",
              minHeight: 44,
              fontWeight: 600,
            }}
          >
            全置換で復元（replace）
            <input
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && confirm("既存データをすべて削除して置き換えます．よろしいですか？")) {
                  handleImportFile(f, "replace");
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {backupMsg && (
          <p style={{ marginTop: 10, color: "var(--accent)", fontSize: "0.85rem" }}>{backupMsg}</p>
        )}
      </div>
    </section>
  );
}

function buildLast30(daily: DailyStat[]): DailyStat[] {
  const map = new Map(daily.map((d) => [d.date, d]));
  const out: DailyStat[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 29);
  for (let i = 0; i < 30; i++) {
    const key = todayKey(cursor);
    out.push(
      map.get(key) ?? {
        date: key,
        sessionCount: 0,
        totalQuestions: 0,
        correctCount: 0,
        masteryUpCount: 0,
      }
    );
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}
