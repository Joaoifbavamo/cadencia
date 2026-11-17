import { useState } from "react";
import { createRoot } from "react-dom/client";
import Progress from "../../src/screens/Progress.tsx";
import Workout from "../../src/screens/Workout.tsx";
import { demoPlan } from "../../src/demo.ts";
import { todayKey, type Entity, type Kind } from "../../src/domain.ts";
import { shiftDate } from "../../src/training-insights.ts";
import type { Model } from "../../src/model.ts";
import "../../src/styles.css";
const today = todayKey(),
  prior = shiftDate(today, -7);
const exercise = {
  ...demoPlan.workouts[0].exercises[0],
  sets: 2,
  warm: "none" as const,
};
const workout = { ...demoPlan.workouts[0], exercises: [exercise] };
const entity = (id: string, kind: Kind, payload: unknown) =>
  ({
    id,
    kind,
    payload,
    version: 1,
    deleted: false,
    dirty: false,
    change_seq: 0,
    mutationId: id,
    localSeq: 0,
  }) as Entity;
const session = (id: string, date: string, done = false) =>
  entity(id, "session", {
    id,
    planId: demoPlan.id,
    workout,
    actualDate: date,
    plannedDate: date,
    startedAt: date + "T10:00:00Z",
    ...(done ? { finishedAt: date + "T11:00:00Z" } : {}),
    skipped: {},
  });
function Fixture() {
  const [screen, setScreen] = useState("progress");
  const [docs, setDocs] = useState([
    session("current", today),
    session("prior", prior, true),
    ...[0, 1].map((index) =>
      entity("prior" + index, "set", {
        sessionId: "prior",
        exerciseId: exercise.id,
        index,
        machine: "",
        load: 20 + index * 2.5,
        reps: 10 - index,
        rir: null,
      }),
    ),
    entity("cardio", "activity", {
      date: prior,
      name: "Bicicleta",
      minutes: 25,
      notes: "",
    }),
  ]);
  const model = {
    docs,
    demo: true,
    profile: { barWeight: 20, increment: 2.5, timezone: "America/Sao_Paulo" },
    save: async (id: string, kind: Kind, payload: unknown) =>
      setDocs((all) => [
        ...all.filter((d) => d.id !== id),
        entity(id, kind, payload),
      ]),
    saveBatch: async () => {},
    importDocuments: async () => {},
    refresh: () => {},
  } as Model;
  return (
    <div className="app-shell">
      <main>
        <button
          onClick={() =>
            setScreen((s) => (s === "progress" ? "workout" : "progress"))
          }
        >
          Alternar teste
        </button>
        {screen === "progress" ? (
          <Progress model={model} />
        ) : (
          <Workout
            model={model}
            sessionId="current"
            accountKey="insights-fixture"
            onClose={() => setScreen("progress")}
          />
        )}
      </main>
    </div>
  );
}
createRoot(document.getElementById("fixture")!).render(<Fixture />);
