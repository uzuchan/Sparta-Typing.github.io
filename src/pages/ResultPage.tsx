import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { MASTERY_META } from "../lib/mastery";
import { ArrowRight, Home, RotateCcw, Sparkles, Target } from "../ui/icons";
import type { SessionSummary } from "../types";

function headline(s: SessionSummary): { title: string; sub: string } {
  if (s.totalQuestions === 0) return { title: "セッション終了", sub: "" };
  const acc = Math.round(s.accuracy * 100);
  if (s.mode === "sparta") {
    return {
      title: `Sparta ${s.spartaScore} pts`,
      sub: `最大コンボ ${s.maxCombo} · ノーヒント正解 ${s.noHintCorrectCount}`,
    };
  }
  if (s.masteryUpWords.length > 0) {
    return {
      title: `${s.masteryUpWords.length} 語がレベルアップ`,
      sub: `正答率 ${acc}% · ${s.correctCount}/${s.totalQuestions} 正解`,
    };
  }
  return {
    title: `${s.correctCount} 問正解`,
    sub: `正答率 ${acc}% · 最大コンボ ${s.maxCombo}`,
  };
}

export function ResultPage(props: {
  summary: SessionSummary;
  onAgain: () => void;
  onReviewWrong: () => void;
  onAdvanceBlock: () => void;
  onHome: () => void;
}) {
  const { summary } = props;
  const head = headline(summary);

  const chartData = summary.masteryUpWords.map((w) => ({
    name: w.question.length > 8 ? w.question.slice(0, 8) + "…" : w.question,
    to: w.to,
  }));

  return (
    <section className="grid page-enter">
      <div className="card">
        <span className="eyebrow">Result · {summary.mode}</span>
        <h2 className="headline" style={{ marginTop: 10 }}>
          {head.title}
        </h2>
        {head.sub && <p className="muted">{head.sub}</p>}
      </div>

      {summary.blockUnlocked && (
        <div className="card">
          <div className="unlock-banner">
            <Sparkles size={22} color="var(--accent)" />
            <div style={{ flex: 1 }}>
              <strong>次の10語が解放されました</strong>
              <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.85rem" }}>
                現在ブロックの習熟が基準に達しました．
              </p>
            </div>
            <button className="primary" onClick={props.onAdvanceBlock}>
              進む <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="stat-row">
          {summary.mode === "sparta" ? (
            <div className="stat">
              <span>Sparta</span>
              <b>{summary.spartaScore}</b>
            </div>
          ) : (
            <div className="stat">
              <span>Normal</span>
              <b>{summary.normalScore}</b>
            </div>
          )}
          <div className="stat">
            <span>出題</span>
            <b>{summary.totalQuestions}</b>
          </div>
          <div className="stat">
            <span>正答率</span>
            <b>{Math.round(summary.accuracy * 100)}%</b>
          </div>
          <div className="stat">
            <span>最大コンボ</span>
            <b>{summary.maxCombo}</b>
          </div>
          <div className="stat">
            <span>平均速度</span>
            <b>{(summary.averageLatencyMs / 1000).toFixed(2)}s</b>
          </div>
          <div className="stat">
            <span>苦手語</span>
            <b>{summary.weakWordCount}</b>
          </div>
        </div>
      </div>

      {summary.masteryUpWords.length > 0 && (
        <div className="card">
          <div className="section-title">
            <h3>レベルアップした語</h3>
          </div>
          <div className="mastered-list">
            {summary.masteryUpWords.map((w) => (
              <div className="mastered-row" key={w.wordId}>
                <strong>{w.question}</strong>
                <span className="arrow">
                  <span style={{ color: MASTERY_META[w.from].color }}>{MASTERY_META[w.from].symbol}</span>
                  {" → "}
                  <span style={{ color: MASTERY_META[w.to].color }}>{MASTERY_META[w.to].symbol}</span>
                  {" Lv"}
                  {w.to}
                </span>
              </div>
            ))}
          </div>
          {chartData.length >= 2 && (
            <div style={{ height: 160, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -28 }}>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} interval={0} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="to" radius={[6, 6, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={MASTERY_META[d.to as 0 | 1 | 2 | 3 | 4 | 5].color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="result-actions">
          <button className="primary" onClick={props.onAgain}>
            <RotateCcw size={16} /> もう一度
          </button>
          {summary.wrongWordIds.length > 0 && (
            <button onClick={props.onReviewWrong}>
              <Target size={16} /> 苦手語だけ復習（{summary.wrongWordIds.length}）
            </button>
          )}
          <button className="ghost" onClick={props.onHome}>
            <Home size={16} /> Home
          </button>
        </div>
      </div>
    </section>
  );
}
