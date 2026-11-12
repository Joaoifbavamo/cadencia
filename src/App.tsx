import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChartNoAxesCombined,
  Cloud,
  CloudOff,
  Dumbbell,
  House,
  Settings as SettingsIcon,
  RefreshCw,
  ArrowRight,
  Check,
  WifiOff,
  Download,
} from "lucide-react";
import { supabase } from "./auth.ts";
import { LocalStore } from "./storage.ts";
import { SyncEngine } from "./sync.ts";
import {
  uid,
  visible,
  validPayload,
  snapshotSession,
  type Entity,
  type Kind,
  type Profile,
  type Workout as W,
} from "./domain.ts";
import { Mark, Sheet, download } from "./components.tsx";
import { demoPlan } from "./demo.ts";
import type { Model } from "./model.ts";
import Today from "./screens/Today.tsx";
import Workout from "./screens/Workout.tsx";
import Calendar from "./screens/Calendar.tsx";
import Progress from "./screens/Progress.tsx";
import PlanEditor from "./screens/PlanEditor.tsx";
import Settings from "./screens/Settings.tsx";
import ThemeControl from "./ThemeControl.tsx";
import Install from "./screens/Install.tsx";
const defaults: Profile = {
  barWeight: null,
  increment: 2.5,
  timezone: "America/Sao_Paulo",
};
export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [, render] = useState(0);
  const [tab, setTab] = useState("Hoje");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<Entity | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [recover, setRecover] = useState(
    location.hash.includes("type=recovery"),
  );
  const [welcome, setWelcome] = useState(false);
  const store = useRef<LocalStore | null>(null);
  const engine = useRef<SyncEngine | null>(null);
  const refresh = () => render((n) => n + 1);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) {
        setAccount(data.session?.user.id ?? null);
        setLoading(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecover(true);
      if (event === "SIGNED_OUT") {
        setSessionId(null);
        setReady(false);
      }
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION")
        setAccount(s?.user.id ?? null);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let local: LocalStore | null = null;
    setReady(false);
    const changed = () => {
      if (!cancelled) refresh();
    };
    const start = async () => {
      try {
        local = await new LocalStore(account).open();
        local.onChange = changed;
        if (cancelled) {
          local.close();
          return;
        }
        store.current = local;
        if (account === "demo" && !visible(local.docs, "plan").length)
          await local.mutate(demoPlan.id, "plan", demoPlan);
        if (cancelled) return;
        engine.current = new SyncEngine(local, changed);
        setReady(true);
        setWelcome(!local.docs.length && account !== "demo");
        void engine.current.run();
        if (account !== "demo")
          channel = supabase
            .channel("documents-" + account)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "documents",
                filter: "user_id=eq." + account,
              },
              () => {
                if (!cancelled) void engine.current?.run();
              },
            )
            .subscribe();
      } catch (e) {
        setError(
          "Não foi possível abrir o armazenamento deste navegador. Confira se há espaço e tente novamente.",
        );
      }
    };
    void start();
    const reconnect = () => {
      setOnline(navigator.onLine);
      void engine.current?.run();
    };
    const focus = () => {
      if (!document.hidden) void engine.current?.run();
    };
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", reconnect);
    document.addEventListener("visibilitychange", focus);
    const timer = setInterval(() => {
      if (!document.hidden) void engine.current?.run();
    }, 30000);
    return () => {
      cancelled = true;
      if (engine.current) engine.current.stopped = true;
      if (channel) void supabase.removeChannel(channel);
      local?.close();
      store.current = null;
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", reconnect);
      document.removeEventListener("visibilitychange", focus);
      clearInterval(timer);
    };
  }, [account]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab, sessionId]);
  async function saveBatch(
    changes: { id: string; kind: Kind; payload: any; deleted?: boolean }[],
  ) {
    if (changes.some((d) => !validPayload(d.kind, d.payload)))
      throw Error("Dados inválidos.");
    await store.current!.batch(changes);
    refresh();
    void engine.current?.run();
  }
  async function save(
    id: string,
    kind: Kind,
    payload: any,
    deleted = false,
    expectedPayload?: string | null,
  ) {
    if (!validPayload(kind, payload))
      throw Error("Revise os campos antes de salvar.");
    if (!store.current) throw Error("Armazenamento indisponível.");
    await store.current.mutate(id, kind, payload, deleted, expectedPayload);
    refresh();
    void engine.current?.run();
  }
  async function start(w: W, actual: string, planned: string) {
    try {
      const plan = visible(store.current!.docs, "plan")[0]?.payload;
      if (!plan) throw Error("Crie ou importe sua ficha.");
      const existing = visible(store.current!.docs, "session").find(
        (d) => !d.payload.finishedAt,
      );
      if (existing) {
        setSessionId(existing.id);
        return;
      }
      const s = snapshotSession(plan, w, actual, planned);
      await save(s.id, "session", s);
      setSessionId(s.id);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function logout() {
    const pending = store.current?.docs.some((d) => d.dirty);
    if (
      pending &&
      !confirm(
        "Existem registros pendentes. Eles ficam neste navegador e só serão enviados quando você entrar nesta mesma conta. Sair agora?",
      )
    )
      return;
    const clear =
      !pending &&
      confirm(
        "Limpar também os dados salvos neste aparelho? Os dados sincronizados continuam na conta.",
      );
    const old = account;
    setReady(false);
    setAccount(null);
    setSessionId(null);
    await supabase.auth.signOut({ scope: "local" });
    if (clear && old) {
      store.current?.close();
      indexedDB.deleteDatabase("cadencia-" + old);
      localStorage.removeItem("cursor-" + old);
    }
  }
  if (loading)
    return (
      <div className="loading">
        <Mark />
        <p>Abrindo seu diário…</p>
      </div>
    );
  if (recover) return <Recovery onDone={() => setRecover(false)} />;
  if (!account)
    return (
      <Login
        onDemo={() => {
          setAccount("demo");
          setTab("Hoje");
        }}
      />
    );
  if (!ready)
    return (
      <div className="loading">
        <Mark />
        <p>{error || "Preparando seus registros…"}</p>
      </div>
    );
  const docs = [...store.current!.docs];
  const model: Model = {
    docs,
    profile: visible(docs, "profile")[0]?.payload || defaults,
    demo: account === "demo",
    save,
    saveBatch,
    refresh,
  };
  const dirty = docs.filter((d) => d.dirty).length;
  const conflicts = docs.filter((d) => d.conflict);
  const status =
    account === "demo"
      ? "Demonstração local"
      : !online
        ? "Sem conexão"
        : engine.current?.error
          ? "Falha ao sincronizar"
          : conflicts.length
            ? "Revisar conflito"
            : engine.current?.running
              ? "Sincronizando…"
              : dirty
                ? `${dirty} pendente${dirty > 1 ? "s" : ""}`
                : "Sincronizado";
  const nav = [
    { name: "Hoje", icon: House },
    { name: "Agenda", icon: CalendarDays },
    { name: "Evolução", icon: ChartNoAxesCombined },
    { name: "Meu treino", icon: Dumbbell },
    { name: "Instalar", icon: Download },
  ];
  return (
    <div className={"app-shell " + (sessionId ? "training" : "")}>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("Hoje");
            setSessionId(null);
          }}
        >
          <Mark />
          <span>
            cadência<span className="brand-point">.</span>
          </span>
        </a>
        <nav>
          {nav.map((n) => (
            <button
              key={n.name}
              className={tab === n.name && !sessionId ? "active" : ""}
              onClick={() => {
                setTab(n.name);
                setSessionId(null);
              }}
            >
              <n.icon size={21} />
              <span>{n.name}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>
            Consistência se constrói
            <br />
            uma série por vez.
          </p>
          <button
            className={tab === "Ajustes" ? "active" : ""}
            onClick={() => {
              setTab("Ajustes");
              setSessionId(null);
            }}
          >
            <SettingsIcon size={19} /> Ajustes
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="app-top">
          <span className="mobile-brand">
            <Mark />
            cadência.
          </span>
          <span className="desktop-top-label">Seu diário de treino</span>
          <button
            className={
              "sync-status " +
              (dirty || !online || engine.current?.error ? "pending" : "")
            }
            onClick={() =>
              conflicts.length
                ? setConflict(conflicts[0])
                : void engine.current?.run()
            }
            title="Conferir sincronização"
          >
            {!online ? (
              <WifiOff size={16} />
            ) : dirty ? (
              <CloudOff size={16} />
            ) : (
              <Cloud size={16} />
            )}
            <span>{status}</span>
          </button>
          <button
            className="icon mobile-settings"
            aria-label="Ajustes"
            onClick={() => {
              setTab("Ajustes");
              setSessionId(null);
            }}
          >
            <SettingsIcon size={20} />
          </button>
        </header>
        {account === "demo" && (
          <div className="demo-notice">
            Modo de demonstração · ficha fictícia · salvo só neste aparelho{" "}
            <button className="text-button" onClick={() => void logout()}>
              Entrar na conta <ArrowRight size={15} />
            </button>
          </div>
        )}
        {engine.current?.error && (
          <div className="sync-error" role="alert">
            {engine.current.error}{" "}
            <button
              className="text-button"
              onClick={() => void engine.current?.run()}
            >
              <RefreshCw size={15} /> Tentar novamente
            </button>
          </div>
        )}
        <main>
          {sessionId ? (
            <Workout
              model={model}
              sessionId={sessionId}
              onClose={() => setSessionId(null)}
            />
          ) : tab === "Hoje" ? (
            <Today
              model={model}
              onStart={start}
              onResume={setSessionId}
              onPlan={() => setTab("Meu treino")}
              onAgenda={() => setTab("Agenda")}
            />
          ) : tab === "Agenda" ? (
            <Calendar model={model} onStart={start} onOpen={setSessionId} />
          ) : tab === "Evolução" ? (
            <Progress model={model} />
          ) : tab === "Meu treino" ? (
            <PlanEditor model={model} />
          ) : tab === "Instalar" ? (
            <Install />
          ) : (
            <Settings model={model} onLogout={() => void logout()} />
          )}
        </main>
        <footer className="app-footer">
          Cadência · o próximo registro é seu.
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Navegação principal">
        {nav.map((n) => (
          <button
            key={n.name}
            className={tab === n.name && !sessionId ? "active" : ""}
            onClick={() => {
              setTab(n.name);
              setSessionId(null);
            }}
          >
            <n.icon size={22} />
            <span>{n.name}</span>
          </button>
        ))}
      </nav>
      {error && (
        <Sheet title="Não foi possível continuar" onClose={() => setError("")}>
          <p role="alert">{error}</p>
          <button className="primary" onClick={() => setError("")}>
            Entendi
          </button>
        </Sheet>
      )}
      {welcome && (
        <Sheet title="Bem-vindo ao Cadência" onClose={() => setWelcome(false)}>
          <p>
            Importe sua ficha pessoal em Ajustes → Importar ficha. Antes do
            primeiro treino, confirme o peso da barra usada na academia.
          </p>
          <button
            className="primary"
            onClick={() => {
              setWelcome(false);
              setTab("Ajustes");
            }}
          >
            Configurar meu diário <ArrowRight size={18} />
          </button>
        </Sheet>
      )}
      {conflict && (
        <Sheet
          title="Duas versões deste registro"
          onClose={() => setConflict(null)}
        >
          <p>
            A mesma informação mudou em dois aparelhos. As duas versões estão
            preservadas; escolha qual usar.
          </p>
          <div className="conflict-versions">
            <div>
              <b>Neste aparelho</b>
              <pre>{JSON.stringify(conflict.payload, null, 2)}</pre>
            </div>
            <div>
              <b>Na conta{conflict.conflict?.deleted ? " · excluído" : ""}</b>
              <pre>{JSON.stringify(conflict.conflict?.payload, null, 2)}</pre>
            </div>
          </div>
          <button
            className="secondary"
            onClick={() =>
              download(
                "cadencia-conflito.json",
                JSON.stringify(conflict, null, 2),
              )
            }
          >
            Baixar as duas versões
          </button>
          <div className="button-row">
            <button
              className="primary"
              onClick={async () => {
                try {
                  await engine.current?.resolve(conflict.id, true);
                  setConflict(null);
                } catch (e) {
                  setError((e as Error).message);
                  setConflict(null);
                }
              }}
            >
              Usar deste aparelho
            </button>
            <button
              className="secondary"
              onClick={async () => {
                try {
                  await engine.current?.resolve(conflict.id, false);
                  setConflict(null);
                } catch (e) {
                  setError((e as Error).message);
                  setConflict(null);
                }
              }}
            >
              Usar da conta
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
function Login({ onDemo }: { onDemo: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(false);
  return (
    <div className="login-shell">
      <div className="login-story">
        <a className="brand" href="#">
          <Mark />
          <span>cadência.</span>
        </a>
        <div>
          <h1>
            Seu treino.
            <br />
            Seu ritmo.
            <br />
            <span>Sua evolução.</span>
          </h1>
          <p>
            Um lugar para fazer o simples,
            <br />
            com consistência.
          </p>
        </div>
        <div className="brand-art" aria-hidden="true">
          <Mark />
        </div>
        <p className="login-foot">Da primeira aproximação à última série.</p>
      </div>
      <div className="login-form">
        <div className="login-theme">
          <ThemeControl />
        </div>
        <div className="mobile-login-brand">
          <Mark />
          cadência.
        </div>
        <h2>
          {reset ? "Recuperar acesso" : "Seu próximo treino começa aqui."}
        </h2>
        <p>Entre na sua conta para continuar no iPhone e no computador.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              if (reset) {
                const { error } = await supabase.auth.resetPasswordForEmail(
                  String(f.get("email")),
                  { redirectTo: location.origin + location.pathname },
                );
                if (error) throw error;
                setError(
                  "Se o endereço tiver uma conta autorizada, enviaremos as instruções.",
                );
              } else {
                const { error } = await supabase.auth.signInWithPassword({
                  email: String(f.get("email")),
                  password: String(f.get("password")),
                });
                if (error) throw error;
              }
            } catch {
              setError(
                reset
                  ? "Não foi possível solicitar a recuperação. Tente novamente."
                  : "Não foi possível entrar. Confira email, senha e conexão.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Email
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="seu@email.com"
            />
          </label>
          {!reset && (
            <label>
              Senha
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="Sua senha"
              />
            </label>
          )}
          <button className="primary" disabled={busy}>
            {busy
              ? "Aguarde…"
              : reset
                ? "Enviar instruções"
                : "Entrar no meu diário"}
            <ArrowRight size={18} />
          </button>
          {error && (
            <p className="feedback" role="status">
              {error}
            </p>
          )}
        </form>
        <button
          className="text-button"
          onClick={() => {
            setReset(!reset);
            setError("");
          }}
        >
          {reset ? "Voltar para entrar" : "Esqueci minha senha"}
        </button>
        <div className="login-divider" />
        <button className="secondary" onClick={onDemo}>
          Conhecer a demonstração <ArrowRight size={18} />
        </button>
        <p className="fine">
          Acesso pessoal. Seus registros são protegidos por login e regras no
          banco. A demonstração usa uma ficha fictícia e fica apenas neste
          navegador.
        </p>
      </div>
    </div>
  );
}
function Recovery({ onDone }: { onDone: () => void }) {
  const [message, setMessage] = useState("");
  return (
    <div className="recovery">
      <Mark />
      <h1>Crie uma nova senha</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const { error } = await supabase.auth.updateUser({
            password: String(f.get("password")),
          });
          if (error)
            setMessage("Não foi possível alterar. Solicite um novo link.");
          else {
            history.replaceState(null, "", location.pathname);
            onDone();
          }
        }}
      >
        <label>
          Nova senha
          <input
            type="password"
            name="password"
            minLength={12}
            required
            autoComplete="new-password"
          />
        </label>
        <button className="primary">
          Salvar nova senha <Check size={18} />
        </button>
      </form>
      <p role="status">{message}</p>
    </div>
  );
}
