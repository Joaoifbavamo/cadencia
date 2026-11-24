export const PUSH_BATCH_SIZE = 5;
export const PUSH_TIMEOUT_MS = 10000;
type ClaimedJob = { id: string; expires_at: string; lease_until: string };

// Recheck both before and after authorization: a slow database call consumes
// lease time too. Reserve one full provider timeout plus settlement headroom.
export async function processPushJobs<T extends ClaimedJob>(
  jobs: T[],
  io: {
    now: () => number;
    authorize: (job: T) => Promise<unknown | null>;
    send: (job: T, subscription: unknown) => Promise<number>;
    settle: (job: T, outcome: "delivered" | "gone") => Promise<boolean>;
  },
) {
  let delivered = 0;
  const ready = (job: T) =>
    Date.parse(job.expires_at) > io.now() &&
    Date.parse(job.lease_until) > io.now() + PUSH_TIMEOUT_MS + 5000;
  for (const job of jobs.slice(0, PUSH_BATCH_SIZE)) {
    try {
      if (!ready(job)) continue;
      const subscription = await io.authorize(job);
      if (!subscription || !ready(job)) continue;
      const status = await io.send(job, subscription);
      if (status >= 200 && status < 300) {
        if (await io.settle(job, "delivered")) delivered++;
      } else if (status === 404 || status === 410) {
        await io.settle(job, "gone");
      }
    } catch {
      // The lease permits bounded retries. Never log subscriptions or secrets.
    }
  }
  return delivered;
}
