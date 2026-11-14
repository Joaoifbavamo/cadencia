import { useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import {
  DEFAULT_SLOTS,
  motivationBody,
  validateMotivation,
  type MotivationSlot,
} from "./motivation.ts";
export default function MotivationEditor({
  initial,
  previewOnly = false,
  onSave,
}: {
  initial?: {
    motivation_enabled?: boolean;
    motivation_name?: string;
    motivation_slots?: MotivationSlot[];
  };
  previewOnly?: boolean;
  onSave: (data: {
    motivation_enabled: boolean;
    motivation_name: string;
    motivation_slots: MotivationSlot[];
  }) => Promise<void>;
}) {
  const [enabled, setEnabled] = useState(initial?.motivation_enabled ?? false),
    [name, setName] = useState(initial?.motivation_name ?? ""),
    [slots, setSlots] = useState<MotivationSlot[]>(
      initial?.motivation_slots?.length
        ? initial.motivation_slots
        : DEFAULT_SLOTS.map((s) => ({ ...s })),
    ),
    [preview, setPreview] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const day = Number(
    new Intl.DateTimeFormat("en", {
      timeZone: "America/Sao_Paulo",
      day: "numeric",
    }).format(new Date()),
  );
  const selected = slots[Math.min(preview, slots.length - 1)];
  const change = (i: number, key: keyof MotivationSlot, value: string) =>
    setSlots((all) =>
      all.map((s, n) => (n === i ? { ...s, [key]: value } : s)),
    );
  return (
    <details className="motivation-settings">
      <summary>
        Mensagens motivacionais{" "}
        <span>{initial?.motivation_enabled ? "Ativas" : "Personalizar"}</span>
      </summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setError("");
          try {
            const clean = validateMotivation(name, slots);
            setBusy(true);
            await onSave({
              motivation_enabled: enabled,
              motivation_name: clean.name,
              motivation_slots: clean.slots,
            });
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>
          Até três pausas de incentivo por dia, nos seus horários. Sem cobrança,
          inclusive nos dias de descanso.
        </p>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Receber mensagens motivacionais
        </label>
        <label>
          Como quer ser chamado? <span className="muted">Opcional</span>
          <input
            maxLength={30}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome ou apelido"
            autoComplete="nickname"
          />
        </label>
        <div className="motivation-slots">
          {slots.map((s, i) => (
            <fieldset key={i} onFocus={() => setPreview(i)}>
              <legend>Mensagem {i + 1}</legend>
              <div className="slot-time">
                <label>
                  Horário · Brasília
                  <input
                    aria-label={"Horário motivacional " + (i + 1)}
                    type="time"
                    required
                    value={s.time}
                    onChange={(e) => change(i, "time", e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="icon"
                  aria-label={"Remover horário " + (i + 1)}
                  disabled={slots.length === 1}
                  onClick={() => {
                    setSlots((all) => all.filter((_, n) => n !== i));
                    setPreview(0);
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <label>
                Mensagem{" "}
                <span className="muted">Opcional · até 160 caracteres</span>
                <input
                  aria-label={"Mensagem motivacional " + (i + 1)}
                  maxLength={160}
                  value={s.message}
                  onChange={(e) => change(i, "message", e.target.value)}
                  placeholder="Vazia: variar as frases automaticamente"
                />
              </label>
            </fieldset>
          ))}
        </div>
        {slots.length < 3 && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setSlots((all) => [...all, { time: "", message: "" }]);
              setPreview(slots.length);
            }}
          >
            <Plus size={16} />
            Adicionar horário
          </button>
        )}
        <div
          className="notification-preview"
          aria-label="Prévia da notificação"
        >
          <div>
            <Bell size={17} />
            <b>Cadência</b>
            <span>{selected.time || "Horário"}</span>
          </div>
          <p>
            {motivationBody({
              name,
              message: selected.message,
              day,
              slot: preview,
            })}
          </p>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {previewOnly ? (
          <p className="fine">
            Prévia da demonstração. Entre na conta e conecte o aparelho para
            salvar e receber.
          </p>
        ) : (
          <button className="secondary" disabled={busy}>
            {busy ? "Salvando…" : "Salvar mensagens e horários"}
          </button>
        )}
        <p className="fine">
          As frases automáticas variam a cada dia. A entrega pode atrasar por
          conexão ou modo Foco. Desligue a opção acima e salve para parar os
          avisos motivacionais.
        </p>
      </form>
    </details>
  );
}
