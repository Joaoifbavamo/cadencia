import { useState } from "react";
import { ArrowRight, Play, Check, Plus, ChevronDown } from "lucide-react";
import type { Model } from "../model.ts";
import {
  todayKey,
  plannedWorkout,
  visible,
  type Plan,
  type Workout,
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
  const [choice, setChoice] = useState("");
  const [choose, setChoose] = useState(false);
  const selected = plan?.workouts.find((w) => w.id === choice) || scheduled;
  const draft = visible(model.docs, "session").find(
    (s) => !s.payload.finishedAt,
  );
  const done = visible(model.docs, "session").filter(
    (s) => s.payload.actualDate === date && s.payload.finishedAt,
  );
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
          <h2>{draft.payload.workout.name}</h2>
          <p>Seu treino está salvo neste aparelho.</p>
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
            <button className="text-button" onClick={() => setChoose(true)}>
              Trocar <ChevronDown size={16} />
            </button>
          </div>
          <p>{selected.exercises.length} exercícios</p>
          <button
            className="primary start-workout"
            onClick={() => onStart(selected, date, date)}
          >
            <Play size={18} /> Começar treino
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
            onClick={() => (plan ? setChoose(true) : onPlan())}
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
      {selected && (
        <section className="today-exercises">
          <details>
            <summary>
              Exercícios do treino <span>{selected.exercises.length}</span>
            </summary>
            <div>
              {selected.exercises.map((e, i) => (
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
              ))}
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
            Você pode escolher um treino de outro dia. Para definir também a
            data originalmente prevista, use a Agenda.
          </p>
          <div className="workout-choices">
            {plan?.workouts.map((w) => (
              <button
                key={w.id}
                className="workout-choice"
                onClick={() => {
                  setChoice(w.id);
                  setChoose(false);
                }}
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
