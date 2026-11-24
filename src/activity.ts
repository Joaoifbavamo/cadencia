import {
  dateValid,
  numberInput,
  validPayload,
  type Activity,
} from "./domain.ts";
import { normalizeSearch } from "./experience.ts";
export type ActivityCategory = NonNullable<Activity["category"]>;
export interface ActivitySetDraft {
  exercise: string;
  reps: string;
  load: string;
}
export function activityCategory(
  activity: Pick<Activity, "name" | "category">,
): ActivityCategory {
  if (activity.category) return activity.category;
  const name = normalizeSearch(activity.name);
  if (name.includes("abdom")) return "abs";
  if (/cardio|caminhada|corrida|bicicleta|esteira|eliptico/.test(name))
    return "cardio";
  return "other";
}
export function activitySummary(activity: Activity) {
  const sets = activity.abdominalSets ?? [];
  const parts =
    activity.minutes > 0
      ? [`${activity.minutes.toLocaleString("pt-BR")} min`]
      : [];
  if (sets.length)
    parts.push(
      `${sets.length} séries · ${sets.reduce((n, s) => n + s.reps, 0)} reps`,
    );
  return parts.join(" · ") || "Realizado · sem duração informada";
}
export function activityPayload({
  date,
  category,
  name,
  minutes,
  notes,
  sets,
}: {
  date: string;
  category: ActivityCategory;
  name: string;
  minutes: string;
  notes: string;
  sets: ActivitySetDraft[];
}): Activity {
  if (!dateValid(date)) throw Error("Escolha uma data válida.");
  const duration =
    minutes.trim() === "" && category === "abs" ? 0 : numberInput(minutes);
  if (
    duration === null ||
    duration < (category === "abs" ? 0 : 1) ||
    duration > 1440
  )
    throw Error(
      category === "abs"
        ? "Informe uma duração válida ou deixe o tempo em branco."
        : "Informe o tempo realizado, entre 1 e 1.440 minutos.",
    );
  if (!name.trim()) throw Error("Informe o nome da atividade.");
  const abdominalSets =
    category === "abs"
      ? sets.map((s, i) => {
          const reps = numberInput(s.reps),
            load = s.load.trim() === "" ? 0 : numberInput(s.load);
          if (
            !s.exercise.trim() ||
            reps === null ||
            !Number.isInteger(reps) ||
            reps < 1 ||
            reps > 200 ||
            load === null ||
            load < 0 ||
            load > 2000
          )
            throw Error(
              `Revise a série ${i + 1}: informe exercício, repetições e carga válida (ou deixe a carga vazia).`,
            );
          return { exercise: s.exercise.trim(), reps, load };
        })
      : undefined;
  const result: Activity = {
    date,
    category,
    name: name.trim(),
    minutes: duration,
    notes,
    ...(abdominalSets?.length ? { abdominalSets } : {}),
  };
  if (!validPayload("activity", result))
    throw Error("Revise os dados da atividade antes de salvar.");
  return result;
}
