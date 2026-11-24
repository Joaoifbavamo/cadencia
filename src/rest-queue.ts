// Invalidate suspended work synchronously; allow the next rest in the same
// workout to use a fresh generation after the previous rest was skipped.
export function restDeadlineCurrent(
  deadline: number,
  storedDeadline: string | null,
) {
  return deadline === 0 || storedDeadline === String(deadline);
}

export function createRestQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  const generations = new Map<string, number>();
  const enqueue = (task: () => Promise<void>) => {
    const next = tail.then(task);
    tail = next.catch(() => {});
    return next;
  };
  return {
    schedule(sessionId: string, task: (valid: () => boolean) => Promise<void>) {
      const generation = generations.get(sessionId) ?? 0;
      const valid = () => generation === (generations.get(sessionId) ?? 0);
      return enqueue(async () => {
        if (valid()) await task(valid);
      });
    },
    cancel(sessionId: string, task: () => Promise<void>) {
      generations.set(sessionId, (generations.get(sessionId) ?? 0) + 1);
      // Any insert already in flight finishes before this delete starts.
      return enqueue(task);
    },
  };
}
