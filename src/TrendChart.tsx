import { useState } from "react";
import { formatDate } from "./components.tsx";

export default function TrendChart({
  points,
  label,
  unit,
}: {
  points: { date: string; value: number }[];
  label: string;
  unit: string;
}) {
  const [cursor, setCursor] = useState<number | null>(null);
  if (!points.length)
    return <p className="muted">Nenhum treino concluído nesse período.</p>;
  const active = Math.min(cursor ?? points.length - 1, points.length - 1);
  const high = Math.max(...points.map((p) => p.value), 1);
  const bottom = 0;
  const step = 10 ** Math.floor(Math.log10(high));
  const top = Math.ceil(high / step) * step;
  const first = Date.parse(points[0].date + "T12:00:00Z");
  const last = Date.parse(points.at(-1)!.date + "T12:00:00Z");
  const x = (date: string) =>
    last === first
      ? 295
      : 58 + ((Date.parse(date + "T12:00:00Z") - first) / (last - first)) * 474;
  const y = (v: number) => 166 - ((v - bottom) / (top - bottom)) * 138;
  const number = (n: number) =>
    n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return (
    <>
      <svg
        className="chart insights-chart"
        viewBox="0 0 560 210"
        role="img"
        aria-label={`${label}. ${points.map((p) => `${formatDate(p.date)}: ${number(p.value)} ${unit}`).join("; ")}`}
      >
        {[bottom, (top + bottom) / 2, top].map((v, i) => (
          <g key={i}>
            <line x1="58" x2="532" y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text
              x="49"
              y={y(v) + 4}
              textAnchor="end"
              fill="var(--muted)"
              fontSize="18"
            >
              {v >= 10000
                ? v.toLocaleString("pt-BR", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  })
                : number(v)}
            </text>
          </g>
        ))}
        <polyline
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          points={points.map((p) => `${x(p.date)},${y(p.value)}`).join(" ")}
        />
        {points.map((p, i) => (
          <circle
            key={p.date}
            cx={x(p.date)}
            cy={y(p.value)}
            r={i === active ? 6 : 3}
            fill="var(--ink)"
          />
        ))}
        <text x="58" y="198" fill="var(--muted)" fontSize="18">
          {formatDate(points[0].date)}
        </text>
        {points.length > 1 && (
          <text
            x="532"
            y="198"
            textAnchor="end"
            fill="var(--muted)"
            fontSize="18"
          >
            {formatDate(points.at(-1)!.date)}
          </text>
        )}
      </svg>
      <div className="chart-explore">
        <button
          className="secondary"
          aria-label="Registro anterior do gráfico"
          disabled={active === 0}
          onClick={() => setCursor(active - 1)}
        >
          Anterior
        </button>
        <output aria-live="polite">
          <span>{formatDate(points[active].date)}</span>
          <strong>
            {number(points[active].value)} {unit}
          </strong>
        </output>
        <button
          className="secondary"
          aria-label="Próximo registro do gráfico"
          disabled={active === points.length - 1}
          onClick={() => setCursor(active + 1)}
        >
          Próximo
        </button>
      </div>
    </>
  );
}
