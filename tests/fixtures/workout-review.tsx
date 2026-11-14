import { useState } from "react";
import { createRoot } from "react-dom/client";
import Workout from "../../src/screens/Workout.tsx";
import PlanEditor from "../../src/screens/PlanEditor.tsx";
import { demoPlan } from "../../src/demo.ts";
import type { Entity, Kind } from "../../src/domain.ts";
import type { Model } from "../../src/model.ts";
import "../../src/styles.css";

const mode = new URLSearchParams(location.search).get("mode");
const workout = {
  ...demoPlan.workouts[0],
  exercises: [
    {
      ...demoPlan.workouts[0].exercises[0],
      sets: 1,
      warm:
        mode === "failure"
          ? ("none" as const)
          : demoPlan.workouts[0].exercises[0].warm,
    },
  ],
};
const entity = (id: string, kind: Kind, payload: unknown): Entity => ({
  id,
  kind,
  payload,
  version: 1,
  change_seq: 0,
  deleted: false,
  dirty: false,
  mutationId: id,
  localSeq: 0,
});
function Fixture() {
  const [docs, setDocs] = useState([
    entity(demoPlan.id, "plan", { ...demoPlan, workouts: [workout] }),
    entity("review-session", "session", {
      id: "review-session",
      planId: demoPlan.id,
      workout,
      actualDate: "2026-11-12",
      plannedDate: "2026-11-12",
      startedAt: "2026-11-12T12:00:00Z",
      skipped: {},
      ...(mode === "history" ? { finishedAt: "2026-11-12T12:30:00Z" } : {}),
    }),
    ...(mode === "history"
      ? [
          entity("review-set", "set", {
            sessionId: "review-session",
            exerciseId: workout.exercises[0].id,
            index: 0,
            load: 20,
            reps: 8,
            rir: null,
            machine: "",
          }),
        ]
      : []),
  ]);
  const [closed, setClosed] = useState(false),
    [dirty, setDirty] = useState(false);
  const model: Model = {
    docs,
    profile: { barWeight: 20, increment: 2.5, timezone: "America/Sao_Paulo" },
    demo: true,
    save: async (id, kind, payload, deleted = false, expectedPayload) => {
      if (mode === "failure") throw Error("Falha simulada ao salvar.");
      const current = docs.find((d) => d.id === id);
      if (
        expectedPayload !== undefined &&
        (current ? JSON.stringify(current.payload) : null) !== expectedPayload
      )
        throw Error("O registro mudou em outro aparelho.");
      if (mode === "editor-delay")
        await new Promise((resolve) => setTimeout(resolve, 400));
      setDocs((all) => [
        ...all.filter((d) => d.id !== id),
        { ...entity(id, kind, deleted ? {} : payload), deleted },
      ]);
    },
    saveBatch: async () => {},
    importDocuments: async () => {},
    refresh: () => {},
  };
  return (
    <>
      <button
        onClick={() =>
          setDocs((all) =>
            all.map((d) =>
              d.kind === "session"
                ? {
                    ...d,
                    payload: {
                      ...d.payload,
                      archivedAt: new Date().toISOString(),
                    },
                  }
                : d,
            ),
          )
        }
      >
        Arquivar remotamente
      </button>
      <button
        onClick={() =>
          setDocs((all) =>
            all.map((d) =>
              d.kind === "set"
                ? {
                    ...d,
                    payload: { ...d.payload, load: 35 },
                    version: d.version + 1,
                  }
                : d,
            ),
          )
        }
      >
        Corrigir carga remotamente
      </button>
      {closed ? (
        <p>Histórico fechado</p>
      ) : mode?.startsWith("editor") ? (
        <PlanEditor
          model={model}
          accountKey={"fixture-" + mode}
          onDirtyChange={setDirty}
        />
      ) : (
        <Workout
          model={model}
          sessionId="review-session"
          accountKey={"fixture-" + mode}
          onClose={() => setClosed(true)}
        />
      )}
      <output id="dirty">{String(dirty)}</output>
      <output id="documents">{JSON.stringify(docs)}</output>
    </>
  );
}
createRoot(document.getElementById("fixture")!).render(<Fixture />);
