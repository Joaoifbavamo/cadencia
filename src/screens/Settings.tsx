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
  const profile = visible(model.docs, "profile")[0];
  const attempt = async (fn: () => Promise<void>) => {
    setBusy(true);
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
              await model.save(profile?.id ?? uid(), "profile", {
                ...model.profile,
                barWeight: b,
                increment: inc,
              });
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
                for (const d of input.documents)
                  await model.save(d.id, d.kind, d.payload);
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
          onClick={() => setPreview(true)}
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
      {preview && (
        <Sheet title="Prévia da limpeza" onClose={() => setPreview(false)}>
          <p>
            {candidates.length} registros anteriores a {before} poderão ser
            removidos. Os últimos treinos usados como referência e rascunhos
            serão mantidos.
          </p>
          <p>
            A exclusão dos detalhes não pode ser desfeita sem backup. Recomendo
            exportar antes.
          </p>
          <button className="secondary" onClick={exportData}>
            Exportar backup
          </button>
          <button
            className="danger-button"
            disabled={busy || !candidates.length}
            onClick={() =>
              attempt(async () => {
                if (model.docs.some((d) => d.conflict))
                  throw Error("Resolva conflitos antes da limpeza.");
                const changes = [];
                if (summaries) {
                  const monthly = new Map<string, number>();
                  for (const d of candidates.filter(
                    (d) => d.kind === "session",
                  )) {
                    const m = d.payload.actualDate.slice(0, 7);
                    monthly.set(m, (monthly.get(m) || 0) + 1);
                  }
                  for (const [month, n] of monthly) {
                    const old = visible(model.docs, "summary").find(
                      (d) => d.payload.month === month,
                    );
                    changes.push({
                      id: old?.id ?? uid(),
                      kind: "summary" as const,
                      payload: {
                        month,
                        sessions: (old?.payload.sessions || 0) + n,
                      },
                    });
                  }
                }
                // Summaries and tombstones enter one IndexedDB transaction and one cloud transaction.
                await model.saveBatch([
                  ...changes,
                  ...candidates.map((d) => ({
                    id: d.id,
                    kind: d.kind,
                    payload: d.payload,
                    deleted: true,
                  })),
                ]);
                setPreview(false);
                setMessage(
                  "Limpeza registrada. Exclusões aguardam sincronização quando offline.",
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
