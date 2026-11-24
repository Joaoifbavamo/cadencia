import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { unlockAlarm } from "../alarm.ts";
import { unitLabel, type Exercise, type Entity } from "../domain.ts";
import { adjustLoad } from "../experience.ts";
export default function WorkingSetForm({
  draftKey,
  exercise,
  index,
  initial,
  suggested,
  history,
  increment = 2.5,
  onSave,
}: {
  draftKey: string;
  exercise: Exercise;
  index: number;
  initial?: Entity;
  suggested: string;
  history: boolean;
  increment?: number;
  onSave: (
    load: string,
    reps: string,
    rir: string,
    baseline: string | null,
  ) => Promise<void>;
}) {
  const baseline = useRef(initial ? JSON.stringify(initial.payload) : null);
  const [draft, setDraft] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem(draftKey) || "null");
      if (
        value &&
        ["load", "reps", "rir"].every((k) => typeof value[k] === "string") &&
        (value.baseline === null || typeof value.baseline === "string")
      ) {
        baseline.current = value.baseline;
        return value;
      }
      return null;
    } catch {
      return null;
    }
  });
  const repsInput = useRef<HTMLInputElement>(null);
  const [load, setLoad] = useState<string>(
      draft?.load ?? (initial ? String(initial.payload.load) : suggested),
    ),
    [reps, setReps] = useState(
      draft?.reps ?? (initial ? String(initial.payload.reps) : ""),
    ),
    [rir, setRir] = useState(
      draft?.rir ??
        (initial?.payload.rir == null ? "" : String(initial.payload.rir)),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ load, reps, rir, baseline: baseline.current }),
      );
    } catch {
      /* Keep the editable values in memory if storage is full. */
    }
  }, [draftKey, load, reps, rir, draft]);
  const remoteChanged =
    baseline.current !== (initial ? JSON.stringify(initial.payload) : null);
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
          await onSave(load, reps, rir, baseline.current);
          try {
            localStorage.removeItem(draftKey);
          } catch {
            /* The saved record remains authoritative. */
          }
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {remoteChanged && (
        <p role="status">
          Esta série mudou em outro lugar. Seu rascunho foi preservado; confira
          os valores atuais antes de salvar.
        </p>
      )}
      {(draft || remoteChanged) && (
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => {
            baseline.current = initial ? JSON.stringify(initial.payload) : null;
            setDraft(null);
            setLoad(initial ? String(initial.payload.load) : suggested);
            setReps(initial ? String(initial.payload.reps) : "");
            setRir(
              initial?.payload.rir == null ? "" : String(initial.payload.rir),
            );
            setError("");
          }}
        >
          Descartar rascunho e carregar valores atuais
        </button>
      )}
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
            disabled={busy}
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
            disabled={busy}
            onChange={(e) => setReps(e.target.value)}
            placeholder="—"
          />
        </label>
      </div>
      <div
        className="quick-load"
        role="group"
        aria-label="Ajuste rápido de carga"
      >
        <button
          type="button"
          className="secondary"
          disabled={busy}
          aria-label={`Diminuir carga em ${increment} kg`}
          onClick={() => setLoad((value) => adjustLoad(value, increment, -1))}
        >
          − {increment.toLocaleString("pt-BR")} kg
        </button>
        <span>Ajustar carga</span>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          aria-label={`Aumentar carga em ${increment} kg`}
          onClick={() => setLoad((value) => adjustLoad(value, increment, 1))}
        >
          + {increment.toLocaleString("pt-BR")} kg
        </button>
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
            disabled={busy}
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
