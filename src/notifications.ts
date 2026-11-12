import { supabase } from "./auth.ts";
import { VAPID_PUBLIC_KEY } from "./push-config.ts";
import { restTag } from "./notification-domain.ts";
export const supportsPush = () =>
  typeof Notification !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window;
export function deviceId(account: string) {
  const key = "push-device-" + account;
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
export async function enablePush() {
  if (!supportsPush())
    throw Error(
      "No iPhone, instale o app na Tela de Início e abra pelo ícone para permitir notificações.",
    );
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw Error(
      "Permissão não concedida. Você pode alterá-la nos Ajustes do iPhone.",
    );
  if (!(await navigator.serviceWorker.getRegistration()))
    throw Error(
      "A instalação está sendo preparada. Feche e abra o app e tente novamente.",
    );
  const registration = await navigator.serviceWorker.ready;
  const bytes = Uint8Array.from(
    atob(VAPID_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: bytes,
    }));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw Error("Entre na sua conta.");
  const id = deviceId(user.id);
  const { data: old } = await supabase
    .from("push_subscriptions")
    .select("daily_enabled,daily_time,rest_enabled")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("push_subscriptions").upsert({
    id,
    user_id: user.id,
    subscription: subscription.toJSON(),
    enabled: true,
    ...(old || {}),
  });
  if (error)
    throw Error(
      "Não foi possível cadastrar este aparelho. Confira sua conexão e acesso à conta.",
    );
  localStorage.setItem("push-active", id);
  localStorage.setItem("push-rest", String(old?.rest_enabled !== false));
  return id;
}
export async function currentPush() {
  const {
    data: { user },
  } = await supabase.auth
    .getSession()
    .then((r) => ({ data: { user: r.data.session?.user } }));
  if (!user) return null;
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id,enabled,daily_enabled,daily_time,rest_enabled")
    .eq("id", deviceId(user.id))
    .maybeSingle();
  if (error) throw Error("Não foi possível conferir as notificações.");
  return data;
}
export async function updatePush(values: {
  daily_enabled?: boolean;
  daily_time?: string;
  rest_enabled?: boolean;
  enabled?: boolean;
}) {
  const row = await currentPush();
  if (!row) throw Error("Ative primeiro as notificações deste aparelho.");
  const { error } = await supabase
    .from("push_subscriptions")
    .update(values)
    .eq("id", row.id);
  if (error) throw Error("Não foi possível salvar os avisos.");
  if (values.rest_enabled !== undefined)
    localStorage.setItem("push-rest", String(values.rest_enabled));
  if (values.enabled === false) localStorage.removeItem("push-active");
}
let queue: Promise<unknown> = Promise.resolve();
export function scheduleRest(sessionId: string, deadline: number) {
  if(!localStorage.getItem('push-active'))return Promise.resolve();
  const task = async () => {
    const row = await currentPush();
    if (!row?.enabled || !row.rest_enabled) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const { error: remove } = await supabase
      .from("push_jobs")
      .delete()
      .eq("subscription_id", row.id)
      .eq("kind", "rest")
      .is("delivered_at", null);
    if (remove) throw remove;
    if (deadline > Date.now()) {
      const { error } = await supabase.from("push_jobs").insert({
        user_id: session.user.id,
        subscription_id: row.id,
        kind: "rest",
        tag: restTag(sessionId, deadline),
        due_at: new Date(deadline).toISOString(),
        expires_at: new Date(deadline + 300000).toISOString(),
      });
      if (error) throw error;
    }
  };
  const next = queue.then(task);
  queue = next.catch(() => {});
  return next;
}
export async function foregroundRest(sessionId: string, deadline: number) {
  if (
    typeof Notification !== "undefined" &&
    Notification.permission === "granted" &&
    !!localStorage.getItem("push-active") &&
    localStorage.getItem("push-rest") !== "false" &&
    document.visibilityState === "visible"
  ) {
    const r = await navigator.serviceWorker?.getRegistration();
    await r?.showNotification("Descanso concluído", {
      body: "Quando estiver pronto, continue a próxima série.",
      tag: restTag(sessionId, deadline),
      icon: new URL("icons/icon-192.png", location.href).href,
    });
    await scheduleRest(sessionId, 0).catch(() => {});
  }
}
export async function testPush() {
  const row = await currentPush();
  if (!row?.enabled)
    throw Error("Ative as notificações neste aparelho primeiro.");
  const { data, error } = await supabase.functions.invoke("cadencia-push", {
    body: { subscriptionId: row.id },
  });
  if (error || !data?.ok)
    throw Error(
      "Não foi possível enviar o teste. Confira a conexão ou aguarde um minuto.",
    );
}
