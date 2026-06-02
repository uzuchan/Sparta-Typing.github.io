import { useEffect, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "../../db/db";
import { Modal } from "../../ui/Modal";
import { getAnswerDisplay, getAnswerReading } from "../../lib/answerParser";
import { MASTERY_META } from "../../lib/mastery";
import type { Attempt, WordItem, WordStats } from "../../types";

export function WordDetailModal(props: {
  word: WordItem;
  stats: WordStats;
  onClose: () => void;
}) {
  const { word, stats } = props;
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    void db.attempts
      .where("wordId")
      .equals(word.id)
      .toArray()
      .then((list) =>
        setAttempts(list.sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
      );
  }, [word.id]);

  const accuracy = stats.seenCount === 0 ? 0 : Math.round((stats.correctCount / stats.seenCount) * 100);
  const meta = MASTERY_META[stats.masteryLevel];

  const chartData = attempts.map((a, i) => ({
    n: i + 1,
    latency: Math.round(a.elapsedMs / 100) / 10,
    correct: a.isCorrect ? 1 : 0,
  }));

  return (
    <Modal title={word.question} onClose={props.onClose}>
      <div className="grid" style={{ gap: 16 }}>
        <div className="stat-row">
          <div className="stat">
            <span>解答</span>
            <b style={{ fontSize: "1.1rem" }}>{getAnswerDisplay(word.answerRaw)}</b>
          </div>
          <div className="stat">
            <span>読み</span>
            <b style={{ fontSize: "1.1rem" }} className="mono">
              {getAnswerReading(word.answerRaw)}
            </b>
          </div>
        </div>

        <div className="stat-row">
          <div className="stat">
            <span>習熟度</span>
            <b style={{ color: meta.color }}>
              {meta.symbol} Lv{stats.masteryLevel}
            </b>
          </div>
          <div className="stat">
            <span>出題</span>
            <b>{stats.seenCount}</b>
          </div>
          <div className="stat">
            <span>正答率</span>
            <b>{accuracy}%</b>
          </div>
          <div className="stat">
            <span>平均速度</span>
            <b>{(stats.avgLatencyMs / 1000).toFixed(2)}s</b>
          </div>
        </div>

        {chartData.length >= 2 ? (
          <div>
            <span className="eyebrow">回答速度の推移（秒）</span>
            <div style={{ height: 180, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <XAxis dataKey="n" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      color: "var(--text-primary)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="latency"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <p className="muted">まだ履歴が足りません．数回プレイすると推移が表示されます．</p>
        )}
      </div>
    </Modal>
  );
}
