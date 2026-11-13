import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Home, Dumbbell, Calendar, TrendingUp, Activity } from "lucide-react";
import MobileNavigation from "../../src/MobileNavigation.tsx";
import Progress from "../../src/screens/Progress.tsx";
import type { Model } from "../../src/model.ts";
import "../../src/styles.css";
const items = [Home, Dumbbell, Calendar, TrendingUp, Activity].map(
  (Icon, i) => ({
    name: ["Hoje", "Ficha", "Agenda", "Evolução", "Atividades"][i],
    icon: <Icon />,
  }),
);
const exercise = {
  id: "e",
  name: "Remada",
  unit: "machine",
  min: 8,
  max: 12,
  machine: "A",
};
const docs = ["2026-11-10", "2026-11-12"].flatMap((date, i) => [
  {
    id: `s${i}`,
    kind: "session",
    payload: {
      actualDate: date,
      startedAt: date + "T10:00:00Z",
      finishedAt: date + "T11:00:00Z",
      workout: { exercises: [exercise] },
    },
  },
  ...[0, 1, 2].map((index) => ({
    id: `set${i}${index}`,
    kind: "set",
    payload: {
      sessionId: `s${i}`,
      exerciseId: "e",
      machine: "A",
      index,
      load: 20 + i * 5,
      reps: 10 - index,
      rir: index,
    },
  })),
]);
function Fixture() {
  const [value, setValue] = useState<string | null>("Hoje");
  return (
    <div className="app-shell">
      <main data-glisse-backdrop>
        <button onClick={() => setValue(null)}>Ocultar navegação</button>
        <p id="current">{value ?? "Oculta"}</p>
        <Progress model={{ docs } as Model} />
      </main>
      <MobileNavigation items={items} value={value} onChange={setValue} />
    </div>
  );
}
createRoot(document.getElementById("fixture")!).render(<Fixture />);
