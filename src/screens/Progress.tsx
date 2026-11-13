import { useMemo, useState } from "react";
import type { Model } from "../model.ts";
import { unitLabel } from "../domain.ts";
import { buildHistoryIndex, dailyLoads } from "../history-index.ts";
import "../progress-history.css";
import { Empty, formatDate } from "../components.tsx";
export default function Progress({ model }: { model: Model }) {
  const [choice, setChoice] = useState("");
  const [period, setPeriod] = useState("90");
  const history = useMemo(() => buildHistoryIndex(model.docs), [model.docs]);
  const rows = history.rows;
  const options = [...new Map(rows.map((r) => [r.key, r])).values()];
  const selected = options.find((o) => o.key === choice) || options[0];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(period));
  const data = rows
    .filter(
      (r) =>
        r.key === selected?.key &&
        (period === "0" || r.date >= cutoff.toISOString().slice(0, 10)),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.index - b.index);
  const points = dailyLoads(data);
  const comparison = selected
    ? (history.byComparison.get(selected.key)?.slice(0, 2) ?? [])
    : [];
  const max = Math.max(...points.map((p) => p.load), 1),
    min = Math.min(...points.map((p) => p.load), max);
  const y = (v: number) => 170 - ((v - min) / (max - min || 1)) * 130;
  return (
    <>
      <div className="page-title">
        <h1>Evolução</h1>
      </div>
      {!options.length ? (
        <Empty title="Toda evolução começa num registro.">
          Suas cargas aparecerão aqui depois das primeiras séries. Nenhum
          resultado é preenchido de antemão.
        </Empty>
      ) : (
        <>
          <div className="progress-filters">
            <label>
              Exercício e faixa
              <select
                value={selected?.key}
                onChange={(e) => setChoice(e.target.value)}
              >
                {options.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.exercise.name} · {o.exercise.min}–{o.exercise.max} reps
                    {o.machine ? " · " + o.machine : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Período
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="30">30 dias</option>
                <option value="90">90 dias</option>
                <option value="365">1 ano</option>
                <option value="0">Todo histórico</option>
              </select>
            </label>
          </div>
          <section
            className="progress-comparison"
            aria-label="Comparação de sessões"
          >
            <h2>Últimas sessões comparáveis</h2>
            <p className="fine">
              Mesmo exercício, faixa, unidade e aparelho · histórico completo,
              independente do período do gráfico.
            </p>
            <div className="progress-comparison-sessions">
              {comparison.map((group, index) => (
                <div key={group.sessionId}>
                  <h3>
                    {index === 0 ? "Mais recente" : "Anterior"} ·{" "}
                    {formatDate(group.session.actualDate)}
                  </h3>
                  {!group.session.finishedAt && (
                    <p className="fine">Treino em andamento</p>
                  )}
                  <p>
                    {group.sets.length}{" "}
                    {group.sets.length === 1
                      ? "série registrada"
                      : "séries registradas"}{" "}
                    · {group.sets.reduce((sum, set) => sum + set.reps, 0)} reps
                    no total
                  </p>
                  <ol>
                    {group.sets.map((set) => (
                      <li key={set.id} value={set.index + 1}>
                        {set.load} kg × {set.reps} reps · RIR {set.rir ?? "—"}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
            {comparison.length < 2 && (
              <p className="muted">
                Uma segunda sessão comparável permitirá conferir as séries lado
                a lado.
              </p>
            )}
          </section>
          <section className="chart-panel">
            <h2>Carga registrada</h2>
            <p className="muted">
              Maior carga de cada dia · {unitLabel(selected.exercise.unit)}
            </p>
            {points.length ? (
              <svg
                className="chart"
                viewBox="0 0 560 210"
                role="img"
                aria-label={`Histórico de carga: ${points.map((p) => `${formatDate(p.date)}, ${p.load} kg`).join("; ")}`}
              >
                <line x1="30" y1="175" x2="535" y2="175" stroke="#dbe0eb" />
                <polyline
                  fill="none"
                  stroke="#203fd6"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  points={points
                    .map(
                      (p, i) =>
                        `${40 + (i * 480) / Math.max(1, points.length - 1)},${y(p.load)}`,
                    )
                    .join(" ")}
                />
                {points.map((p, i) => (
                  <g key={p.date}>
                    <circle
                      cx={40 + (i * 480) / Math.max(1, points.length - 1)}
                      cy={y(p.load)}
                      r="5"
                      fill="#203fd6"
                    />
                    <title>
                      {p.date}: {p.load} kg
                    </title>
                  </g>
                ))}
                <text x="30" y="202" fontSize="12" fill="#526078">
                  {formatDate(points[0].date)}
                </text>
                <text
                  x="535"
                  y="202"
                  textAnchor="end"
                  fontSize="12"
                  fill="#526078"
                >
                  {formatDate(points.at(-1)!.date)}
                </text>
              </svg>
            ) : (
              <p>Nenhum registro nesse período.</p>
            )}
            <p className="fine">
              Carga maior com menos repetições ou RIR diferente não comprova
              melhora. Compare também execução, amplitude e aparelho.
            </p>
          </section>
          <h2>Histórico de séries</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Série</th>
                  <th>Carga</th>
                  <th>Reps</th>
                  <th>RIR</th>
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.date)}</td>
                    <td>{r.index + 1}</td>
                    <td>{r.load} kg</td>
                    <td>{r.reps}</td>
                    <td>{r.rir ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
