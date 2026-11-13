import { useEffect, useState, useRef } from "react";
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
  setIdentity,
  latestSet,
  warmup,
  unitLabel,
  firstPendingExerciseIndex,
} from "../domain.ts";
import { Sheet } from "../components.tsx";
import { scheduleRest, foregroundRest } from "../notifications.ts";
import { timerRemaining } from "../notification-domain.ts";
export default function Workout({
  model,
  sessionId,
  onClose,
}: {
  model: Model;
  sessionId: string;
  onClose: () => void;
}) {
  const document = model.docs.find(
    (d) => d.id === sessionId && d.kind === "session" && !d.deleted,
  );
  if (!document || document.payload.archivedAt)
    return (
      <div className="empty">
        <h1>Este treino foi removido.</h1>
        <p>Volte para hoje para escolher outro treino.</p>
        <button className="secondary" onClick={onClose}>
          Voltar para hoje
        </button>
      </div>
    );
  return (
    <WorkoutSession
      key={sessionId}
      model={model}
      session={document.payload}
      sessionId={sessionId}
      onClose={onClose}
    />
  );
}
function WorkoutSession({
  model,
  session,
  sessionId,
  onClose,
}: {
  model: Model;
  session: Session;
  sessionId: string;
  onClose: () => void;
}) {
  const history = Boolean(session.finishedAt);
  const [index, setIndex] = useState(() =>
      firstPendingExerciseIndex(session, model.docs),
    ),
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
    if (history) return;
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [history]);
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
  const remaining = history ? 0 : timerRemaining(deadline, tick);
  const [restFinished, setRestFinished] = useState(false);
  const notified = useRef(0);
  useEffect(() => {
    if (
      deadline > 0 &&
      tick >= deadline &&
      notified.current !== deadline &&
      !history &&
      tick - deadline < 300000
    ) {
      notified.current = deadline;
      setRestFinished(true);
      if (!model.demo) void foregroundRest(sessionId, deadline).catch(() => {});
    }
  }, [tick, deadline, history]);
  const elapsed = Math.max(
    0,
    Math.floor(
      ((session.finishedAt ? Date.parse(session.finishedAt) : tick) -
        Date.parse(session.startedAt)) /
        60000,
    ),
  );
  const timer = (s: number) => {
    if (history) return;
    const d = s > 0 ? Date.now() + s * 1000 : 0;
    localStorage.setItem(key, String(d));
    setDeadline(d);
    setTick(Date.now());
    setRestFinished(false);
    if (!model.demo)
      void scheduleRest(sessionId, d).catch(() =>
        setError(
          "O relógio funciona aqui; o aviso com o app fechado não foi agendado. Confira conexão e notificações.",
        ),
      );
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
      !history &&
      count < exercise.sets &&
      !session.skipped[exercise.id] &&
      !confirm(
        "Ainda há séries sem registro. Avançar para o próximo exercício?",
      )
    )
      return;
    if (index < session.workout.exercises.length - 1) setIndex(index + 1);
    else if (history) onClose();
    else {
      setError("");
      setFinish(true);
    }
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
      {history && (
        <p className="fine" role="status">
          Treino concluído · você pode corrigir as séries registradas. O horário
          de conclusão será preservado.
        </p>
      )}
      <motion.div
        key={exercise.id}
        initial={reduced ? false : { y: 6 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", bounce: 0, duration: reduced ? 0 : 0.25 }}
      >
        <h1 className="exercise-title">{exercise.name}</h1>
        <dl className="prescription">
          <div>
            <dt>Séries × reps</dt>
            <dd>
              {exercise.sets} × {exercise.min}–{exercise.max}
            </dd>
          </div>
          <div>
            <dt>Esforço</dt>
            <dd>RIR {exercise.rir}</dd>
          </div>
          <div>
            <dt>Pausa</dt>
            <dd>
              {exercise.rest >= 120
                ? exercise.rest / 60 + " min"
                : exercise.rest + " s"}
            </dd>
          </div>
        </dl>
        <ExerciseEntry
          key={exercise.id}
          exercise={exercise}
          session={session}
          model={model}
          history={history}
          attempt={attempt}
          onSave={() => timer(exercise.rest)}
        />
      </motion.div>
      {error && !skip && !finish && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {restFinished && !history && (
        <div className="rest-finished" role="status">
          <Check size={18} />
          <span>Descanso concluído. Próxima série quando estiver pronto.</span>
          <button
            className="icon"
            aria-label="Dispensar aviso de descanso"
            onClick={() => setRestFinished(false)}
          >
            <Check size={18} />
          </button>
        </div>
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
            ? history
              ? "Fechar histórico"
              : "Revisar treino"
            : "Próximo exercício"}
          <ChevronRight size={17} />
        </button>
      </div>
      <details className="instructions">
        <summary>Orientações e opções</summary>
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
        {!history && (
          <button
            className="text-button skip-action"
            onClick={() => {
              setError("");
              setSkip(true);
            }}
          >
            <SkipForward size={16} />
            Pular este exercício
          </button>
        )}
      </details>
      {session.skipped[exercise.id] && (
        <p className="fine">
          Pulado: {session.skipped[exercise.id]}{" "}
          {!history && (
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
          )}
        </p>
      )}
      {elapsed >= 40 && !session.finishedAt && (
        <p className="time-warning">
          Você está com {elapsed} min de sessão. Preserve as pausas dos básicos
          e retire acessórios se necessário para encerrar em 45 min.
        </p>
      )}
      {skip && !history && (
        <Sheet title="Pular exercício" onClose={() => setSkip(false)}>
          <label>
            Motivo
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
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
      {finish && !history && (
        <Sheet title="Revisar e finalizar" onClose={() => setFinish(false)}>
          <p>
            {sets.length} de {total} séries registradas ·{" "}
            {Object.keys(session.skipped).length} exercícios pulados.
          </p>
          <p>
            Séries em branco ficam como não realizadas. Registros pendentes
            serão enviados quando houver conexão.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary"
            onClick={() =>
              attempt(async () => {
                await model.save(session.id, "session", {
                  ...session,
                  finishedAt: new Date().toISOString(),
                });
                timer(0);
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
  history,
  attempt,
  onSave,
}: {
  exercise: Exercise;
  session: Session;
  model: Model;
  history: boolean;
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
        <details className="warmup compact-warmup">
          <summary>
            Aquecimento{" "}
            <span>
              {stages.length
                ? stages
                    .map((s, i) => (custom[i] ?? s.load) + " kg")
                    .join(" · ")
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
          <h2>
            Série {active + 1} de {e.sets}
          </h2>
        </div>
        {history && !recorded.some((d) => d.payload.index === active) ? (
          <p className="fine">
            Esta série não foi realizada. Em Ver séries, selecione um registro
            para corrigir.
          </p>
        ) : (
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
                await model.save(
                  old?.id ?? (await setIdentity(session.id, e.id, active)),
                  "set",
                  {
                    sessionId: session.id,
                    exerciseId: e.id,
                    index: active,
                    ...values,
                    machine: e.machine,
                  },
                );
                setWorking(String(values.load));
                if (!history) onSave();
                const next = Array.from({ length: e.sets }, (_, i) => i).find(
                  (i) =>
                    i !== active &&
                    !recorded.some((d) => d.payload.index === i),
                );
                if (next !== undefined) setActive(next);
              })
            }
          />
        )}
        {reference && (
          <p className="reference-note">
            Última referência: {reference.load} kg × {reference.reps} reps
            {reference.rir !== null ? " · RIR " + reference.rir : ""}
          </p>
        )}
        <details className="series-history">
          <summary>
            Ver séries{" "}
            <span>
              {recorded.length}/{e.sets} feitas
            </span>
          </summary>
          <div className="saved-series">
            {Array.from({ length: e.sets }, (_, i) => {
              const d = recorded.find((s) => s.payload.index === i);
              return (
                <button
                  key={i}
                  onClick={(ev) => {
                    setActive(i);
                    ev.currentTarget
                      .closest("details")
                      ?.removeAttribute("open");
                  }}
                  aria-label={
                    d ? "Editar série " + (i + 1) : "Série " + (i + 1)
                  }
                  aria-current={active === i ? "step" : undefined}
                >
                  {d && <Check size={15} />}
                  <span>{i + 1}ª</span>
                  <b>
                    {d
                      ? `${d.payload.load} kg × ${d.payload.reps}`
                      : "Sem registro"}
                  </b>
                  <small>
                    {d?.payload.rir != null ? "RIR " + d.payload.rir : ""}
                  </small>
                  <span className="edit-link">
                    {d ? "Editar" : "Selecionar"}
                  </span>
                </button>
              );
            })}
          </div>
        </details>
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
            placeholder={suggested || "—"}
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
            placeholder="—"
            onChange={(e) => setReps(e.target.value)}
          />
        </label>
      </div>
      <details
        className="rir-disclosure"
        open={initial?.payload.rir != null || undefined}
      >
        <summary>
          RIR <span>opcional</span>
        </summary>
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
      </details>
      <button
        className={(initial ? "secondary" : "primary") + " save-series"}
        disabled={busy}
      >
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
