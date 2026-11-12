import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  SkipForward,
  ChevronLeft,
} from "lucide-react";
import type { Model } from "../model.ts";
import {
  type Session,
  type Exercise,
  type Entity,
  visible,
  validateSet,
  latestSet,
  warmup,
  unitLabel,
} from "../domain.ts";
import { Sheet } from "../components.tsx";
export default function Workout({
  model,
  sessionId,
  onClose,
}: {
  model: Model;
  sessionId: string;
  onClose: () => void;
}) {
  const session: Session = model.docs.find((d) => d.id === sessionId)!.payload;
  const [index, setIndex] = useState(0),
    [error, setError] = useState(""),
    [finish, setFinish] = useState(false),
    [skip, setSkip] = useState(false),
    [reason, setReason] = useState("Aparelho indisponível"),
    [tick, setTick] = useState(Date.now());
  const key = "rest-" + sessionId;
  const [deadline, setDeadline] = useState(
    Number(localStorage.getItem(key) || 0),
  );
  const reduced = useReducedMotion();
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [index]);
  const exercise = session.workout.exercises[index];
  const sets = visible(model.docs, "set").filter(
    (d) => d.payload.sessionId === sessionId,
  );
  const count = sets.filter(
    (d) => d.payload.exerciseId === exercise?.id,
  ).length;
  const total = session.workout.exercises.reduce((n, e) => n + e.sets, 0);
  const remaining = Math.max(0, Math.ceil((deadline - tick) / 1000));
  const elapsed = Math.max(
    0,
    Math.floor(
      ((session.finishedAt ? Date.parse(session.finishedAt) : tick) -
        Date.parse(session.startedAt)) /
        60000,
    ),
  );
  const timer = (s: number) => {
    const d = Date.now() + s * 1000;
    localStorage.setItem(key, String(d));
    setDeadline(d);
    setTick(Date.now());
  };
  const attempt = async (fn: () => Promise<void>) => {
    try {
      setError("");
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  };
  const next = () => {
    if (
      count < exercise.sets &&
      !session.skipped[exercise.id] &&
      !confirm(
        "Ainda há séries sem registro. Avançar para o próximo exercício?",
      )
    )
      return;
    if (index < session.workout.exercises.length - 1) setIndex(index + 1);
    else setFinish(true);
  };
  if (!exercise)
    return (
      <div className="empty">
        <h1>Este treino está sem exercícios.</h1>
        <button className="secondary" onClick={onClose}>
          Voltar e editar ficha
        </button>
      </div>
    );
  return (
    <div className="workout-screen workout-v2">
      <header className="workout-head">
        <button
          className="icon"
          aria-label="Voltar para hoje"
          onClick={onClose}
        >
          <ArrowLeft />
        </button>
        <div>
          <span>{session.workout.name}</span>
          <small>
            Exercício {index + 1} de {session.workout.exercises.length}
          </small>
        </div>
        <span className="elapsed">
          <Clock3 size={15} />
          {elapsed} min
        </span>
      </header>
      <div className="steps">
        {session.workout.exercises.map((e, i) => (
          <button
            key={e.id}
            className={index === i ? "active" : ""}
            aria-label={"Ir para " + e.name}
            onClick={() => setIndex(i)}
          >
            <span
              style={{
                width:
                  (sets.filter((s) => s.payload.exerciseId === e.id).length /
                    e.sets) *
                    100 +
                  "%",
              }}
            />
          </button>
        ))}
      </div>
      <motion.div
        key={exercise.id}
        initial={false}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", bounce: 0, duration: reduced ? 0 : 0.25 }}
      >
        <h1 className="exercise-title">{exercise.name}</h1>
        <div className="prescription">
          <span>
            <b>
              {exercise.sets} × {exercise.min}–{exercise.max}
            </b>{" "}
            reps
          </span>
          <span>
            RIR alvo <b>{exercise.rir}</b>
          </span>
          <span>
            Descanso{" "}
            <b>
              {exercise.rest >= 120
                ? exercise.rest / 60 + " min"
                : exercise.rest + " s"}
            </b>
          </span>
        </div>
        <ExerciseEntry
          key={exercise.id}
          exercise={exercise}
          session={session}
          model={model}
          attempt={attempt}
          onSave={() => timer(exercise.rest)}
        />
      </motion.div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {remaining > 0 && (
        <div className="rest-bar" role="timer">
          <Clock3 size={20} />
          <span>
            Descanso
            <b>
              {Math.floor(remaining / 60)}:
              {String(remaining % 60).padStart(2, "0")}
            </b>
          </span>
          <button className="text-button" onClick={() => timer(remaining + 30)}>
            +30 s
          </button>
          <button
            className="icon"
            aria-label="Encerrar descanso"
            onClick={() => timer(0)}
          >
            <Check size={19} />
          </button>
        </div>
      )}
      <div className="exercise-nav">
        <button
          className="secondary"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          <ChevronLeft size={17} />
          Anterior
        </button>
        <button
          className={count >= exercise.sets ? "primary" : "secondary"}
          onClick={next}
        >
          {index === session.workout.exercises.length - 1
            ? "Revisar treino"
            : "Próximo exercício"}
          <ChevronRight size={17} />
        </button>
      </div>
      <details className="instructions">
        <summary>Como executar e alternativas</summary>
        <p>
          {exercise.notes ||
            "Use amplitude confortável e execução controlada. Dor aguda é motivo para interromper."}
        </p>
        <p>
          <b>Se indisponível:</b>{" "}
          {exercise.alternative ||
            "Escolha uma variação familiar e registre a carga separadamente."}
        </p>
        <p>
          Avance nas repetições mantendo o RIR. Ao alcançar o topo em todas as
          séries, no RIR alvo, em duas exposições comparáveis, considere o menor
          aumento de carga disponível.
        </p>
      </details>
      <button className="text-button skip-action" onClick={() => setSkip(true)}>
        <SkipForward size={16} />
        Pular este exercício
      </button>
      {session.skipped[exercise.id] && (
        <p className="fine">
          Pulado: {session.skipped[exercise.id]}{" "}
          <button
            className="text-button"
            onClick={() =>
              attempt(async () => {
                const skipped = { ...session.skipped };
                delete skipped[exercise.id];
                await model.save(session.id, "session", {
                  ...session,
                  skipped,
                });
              })
            }
          >
            Desfazer
          </button>
        </p>
      )}
      {elapsed >= 40 && !session.finishedAt && (
        <p className="time-warning">
          Você está com {elapsed} min de sessão. Preserve as pausas dos básicos
          e retire acessórios se necessário para encerrar em 45 min.
        </p>
      )}
      {skip && (
        <Sheet title="Pular exercício" onClose={() => setSkip(false)}>
          <label>
            Motivo
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <button
            className="primary"
            onClick={() =>
              attempt(async () => {
                if (!reason.trim()) throw Error("Informe o motivo.");
                await model.save(session.id, "session", {
                  ...session,
                  skipped: { ...session.skipped, [exercise.id]: reason },
                });
                setSkip(false);
                if (index < session.workout.exercises.length - 1)
                  setIndex(index + 1);
              })
            }
          >
            Salvar e avançar
          </button>
        </Sheet>
      )}
      {finish && (
        <Sheet title="Revisar e finalizar" onClose={() => setFinish(false)}>
          <p>
            {sets.length} de {total} séries registradas ·{" "}
            {Object.keys(session.skipped).length} exercícios pulados.
          </p>
          <p>
            Séries em branco ficam como não realizadas. Registros pendentes
            serão enviados quando houver conexão.
          </p>
          <button
            className="primary"
            onClick={() =>
              attempt(async () => {
                await model.save(session.id, "session", {
                  ...session,
                  finishedAt: new Date().toISOString(),
                });
                onClose();
              })
            }
          >
            Finalizar treino <Check size={18} />
          </button>
        </Sheet>
      )}
    </div>
  );
}
function ExerciseEntry({
  exercise: e,
  session,
  model,
  attempt,
  onSave,
}: {
  exercise: Exercise;
  session: Session;
  model: Model;
  attempt: (a: () => Promise<void>) => Promise<void>;
  onSave: () => void;
}) {
  const reference = latestSet(model.docs, e, session.id);
  const recorded = visible(model.docs, "set").filter(
    (d) => d.payload.sessionId === session.id && d.payload.exerciseId === e.id,
  );
  const [active, setActive] = useState(
    () =>
      Array.from({ length: e.sets }, (_, i) => i).find(
        (i) => !recorded.some((d) => d.payload.index === i),
      ) ?? 0,
  );
  const [working, setWorking] = useState(
    String(recorded[0]?.payload.load ?? reference?.load ?? ""),
  );
  const [custom, setCustom] = useState<Record<number, string>>({});
  const stages = warmup(
    Number(working.replace(",", ".")),
    model.profile.barWeight,
    model.profile.increment,
    e.unit,
    e.warm,
  );
  return (
    <>
      {e.warm !== "none" && (
        <details className="warmup compact-warmup" open={stages.length > 0}>
          <summary>
            Aquecimento{" "}
            <span>
              {stages.length
                ? stages.length + " aproximações sugeridas"
                : "Definir cargas"}
            </span>
          </summary>
          <label className="working-load">
            Carga planejada · {unitLabel(e.unit)}
            <input
              aria-label="Carga para aquecimento"
              inputMode="decimal"
              value={working}
              placeholder="kg"
              onChange={(ev) => setWorking(ev.target.value)}
            />
          </label>
          {stages.length ? (
            <div className="warm-stages">
              {stages.map((s, i) => (
                <label key={i}>
                  <span>
                    {s.reps} reps · {s.rest}s
                  </span>
                  <input
                    aria-label={"Carga da aproximação " + (i + 1)}
                    inputMode="decimal"
                    value={custom[i] ?? s.load}
                    onChange={(ev) =>
                      setCustom({ ...custom, [i]: ev.target.value })
                    }
                  />
                  <span>kg</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="fine">
              {e.unit === "bar" && !model.profile.barWeight
                ? "Confirme o peso da barra em Ajustes; depois informe a carga planejada."
                : "Informe a carga de trabalho para calcular."}
            </p>
          )}
          <p className="fine">
            Ajuste se necessário. No início da sessão, faça também 3 min leves.
            Recupere antes da primeira série válida.
          </p>
        </details>
      )}
      <section className="series-entry">
        <div className="series-heading">
          <h2>Registrar série</h2>
          <span>
            {recorded.length} de {e.sets} feitas
          </span>
        </div>
        <div className="series-tabs" aria-label="Séries deste exercício">
          {Array.from({ length: e.sets }, (_, i) => (
            <button
              key={i}
              className={active === i ? "selected" : ""}
              aria-pressed={active === i}
              onClick={() => setActive(i)}
            >
              {recorded.some((d) => d.payload.index === i) && (
                <Check size={14} />
              )}
              Série {i + 1}
            </button>
          ))}
        </div>
        <SeriesForm
          key={active}
          index={active}
          exercise={e}
          initial={recorded.find((d) => d.payload.index === active)}
          suggested={working || String(reference?.load ?? "")}
          onSubmit={(load, reps, rir) =>
            attempt(async () => {
              const values = validateSet(load, reps, rir);
              if (
                e.unit === "bar" &&
                model.profile.barWeight !== null &&
                values.load < model.profile.barWeight
              )
                throw Error("A carga total deve incluir a barra.");
              const old = recorded.find((d) => d.payload.index === active);
              await model.save(old?.id ?? crypto.randomUUID(), "set", {
                sessionId: session.id,
                exerciseId: e.id,
                index: active,
                ...values,
                machine: e.machine,
              });
              setWorking(String(values.load));
              onSave();
              const next = Array.from({ length: e.sets }, (_, i) => i).find(
                (i) =>
                  i !== active && !recorded.some((d) => d.payload.index === i),
              );
              if (next !== undefined) setActive(next);
            })
          }
        />
        {reference && (
          <p className="reference-note">
            Última referência: {reference.load} kg × {reference.reps} reps
            {reference.rir !== null ? " · RIR " + reference.rir : ""}
          </p>
        )}
        {!reference && recorded.length === 0 && (
          <p className="reference-note">
            Sem registro anterior desta variação. Escolha uma carga que permita
            o RIR alvo.
          </p>
        )}
        {recorded.length > 0 && (
          <div className="saved-series">
            {recorded
              .sort((a, b) => a.payload.index - b.payload.index)
              .map((d) => (
                <button
                  key={d.id}
                  onClick={() => setActive(d.payload.index)}
                  aria-label={"Editar série " + (d.payload.index + 1)}
                >
                  <Check size={15} />
                  <span>{d.payload.index + 1}ª</span>
                  <b>
                    {d.payload.load} kg × {d.payload.reps}
                  </b>
                  <small>
                    {d.payload.rir === null ? "RIR —" : "RIR " + d.payload.rir}
                  </small>
                  <span className="edit-link">Editar</span>
                </button>
              ))}
          </div>
        )}
      </section>
    </>
  );
}
function SeriesForm({
  index,
  exercise,
  initial,
  suggested,
  onSubmit,
}: {
  index: number;
  exercise: Exercise;
  initial: Entity | undefined;
  suggested: string;
  onSubmit: (a: string, b: string, c: string) => Promise<void>;
}) {
  const [load, setLoad] = useState(
      initial ? String(initial.payload.load) : suggested,
    ),
    [reps, setReps] = useState(initial ? String(initial.payload.reps) : ""),
    [rir, setRir] = useState(
      initial?.payload.rir == null ? "" : String(initial.payload.rir),
    ),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="single-series-form"
      onSubmit={async (ev) => {
        ev.preventDefault();
        setBusy(true);
        try {
          await onSubmit(load || suggested, reps, rir);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="series-main-fields">
        <label>
          Carga <span className="field-unit">{unitLabel(exercise.unit)}</span>
          <input
            aria-label={"Carga série " + (index + 1)}
            inputMode="decimal"
            value={load}
            placeholder={suggested || "0"}
            onChange={(e) => setLoad(e.target.value)}
          />
        </label>
        <label>
          Repetições{" "}
          <span className="field-unit">
            meta: {exercise.min}–{exercise.max}
          </span>
          <input
            aria-label={"Repetições série " + (index + 1)}
            inputMode="numeric"
            value={reps}
            placeholder={exercise.min + "–" + exercise.max}
            onChange={(e) => setReps(e.target.value)}
          />
        </label>
      </div>
      <label className="optional-rir">
        <span>
          RIR <small>opcional · quantas ainda conseguiria fazer?</small>
        </span>
        <input
          aria-label={"RIR série " + (index + 1) + " opcional"}
          inputMode="decimal"
          value={rir}
          placeholder="—"
          onChange={(e) => setRir(e.target.value)}
        />
      </label>
      <button className="primary save-series" disabled={busy}>
        <Check size={19} />
        {busy
          ? "Salvando…"
          : initial
            ? "Salvar alteração da série " + (index + 1)
            : "Salvar série " + (index + 1)}
      </button>
    </form>
  );
}
