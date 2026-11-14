import { usePausedRemoval } from "../PausedRemoval.tsx";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, ArrowUpRight } from "lucide-react";
import type { Model } from "../model.ts";
import {
  visible,
  todayKey,
  plannedWorkout,
  uid,
  type Plan,
  type Workout,
  type Entity,
} from "../domain.ts";
import { Sheet, formatDate } from "../components.tsx";
export default function Calendar({
  model,
  onStart,
  onOpen,
}: {
  model: Model;
  onStart: (w: Workout, actual: string, planned: string) => void;
  onOpen: (id: string) => void;
}) {
  const removal = usePausedRemoval(model);
  const [date, setDate] = useState(todayKey());
  const [month, setMonth] = useState(date.slice(0, 7));
  const [activity, setActivity] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Entity>();
  const [savingActivity, setSavingActivity] = useState(false);
  const openActivity = (item?: Entity) => {
    setEditing(item);
    setError("");
    setActivity(true);
  };
  const [planned, setPlanned] = useState(
    model.profile.todayChoice?.date === date
      ? model.profile.todayChoice.plannedDate
      : date,
  );
  const [workoutId, setWorkoutId] = useState("");
  const plan = visible(model.docs, "plan")[0]?.payload as Plan | undefined;
  const chosenForDate = plan?.workouts.find(
    (w) =>
      model.profile.todayChoice?.date === date &&
      w.id === model.profile.todayChoice.workoutId,
  );
  const selected =
    plan?.workouts.find((w) => w.id === workoutId) ||
    chosenForDate ||
    plannedWorkout(plan, date) ||
    plan?.workouts[0];
  const start = new Date(month + "-01T12:00:00Z");
  const offset = (start.getUTCDay() + 6) % 7;
  const count = new Date(
    start.getUTCFullYear(),
    start.getUTCMonth() + 1,
    0,
  ).getDate();
  const sessions = visible(model.docs, "session");
  const activities = visible(model.docs, "activity");
  const selectDate = (next: string) => {
    setDate(next);
    setPlanned(
      model.profile.todayChoice?.date === next
        ? model.profile.todayChoice.plannedDate
        : next,
    );
    setWorkoutId("");
  };
  const shift = (n: number) => {
    const d = new Date(month + "-15T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  };
  return (
    <>
      <div className="page-title">
        <h1>Agenda</h1>
        <button
          className="secondary"
          onClick={() => {
            selectDate(todayKey(new Date(), model.profile.timezone));
            setMonth(todayKey(new Date(), model.profile.timezone).slice(0, 7));
          }}
        >
          Hoje
        </button>
      </div>
      <div className="calendar-panel">
        <div className="month-title">
          <button
            className="icon"
            aria-label="Mês anterior"
            onClick={() => shift(-1)}
          >
            <ChevronLeft />
          </button>
          <h2>
            {start.toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </h2>
          <button
            className="icon"
            aria-label="Próximo mês"
            onClick={() => shift(1)}
          >
            <ChevronRight />
          </button>
        </div>
        <div className="calendar-grid">
          {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
            <span className="day-label" key={i}>
              {d}
            </span>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <span key={"blank" + i} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const d = month + "-" + String(i + 1).padStart(2, "0");
            const done =
              sessions.some(
                (s) => s.payload.actualDate === d && s.payload.finishedAt,
              ) || activities.some((a) => a.payload.date === d);
            return (
              <button
                key={d}
                className={d === date ? "selected" : ""}
                aria-pressed={d === date}
                aria-label={
                  new Date(d + "T12:00:00Z").toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  }) +
                  (d === todayKey() ? ", hoje" : "") +
                  (done
                    ? ", registrado"
                    : plannedWorkout(plan, d)
                      ? ", treino previsto"
                      : ", dia livre")
                }
                onClick={() => {
                  selectDate(d);
                }}
              >
                <b>{i + 1}</b>
                <i
                  className={
                    done ? "trained" : plannedWorkout(plan, d) ? "planned" : ""
                  }
                />
              </button>
            );
          })}
        </div>
        <p className="fine legend">
          <i className="trained" /> Registrado <i className="planned" />{" "}
          Previsto
        </p>
      </div>
      <section className="calendar-detail">
        <h2>{formatDate(date)}</h2>
        <p className="muted">
          {chosenForDate?.name ||
            plannedWorkout(plan, date)?.name ||
            "Dia livre na ficha"}
        </p>
        {sessions
          .filter((s) => s.payload.actualDate === date)
          .map((s) => (
            <div className="agenda-row agenda-session" key={s.id}>
              <div>
                <b>{s.payload.workout.name}</b>
                <p>
                  {s.payload.finishedAt ? "Concluído" : "Rascunho"} · previsto:{" "}
                  {formatDate(s.payload.plannedDate)}
                </p>
                <details className="agenda-dates">
                  <summary>Alterar datas</summary>
                  <div className="agenda-date-fields">
                    <label>
                      Data realizada
                      <input
                        type="date"
                        value={s.payload.actualDate}
                        onChange={async (e) => {
                          const next = e.currentTarget.value;
                          if (!next) return;
                          try {
                            await model.save(
                              s.id,
                              "session",
                              {
                                ...s.payload,
                                actualDate: next,
                              },
                              false,
                              JSON.stringify(s.payload),
                            );
                            selectDate(next);
                            setMonth(next.slice(0, 7));
                          } catch (error) {
                            setError((error as Error).message);
                          }
                        }}
                      />
                    </label>
                    <label>
                      Data originalmente prevista
                      <input
                        type="date"
                        value={s.payload.plannedDate}
                        onChange={async (e) => {
                          const next = e.currentTarget.value;
                          if (!next) return;
                          try {
                            await model.save(
                              s.id,
                              "session",
                              {
                                ...s.payload,
                                plannedDate: next,
                              },
                              false,
                              JSON.stringify(s.payload),
                            );
                          } catch (error) {
                            setError((error as Error).message);
                          }
                        }}
                      />
                    </label>
                  </div>
                </details>
              </div>
              {!s.payload.finishedAt && (
                <button
                  className="text-button"
                  aria-label={
                    "Retirar treino pausado: " + s.payload.workout.name
                  }
                  onClick={() => removal.requestRemove(s)}
                >
                  Retirar
                </button>
              )}
              <button
                className="text-button agenda-open"
                aria-label="Abrir registro"
                onClick={() => onOpen(s.id)}
              >
                Ver registro <ArrowUpRight size={18} />
              </button>
            </div>
          ))}
        {activities
          .filter((a) => a.payload.date === date)
          .map((a) => (
            <div className="agenda-row" key={a.id}>
              <div>
                <b>{a.payload.name}</b>
                <p>
                  {a.payload.minutes} min · {a.payload.notes}
                </p>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  if (confirm("Excluir esta atividade?"))
                    model
                      .save(a.id, "activity", a.payload, true)
                      .catch((e) => setError(e.message));
                }}
              >
                Excluir
              </button>
              <button className="text-button" onClick={() => openActivity(a)}>
                Editar atividade
              </button>
            </div>
          ))}
        {selected && (
          <div className="schedule-form">
            <label>
              Treino a realizar
              <select
                value={selected.id}
                onChange={(e) => setWorkoutId(e.target.value)}
              >
                {plan?.workouts.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Data originalmente prevista
              <input
                type="date"
                value={planned}
                onChange={(e) => setPlanned(e.target.value)}
              />
            </label>
            <button
              className="primary"
              onClick={() => onStart(selected, date, planned)}
            >
              Registrar neste dia <Plus size={18} />
            </button>
          </div>
        )}
        <button className="secondary" onClick={() => openActivity()}>
          Adicionar cardio ou atividade <Plus size={18} />
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>
      {removal.controls}
      {activity && (
        <Sheet
          title={editing ? "Editar atividade" : "Nova atividade"}
          onClose={() => !savingActivity && setActivity(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (savingActivity) return;
              const f = new FormData(e.currentTarget);
              setSavingActivity(true);
              try {
                await model.save(
                  editing?.id ?? uid(),
                  "activity",
                  {
                    date,
                    name: String(f.get("name")).trim(),
                    minutes: Number(f.get("minutes")),
                    notes: String(f.get("notes")),
                  },
                  false,
                  editing ? JSON.stringify(editing.payload) : null,
                );
                setActivity(false);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setSavingActivity(false);
              }
            }}
          >
            <label>
              Atividade
              <input
                name="name"
                defaultValue={editing?.payload.name ?? ""}
                required
                placeholder="Caminhada, bicicleta…"
              />
            </label>
            <label>
              Duração em minutos
              <input
                name="minutes"
                defaultValue={editing?.payload.minutes ?? ""}
                type="number"
                min="1"
                max="1440"
                required
                inputMode="numeric"
              />
            </label>
            <label>
              Observação opcional
              <textarea
                name="notes"
                defaultValue={editing?.payload.notes ?? ""}
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={savingActivity}>
              {savingActivity ? "Salvando…" : "Salvar atividade"}
            </button>
          </form>
        </Sheet>
      )}
    </>
  );
}
