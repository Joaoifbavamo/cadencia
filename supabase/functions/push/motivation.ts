export type MotivationSlot = { time: string; message: string };
export const DEFAULT_SLOTS: MotivationSlot[] = [
  { time: "09:00", message: "" },
  { time: "15:00", message: "" },
  { time: "19:00", message: "" },
];
const MESSAGES = [
  "Um passo de cada vez. Faça espaço para o que importa para você.",
  "Consistência também é respeitar seu ritmo. Confira como está seu dia.",
  "Seu próximo registro começa com uma decisão pequena.",
  "Treino e descanso fazem parte do caminho. Cuide do seu ritmo hoje.",
  "Não precisa ser perfeito. Valorize o que você consegue fazer hoje.",
  "Sua evolução acontece ao longo do tempo. Continue com calma e intenção.",
  "Se fizer sentido para hoje, reserve um momento para você.",
];
export function validateMotivation(name: string, slots: MotivationSlot[]) {
  const clean = name.trim();
  if (clean.length > 30 || /[\u0000-\u001f\u007f]/.test(clean))
    throw Error("Use um nome de até 30 caracteres.");
  if (!Array.isArray(slots) || slots.length < 1 || slots.length > 3)
    throw Error("Escolha de um a três horários.");
  const seen = new Set<string>();
  const result = slots.map((s) => {
    if (
      typeof s.time !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time) ||
      seen.has(s.time)
    )
      throw Error("Use horários válidos e diferentes.");
    seen.add(s.time);
    if (
      typeof s.message !== "string" ||
      s.message.trim().length > 160 ||
      /[\u0000-\u001f\u007f]/.test(s.message)
    )
      throw Error("Cada mensagem pode ter até 160 caracteres, em uma linha.");
    return { time: s.time, message: s.message.trim() };
  });
  return { name: clean, slots: result };
}
export function motivationBody(context: {
  name?: string;
  message?: string;
  day?: number;
  slot?: number;
}) {
  const name = String(context.name ?? "")
      .trim()
      .slice(0, 30),
    custom = String(context.message ?? "")
      .trim()
      .slice(0, 160);
  const index =
    Math.abs(
      Math.trunc(Number(context.day) || 1) +
        Math.trunc(Number(context.slot) || 0),
    ) % MESSAGES.length;
  return (name ? name + ", " : "") + (custom || MESSAGES[index]);
}
