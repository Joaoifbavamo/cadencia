import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  List,
  SkipForward,
  Trash2,
  Undo2,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { Model } from "../model.ts";
import {
  visible,
  latestSet,
  validateSet,
  setIdentity,
  type Entity,
  type Session,
} from "../domain.ts";
import { Sheet, formatDate } from "../components.tsx";
import {
  loadFlow,
  flowAfterRest,
  prepared,
  type Flow,
  type Phase,
} from "../workout-flow.ts";
import { armAlarm, cancelAlarm, unlockAlarm, playAlarm } from "../alarm.ts";
import {
  scheduleRest,
  foregroundRest,
  cancelRestForSession,
} from "../notifications.ts";
import "../guided-workout.css";
import WarmupStage from "../workout/WarmupStage.tsx";
import WorkingSetForm from "../workout/WorkingSetForm.tsx";
import RestStage from "../workout/RestStage.tsx";
type GuidedSession = Session & { warmupDone?: string[] };
export default function Workout({
  model,
  sessionId,
  onClose,
  accountKey = "local",
}: {
  model: Model;
  sessionId: string;
  onClose: () => void;
  accountKey?: string;
}) {
  const doc = model.docs.find(
    (d) => d.kind === "session" && d.id === sessionId && !d.deleted,
  );
  if (!doc || doc.payload.archivedAt)
    return (
      <div className="empty">
        <h1>Este treino foi removido.</h1>
        <button className="secondary" onClick={onClose}>
          Voltar para hoje
        </button>
      </div>
    );
  return (
    <GuidedWorkout
      key={sessionId}
      model={model}
      session={doc.payload}
      onClose={onClose}
      accountKey={accountKey}
    />
  );
}
function GuidedWorkout({
  model,
  session,
  onClose,
  accountKey,
}: {
  model: Model;
  session: GuidedSession;
  onClose: () => void;
  accountKey: string;
}) {
  const key = "guided-" + accountKey + "-" + session.id,
    restKey = "rest-" + session.id;
  const [flow, setFlow] = useState<Flow>(() => {
    const cached = loadFlow(localStorage.getItem(key), session, model.docs);
    const rest = Number(localStorage.getItem(restKey) || 0);
    return cached.phase === "rest" && (!Number.isFinite(rest) || rest <= 0)
      ? flowAfterRest(cached, session, model.docs)
      : cached;
  });
  const [deadline, setDeadline] = useState(() =>
    session.finishedAt ? 0 : Number(localStorage.getItem(restKey) || 0),
  );
  const [sound, setSound] = useState(
    () => localStorage.getItem("alarm-" + accountKey) !== "off",
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [skip, setSkip] = useState(false),
    [reason, setReason] = useState("Aparelho indisponível"),
    [remove, setRemove] = useState<Entity | null>(null),
    [undo, setUndo] = useState<Entity | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false),
    reduced = useReducedMotion();
  const history = Boolean(session.finishedAt);
  const sets = useMemo(
    () =>
      visible(model.docs, "set").filter(
        (d) => d.payload.sessionId === session.id,
      ),
    [model.docs, session.id],
  );
  const exercise =
    session.workout.exercises.find((e) => e.id === flow.exerciseId) ??
    session.workout.exercises[0];
  const recorded = useMemo(
    () =>
      sets
        .filter((s) => s.payload.exerciseId === exercise?.id)
        .sort((a, b) => a.payload.index - b.payload.index),
    [sets, exercise?.id],
  );
  const reference = useMemo(
    () => (exercise ? latestSet(model.docs, exercise, session.id) : undefined),
    [model.docs, exercise, session.id],
  );
  const [editing, setEditing] = useState<number | null>(null);
  const active =
    editing ??
    Array.from({ length: exercise?.sets ?? 0 }, (_, i) => i).find(
      (i) => !recorded.some((d) => d.payload.index === i),
    ) ??
    Math.max(0, (exercise?.sets ?? 1) - 1);
  const [target, setTarget] = useState(
    () => flow.targets[exercise?.id] ?? String(reference?.load ?? ""),
  );
  useEffect(() => {
    setTarget(flow.targets[exercise?.id] ?? String(reference?.load ?? ""));
    setEditing(null);
  }, [exercise?.id]);
  const patch = (next: Partial<Flow>) => setFlow((f) => ({ ...f, ...next }));
  const go = (phase: Phase) => {
    setError("");
    patch({ phase });
    window.scrollTo({ top: 0 });
  };
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(flow));
  }, [key, flow]);
  useEffect(() => {
    if (deadline > 0 && !history) armAlarm(session.id, deadline, sound);
    else cancelAlarm(session.id);
  }, [deadline, history, sound, session.id]);
  useEffect(() => {
    if (history) {
      setDeadline(0);
      localStorage.removeItem(restKey);
      void cancelRestForSession(session.id).catch(() => {});
      patch({ phase: "review" });
    }
  }, [history]);
  const run = async (fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const stopRest = () => {
    cancelAlarm(session.id);
    setDeadline(0);
    localStorage.removeItem(restKey);
    if (!model.demo) void cancelRestForSession(session.id).catch(() => {});
  };
  const startRest = (
    seconds: number,
    restReturn: Flow["restReturn"],
    label: string,
  ) => {
    const end = Date.now() + seconds * 1000;
    localStorage.setItem(restKey, String(end));
    setDeadline(end);
    patch({
      phase: "rest",
      restReturn,
      restLabel: label,
      restSeconds: seconds,
    });
    armAlarm(session.id, end, sound);
    if (!model.demo)
      void scheduleRest(session.id, end).catch(() =>
        setError(
          "O cronômetro está ativo. O aviso com o app fechado não foi agendado; confira sua conexão.",
        ),
      );
    window.scrollTo({ top: 0 });
  };
  const finishWarm = async () => {
    const warmed = [...new Set([...flow.warmed, exercise.id])];
    const remote = Array.isArray(session.warmupDone) ? session.warmupDone : [];
    await model.save(
      session.id,
      "session",
      { ...session, warmupDone: [...new Set([...remote, exercise.id])] },
      false,
      JSON.stringify(session),
    );
    patch({ warmed });
  };
  const nextExercise = () => {
    stopRest();
    setEditing(null);
    setFlow((f) =>
      flowAfterRest({ ...f, restReturn: "next" }, session, model.docs),
    );
    window.scrollTo({ top: 0 });
  };
  const openExercise = (id: string) => {
    const e = session.workout.exercises.find((s) => s.id === id)!;
    stopRest();
    setEditing(null);
    patch({
      exerciseId: id,
      warmIndex: 0,
      phase: history
        ? "records"
        : e.warm !== "none" && !prepared(session, model.docs, flow.warmed, id)
          ? "warmup"
          : "work",
    });
    window.scrollTo({ top: 0 });
  };
  const saveSet = async (
    load: string,
    reps: string,
    rir: string,
    baseline: string | null,
  ) => {
    if (busyRef.current) throw Error("Aguarde salvar a série.");
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const values = validateSet(load, reps, rir);
      if (
        exercise.unit === "bar" &&
        model.profile.barWeight !== null &&
        values.load < model.profile.barWeight
      )
        throw Error("A carga total deve incluir a barra.");
      const old = recorded.find((d) => d.payload.index === active);
      if (history && !old)
        throw Error("No histórico, corrija apenas séries registradas.");
      const id =
        old?.id ?? (await setIdentity(session.id, exercise.id, active));
      const raw = model.docs.find((d) => d.id === id);
      await model.save(
        id,
        "set",
        {
          sessionId: session.id,
          exerciseId: exercise.id,
          index: active,
          ...values,
          machine: exercise.machine,
        },
        false,
        baseline === null && raw?.deleted
          ? JSON.stringify(raw.payload)
          : baseline,
      );
      setTarget(String(values.load));
      patch({
        targets: { ...flow.targets, [exercise.id]: String(values.load) },
        lastIndex: active,
      });
      if (history || editing !== null) {
        setEditing(null);
        go("records");
      } else
        startRest(
          exercise.rest,
          recorded.length + (old ? 0 : 1) >= exercise.sets ? "next" : "work",
          `Série ${active + 1} salva`,
        );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const removeSet = () =>
    run(async () => {
      if (!remove) return;
      const current = model.docs.find((d) => d.id === remove.id);
      if (!current || current.deleted)
        throw Error("Esta série já foi alterada.");
      await model.save(
        current.id,
        "set",
        current.payload,
        true,
        JSON.stringify(remove.payload),
      );
      setUndo(remove);
      setRemove(null);
      stopRest();
    });
  const restoreSet = () =>
    run(async () => {
      if (!undo) return;
      const current = model.docs.find((d) => d.id === undo.id);
      if (!current?.deleted)
        throw Error("A série já foi alterada. Confira os registros.");
      await model.save(
        undo.id,
        "set",
        undo.payload,
        false,
        JSON.stringify(current.payload),
      );
      setUndo(null);
    });
  useEffect(() => {
    const heading = stageRef.current?.querySelector("h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [flow.phase, exercise?.id]);
  if (!exercise)
    return (
      <div className="empty">
        <h1>Este treino está sem exercícios.</h1>
        <button className="secondary" onClick={onClose}>
          Voltar para hoje
        </button>
      </div>
    );
  const index = session.workout.exercises.findIndex(
    (e) => e.id === exercise.id,
  );
  const label =
    flow.phase === "warmup"
      ? "Aquecimento"
      : flow.phase === "work"
        ? "Séries válidas"
        : flow.phase === "rest"
          ? "Descanso"
          : flow.phase === "overview"
            ? "Exercícios"
            : flow.phase === "records"
              ? "Registros"
              : "Resumo";
  return (
    <div className="guided-workout" ref={stageRef}>
      <header className="guided-toolbar">
        <button
          className="icon"
          aria-label="Voltar para hoje"
          onClick={onClose}
          disabled={busy}
        >
          <ArrowLeft />
        </button>
        <div>
          <span>{session.workout.name}</span>
          <b>{label}</b>
        </div>
        <button
          className="icon"
          aria-label="Ver exercícios do treino"
          onClick={() => go("overview")}
          disabled={busy}
        >
          <List />
        </button>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {undo && (
        <div className="guided-feedback" role="status">
          <span>Série retirada.</span>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void restoreSet()}
          >
            <Undo2 size={16} />
            Desfazer série
          </button>
        </div>
      )}
      <motion.div
        key={flow.phase + "-" + exercise.id}
        initial={reduced ? false : { opacity: 0.85, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0, duration: reduced ? 0 : 0.25 }}
        className="guided-stage"
      >
        {flow.phase === "warmup" && (
          <>
            <h1>Aquecimento</h1>
            <p className="guided-subtitle">{exercise.name}</p>
            <WarmupStage
              key={exercise.id}
              model={model}
              exercise={exercise}
              target={target}
              onTarget={(v) => {
                setTarget(v);
                patch({
                  targets: { ...flow.targets, [exercise.id]: v },
                  warmIndex: 0,
                });
              }}
              stageIndex={flow.warmIndex}
              busy={busy}
              onComplete={(stage) =>
                void run(async () => {
                  void unlockAlarm();
                  if (stage.last) {
                    await finishWarm();
                    startRest(stage.rest, "work", "Aquecimento concluído");
                  } else {
                    patch({ warmIndex: flow.warmIndex + 1 });
                    startRest(stage.rest, "warmup", "Aproximação concluída");
                  }
                })
              }
              onManual={() =>
                void run(async () => {
                  void unlockAlarm();
                  await finishWarm();
                  go("work");
                })
              }
            />
            <button
              className="text-button stage-minor"
              disabled={busy}
              onClick={() => {
                if (confirm("Pular o aquecimento deste exercício?"))
                  void run(async () => {
                    await finishWarm();
                    go("work");
                  });
              }}
            >
              Pular aquecimento
            </button>
          </>
        )}
        {flow.phase === "work" && (
          <>
            <p className="guided-position">
              Exercício {index + 1} de {session.workout.exercises.length}
            </p>
            <h1>{exercise.name}</h1>
            <p className="guided-subtitle">
              {exercise.sets} × {exercise.min}–{exercise.max} repetições · RIR
              alvo {exercise.rir}
            </p>
            {recorded.length >= exercise.sets && editing === null ? (
              <div className="guided-completed">
                <Check size={28} />
                <h2>Séries concluídas</h2>
                <p>Todas as séries deste exercício foram registradas.</p>
                <button className="primary guided-full" onClick={nextExercise}>
                  Continuar treino <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <>
                <h2 className="guided-series-heading">
                  {editing !== null ? "Corrigir série" : "Série"} {active + 1}{" "}
                  de {exercise.sets}
                </h2>
                <WorkingSetForm
                  key={exercise.id + "-" + active + "-" + (editing !== null)}
                  exercise={exercise}
                  index={active}
                  initial={recorded.find((d) => d.payload.index === active)}
                  suggested={target || String(reference?.load ?? "")}
                  history={history || editing !== null}
                  onSave={saveSet}
                />
              </>
            )}
            {reference && (
              <p className="guided-reference">
                Última sessão comparável: {reference.load} kg × {reference.reps}{" "}
                reps{reference.rir !== null ? ` · RIR ${reference.rir}` : ""}.
              </p>
            )}
            <div className="guided-secondary">
              <button
                className="text-button"
                onClick={() => go("records")}
                disabled={busy}
              >
                Ver séries deste exercício
              </button>
              <button
                className="text-button"
                onClick={() => {
                  if (
                    recorded.length < exercise.sets &&
                    !confirm(
                      "Ainda há séries sem registro. Avançar mesmo assim?",
                    )
                  )
                    return;
                  nextExercise();
                }}
                disabled={busy}
              >
                Próximo exercício <ArrowRight size={16} />
              </button>
            </div>
            <details className="guided-instructions">
              <summary>Execução, alternativas e opções</summary>
              <p>
                {exercise.notes ||
                  "Use amplitude confortável e execução controlada."}
              </p>
              <p>
                <b>Alternativa:</b>{" "}
                {exercise.alternative ||
                  "Use uma variação familiar e registre separadamente."}
              </p>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  setError("");
                  setSkip(true);
                }}
              >
                <SkipForward size={16} />
                Pular exercício
              </button>
            </details>
          </>
        )}
        {flow.phase === "rest" && (
          <RestStage
            key={deadline}
            deadline={deadline}
            seconds={flow.restSeconds}
            label={flow.restLabel}
            sound={sound}
            onSound={async () => {
              const enabled = !sound;
              setSound(enabled);
              localStorage.setItem(
                "alarm-" + accountKey,
                enabled ? "on" : "off",
              );
              armAlarm(session.id, deadline, enabled);
              if (enabled) await unlockAlarm();
            }}
            onTest={async () => {
              await unlockAlarm();
              playAlarm();
            }}
            onMore={() =>
              startRest(
                Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) + 30,
                flow.restReturn,
                flow.restLabel,
              )
            }
            onDone={() => {
              stopRest();
              setFlow((f) => flowAfterRest(f, session, model.docs));
              window.scrollTo({ top: 0 });
            }}
            nextLabel={
              flow.restReturn === "warmup"
                ? "Próxima aproximação"
                : flow.restReturn === "next"
                  ? "Continuar treino"
                  : "Próxima série"
            }
            onFinished={() => {
              if (!model.demo)
                void foregroundRest(session.id, deadline).catch(() => {});
            }}
          />
        )}
        {flow.phase === "overview" && (
          <>
            <h1>Seu treino</h1>
            <p className="guided-subtitle">
              Toque no exercício para abrir sua etapa.
            </p>
            <div className="guided-exercise-list">
              {session.workout.exercises.map((e, i) => {
                const done = sets.filter(
                  (s) => s.payload.exerciseId === e.id,
                ).length;
                return (
                  <button key={e.id} onClick={() => openExercise(e.id)}>
                    <span>{i + 1}</span>
                    <div>
                      <b>{e.name}</b>
                      <small>
                        {session.skipped[e.id]
                          ? "Pulado · " + session.skipped[e.id]
                          : `${done}/${e.sets} séries válidas`}
                      </small>
                    </div>
                    {done >= e.sets ? (
                      <Check size={20} />
                    ) : (
                      <ArrowRight size={20} />
                    )}
                  </button>
                );
              })}
            </div>
            <button
              className="secondary guided-full"
              onClick={() => go("review")}
            >
              {history ? "Ver resumo" : "Revisar e finalizar"}
            </button>
          </>
        )}
        {flow.phase === "records" && (
          <>
            <h1>Séries registradas</h1>
            <p className="guided-subtitle">{exercise.name}</p>
            {recorded.length === 0 ? (
              <p>Nenhuma série registrada neste exercício.</p>
            ) : (
              <div className="guided-records">
                {recorded.map((d) => (
                  <div key={d.id}>
                    <div>
                      <b>Série {d.payload.index + 1}</b>
                      <span>
                        {d.payload.load} kg × {d.payload.reps} reps
                        {d.payload.rir !== null
                          ? ` · RIR ${d.payload.rir}`
                          : ""}
                      </span>
                    </div>
                    <button
                      className="text-button"
                      aria-label={"Editar série " + (d.payload.index + 1)}
                      onClick={() => {
                        setEditing(d.payload.index);
                        go("work");
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="icon"
                      aria-label={"Retirar série " + (d.payload.index + 1)}
                      onClick={() => setRemove(d)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              className="primary guided-full"
              onClick={() =>
                history ? go("review") : (setEditing(null), go("work"))
              }
            >
              {history ? "Voltar ao resumo" : "Voltar às séries válidas"}
            </button>
          </>
        )}
        {flow.phase === "review" && (
          <>
            <h1>{history ? "Treino concluído" : "Revisar treino"}</h1>
            <p className="guided-subtitle">
              {session.workout.name} · {formatDate(session.actualDate)}
            </p>
            <div className="guided-summary">
              <b>
                {sets.length}
                <span>
                  de {session.workout.exercises.reduce((n, e) => n + e.sets, 0)}{" "}
                  séries registradas
                </span>
              </b>
              <p>
                {Object.keys(session.skipped).length} exercícios pulados
                {history
                  ? ` · ${Math.max(0, Math.round((Date.parse(session.finishedAt!) - Date.parse(session.startedAt)) / 60000))} min de sessão`
                  : ""}
              </p>
            </div>
            {!history && (
              <p className="fine">
                Séries não registradas ficam como não realizadas. Seus dados
                sincronizam quando houver conexão.
              </p>
            )}
            <button
              className="secondary guided-full"
              onClick={() => go("overview")}
            >
              {history ? "Ver e corrigir séries" : "Conferir exercícios"}
            </button>
            {history ? (
              <button className="primary guided-full" onClick={onClose}>
                Voltar para hoje
              </button>
            ) : (
              <button
                className="primary guided-full"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    stopRest();
                    await model.save(
                      session.id,
                      "session",
                      { ...session, finishedAt: new Date().toISOString() },
                      false,
                      JSON.stringify(session),
                    );
                    localStorage.removeItem(key);
                  })
                }
              >
                {busy ? "Finalizando…" : "Finalizar treino"}
              </button>
            )}
          </>
        )}
      </motion.div>
      {skip && (
        <Sheet title="Pular exercício" onClose={() => !busy && setSkip(false)}>
          <label>
            Motivo
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (!reason.trim()) throw Error("Informe o motivo.");
                await model.save(
                  session.id,
                  "session",
                  {
                    ...session,
                    skipped: {
                      ...session.skipped,
                      [exercise.id]: reason.trim(),
                    },
                  },
                  false,
                  JSON.stringify(session),
                );
                setSkip(false);
                nextExercise();
              })
            }
          >
            Salvar e avançar
          </button>
        </Sheet>
      )}
      {remove && (
        <Sheet title="Retirar série" onClose={() => !busy && setRemove(null)}>
          <p>
            Retirar a série {remove.payload.index + 1} de {exercise.name}? Ela
            sairá da evolução e poderá ser desfeita nesta tela.
          </p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button
            className="primary"
            disabled={busy}
            onClick={() => void removeSet()}
          >
            Confirmar retirada da série
          </button>
        </Sheet>
      )}
    </div>
  );
}
