import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { unlockAlarm } from "../alarm.ts";
import { unitLabel, type Exercise, type Entity } from "../domain.ts";
export default function WorkingSetForm({
  exercise,
  index,
  initial,
  suggested,
  history,
  onSave,
}: {
  exercise: Exercise;
  index: number;
  initial?: Entity;
  suggested: string;
  history: boolean;
  onSave: (
    load: string,
    reps: string,
    rir: string,
    baseline: string | null,
  ) => Promise<void>;
}) {
  const baseline = useRef(initial ? JSON.stringify(initial.payload) : null);
  const repsInput = useRef<HTMLInputElement>(null);
  const [load, setLoad] = useState(
      initial ? String(initial.payload.load) : suggested,
    ),
    [reps, setReps] = useState(initial ? String(initial.payload.reps) : ""),
    [rir, setRir] = useState(
      initial?.payload.rir == null ? "" : String(initial.payload.rir),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="guided-set-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        void unlockAlarm();
        setBusy(true);
        setError("");
        try {
          await onSave(load || suggested, reps, rir, baseline.current);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="guided-number-fields">
        <label>
          Carga<span>{unitLabel(exercise.unit)}</span>
          <input
            aria-label={"Carga série " + (index + 1)}
            inputMode="decimal"
            enterKeyHint="next"
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                repsInput.current?.focus();
              }
            }}
            value={load}
            onChange={(e) => setLoad(e.target.value)}
            placeholder="—"
          />
        </label>
        <label>
          Repetições
          <span>
            Meta: {exercise.min}–{exercise.max}
          </span>
          <input
            aria-label={"Repetições série " + (index + 1)}
            inputMode="numeric"
            ref={repsInput}
            enterKeyHint="done"
            onFocus={(e) => e.currentTarget.select()}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="—"
          />
        </label>
      </div>
      <details
        className="guided-rir"
        open={initial?.payload.rir != null || undefined}
      >
        <summary>
          Registrar RIR <span>opcional</span>
        </summary>
        <label>
          Repetições que ainda conseguiria fazer
          <input
            aria-label={"RIR série " + (index + 1) + " opcional"}
            inputMode="decimal"
            value={rir}
            onChange={(e) => setRir(e.target.value)}
            placeholder="Deixe vazio se preferir"
          />
        </label>
      </details>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary guided-full" disabled={busy}>
        <Check size={18} />
        {busy
          ? "Salvando…"
          : history
            ? "Salvar alteração da série " + (index + 1)
            : "Salvar série " + (index + 1) + " e descansar"}
      </button>
    </form>
  );
}
