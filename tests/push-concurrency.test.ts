import { test } from "node:test";
import assert from "node:assert/strict";
import { createRestQueue, restDeadlineCurrent } from "../src/rest-queue.ts";
import { processPushJobs } from "../supabase/functions/push/worker.ts";

test("a delayed old deadline cannot replace the next rest; foreground cleanup remains allowed", async () => {
  const queue = createRestQueue();
  let stored: string | null = "1000";
  const jobs: number[] = [];
  await queue.cancel("s", async () => {
    stored = null;
  });
  await queue.schedule("s", async () => {
    if (restDeadlineCurrent(1000, stored)) jobs.push(1000);
  });
  stored = "2000";
  await queue.schedule("s", async () => {
    if (restDeadlineCurrent(1000, stored)) jobs.push(1000);
  });
  await queue.schedule("s", async () => {
    if (restDeadlineCurrent(2000, stored)) jobs.push(2000);
  });
  assert.deepEqual(jobs, [2000]);
  assert.equal(restDeadlineCurrent(0, null), true);
});

test("five provider timeouts consume only 50s and do not prevent subsequent jobs", async () => {
  let now = 0;
  let settled = 0;
  const jobs = Array.from({ length: 5 }, (_, id) => ({
    id: String(id),
    expires_at: new Date(120000).toISOString(),
    lease_until: new Date(90000).toISOString(),
  }));
  await processPushJobs(jobs, {
    now: () => now,
    authorize: async () => ({}),
    send: async () => {
      now += 10000;
      throw Error("TimeoutError");
    },
    settle: async () => {
      settled++;
      return true;
    },
  });
  assert.equal(now, 50000);
  assert.equal(settled, 0);
});

test("cancel removes an in-flight insert and invalidates queued work; next rest in same workout works", async () => {
  const queue = createRestQueue();
  const jobs = new Set<string>();
  let release!: () => void;
  const network = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const inserting = new Promise<void>((resolve) => {
    started = resolve;
  });
  const pending = queue.schedule("finished", async () => {
    started();
    await network;
    jobs.add("finished");
  });
  await inserting;
  const late = queue.schedule("finished", async () => {
    jobs.add("finished");
  });
  const cancelled = queue.cancel("finished", async () => {
    jobs.delete("finished");
  });
  release();
  await Promise.all([pending, cancelled, late]);
  assert.deepEqual([...jobs], []);
  await queue.schedule("finished", async () => {
    jobs.add("next rest");
  });
  assert.deepEqual([...jobs], ["next rest"]);
});

test("cancel invalidates a schedule suspended before its insert; queue recovers from errors", async () => {
  const queue = createRestQueue();
  let release!: () => void;
  const network = new Promise<void>((resolve) => {
    release = resolve;
  });
  let inserts = 0;
  const pending = queue.schedule("s", async (valid) => {
    await network;
    if (valid()) inserts++;
  });
  const cancelled = queue.cancel("s", async () => {
    throw Error("offline");
  });
  release();
  await pending;
  await assert.rejects(cancelled);
  await queue.schedule("next", async () => {
    inserts++;
  });
  assert.equal(inserts, 1);
});

test("five slow deliveries stay inside a 90 second lease; expired and revoked jobs never send", async () => {
  let now = 0;
  const jobs = Array.from({ length: 8 }, (_, id) => ({
    id: String(id),
    expires_at: new Date(id === 1 ? 5000 : 120000).toISOString(),
    lease_until: new Date(90000).toISOString(),
  }));
  const sent: string[] = [];
  const delivered = await processPushJobs(jobs, {
    now: () => now,
    authorize: async (job) => (job.id === "2" ? null : { endpoint: "mock" }),
    send: async (job) => {
      sent.push(job.id);
      now += 10000;
      return 201;
    },
    settle: async () => true,
  });
  assert.deepEqual(sent, ["0", "3", "4"]);
  assert.equal(delivered, 3);
  assert.equal(now, 30000);
});

test("lease stolen or elapsed during authorization never sends or finalizes; failed delivery is retriable", async () => {
  let now = 0;
  let sent = 0;
  let settled = 0;
  const job = {
    id: "a",
    expires_at: new Date(120000).toISOString(),
    lease_until: new Date(90000).toISOString(),
  };
  await processPushJobs([job], {
    now: () => now,
    authorize: async () => {
      now = 85000;
      return {};
    },
    send: async () => {
      sent++;
      return 201;
    },
    settle: async () => {
      settled++;
      return false;
    },
  });
  assert.equal(sent, 0);
  assert.equal(settled, 0);
  now = 0;
  const delivered = await processPushJobs([job], {
    now: () => now,
    authorize: async () => ({}),
    send: async () => 201,
    settle: async () => false,
  });
  assert.equal(delivered, 0);
});
