import type { Plan } from "./domain.ts";
type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export interface EditorDraft {
  version: 1;
  plan: Plan;
  base: string | null;
  savedAt: string;
}
const key = (account: string) => "cadencia-editor-draft-" + account;
function isPlanShape(p: any): p is Plan {
  return (
    p &&
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    Array.isArray(p.workouts) &&
    p.workouts.every(
      (w: any) =>
        w &&
        typeof w.id === "string" &&
        typeof w.name === "string" &&
        Number.isFinite(w.day) &&
        Array.isArray(w.exercises) &&
        w.exercises.every(
          (e: any) =>
            e &&
            ["id", "name", "movement", "notes", "alternative", "machine"].every(
              (k) => typeof e[k] === "string",
            ) &&
            ["sets", "min", "max", "rir", "rest"].every((k) =>
              Number.isFinite(e[k]),
            ) &&
            ["bar", "dumbbell", "machine", "body"].includes(e.unit) &&
            ["main", "secondary", "none"].includes(e.warm),
        ),
    )
  );
}
export function readEditorDraft(
  account: string,
  storage: DraftStorage = localStorage,
): EditorDraft | null {
  try {
    const d = JSON.parse(storage.getItem(key(account)) || "null");
    return d?.version === 1 &&
      isPlanShape(d.plan) &&
      (d.base === null || typeof d.base === "string") &&
      typeof d.savedAt === "string"
      ? d
      : null;
  } catch {
    return null;
  }
}
export function writeEditorDraft(
  account: string,
  plan: Plan,
  base: string | null,
  storage: DraftStorage = localStorage,
) {
  storage.setItem(
    key(account),
    JSON.stringify({
      version: 1,
      plan,
      base,
      savedAt: new Date().toISOString(),
    }),
  );
}
export function clearEditorDraft(
  account: string,
  storage: DraftStorage = localStorage,
) {
  storage.removeItem(key(account));
}
