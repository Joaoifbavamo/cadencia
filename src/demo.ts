import type { Plan } from "./domain.ts";
// Public, explicitly fictional example. The owner's real plan is imported after login.
export const demoPlan: Plan = {
  id: "d0000000-0000-4000-8000-000000000001",
  name: "Ficha de demonstração",
  workouts: [
    {
      id: "demo-upper",
      name: "Superior · exemplo",
      day: 1,
      exercises: [
        {
          id: "demo-bench",
          name: "Supino reto com barra",
          movement: "Supino",
          sets: 3,
          min: 6,
          max: 8,
          rir: 2,
          rest: 120,
          unit: "bar",
          warm: "main",
          notes: "Exemplo de funcionamento. Não é a sua ficha pessoal.",
          alternative: "Supino com halteres; criar registro separado.",
          machine: "",
        },
        {
          id: "demo-row",
          name: "Remada sentada com apoio no peito",
          movement: "Remada",
          sets: 3,
          min: 8,
          max: 12,
          rir: 2,
          rest: 120,
          unit: "machine",
          warm: "secondary",
          notes: "Ajuste o banco e mantenha o tronco apoiado.",
          alternative: "Remada no cabo; criar registro separado.",
          machine: "",
        },
      ],
    },
  ],
};
