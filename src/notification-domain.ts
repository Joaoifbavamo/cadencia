export const timerRemaining = (deadline: number, now = Date.now()) =>
  Math.max(0, Math.ceil((deadline - now) / 1000));
export const restTag = (sessionId: string, deadline: number) =>
  "rest-" + sessionId + "-" + deadline;
export function nextDailyReminder(time: string, now = new Date()): Date {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw Error("Horário inválido.");
  const zone = "America/Sao_Paulo";
  const parts = (d: Date) =>
    Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(d)
        .map((p) => [p.type, p.value]),
    );
  const p = parts(now);
  const target = Date.parse(
    p.year + "-" + p.month + "-" + p.day + "T" + time + ":00Z",
  );
  const convert = (t: number) => {
    let guess = t;
    for (let i = 0; i < 3; i++) {
      const v = parts(new Date(guess));
      const local = Date.parse(
        v.year +
          "-" +
          v.month +
          "-" +
          v.day +
          "T" +
          v.hour +
          ":" +
          v.minute +
          ":" +
          v.second +
          "Z",
      );
      guess += t - local;
    }
    return new Date(guess);
  };
  const today = convert(target);
  return today > now ? today : convert(target + 86400000);
}
