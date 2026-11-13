let context: AudioContext | null = null;
interface PendingAlarm {
  deadline: number;
  sound: boolean;
  timer?: ReturnType<typeof setTimeout>;
  wake: () => void;
}
const alarms = new Map<string, PendingAlarm>();
const CATCH_UP_MS = 5 * 60 * 1000;
export async function unlockAlarm() {
  try {
    const Constructor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Constructor) return false;
    context ??= new Constructor();
    if (context.state !== "running") await context.resume();
    return context.state === "running";
  } catch {
    return false;
  }
}
export function alarmReady() {
  return context?.state === "running";
}
export function playAlarm() {
  if (!context || context.state !== "running") return false;
  const now = context.currentTime;
  [660, 880, 660].forEach((frequency, i) => {
    const tone = context!.createOscillator(),
      gain = context!.createGain();
    tone.type = "sine";
    tone.frequency.value = frequency;
    gain.gain.setValueAtTime(0, now + i * 0.3);
    gain.gain.linearRampToValueAtTime(0.15, now + i * 0.3 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.3 + 0.23);
    tone.connect(gain);
    gain.connect(context!.destination);
    tone.start(now + i * 0.3);
    tone.stop(now + i * 0.3 + 0.25);
    tone.onended = () => {
      tone.disconnect();
      gain.disconnect();
    };
  });
  return true;
}
/** Stop local sound and visibility catch-up when a rest is explicitly ended. */
export function cancelAlarm(sessionId: string) {
  const alarm = alarms.get(sessionId);
  if (!alarm) return;
  clearTimeout(alarm.timer);
  document.removeEventListener("visibilitychange", alarm.wake);
  alarms.delete(sessionId);
}
/** One delivery key per session/deadline, shared by timeout, restore and visibility. */
export function armAlarm(sessionId: string, deadline: number, sound: boolean) {
  cancelAlarm(sessionId);
  if (!Number.isFinite(deadline) || deadline <= 0) return;
  const alarm: PendingAlarm = { deadline, sound, wake: () => {} };
  const current = () =>
    alarms.get(sessionId) === alarm &&
    localStorage.getItem("rest-" + sessionId) === String(deadline);
  const wake = () => {
    if (!current()) return cancelAlarm(sessionId);
    const remaining = deadline - Date.now();
    if (remaining > 0) return;
    if (remaining < -CATCH_UP_MS) return cancelAlarm(sessionId);
    // A hidden timeout leaves the listener armed until the app is visible.
    if (document.visibilityState !== "visible") return;
    const key = "heard-" + sessionId;
    if (localStorage.getItem(key) === String(deadline))
      return cancelAlarm(sessionId);
    localStorage.setItem(key, String(deadline));
    let resuming = false;
    if (alarm.sound) {
      if (alarmReady()) playAlarm();
      else if (context) {
        resuming = true;
        // A previously unlocked context can be suspended while backgrounded.
        // Resume it without creating a new context outside a user gesture.
        void context
          .resume()
          .then(() => {
            if (
              current() &&
              alarm.sound &&
              document.visibilityState === "visible"
            )
              playAlarm();
          })
          .catch(() => {})
          .finally(() => {
            if (alarms.get(sessionId) === alarm) cancelAlarm(sessionId);
          });
      }
    }
    clearTimeout(alarm.timer);
    document.removeEventListener("visibilitychange", wake);
    // An asynchronous resume keeps its entry until it can check whether the
    // rest and the user's sound choice are still current.
    window.dispatchEvent(
      new CustomEvent("cadencia-rest-ended", {
        detail: { sessionId, deadline },
      }),
    );
    if (!resuming && alarms.get(sessionId) === alarm) cancelAlarm(sessionId);
  };
  alarm.wake = wake;
  alarms.set(sessionId, alarm);
  document.addEventListener("visibilitychange", wake);
  if (deadline > Date.now())
    alarm.timer = setTimeout(wake, deadline - Date.now());
  else wake();
}
