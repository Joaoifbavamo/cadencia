import { useState } from "react";
import { Sheet, formatDate } from "./components.tsx";
import type { Model } from "./model.ts";
import {
  archivePausedSession,
  restoreArchivedSession,
  type Entity,
} from "./domain.ts";
import { cancelRestForSession } from "./notifications.ts";
export function usePausedRemoval(model: Model) {
  const [target, setTarget] = useState<Entity | null>(null),
    [tray, setTray] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [last, setLast] = useState<string | null>(null);
  const archived = model.docs.filter(
    (d) => d.kind === "session" && !d.deleted && d.payload.archivedAt,
  );
  const restore = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      const d = model.docs.find((s) => s.id === id);
      if (!d || d.deleted || !d.payload.archivedAt)
        throw Error("Este treino já foi alterado. Atualize a lista.");
      await model.save(
        d.id,
        "session",
        restoreArchivedSession(d.payload),
        false,
        JSON.stringify(d.payload),
      );
      localStorage.removeItem("rest-"+id);
      setLast(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const requestRemove = (d: Entity) => {
    setError("");
    setTarget(d);
  };
  const controls = (
    <>
      {last && (
        <div className="feedback archive-feedback" role="status">
          <span>Treino retirado do histórico.</span>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void restore(last)}
          >
            Desfazer retirada
          </button>
        </div>
      )}
      {archived.length > 0 && (
        <button
          className="text-button archived-access"
          onClick={() => {
            setError("");
            setTray(true);
          }}
        >
          Treinos retirados ({archived.length})
        </button>
      )}
      {error && !target && !tray && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {target && (
        <Sheet
          title="Retirar treino pausado"
          onClose={() => !busy && setTarget(null)}
        >
          <p>
            <b>{target.payload.workout.name}</b> ·{" "}
            {formatDate(target.payload.actualDate)}
          </p>
          <p>
            O treino e suas séries sairão do histórico, da evolução e das cargas
            de referência. Os dados ficam guardados em Treinos retirados para
            você restaurar.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await model.save(
                  target.id,
                  "session",
                  archivePausedSession(target.payload),
                  false,
                  JSON.stringify(target.payload),
                );
                localStorage.removeItem("rest-" + target.id);
                if (!model.demo)
                  void cancelRestForSession(target.id).catch(() => {});
                setLast(target.id);
                setTarget(null);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Retirando…" : "Confirmar retirada"}
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => setTarget(null)}
          >
            Manter treino
          </button>
        </Sheet>
      )}
      {tray && (
        <Sheet
          title="Treinos retirados"
          onClose={() => !busy && setTray(false)}
        >
          <p>
            Restaurar devolve o treino e suas séries ao histórico, sem reativar
            o cronômetro antigo.
          </p>
          {archived.length === 0 && <p>Nenhum treino retirado.</p>}
          {archived.map((d) => (
            <div className="archive-row" key={d.id}>
              <div>
                <b>{d.payload.workout.name}</b>
                <p>{formatDate(d.payload.actualDate)}</p>
              </div>
              <button
                className="secondary"
                aria-label={"Restaurar " + d.payload.workout.name}
                disabled={busy}
                onClick={() => void restore(d.id)}
              >
                Restaurar
              </button>
            </div>
          ))}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </Sheet>
      )}
    </>
  );
  return { requestRemove, controls };
}
