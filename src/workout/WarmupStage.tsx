import { useState } from "react";
import type { Model } from "../model.ts";
import { warmup, unitLabel, visible, uid, type Exercise } from "../domain.ts";
export default function WarmupStage({
  model,
  exercise,
  target,
  onTarget,
  stageIndex,
  busy,
  onComplete,
  onManual,
}: {
  model: Model;
  exercise: Exercise;
  target: string;
  onTarget: (v: string) => void;
  stageIndex: number;
  busy: boolean;
  onComplete: (s: { last: boolean; rest: number }) => void;
  onManual: () => void;
}) {
  const [bar, setBar] = useState(
      model.profile.barWeight === null ? "" : String(model.profile.barWeight),
    ),
    [error, setError] = useState("");
  const stages = warmup(
    Number(target.replace(",", ".")),
    model.profile.barWeight,
    model.profile.increment,
    exercise.unit,
    exercise.warm,
  );
  const i = Math.min(stageIndex, Math.max(0, stages.length - 1)),
    stage = stages[i];
  return (
    <div className="warmup-only">
      <p className="guided-note">
        Antes do primeiro exercício, faça cerca de 3 minutos leves. As
        aproximações abaixo não contam como séries válidas.
      </p>
      <details className="warmup-setup" open={!stage || undefined}>
        <summary>Definir cargas do aquecimento</summary>
        <label>
          Carga prevista nas séries válidas · {unitLabel(exercise.unit)}
          <input
            aria-label="Carga de trabalho para aquecimento"
            inputMode="decimal"
            value={target}
            onChange={(e) => onTarget(e.target.value)}
            placeholder="Usar última carga registrada"
          />
        </label>
        {exercise.unit === "bar" && model.profile.barWeight === null && (
          <>
            <label>
              Peso real da barra em kg
              <input
                inputMode="decimal"
                value={bar}
                onChange={(e) => setBar(e.target.value)}
                placeholder="Confirme na academia"
              />
            </label>
            <button
              className="secondary"
              disabled={busy}
              onClick={async () => {
                setError("");
                try {
                  const n = Number(bar.replace(",", "."));
                  if (!Number.isFinite(n) || n <= 0 || n > 100)
                    throw Error("Informe o peso real da barra.");
                  const p = visible(model.docs, "profile")[0];
                  await model.save(
                    p?.id ?? model.singletonIds?.profile ?? uid(),
                    "profile",
                    { ...model.profile, barWeight: n },
                    false,
                    p ? JSON.stringify(p.payload) : null,
                  );
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Confirmar peso da barra
            </button>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </details>
      {stage ? (
        <>
          <p className="guided-position">
            Aproximação {i + 1} de {stages.length}
          </p>
          <div className="warmup-prescription">
            <b>
              {stage.load}
              <span>kg {exercise.unit === "bar" ? "no total" : ""}</span>
            </b>
            <b>
              {stage.reps}
              <span>repetições</span>
            </b>
          </div>
          <p className="fine">
            Sugestão ajustável. Use a montagem disponível e mantenha o esforço
            confortável.
          </p>
          <button
            className="primary guided-full"
            disabled={busy}
            onClick={() =>
              onComplete({ last: i === stages.length - 1, rest: stage.rest })
            }
          >
            {busy ? "Salvando…" : "Concluir aproximação " + (i + 1)}
          </button>
        </>
      ) : (
        <>
          <p className="guided-note">
            Defina a carga e, quando necessário, o peso da barra para calcular
            as aproximações. Se você já aqueceu por conta própria, confirme
            abaixo.
          </p>
          <button
            className="primary guided-full"
            disabled={busy}
            onClick={onManual}
          >
            Já fiz meu aquecimento
          </button>
        </>
      )}
    </div>
  );
}
