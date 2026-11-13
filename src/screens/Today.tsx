import { Button as GlassButton } from "glisse";
import { useState } from "react";
import { ArrowRight, Play, Check, Plus, ChevronDown } from "lucide-react";
import type { Model } from "../model.ts";
import {
  todayKey,
  plannedWorkout,
  visible,
  type Plan,
  type Workout,
  uid,
  findResumableSession,
} from "../domain.ts";
import { formatDate, Sheet } from "../components.tsx";
export default function Today({
  model,
  onStart,
  onResume,
  onPlan,
  onAgenda,
}: {
  model: Model;
  onStart: (w: Workout, a: string, p: string) => void;
  onResume: (id: string) => void;
  onPlan: () => void;
  onAgenda: () => void;
}) {
  const date = todayKey(new Date(), model.profile.timezone);
  const plan = visible(model.docs, "plan")[0]?.payload as Plan | undefined;
  const scheduled = plannedWorkout(plan, date);
  const [choose, setChoose] = useState(false);
  const profileDoc = visible(model.docs, "profile")[0];
  const choice =
    model.profile.todayChoice?.date === date
      ? model.profile.todayChoice
      : undefined;
  const drafts = visible(model.docs, "session")
    .filter((s) => !s.payload.finishedAt)
    .sort((a, b) => b.payload.startedAt.localeCompare(a.payload.startedAt));
  const selected =
    plan?.workouts.find((w) => w.id === choice?.workoutId) ||
    drafts.find((s) => s.payload.actualDate === date)?.payload.workout ||
    scheduled;
  const draft = findResumableSession(model.docs, selected?.id ?? "", date);
  const displayWorkout = draft?.payload.workout ?? selected;
  const plannedDate =
    draft?.payload.plannedDate ??
    (choice && choice.workoutId === selected?.id ? choice.plannedDate : date);
  const [planned, setPlanned] = useState(plannedDate);
  const [choosing, setChoosing] = useState(false),
    [choiceError, setChoiceError] = useState("");
  const openChoice = () => {
    setPlanned(plannedDate);
    setChoiceError("");
    setChoose(true);
  };
  const chooseWorkout = async (w: Workout) => {
    setChoosing(true);
    setChoiceError("");
    try {
      await model.save(
        profileDoc?.id ?? uid(),
        "profile",
        {
          ...model.profile,
          todayChoice: { date, workoutId: w.id, plannedDate: planned },
        },
        false,
        profileDoc ? JSON.stringify(profileDoc.payload) : null,
      );
      setChoose(false);
    } catch (e) {
      setChoiceError((e as Error).message);
    } finally {
      setChoosing(false);
    }
  };
  const done = visible(model.docs, "session").filter(
    (s) => s.payload.actualDate === date && s.payload.finishedAt,
  );
  const first = new Date(date + "T12:00:00Z");
  first.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(first);
    day.setUTCDate(first.getUTCDate() + i);
    const key = day.toISOString().slice(0, 10);
    const completed = visible(model.docs, "session").filter(
      (s) => s.payload.actualDate === key && s.payload.finishedAt,
    ).length;
    return {
      key,
      day,
      completed,
      planned: Boolean(
        plannedWorkout(plan, key) || (key === date && (choice || draft)),
      ),
    };
  });
  const weekCount = week.reduce((n, d) => n + d.completed, 0);
  const draftSets = draft
    ? visible(model.docs, "set").filter((s) => s.payload.sessionId === draft.id)
        .length
    : 0;
  return (
    <div className="today-v2">
      <div className="page-title">
        <div>
          <h1>Treino de hoje</h1>
          <p className="today-date">
            {new Date(date + "T12:00:00Z").toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            })}
          </p>
        </div>
        <button className="text-button" onClick={onAgenda}>
          Agenda <ArrowRight size={17} />
        </button>
      </div>
      {draft ? (
        <section className="today-workout">
          <div className="workout-state">
            <span className="state-dot" /> Em andamento
          </div>
          <div className="workout-card-heading">
            <h2>{draft.payload.workout.name}</h2>
            <GlassButton className="change-workout" onClick={openChoice}>
              Trocar treino <ChevronDown size={16} />
            </GlassButton>
          </div>
          <p>{draftSets} séries registradas · continue de onde parou</p>
          <button
            className="primary start-workout"
            onClick={() => onResume(draft.id)}
          >
            Continuar treino <ArrowRight size={19} />
          </button>
        </section>
      ) : selected ? (
        <section className="today-workout">
          <div className="workout-card-heading">
            <h2>{selected.name}</h2>
            <GlassButton className="change-workout" onClick={openChoice}>
              Trocar treino <ChevronDown size={16} />
            </GlassButton>
          </div>
          <p>{selected.exercises.length} exercícios</p>
          <button
            className="primary start-workout"
            onClick={() => onStart(selected, date, plannedDate)}
          >
            <Play size={18} />{" "}
            {done.some((s) => s.payload.workout.id === selected.id)
              ? "Treinar novamente"
              : "Começar treino"}
          </button>
        </section>
      ) : (
        <section className="today-workout rest-day">
          <h2>{plan ? "Hoje é dia livre." : "Vamos preparar sua ficha."}</h2>
          <p>
            {plan
              ? "Pode descansar, registrar cardio ou fazer um treino em outro dia."
              : "Importe a ficha pessoal em Ajustes ou monte o treino no editor."}
          </p>
          <button
            className="primary start-workout"
            onClick={() => (plan ? openChoice() : onPlan())}
          >
            {plan ? "Escolher um treino" : "Criar meu treino"}
            <Plus size={18} />
          </button>
          {plan && (
            <button className="secondary start-workout" onClick={onAgenda}>
              Registrar cardio ou atividade
            </button>
          )}
        </section>
      )}
      {drafts.some((s) => s.id !== draft?.id) && (
        <details className="paused-workouts">
          <summary>
            Treinos pausados{" "}
            <span>{drafts.filter((s) => s.id !== draft?.id).length}</span>
          </summary>
          {drafts
            .filter((s) => s.id !== draft?.id)
            .map((s) => (
              <button
                key={s.id}
                className="workout-choice"
                onClick={() => onResume(s.id)}
              >
                <div>
                  <b>{s.payload.workout.name}</b>
                  <span>
                    {formatDate(s.payload.actualDate)} · retomar sem perder
                    registros
                  </span>
                </div>
                <ArrowRight size={18} />
              </button>
            ))}
        </details>
      )}
      {plannedDate !== date && (
        <p className="fine">
          Treino originalmente previsto para {formatDate(plannedDate)}.
        </p>
      )}
      <section className="home-week" aria-label="Sua semana de treino">
        <div>
          <h2>Sua semana</h2>
          <span>
            {weekCount}{" "}
            {weekCount === 1 ? "treino concluído" : "treinos concluídos"}
          </span>
        </div>
        <ol>
          {week.map((d) => (
            <li
              key={d.key}
              className={
                (d.key === date ? "is-today " : "") +
                (d.completed ? "is-complete" : d.planned ? "is-planned" : "")
              }
              aria-label={
                formatDate(d.key) +
                (d.key === date ? ", hoje" : "") +
                (d.completed
                  ? ", treino concluído"
                  : d.planned
                    ? ", treino previsto"
                    : ", dia livre")
              }
            >
              <span>
                {d.day
                  .toLocaleDateString("pt-BR", {
                    weekday: "short",
                    timeZone: "UTC",
                  })
                  .slice(0, 3)}
              </span>
              <time
                dateTime={d.key}
                aria-current={d.key === date ? "date" : undefined}
              >
                {d.day.getUTCDate()}
              </time>
              <span className="week-mark" aria-hidden="true">
                {d.completed ? <Check size={12} /> : null}
              </span>
            </li>
          ))}
        </ol>
      </section>
      {displayWorkout && (
        <section className="today-exercises">
          <details>
            <summary>
              Exercícios do treino{" "}
              <span>{displayWorkout.exercises.length}</span>
            </summary>
            <div>
              {displayWorkout.exercises.map(
                (e: import("../domain.ts").Exercise, i: number) => (
                  <div className="preview-row" key={e.id}>
                    <span className="row-order">{i + 1}</span>
                    <div>
                      <h3>{e.name}</h3>
                      <p>
                        {e.sets} × {e.min}–{e.max} reps · RIR {e.rir} ·{" "}
                        {e.rest >= 120 ? e.rest / 60 + " min" : e.rest + " s"}
                      </p>
                    </div>
                  </div>
                ),
              )}
              <p className="time-note">
                Reserve até 45 min, incluindo aquecimento. O tempo real depende
                das pausas e da academia.
              </p>
            </div>
          </details>
          <button className="text-button" onClick={onPlan}>
            Editar minha ficha <ArrowRight size={16} />
          </button>
        </section>
      )}
      {done.map((s) => (
        <div key={s.id} className="completed-session">
          <Check />
          <div>
            <b>{s.payload.workout.name}</b>
            <p>Concluído em {formatDate(s.payload.actualDate)}</p>
          </div>
          <button className="text-button" onClick={() => onResume(s.id)}>
            Ver séries
          </button>
        </div>
      ))}
      {!selected && plan && (
        <button className="text-button" onClick={onPlan}>
          Ver minha ficha <ArrowRight size={16} />
        </button>
      )}
      {choose && (
        <Sheet title="Qual treino vai fazer?" onClose={() => setChoose(false)}>
          <p>
            A escolha vale só para hoje e sincroniza com sua conta. Trocar não
            apaga séries nem altera sua divisão semanal.
          </p>
          <label>
            Data originalmente prevista
            <input
              type="date"
              value={planned}
              onChange={(e) => setPlanned(e.target.value)}
              required
            />
          </label>
          {choiceError && (
            <p className="error" role="alert">
              {choiceError}
            </p>
          )}
          <div className="workout-choices">
            {plan?.workouts.map((w) => (
              <button
                key={w.id}
                className="workout-choice"
                disabled={choosing || !planned}
                onClick={() => void chooseWorkout(w)}
              >
                <div>
                  <b>{w.name}</b>
                  <span>{w.exercises.length} exercícios</span>
                </div>
                <ArrowRight size={19} />
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}
