export async function seedFrontendDemo(page, sessions = 80) {
  await page.evaluate(async (sessions) => {
    const { LocalStore } = await import("/src/storage.ts"),
      { demoPlan } = await import("/src/demo.ts");
    const s = await new LocalStore("demo").open();
    const e = (id, kind, payload) => ({
      id,
      kind,
      payload,
      version: 1,
      change_seq: 1,
      deleted: false,
      dirty: false,
      mutationId: id,
      localSeq: 0,
    });
    const plan = structuredClone(demoPlan);
    plan.workouts[0].name = "Superior A · peito, costas, braços e ombros";
    plan.workouts[0].day = new Date().getDay();
    const records = [
      e(plan.id, "plan", plan),
      e("audit-profile", "profile", {
        barWeight: 20,
        increment: 2.5,
        timezone: "America/Sao_Paulo",
      }),
    ];
    for (let i = 0; i < sessions; i++) {
      let date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10),
        id = "audit-session-" + i;
      records.push(
        e(id, "session", {
          id,
          planId: plan.id,
          workout: plan.workouts[0],
          actualDate: key,
          plannedDate: key,
          startedAt: key + "T12:00:00Z",
          finishedAt: key + "T12:40:00Z",
          skipped: {},
        }),
      );
      for (let n = 0; n < 3; n++)
        records.push(
          e(id + "-set-" + n, "set", {
            sessionId: id,
            exerciseId: "demo-bench",
            index: n,
            load: 60 + (i % 10) * 2.5,
            reps: 8,
            rir: n === 2 ? null : 2,
            machine: "",
          }),
        );
    }
    await s.putMany(records);
    s.close();
  }, sessions);
  await page.waitForTimeout(100);
}
