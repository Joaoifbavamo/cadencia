import { useEffect, useRef, useState } from "react";
import { Plus, ChevronDown, ChevronUp, Trash2, Save } from "lucide-react";
import type { Model } from "../model.ts";
import {
  readEditorDraft,
  writeEditorDraft,
  clearEditorDraft,
} from "../editor-draft.ts";
import { download } from "../components.tsx";
import {
  uid,
  visible,
  type Plan,
  type Exercise,
  isExercise,
} from "../domain.ts";
const blankExercise = (): Exercise => ({
  id: uid(),
  name: "Novo exercício",
  movement: "Novo exercício",
  sets: 2,
  min: 8,
  max: 12,
  rir: 2,
  rest: 90,
  unit: "machine",
  warm: "none",
  notes: "",
  alternative: "",
  machine: "",
});
export default function PlanEditor({
  model,
  onDirtyChange,
  accountKey,
}: {
  model: Model;
  accountKey: string;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const existing = visible(model.docs, "plan")[0];
  const [plan, setPlan] = useState<Plan>(() =>
    structuredClone(
      existing?.payload || {
        id: model.singletonIds?.plan ?? uid(),
        name: "Minha ficha",
        workouts: [],
      },
    ),
  );
  const [message, setMessage] = useState("");
  const [recoverable, setRecoverable] = useState(() =>
    readEditorDraft(accountKey),
  );
  const [saving, setSaving] = useState(false);
  const latestPlan = useRef(plan);
  latestPlan.current = plan;
  const [base, setBase] = useState<string | null>(
    existing ? JSON.stringify(existing.payload) : null,
  );
  const [open, setOpen] = useState("");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const change = (fn: (p: Plan) => void) => {
    const p = structuredClone(plan);
    fn(p);
    setPlan(p);
    setDirty(true);
    try {
      writeEditorDraft(accountKey, p, base);
      setMessage(
        "Rascunho guardado neste aparelho. Salve a ficha para sincronizar.",
      );
    } catch {
      setMessage(
        "Não foi possível guardar o rascunho neste aparelho. Mantenha esta tela aberta e salve a ficha.",
      );
    }
  };
  const days = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];
  if (recoverable)
    return (
      <section className="empty-state">
        <h1>Recuperar sua ficha?</h1>
        <p>
          Há um rascunho desta conta guardado neste aparelho em{" "}
          {new Date(recoverable.savedAt).toLocaleString("pt-BR")}. Ele ainda não
          foi salvo na ficha.
        </p>
        <div className="button-row">
          <button
            className="primary"
            onClick={() => {
              setPlan(structuredClone(recoverable.plan));
              setBase(recoverable.base);
              setDirty(true);
              setRecoverable(null);
              setMessage(
                "Rascunho recuperado. Revise e salve a ficha para sincronizar.",
              );
            }}
          >
            Recuperar rascunho
          </button>
          <button
            className="secondary"
            onClick={() => {
              try {
                clearEditorDraft(accountKey);
                setRecoverable(null);
              } catch {
                setMessage(
                  "Não foi possível remover o rascunho. Tente novamente.",
                );
              }
            }}
          >
            Descartar rascunho
          </button>
        </div>
        <p role="status">{message}</p>
      </section>
    );
  return (
    <>
      <div className="page-title editor-toolbar">
        <div>
          <h1>Meu treino</h1>
          <p className="muted">Sua ficha, do seu jeito.</p>
        </div>
        <button
          className="primary"
          disabled={saving}
          onClick={async () => {
            if (saving) return;
            setSaving(true);
            try {
              if (
                !plan.name.trim() ||
                plan.workouts.some(
                  (w) =>
                    !w.name.trim() || w.exercises.some((e) => !isExercise(e)),
                )
              )
                throw Error(
                  "Revise nomes, séries, faixa de repetições e descanso (15–600 s).",
                );
              await model.save(plan.id, "plan", plan, false, base);
              setBase(JSON.stringify(plan));
              const stillDirty =
                JSON.stringify(latestPlan.current) !== JSON.stringify(plan);
              setDirty(stillDirty);
              if (stillDirty)
                writeEditorDraft(
                  accountKey,
                  latestPlan.current,
                  JSON.stringify(plan),
                );
              else clearEditorDraft(accountKey);
              setMessage(
                stillDirty
                  ? "Ficha salva. Há novas alterações ainda não salvas."
                  : "Ficha salva neste dispositivo. Veja a sincronização no topo.",
              );
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setSaving(false);
            }
          }}
        >
          <Save size={18} /> {saving ? "Salvando…" : "Salvar ficha"}
        </button>
      </div>
      {message && (
        <p role="status" className="feedback">
          {message}
        </p>
      )}
      <p className="editor-note">
        Treinos já iniciados mantêm a ficha original. Trocar um exercício ou
        aparelho exige uma referência de carga própria.
      </p>
      {message.includes("mudou em outro lugar") && (
        <div className="button-row">
          <button
            className="secondary"
            onClick={() =>
              download(
                "cadencia-rascunho.json",
                JSON.stringify(
                  {
                    format: "cadencia",
                    version: 1,
                    documents: [{ id: plan.id, kind: "plan", payload: plan }],
                  },
                  null,
                  2,
                ),
              )
            }
          >
            Baixar meu rascunho
          </button>
          <button
            className="secondary"
            onClick={() => {
              if (existing) {
                setPlan(structuredClone(existing.payload));
                setBase(JSON.stringify(existing.payload));
                setDirty(false);
                clearEditorDraft(accountKey);
                setMessage("Ficha atual carregada.");
              }
            }}
          >
            Carregar ficha atual
          </button>
        </div>
      )}
      <p role="status" className="editor-note">
        {dirty
          ? "Ficha com alterações não salvas."
          : "Ficha sem alterações pendentes."}
      </p>
      {dirty && (
        <button
          className="text-button"
          onClick={() => {
            if (
              !confirm("Descartar todas as alterações não salvas desta ficha?")
            )
              return;
            try {
              clearEditorDraft(accountKey);
              setPlan(
                structuredClone(
                  existing?.payload || {
                    id: model.singletonIds?.plan ?? plan.id,
                    name: "Minha ficha",
                    workouts: [],
                  },
                ),
              );
              setBase(existing ? JSON.stringify(existing.payload) : null);
              setDirty(false);
              setMessage("Rascunho descartado.");
            } catch {
              setMessage("Não foi possível descartar. Tente novamente.");
            }
          }}
        >
          Descartar alterações
        </button>
      )}
      <label>
        Nome da ficha
        <input
          value={plan.name}
          onChange={(e) =>
            change((p) => {
              p.name = e.target.value;
            })
          }
        />
      </label>
      {plan.workouts.map((w, wi) => (
        <section className="workout-editor" key={w.id}>
          <div className="editor-workout-title">
            <label>
              Treino
              <input
                value={w.name}
                onChange={(e) =>
                  change((p) => {
                    p.workouts[wi].name = e.target.value;
                  })
                }
              />
            </label>
            <label>
              Dia da semana
              <select
                value={w.day}
                onChange={(e) =>
                  change((p) => {
                    p.workouts[wi].day = Number(e.target.value);
                  })
                }
              >
                {days.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="icon danger"
              aria-label={`Excluir ${w.name}`}
              onClick={() => {
                if (
                  confirm(
                    "Remover este treino da ficha? O histórico será preservado.",
                  )
                )
                  change((p) => {
                    p.workouts.splice(wi, 1);
                  });
              }}
            >
              <Trash2 size={18} />
            </button>
          </div>
          {w.exercises.map((e, ei) => (
            <div className="editor-exercise" key={e.id}>
              <button
                className="editor-summary"
                aria-expanded={open === e.id}
                aria-controls={"exercise-fields-" + e.id}
                onClick={() => setOpen(open === e.id ? "" : e.id)}
              >
                <span className="row-order">{ei + 1}</span>
                <div>
                  <b>{e.name}</b>
                  <span>
                    {e.sets} × {e.min}–{e.max} · RIR {e.rir} · {e.rest} s
                  </span>
                </div>
                <ChevronDown size={19} />
              </button>
              {open === e.id && (
                <div className="exercise-fields" id={"exercise-fields-" + e.id}>
                  <label className="wide">
                    Nome específico
                    <input
                      value={e.name}
                      onChange={(ev) =>
                        change((p) => {
                          p.workouts[wi].exercises[ei].name = ev.target.value;
                        })
                      }
                    />
                  </label>
                  {(
                    [
                      ["sets", "Séries"],
                      ["min", "Reps mín."],
                      ["max", "Reps máx."],
                      ["rir", "RIR alvo"],
                      ["rest", "Descanso (s)"],
                    ] as const
                  ).map(([field, label]) => (
                    <label key={field}>
                      {label}
                      <input
                        type="number"
                        value={e[field]}
                        onChange={(ev) =>
                          change((p) => {
                            p.workouts[wi].exercises[ei][field] = Number(
                              ev.target.value,
                            );
                          })
                        }
                      />
                    </label>
                  ))}
                  <label className="wide">
                    Unidade
                    <select
                      value={e.unit}
                      onChange={(ev) =>
                        change((p) => {
                          p.workouts[wi].exercises[ei].unit = ev.target
                            .value as Exercise["unit"];
                        })
                      }
                    >
                      <option value="bar">Total com barra</option>
                      <option value="dumbbell">Por halter</option>
                      <option value="machine">Indicada no aparelho</option>
                      <option value="body">Carga adicional</option>
                    </select>
                  </label>
                  <label className="wide">
                    Aquecimento
                    <select
                      value={e.warm}
                      onChange={(ev) =>
                        change((p) => {
                          p.workouts[wi].exercises[ei].warm = ev.target
                            .value as Exercise["warm"];
                        })
                      }
                    >
                      <option value="main">3 aproximações</option>
                      <option value="secondary">1 aproximação leve</option>
                      <option value="none">Sem sugestão automática</option>
                    </select>
                  </label>
                  <label className="wide">
                    Identificação do aparelho (opcional)
                    <input
                      value={e.machine}
                      onChange={(ev) =>
                        change((p) => {
                          p.workouts[wi].exercises[ei].machine =
                            ev.target.value;
                        })
                      }
                    />
                  </label>
                  <label className="wide">
                    Orientação
                    <textarea
                      value={e.notes}
                      onChange={(ev) =>
                        change((p) => {
                          p.workouts[wi].exercises[ei].notes = ev.target.value;
                        })
                      }
                    />
                  </label>
                  <label className="wide">
                    Alternativa
                    <textarea
                      value={e.alternative}
                      onChange={(ev) =>
                        change((p) => {
                          p.workouts[wi].exercises[ei].alternative =
                            ev.target.value;
                        })
                      }
                    />
                  </label>
                  <div className="wide editor-actions">
                    <button
                      className="secondary"
                      disabled={ei === 0}
                      onClick={() =>
                        change((p) => {
                          const list = p.workouts[wi].exercises;
                          [list[ei], list[ei - 1]] = [list[ei - 1], list[ei]];
                        })
                      }
                    >
                      <ChevronUp size={16} /> Subir
                    </button>
                    <button
                      className="secondary"
                      disabled={ei === w.exercises.length - 1}
                      onClick={() =>
                        change((p) => {
                          const list = p.workouts[wi].exercises;
                          [list[ei], list[ei + 1]] = [list[ei + 1], list[ei]];
                        })
                      }
                    >
                      <ChevronDown size={16} /> Descer
                    </button>
                    <button
                      className="text-button danger"
                      onClick={() => {
                        if (confirm("Remover exercício da ficha?"))
                          change((p) => {
                            p.workouts[wi].exercises.splice(ei, 1);
                          });
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button
            className="text-button"
            onClick={() =>
              change((p) => {
                const e = blankExercise();
                p.workouts[wi].exercises.push(e);
                setOpen(e.id);
              })
            }
          >
            <Plus size={18} /> Adicionar exercício
          </button>
        </section>
      ))}
      <button
        className="secondary"
        onClick={() =>
          change((p) => {
            p.workouts.push({
              id: uid(),
              name: "Novo treino",
              day: 1,
              exercises: [],
            });
          })
        }
      >
        <Plus size={18} /> Adicionar dia de treino
      </button>
    </>
  );
}
