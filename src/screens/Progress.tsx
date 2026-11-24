import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { Model } from "../model.ts";
import { todayKey, unitLabel } from "../domain.ts";
import { buildHistoryIndex } from "../history-index.ts";
import {
  exercisePoints,
  seriesCsv,
  shiftDate,
  trainingSummary,
  sortHistoryRows,
  type Metric,
} from "../training-insights.ts";
import TrendChart from "../TrendChart.tsx";
import { normalizeSearch } from "../experience.ts";
import "../progress-history.css";
import { Empty, formatDate } from "../components.tsx";
export default function Progress({ model }: { model: Model }) {
  const [choice, setChoice] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [period, setPeriod] = useState("90");
  const [metric, setMetric] = useState<Metric>("load");
  const [search, setSearch] = useState("");
  const history = useMemo(() => buildHistoryIndex(model.docs), [model.docs]);
  const rows = history.rows;
  const options = [...new Map(rows.map((r) => [r.key, r])).values()];
  const selected = options.find((o) => o.key === choice) || options[0];
  const filteredOptions = options.filter((o) =>
    normalizeSearch(`${o.exercise.name} ${o.machine}`).includes(
      normalizeSearch(search),
    ),
  );
  const today = todayKey(new Date(), model.profile?.timezone);
  const cutoff =
    period === "0" ? "0000-01-01" : shiftDate(today, -(Number(period) - 1));
  const summary = useMemo(
    () => trainingSummary(model.docs, cutoff, today, history),
    [model.docs, cutoff, today, history],
  );
  const data = sortHistoryRows(
    rows.filter(
      (r) => r.key === selected?.key && r.date >= cutoff && r.date <= today,
    ),
    history.sessions,
  );
  const completed = data.filter((r) => summary.completedIds.has(r.sessionId));
  const points = exercisePoints(completed, metric);
  const pageIndex = Math.min(
    page,
    Math.max(0, Math.ceil(data.length / pageSize) - 1),
  );
  const recent = sortHistoryRows(data, history.sessions, true);
  const pageRows = recent.slice(
    pageIndex * pageSize,
    (pageIndex + 1) * pageSize,
  );
  const comparison = selected
    ? (history.byComparison
        .get(selected.key)
        ?.filter((g) => g.session.finishedAt && g.session.actualDate <= today)
        .slice(0, 2) ?? [])
    : [];
  const metricLabel = {
    load: "Carga registrada",
    reps: "Repetições registradas",
    volume: "Volume registrado",
  }[metric];
  const best = [...completed].sort(
    (a, b) => b.load - a.load || b.reps - a.reps,
  )[0];
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Evolução</h1>
          <p className="page-description">
            Consistência que você pode acompanhar.
          </p>
        </div>
      </div>
      <label className="insights-period">
        Período
        <select
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value);
            setPage(0);
          }}
        >
          <option value="30">30 dias</option>
          <option value="90">90 dias</option>
          <option value="365">1 ano</option>
          <option value="0">Todo histórico</option>
        </select>
      </label>
      <dl className="insights-summary" aria-label="Resumo do período">
        <div>
          <dt>Treinos concluídos</dt>
          <dd>{summary.workouts}</dd>
        </div>
        <div>
          <dt>Dias de treino</dt>
          <dd>{summary.days}</dd>
        </div>
        <div>
          <dt>Séries válidas registradas</dt>
          <dd>{summary.sets}</dd>
        </div>
        <div>
          <dt>Atividades extras</dt>
          <dd>
            {summary.minutes}
            <small> min</small>
          </dd>
        </div>
      </dl>
      <section className="attendance-panel" aria-label="Frequência semanal">
        <h2>Seu ritmo de treino</h2>
        <p className="fine">
          Treinos concluídos por semana · últimas 8 semanas dentro do período.
        </p>
        <div className="attendance-bars">
          {summary.weeks.map((w) => (
            <div key={w.date}>
              <span>{w.value}</span>
              <div className="attendance-track">
                <i
                  style={{
                    height: `${(w.value / Math.max(1, ...summary.weeks.map((x) => x.value))) * 100}%`,
                  }}
                />
              </div>
              <time dateTime={w.date}>
                {w.date.slice(8, 10)}/{w.date.slice(5, 7)}
              </time>
            </div>
          ))}
        </div>
      </section>
      {!options.length ? (
        <Empty title="Toda evolução começa num registro.">
          Suas cargas aparecerão aqui depois das primeiras séries. Nenhum
          resultado é preenchido de antemão.
        </Empty>
      ) : (
        <>
          <div className="progress-filters">
            <label>
              Buscar exercício
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ex.: supino, tríceps…"
              />
            </label>
            <label>
              Exercício e faixa
              <select
                value={selected?.key}
                onChange={(e) => {
                  setChoice(e.target.value);
                  setPage(0);
                }}
              >
                {(!filteredOptions.some((o) => o.key === selected?.key) &&
                selected
                  ? [selected, ...filteredOptions]
                  : filteredOptions
                ).map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.exercise.name} · {o.exercise.min}–{o.exercise.max} reps
                    {o.machine ? " · " + o.machine : ""}
                  </option>
                ))}
              </select>
            </label>
            {search && (
              <p className="fine" role="status">
                {filteredOptions.length} variações encontradas. A seleção atual
                é mantida até você escolher outra.
              </p>
            )}
          </div>
          <p className="exercise-record-summary">
            {new Set(completed.map((r) => r.sessionId)).size} treinos concluídos
            · {completed.length} séries ·{" "}
            {completed.reduce((sum, r) => sum + r.reps, 0)} repetições neste
            período
          </p>
          <section className="chart-panel">
            <h2>{metricLabel}</h2>
            <div
              className="metric-switch"
              role="group"
              aria-label="Métrica do gráfico"
            >
              {(
                [
                  ["load", "Carga"],
                  ["reps", "Repetições"],
                  ["volume", "Volume"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  className="secondary"
                  aria-pressed={metric === value}
                  onClick={() => setMetric(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="muted">
              {metric === "load"
                ? "Maior carga de cada dia"
                : metric === "reps"
                  ? "Soma das repetições do dia"
                  : "Soma de carga × repetições do dia"}{" "}
              · treinos concluídos · {unitLabel(selected.exercise.unit)}
            </p>
            <TrendChart
              key={`${selected.key}-${period}-${metric}`}
              points={points}
              label={metricLabel}
              unit={
                metric === "reps"
                  ? "reps"
                  : metric === "volume"
                    ? "kg·reps"
                    : "kg"
              }
            />
            {best && (
              <p className="insights-best">
                <b>Maior carga no período:</b> {best.load} kg × {best.reps} reps
                · RIR {best.rir ?? "não informado"} · {formatDate(best.date)}
              </p>
            )}
            <p className="fine">
              Carga maior com menos repetições ou RIR diferente não comprova
              melhora. Compare também execução, amplitude e aparelho.
            </p>
            {metric === "volume" && (
              <p className="fine">
                Volume usa a carga como você registrou, sem duplicar halteres.
                Mais séries também aumentam esse número; ele não mede
                hipertrofia. Não compare aparelhos ou exercícios diferentes.
              </p>
            )}
          </section>
          <details
            className="progress-comparison"
            aria-label="Comparação de sessões"
          >
            <summary>
              <h2>Últimas sessões comparáveis</h2>
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
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
          </details>
          <div className="insights-history-title">
            <h2>Histórico de séries</h2>
            <button
              className="secondary"
              disabled={!data.length}
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([seriesCsv(data)], {
                    type: "text/csv;charset=utf-8;",
                  }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = `cadencia-series-${today}.csv`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Exportar CSV
            </button>
          </div>
          <p className="fine">
            Inclui séries de sessões em andamento. Gráficos e resumo consideram
            somente treinos concluídos. Exportação segue os filtros acima.
          </p>
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
                {pageRows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {formatDate(r.date)}
                      <small className="series-draft">
                        {history.sessions.get(r.sessionId)?.workout.name} ·{" "}
                        {new Date(
                          history.sessions.get(r.sessionId)?.startedAt ??
                            r.date,
                        ).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone:
                            model.profile?.timezone ?? "America/Sao_Paulo",
                        })}
                      </small>
                      {!history.sessions.get(r.sessionId)?.finishedAt && (
                        <small className="series-draft">Em andamento</small>
                      )}
                    </td>
                    <td>{r.index + 1}</td>
                    <td>{r.load} kg</td>
                    <td>{r.reps}</td>
                    <td>{r.rir ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.length > 0 && (
            <nav
              className="history-pagination"
              aria-label="Páginas do histórico"
            >
              <p role="status">
                {pageIndex * pageSize + 1}–
                {Math.min((pageIndex + 1) * pageSize, data.length)} de{" "}
                {data.length} séries
              </p>
              <div>
                <button
                  className="secondary"
                  aria-label="Mais recentes"
                  disabled={pageIndex === 0}
                  onClick={() => setPage(pageIndex - 1)}
                >
                  Mais recentes
                </button>
                <button
                  className="secondary"
                  aria-label="Mais antigos"
                  disabled={(pageIndex + 1) * pageSize >= data.length}
                  onClick={() => setPage(pageIndex + 1)}
                >
                  Mais antigos
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </>
  );
}
