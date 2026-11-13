import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Model } from "../model.ts";
import { visible, uid, validateImport, cleanupCandidates } from "../domain.ts";
import { download, Sheet } from "../components.tsx";
import ThemeControl from "../ThemeControl.tsx";
import NotificationSettings from "../NotificationSettings.tsx";
export default function Settings({
  model,
  onLogout,
  onInstall,
}: {
  model: Model;
  onLogout: () => void;
  onInstall: () => void;
}) {
  const profile = visible(model.docs, "profile")[0];
  const [profileBase, setProfileBase] = useState<string | null>(() =>
    profile ? JSON.stringify(profile.payload) : null,
  );
  const [bar, setBar] = useState(
    model.profile.barWeight === null ? "" : String(model.profile.barWeight),
  );
  const [increment, setIncrement] = useState(String(model.profile.increment));
  const [message, setMessage] = useState("");
  const [before, setBefore] = useState("");
  const [preview, setPreview] = useState(false);
  const [summaries, setSummaries] = useState(false);
  const [busy, setBusy] = useState(false);
  const candidates = cleanupCandidates(model.docs, before);
  const attempt = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const exportData = () =>
    download(
      "cadencia-backup-" + new Date().toISOString().slice(0, 10) + ".json",
      JSON.stringify(
        {
          format: "cadencia",
          version: 1,
          documents: model.docs
            .filter((d) => !d.deleted)
            .map(({ id, kind, payload }) => ({ id, kind, payload })),
        },
        null,
        2,
      ),
    );
  return (
    <>
      <div className="page-title">
        <h1>Ajustes</h1>
      </div>
      <section className="settings-section appearance-section">
        <h2>Aparência</h2>
        <p>Escolha o tema ou acompanhe o sistema do iPhone.</p>
        <ThemeControl />
      </section>
      <NotificationSettings demo={model.demo} onInstall={onInstall} />
      <details className="settings-section settings-disclosure">
        <summary>
          <h2>Cargas e aquecimento</h2>
        </summary>
        <p>
          Informe o peso real da barra usada. O campo de carga dos exercícios
          com barra sempre inclui a barra.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void attempt(async () => {
              const b =
                bar.trim() === "" ? null : Number(bar.replace(",", "."));
              const inc = Number(increment.replace(",", "."));
              if (
                (b !== null && (!Number.isFinite(b) || b <= 0 || b > 100)) ||
                !Number.isFinite(inc) ||
                inc <= 0 ||
                inc > 100
              )
                throw Error("Revise peso da barra e incremento.");
              const payload = {
                ...model.profile,
                barWeight: b,
                increment: inc,
              };
              await model.save(
                profile?.id ?? model.singletonIds?.profile ?? uid(),
                "profile",
                payload,
                false,
                profileBase,
              );
              setProfileBase(JSON.stringify(payload));
              setMessage("Preferências salvas localmente.");
            });
          }}
        >
          <div className="form-pair">
            <label>
              Peso da barra em kg
              <input
                inputMode="decimal"
                value={bar}
                onChange={(e) => setBar(e.target.value)}
                placeholder="Confirmar na academia"
              />
            </label>
            <label>
              Menor aumento total em kg
              <input
                inputMode="decimal"
                value={increment}
                onChange={(e) => setIncrement(e.target.value)}
              />
            </label>
          </div>
          <p className="fine">
            Ex.: anilha de 1,25 kg de cada lado representa aumento total de 2,5
            kg. Halteres e máquinas podem exigir ajuste manual das aproximações.
          </p>
          <button className="primary" disabled={busy}>
            Salvar preferências
          </button>
        </form>
      </details>
      <section className="settings-section installation-shortcut">
        <button className="text-button" onClick={onInstall}>
          Instalar no iPhone <ArrowRight size={16} />
        </button>
      </section>
      <details className="settings-section settings-disclosure">
        <summary>
          <h2>Seus dados</h2>
        </summary>
        <p>
          A ficha pessoal é importada aqui e fica na sua conta. O código público
          não contém seu histórico.
        </p>
        <div className="button-row">
          <button className="secondary" onClick={exportData}>
            Exportar backup JSON
          </button>
          <button
            className="secondary"
            onClick={() => {
              const sets = visible(model.docs, "set");
              const csv = [
                [
                  "sessao",
                  "exercicio",
                  "serie",
                  "carga_kg",
                  "reps",
                  "rir",
                  "aparelho",
                ],
                ...sets.map((d) => [
                  d.payload.sessionId,
                  d.payload.exerciseId,
                  d.payload.index + 1,
                  d.payload.load,
                  d.payload.reps,
                  d.payload.rir ?? "",
                  d.payload.machine,
                ]),
              ]
                .map((row) =>
                  row
                    .map((v) => '"' + String(v).replaceAll('"', '""') + '"')
                    .join(";"),
                )
                .join("\r\n");
              download(
                "cadencia-series.csv",
                "\ufeff" + csv,
                "text/csv;charset=utf-8",
              );
            }}
          >
            Exportar séries CSV
          </button>
        </div>
        <label className="import-file">
          Importar ficha ou backup JSON
          <input
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              void attempt(async () => {
                if (f.size > 20000000) throw Error("Arquivo maior que 20 MB.");
                const input = validateImport(JSON.parse(await f.text()));
                if (
                  !confirm(
                    `Importar ${input.documents.length} registros? IDs existentes serão atualizados com controle de conflito. Exporte um backup antes.`,
                  )
                )
                  return;
                await model.importDocuments(input);
                setMessage(
                  "Importação salva localmente. Confira a sincronização.",
                );
                e.target.value = "";
              });
            }}
          />
        </label>
        <p className="fine">
          Importe somente arquivos seus. Arquivos não incluem senha ou sessão de
          login.
        </p>
      </details>
      <details className="settings-section settings-disclosure">
        <summary>
          <h2>Gerenciar histórico</h2>
        </summary>
        <p>
          Limpeza automática desligada. Sessões em andamento e a última
          referência de cada variação são preservadas.
        </p>
        {model.cleanup?.job && (
          <div className="feedback" role="status" aria-live="polite">
            <p>{model.cleanup.job.message}</p>
            <p>
              {model.cleanup.job.processed} de {model.cleanup.job.total}{" "}
              registros preparados · {model.cleanup.job.skipped} preservados
              após mudanças.
            </p>
            <progress
              value={model.cleanup.job.processed + model.cleanup.job.skipped}
              max={Math.max(1, model.cleanup.job.total)}
              aria-label="Progresso da limpeza"
            />
            {!["complete", "cancelled"].includes(model.cleanup.job.status) && (
              <div className="button-row">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void attempt(async () => {
                      await model.cleanup!.step();
                    })
                  }
                >
                  Continuar próximo lote
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void attempt(async () => {
                      await model.cleanup!.cancel();
                    })
                  }
                >
                  Cancelar restante
                </button>
              </div>
            )}
            {model.cleanup.job.recovery && (
              <div>
                <button
                  className="secondary"
                  disabled={
                    busy || model.docs.some((d) => d.dirty || d.conflict)
                  }
                  onClick={() => void attempt(() => model.cleanup!.restore())}
                >
                  Restaurar último lote
                </button>
                <p className="fine">
                  A restauração fica disponível após confirmar a sincronização
                  das pendências, sem conflitos. Ela recupera somente o último
                  lote neste aparelho e cancela o restante da limpeza. Continuar
                  outro lote substitui esta recuperação local.
                </p>
              </div>
            )}
            <p className="fine">
              O restante pode ser retomado após reabrir este aparelho. Cancelar
              preserva registros ainda não preparados. Lotes já registrados
              aguardam confirmação antes de poder restaurar o último lote.
            </p>
          </div>
        )}
        <label>
          Registros anteriores a
          <input
            type="date"
            value={before}
            onChange={(e) => setBefore(e.target.value)}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={summaries}
            onChange={(e) => setSummaries(e.target.checked)}
          />{" "}
          Manter contagem mensal dos treinos removidos
        </label>
        <button
          className="secondary"
          disabled={!before || busy}
          onClick={() => {
            setMessage("");
            setPreview(true);
          }}
        >
          Ver prévia da limpeza
        </button>
      </details>
      <section className="settings-section">
        <h2>Conta e privacidade</h2>
        <p>
          O salvamento neste aparelho acontece primeiro. “Sincronizado” só
          aparece após o servidor confirmar. Pendências podem se perder se o
          navegador apagar o armazenamento; exporte backups periodicamente.
        </p>
        <button className="secondary" onClick={onLogout}>
          Sair da conta
        </button>
      </section>
      {message && (
        <p className="feedback" role="status">
          {message}
        </p>
      )}
      {message.includes("mudou em outro lugar") && (
        <button
          className="secondary"
          onClick={() => {
            setBar(
              model.profile.barWeight === null
                ? ""
                : String(model.profile.barWeight),
            );
            setIncrement(String(model.profile.increment));
            setProfileBase(profile ? JSON.stringify(profile.payload) : null);
            setMessage(
              "Preferências atuais carregadas. Revise antes de salvar.",
            );
          }}
        >
          Carregar preferências atuais
        </button>
      )}
      {preview && (
        <Sheet title="Prévia da limpeza" onClose={() => setPreview(false)}>
          {message && (
            <p className="error" role="alert">
              {message}
            </p>
          )}
          <p>
            {candidates.length} registros anteriores a {before} poderão ser
            removidos. Os últimos treinos usados como referência e rascunhos
            serão mantidos.
          </p>
          <p>
            Apenas o último lote pode ser restaurado neste aparelho. Para
            recuperar lotes anteriores, exporte um backup antes de continuar.
          </p>
          {model.cleanup?.job?.recovery && (
            <p>
              Esta limpeza substituirá a recuperação local do lote anterior.
            </p>
          )}
          <button className="secondary" onClick={exportData}>
            Exportar backup
          </button>
          <button
            className="danger-button"
            disabled={busy || !candidates.length}
            onClick={() =>
              void attempt(async () => {
                if (!model.cleanup) throw Error("Armazenamento indisponível.");
                await model.cleanup.start(before, summaries);
                setPreview(false);
                setMessage(
                  "Limpeza salva neste aparelho. Acompanhe os lotes abaixo.",
                );
              })
            }
          >
            Confirmar exclusão dos detalhes
          </button>
        </Sheet>
      )}
    </>
  );
}
