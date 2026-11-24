import { useEffect, useId, useRef, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import type { Model } from "./model.ts";
import { uid, type Entity } from "./domain.ts";
import { Sheet } from "./components.tsx";
import SectionTabs from "./SectionTabs.tsx";
import {
  activityCategory,
  activityPayload,
  type ActivityCategory,
  type ActivitySetDraft,
} from "./activity.ts";
import "./activities.css";
type Fields = { name: string; minutes: string; notes: string };
export default function ActivityComposer({
  model,
  date: initialDate,
  initial,
  initialCategory = "other",
  onClose,
  onSaved,
}: {
  model: Model;
  date: string;
  initial?: Entity;
  initialCategory?: ActivityCategory;
  onClose: () => void;
  onSaved: (date: string) => void;
}) {
  const firstCategory = initial
    ? activityCategory(initial.payload)
    : initialCategory;
  const [category, setCategory] = useState<ActivityCategory>(firstCategory);
  const [date, setDate] = useState(initial?.payload.date ?? initialDate);
  const [fields, setFields] = useState<Record<ActivityCategory, Fields>>(
    () => ({
      cardio: { name: "Cardio", minutes: "", notes: "" },
      abs: { name: "Abdômen", minutes: "", notes: "" },
      other: { name: "", minutes: "", notes: "" },
      ...(initial
        ? {
            [firstCategory]: {
              name: initial.payload.name,
              minutes:
                initial.payload.minutes > 0
                  ? String(initial.payload.minutes)
                  : "",
              notes: initial.payload.notes,
            },
          }
        : {}),
    }),
  );
  const [sets, setSets] = useState<ActivitySetDraft[]>(() =>
    (initial?.payload.abdominalSets ?? []).map(
      (s: { exercise: string; reps: number; load: number }) => ({
        exercise: s.exercise,
        reps: String(s.reps),
        load: s.load ? String(s.load) : "",
      }),
    ),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    dirty = useRef(false),
    id = useRef(initial?.id ?? uid());
  const baseline = useRef(initial ? JSON.stringify(initial.payload) : null);
  const field = fields[category];
  const formId = useId();
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "nearest" });
  }, [error]);
  const patch = (next: Partial<Fields>) => {
    dirty.current = true;
    setFields((all) => ({ ...all, [category]: { ...all[category], ...next } }));
  };
  const close = () => {
    if (
      !lock.current &&
      (!dirty.current ||
        confirm("Descartar o registro que ainda não foi salvo?"))
    )
      onClose();
  };
  const changeCategory = (value: string) => {
    if (initial && value !== category) {
      dirty.current = true;
      setFields((all) => ({
        ...all,
        [value]: {
          ...all[value as ActivityCategory],
          minutes:
            all[value as ActivityCategory].minutes || all[category].minutes,
          notes: all[value as ActivityCategory].notes || all[category].notes,
        },
      }));
    }
    setCategory(value as ActivityCategory);
    setError("");
  };
  return (
    <Sheet
      title={
        initial
          ? "Editar atividade"
          : initialCategory === "cardio"
            ? "Registrar cardio"
            : initialCategory === "abs"
              ? "Registrar abdômen"
              : "Nova atividade"
      }
      onClose={close}
      footer={
        <div className="activity-save">
          <p className="fine">
            O registro será salvo somente ao confirmar abaixo.
          </p>
          <button
            form={formId}
            type="submit"
            className="primary"
            disabled={busy}
          >
            <Check size={18} />
            {busy ? "Salvando…" : "Salvar atividade"}
          </button>
        </div>
      }
    >
      <form
        id={formId}
        className="activity-composer"
        onSubmit={async (event) => {
          event.preventDefault();
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError("");
          try {
            const payload = activityPayload({ date, category, ...field, sets });
            const { abdominalSets: _oldSets, ...previous } =
              initial?.payload ?? {};
            await model.save(
              id.current,
              "activity",
              { ...previous, ...payload },
              false,
              baseline.current,
            );
            dirty.current = false;
            onSaved(date);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy} className="activity-fields">
          <SectionTabs
            id="activity"
            label="Tipo de atividade"
            value={category}
            onChange={changeCategory}
            items={[
              { value: "cardio", label: "Cardio" },
              { value: "abs", label: "Abdômen" },
              { value: "other", label: "Outra" },
            ]}
          />
          <div
            className="activity-panel"
            role="tabpanel"
            id={`activity-panel-${category}`}
            aria-labelledby={`activity-tab-${category}`}
          >
            <label className="activity-date">
              Data do registro
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  dirty.current = true;
                  setDate(e.target.value);
                }}
                required
              />
            </label>
            {category === "cardio" && (
              <div
                className="activity-presets"
                role="group"
                aria-label="Modalidade de cardio"
              >
                {["Cardio", "Caminhada", "Bicicleta", "Esteira"].map((name) => (
                  <button
                    type="button"
                    key={name}
                    className="secondary"
                    aria-pressed={field.name === name}
                    onClick={() => patch({ name })}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            {category === "other" && (
              <div
                className="activity-presets"
                role="group"
                aria-label="Atalhos de atividade"
              >
                {["Cardio", "Abdômen", "Caminhada", "Bicicleta"].map((name) => (
                  <button
                    type="button"
                    key={name}
                    className="secondary"
                    onClick={() => {
                      changeCategory(name === "Abdômen" ? "abs" : "cardio");
                      if (name !== "Abdômen") {
                        dirty.current = true;
                        setFields((all) => ({
                          ...all,
                          cardio: { ...all.cardio, name },
                        }));
                      }
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            {category === "abs" ? (
              <p className="activity-helper">
                Fez abdômen? Salve para marcar como realizado. Tempo e detalhes
                das séries são opcionais.
              </p>
            ) : (
              <label>
                Atividade
                <input
                  name="name"
                  value={field.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="Nome da atividade"
                  maxLength={200}
                  required
                />
              </label>
            )}
            {category !== "abs" && (
              <>
                <label className="activity-duration">
                  Duração em minutos
                  <input
                    name="minutes"
                    type="number"
                    min="1"
                    max="1440"
                    step="any"
                    inputMode="decimal"
                    value={field.minutes}
                    onChange={(e) => patch({ minutes: e.target.value })}
                    placeholder="Tempo realizado"
                    required
                  />
                </label>
                <div
                  className="duration-presets"
                  role="group"
                  aria-label="Tempos rápidos"
                >
                  {[10, 15, 20, 25, 30, 45].map((minutes) => (
                    <button
                      type="button"
                      key={minutes}
                      className="secondary"
                      aria-pressed={Number(field.minutes) === minutes}
                      onClick={() => patch({ minutes: String(minutes) })}
                    >
                      {minutes} min
                    </button>
                  ))}
                </div>
              </>
            )}
            {category === "abs" && (
              <details
                className="abdominal-details"
                open={sets.length > 0 || undefined}
              >
                <summary>
                  Anotar séries <span>opcional</span>
                </summary>
                <p className="fine">
                  Adicione somente as séries que realizou. A carga é adicional;
                  deixe vazia se usou apenas o peso do corpo.
                </p>
                {sets.map((set, index) => (
                  <div className="abdominal-set" key={index}>
                    <div className="abdominal-set-title">
                      <label>
                        Exercício · série {index + 1}
                        <input
                          aria-label={`Exercício abdominal série ${index + 1}`}
                          value={set.exercise}
                          maxLength={200}
                          onChange={(e) => {
                            dirty.current = true;
                            setSets((all) =>
                              all.map((s, i) =>
                                i === index
                                  ? { ...s, exercise: e.target.value }
                                  : s,
                              ),
                            );
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="icon"
                        aria-label={`Remover série abdominal ${index + 1}`}
                        onClick={() => {
                          dirty.current = true;
                          setSets((all) => all.filter((_, i) => i !== index));
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="form-pair">
                      <label>
                        Repetições
                        <input
                          aria-label={`Repetições abdominal série ${index + 1}`}
                          inputMode="numeric"
                          value={set.reps}
                          onChange={(e) => {
                            dirty.current = true;
                            setSets((all) =>
                              all.map((s, i) =>
                                i === index
                                  ? { ...s, reps: e.target.value }
                                  : s,
                              ),
                            );
                          }}
                          placeholder="Realizadas"
                        />
                      </label>
                      <label>
                        Carga adicional · kg
                        <input
                          aria-label={`Carga abdominal série ${index + 1} opcional`}
                          inputMode="decimal"
                          value={set.load}
                          onChange={(e) => {
                            dirty.current = true;
                            setSets((all) =>
                              all.map((s, i) =>
                                i === index
                                  ? { ...s, load: e.target.value }
                                  : s,
                              ),
                            );
                          }}
                          placeholder="Opcional"
                        />
                      </label>
                    </div>
                  </div>
                ))}
                <div
                  className="abdominal-add"
                  role="group"
                  aria-label="Adicionar série de abdômen"
                >
                  {["Crunch na polia", "Abdominal reverso"].map((exercise) => (
                    <button
                      type="button"
                      className="secondary"
                      key={exercise}
                      disabled={sets.length >= 30}
                      onClick={() => {
                        dirty.current = true;
                        setSets((all) => [
                          ...all,
                          { exercise, reps: "", load: "" },
                        ]);
                      }}
                    >
                      <Plus size={16} />
                      {exercise}
                    </button>
                  ))}
                </div>
              </details>
            )}
            <details className="activity-more">
              <summary>
                {category === "abs"
                  ? "Tempo, nome e observações"
                  : "Observação opcional"}
              </summary>
              {category === "abs" && (
                <>
                  <label>
                    Nome da atividade
                    <input
                      aria-label="Nome da atividade abdominal"
                      value={field.name}
                      onChange={(e) => patch({ name: e.target.value })}
                      maxLength={200}
                    />
                  </label>
                  <label>
                    Duração opcional em minutos
                    <input
                      type="number"
                      min="0"
                      max="1440"
                      step="any"
                      inputMode="decimal"
                      value={field.minutes}
                      onChange={(e) => patch({ minutes: e.target.value })}
                      placeholder="Pode deixar em branco"
                    />
                  </label>
                </>
              )}
              <label>
                Observação opcional
                <textarea
                  name="notes"
                  value={field.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                  maxLength={4000}
                  rows={2}
                />
              </label>
            </details>
            {category !== "abs" &&
              initial?.payload.abdominalSets?.length > 0 && (
                <p className="fine">
                  Ao mudar o tipo, as séries de abdômen deixam de fazer parte
                  deste registro.
                </p>
              )}
          </div>
          {(["cardio", "abs", "other"] as const)
            .filter((value) => value !== category)
            .map((value) => (
              <div
                key={value}
                role="tabpanel"
                id={`activity-panel-${value}`}
                aria-labelledby={`activity-tab-${value}`}
                hidden
              />
            ))}
        </fieldset>
        {error && (
          <p ref={errorRef} role="alert" className="error">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}
