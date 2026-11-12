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
export async function requestPushPermission() {
  if (!supportsPush())
    throw Error(
      "Abra o Cadência instalado na Tela de Início do iPhone para permitir avisos.",
    );
  const result = await Notification.requestPermission();
  if (result !== "granted")
    throw Error(
      result === "denied"
        ? "Notificações bloqueadas. Altere a permissão do Cadência nos Ajustes do iPhone."
        : "A permissão ainda não foi concedida.",
    );
  return result;
}
export async function enablePush(registration?: ServiceWorkerRegistration) {
  if (!supportsPush())
    throw Error(
      "Este navegador não oferece Web Push. Confira a instalação na Tela de Início.",
    );
  if (Notification.permission !== "granted")
    throw Error("Permita os avisos primeiro; depois conecte este aparelho.");
  if (!registration?.active)
    throw Error(
      "Aguarde a preparação do app ou atualize a página e tente novamente.",
    );
  const text = VAPID_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(
    atob(text.padEnd(Math.ceil(text.length / 4) * 4, "=")),
    (c) => c.charCodeAt(0),
  );
  // Begin subscription in the tap handler, before any await or network request.
  let pending: Promise<PushSubscription>;
  try {
    pending = registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: bytes,
    });
  } catch {
    throw Error(
      "O iPhone não iniciou a inscrição. Abra pelo ícone da Tela de Início e toque novamente.",
    );
  }
  let subscription: PushSubscription;
  try {
    subscription = await pending;
  } catch (e) {
    const name = (e as DOMException)?.name;
    throw Error(
      name === "NotAllowedError"
        ? "O iPhone recusou a inscrição. Confira a permissão e abra pelo ícone instalado."
        : name === "InvalidStateError"
          ? "A inscrição anterior é incompatível. Use Refazer conexão e conecte novamente."
          : "Não foi possível inscrever o aparelho. Confira a internet e tente novamente.",
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    throw Error("Entre novamente na conta para conectar este aparelho.");
  const id = deviceId(user.id);
  const { data: old, error: readError } = await supabase
    .from("push_subscriptions")
    .select("daily_enabled,daily_time,rest_enabled")
    .eq("id", id)
    .maybeSingle();
  if (readError)
    throw Error(
      "O aparelho foi inscrito, mas a conta não respondeu. Confira a conexão e tente conectar novamente.",
    );
  const { error } = await supabase.from("push_subscriptions").upsert({
    id,
    user_id: user.id,
    subscription: subscription.toJSON(),
    enabled: true,
    ...(old || {}),
  });
  if (error)
    throw Error(
      "A inscrição não foi salva na conta. Confira o login e tente conectar novamente.",
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
  if (!localStorage.getItem("push-active")) return Promise.resolve();
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
  if (error) {
    const context = (error as { context?: Response }).context;
    if (context instanceof Response) {
      let detail: any;
      try {
        detail = await context.json();
      } catch {}
      if (typeof detail?.error === "string") throw Error(detail.error);
      if (context.status === 401)
        throw Error("Entre novamente na conta antes de testar os avisos.");
    }
    throw Error(
      "Não foi possível alcançar o serviço de avisos. Confira a conexão e tente novamente.",
    );
  }
  if (!data?.ok)
    throw Error(
      "O serviço não confirmou o envio. Reconecte este aparelho e tente novamente.",
    );
}
