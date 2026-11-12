import { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  Check,
  ArrowRight,
  RefreshCw,
  Circle,
} from "lucide-react";
import {
  enablePush,
  currentPush,
  updatePush,
  testPush,
  requestPushPermission,
} from "./notifications.ts";
import {
  notificationStep,
  readNotificationEnvironment,
} from "./notification-environment.ts";
export default function NotificationSettings({
  demo,
  onInstall,
}: {
  demo: boolean;
  onInstall: () => void;
}) {
  const [row, setRow] = useState<any>(null),
    [time, setTime] = useState("20:00"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [environment, setEnvironment] = useState(readNotificationEnvironment),
    [registration, setRegistration] = useState<ServiceWorkerRegistration>(),
    [subscribed, setSubscribed] = useState(false);
  const refresh = async () => {
    setEnvironment(readNotificationEnvironment());
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      setRegistration(reg);
      if (reg?.pushManager)
        setSubscribed(Boolean(await reg.pushManager.getSubscription()));
    }
    if (!demo) {
      const data = await currentPush();
      setRow(data);
      if (data?.daily_time) setTime(data.daily_time.slice(0, 5));
    }
  };
  useEffect(() => {
    void refresh().catch((e) => setMessage(e.message));
    const onFocus = () => {
      if (!document.hidden) void refresh().catch(() => {});
    };
    document.addEventListener("visibilitychange", onFocus);
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.ready.then((reg) => setRegistration(reg));
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, []);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMessage("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const step = notificationStep(environment);
  const connected = Boolean(
    row?.enabled && subscribed && environment.permission === "granted",
  );
  const statuses = [
    {
      name: environment.ios ? "App na Tela de Início" : "Navegador compatível",
      done: environment.ios
        ? environment.standalone
        : environment.notifications && environment.push && environment.worker,
    },
    {
      name: "Permissão do aparelho",
      done: environment.permission === "granted",
    },
    { name: "Conectado à sua conta", done: connected },
  ];
  return (
    <section className="settings-section notification-settings">
      <div className="section-heading">
        <h2>Notificações</h2>
        <Bell size={19} />
      </div>
      <p>Avisos de descanso e lembretes diários neste aparelho.</p>
      {demo ? (
        <p className="fine">
          A demonstração não envia avisos. Entre na sua conta para ativar neste
          aparelho.
        </p>
      ) : (
        <>
          <ol className="notification-checks">
            {statuses.map((s) => (
              <li key={s.name}>
                {s.done ? <Check size={17} /> : <Circle size={15} />}
                <span>{s.name}</span>
                <b>{s.done ? "Pronto" : "Pendente"}</b>
              </li>
            ))}
          </ol>
          {step === "install" ? (
            <div className="setup-help">
              <p>
                No iPhone, permita os avisos depois de abrir o Cadência pelo
                ícone da Tela de Início.
              </p>
              <button className="primary" onClick={onInstall}>
                Ver instalação <ArrowRight size={17} />
              </button>
            </div>
          ) : step === "unsupported" ? (
            <div className="setup-help">
              <p>
                Este navegador ou atalho não oferece Web Push. No iPhone, use
                iOS 16.4 ou posterior e a instalação pelo Safari. Se o perfil
                abrir sem essa função, use a opção Safari na aba Instalar.
              </p>
              <button className="secondary" onClick={onInstall}>
                Conferir instalação
              </button>
            </div>
          ) : step === "blocked" ? (
            <div className="setup-help">
              <p>
                O iPhone bloqueou os avisos. Nos Ajustes, procure Cadência →
                Notificações e permita. Depois volte aqui.
              </p>
              <button className="secondary" onClick={() => void act(refresh)}>
                <RefreshCw size={16} />
                Verificar novamente
              </button>
            </div>
          ) : step === "permission" ? (
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  await requestPushPermission();
                  setEnvironment(readNotificationEnvironment());
                  setMessage(
                    "Permissão concedida. Agora toque em Conectar este aparelho.",
                  );
                })
              }
            >
              <Bell size={18} />
              Permitir notificações
            </button>
          ) : (
            <button
              className={connected ? "secondary" : "primary"}
              disabled={busy || !registration?.active}
              onClick={() =>
                act(async () => {
                  await enablePush(registration);
                  setSubscribed(true);
                  setMessage(
                    "Aparelho conectado. Envie uma notificação de teste para conferir no iPhone.",
                  );
                })
              }
            >
              {connected ? <RefreshCw size={17} /> : <Bell size={18} />}{" "}
              {connected
                ? "Reconectar aparelho"
                : registration?.active
                  ? "Conectar este aparelho"
                  : "Preparando aplicativo…"}
            </button>
          )}
          {connected && (
            <div className="notification-options">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={row.rest_enabled}
                  disabled={busy}
                  onChange={(e) =>
                    act(() => updatePush({ rest_enabled: e.target.checked }))
                  }
                />
                Avisar no fim do descanso
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={row.daily_enabled}
                  disabled={busy}
                  onChange={(e) =>
                    act(() => updatePush({ daily_enabled: e.target.checked }))
                  }
                />
                Lembrete todos os dias
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(async () => {
                    await updatePush({ daily_time: time + ":00" });
                    setMessage(
                      "Horário salvo. O lembrete usa o fuso de Brasília.",
                    );
                  });
                }}
              >
                <label>
                  Horário diário · Brasília
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </label>
                <button className="secondary" disabled={busy}>
                  Salvar horário
                </button>
              </form>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    await testPush();
                    setMessage(
                      "O serviço aceitou o teste. Confira a Central de Notificações do iPhone.",
                    );
                  })
                }
              >
                Enviar notificação de teste <ArrowRight size={17} />
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    await updatePush({ enabled: false });
                    const sub =
                      await registration?.pushManager?.getSubscription();
                    await sub?.unsubscribe();
                    setSubscribed(false);
                    setMessage("Avisos desativados neste aparelho.");
                  })
                }
              >
                <BellOff size={16} />
                Desativar neste aparelho
              </button>
            </div>
          )}
          {(message || subscribed) &&
            !connected &&
            environment.permission === "granted" && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    if (row) await updatePush({ enabled: false });
                    await (
                      await registration?.pushManager?.getSubscription()
                    )?.unsubscribe();
                    setSubscribed(false);
                    setMessage(
                      "Inscrição anterior removida. Toque em Conectar este aparelho para criar uma nova.",
                    );
                  })
                }
              >
                <RefreshCw size={15} />
                Refazer conexão
              </button>
            )}
        </>
      )}
      {message && (
        <p className="feedback" role="status">
          {message}
        </p>
      )}
      <details className="notification-help">
        <summary>Como os avisos funcionam</summary>
        <p className="fine">
          Com o app aberto, o relógio usa o prazo exato. Fora dele, o servidor
          verifica a cada minuto; rede, modo Foco e iOS podem atrasar a entrega.
          O aviso remoto depende de internet.
        </p>
      </details>
    </section>
  );
}
