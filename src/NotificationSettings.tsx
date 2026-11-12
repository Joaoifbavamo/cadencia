import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import {
  enablePush,
  currentPush,
  updatePush,
  testPush,
  supportsPush,
} from "./notifications.ts";
export default function NotificationSettings({ demo }: { demo: boolean }) {
  const [row, setRow] = useState<any>(null),
    [time, setTime] = useState("20:00"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = async () => {
    if (demo) return;
    const data = await currentPush();
    setRow(data);
    if (data?.daily_time) setTime(data.daily_time.slice(0, 5));
  };
  useEffect(() => {
    void refresh().catch(() => {});
  }, []);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="settings-section notification-settings">
      <h2>Notificações</h2>
      <p>Alertas de descanso e lembretes diários neste aparelho.</p>
      {demo ? (
        <p className="fine">
          Entre na conta pessoal para cadastrar notificações. A demonstração não
          envia alertas.
        </p>
      ) : (
        <>
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              act(async () => {
                await enablePush();
                setMessage(
                  "Aparelho cadastrado. Envie um teste para conferir.",
                );
              })
            }
          >
            <Bell size={18} />
            {row?.enabled ? "Revalidar permissão" : "Ativar neste aparelho"}
          </button>
          {!supportsPush() && (
            <p className="fine">
              No iPhone, abra pela Tela de Início. Veja a aba Instalar. Web Push
              exige iOS 16.4 ou posterior e permissão; o atalho do perfil
              precisa ser conferido no aparelho.
            </p>
          )}
          {row?.enabled && (
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
                Avisar quando o descanso acabar
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
                      "Horário diário salvo. Fuso: Brasília/São Paulo.",
                    );
                  });
                }}
              >
                <label>
                  Horário do lembrete · Brasília
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
              <div className="button-row">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      await testPush();
                      setMessage(
                        "Teste enviado. Confira a central de notificações.",
                      );
                    })
                  }
                >
                  Enviar notificação de teste
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      await updatePush({ enabled: false });
                      const sub = await (
                        await navigator.serviceWorker.ready
                      ).pushManager.getSubscription();
                      await sub?.unsubscribe();
                      setMessage("Alertas desativados neste aparelho.");
                    })
                  }
                >
                  <BellOff size={16} />
                  Desativar neste aparelho
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <p className="fine">
        Com o app aberto, o relógio usa o prazo exato. Fora dele, o servidor
        verifica a cada minuto: o aviso pode atrasar cerca de um minuto ou mais
        por rede, modo Foco ou entrega do iOS. Alertas remotos precisam de
        conexão.
      </p>
      {message && (
        <p className="feedback" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
