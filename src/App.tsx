import MobileNavigation from "./MobileNavigation.tsx";
import { parseRoute, routeHash, type AppRoute } from "./router.ts";
import { clearEditorDraft } from "./editor-draft.ts";
import { singletonIdentity } from "./singleton.ts";
import { useCallback, useEffect, useRef, useState } from "react";
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
  visible,
  validPayload,
  snapshotSession,
  findResumableSession,
  todayKey,
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
import UpdateNotice from "./UpdateNotice.tsx";
const defaults: Profile = {
  barWeight: null,
  increment: 2.5,
  timezone: "America/Sao_Paulo",
};
const NAV_ITEMS = [
  { name: "Hoje", icon: House },
  { name: "Agenda", icon: CalendarDays },
  { name: "Evolução", icon: ChartNoAxesCombined },
  { name: "Meu treino", icon: Dumbbell },
  { name: "Instalar", icon: Download },
];
const MOBILE_ITEMS = NAV_ITEMS.map((n) => ({
  name: n.name,
  icon: <n.icon size={22} />,
}));
export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [singletonIds, setSingletonIds] = useState<Model["singletonIds"]>();
  const [, render] = useState(0);
  const [tab, setTab] = useState(
    () => parseRoute(location.hash)?.tab ?? "Hoje",
  );
  const [planDirty, setPlanDirty] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(
    () => parseRoute(location.hash)?.sessionId ?? null,
  );
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<Entity | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [recover, setRecover] = useState(
    location.hash.includes("type=recovery"),
  );
  const [welcome, setWelcome] = useState(false);
  const store = useRef<LocalStore | null>(null);
  const engine = useRef<SyncEngine | null>(null);
  const navigationRef = useRef({ tab, sessionId, planDirty, account });
  navigationRef.current = { tab, sessionId, planDirty, account };
  const focusNavigation = useRef(false);
  const arrowNavigation = useRef(false);
  const historyPosition = useRef<number>(
    history.state?.cadenciaRouteIndex ?? 0,
  );
  const restoringPosition = useRef(false);
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
        setAccount(null);
        setPlanDirty(false);
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
        const [profile, plan] = await Promise.all([
          singletonIdentity(account, "profile"),
          singletonIdentity(account, "plan"),
        ]);
        local.onChange = changed;
        if (cancelled) {
          local.close();
          return;
        }
        store.current = local;
        setSingletonIds({ profile, plan });
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
          e instanceof Error && e.message.startsWith("Feche outras abas")
            ? e.message
            : "Não foi possível abrir o armazenamento deste navegador. Confira se há espaço e tente novamente.",
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
    if (!location.hash.includes("type=recovery"))
      history.replaceState(
        { ...history.state, cadenciaRouteIndex: historyPosition.current },
        "",
      );
    const key = (event: KeyboardEvent) => {
      arrowNavigation.current =
        ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) &&
        Boolean((event.target as Element)?.closest?.(".bottom-nav"));
    };
    const pointer = () => {
      arrowNavigation.current = false;
    };
    const restore = () => {
      if (location.hash.includes("type=recovery")) return;
      const route = parseRoute(location.hash) ?? {
        tab: "Hoje",
        sessionId: null,
      };
      const current = navigationRef.current;
      if (restoringPosition.current) {
        if (route.tab === current.tab && route.sessionId === current.sessionId)
          restoringPosition.current = false;
        return;
      }
      if (route.tab === current.tab && route.sessionId === current.sessionId)
        return;
      if (
        current.tab === "Meu treino" &&
        current.planDirty &&
        !confirm(
          "Sua ficha tem alterações não salvas. Sair e descartar essas alterações?",
        )
      ) {
        const incoming = history.state?.cadenciaRouteIndex;
        if (
          typeof incoming === "number" &&
          incoming !== historyPosition.current
        ) {
          restoringPosition.current = true;
          history.go(historyPosition.current - incoming);
        } else {
          history.replaceState(
            { ...history.state, cadenciaRouteIndex: historyPosition.current },
            "",
            routeHash(current),
          );
        }
        return;
      }
      if (current.planDirty && current.account)
        clearEditorDraft(current.account);
      setPlanDirty(false);
      historyPosition.current =
        history.state?.cadenciaRouteIndex ?? historyPosition.current + 1;
      history.replaceState(
        { ...history.state, cadenciaRouteIndex: historyPosition.current },
        "",
      );
      focusNavigation.current = true;
      setTab(route.tab);
      setSessionId(route.sessionId);
    };
    window.addEventListener("popstate", restore);
    window.addEventListener("hashchange", restore);
    document.addEventListener("keydown", key, true);
    document.addEventListener("pointerdown", pointer, true);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("hashchange", restore);
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("pointerdown", pointer, true);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    window.scrollTo({ top: 0 });
    if (!focusNavigation.current) return;
    focusNavigation.current = false;
    const heading = document.querySelector<HTMLElement>("main h1, main h2");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [tab, sessionId, ready]);
  const openRoute = useCallback((route: AppRoute) => {
    if (routeHash(route) !== location.hash) {
      historyPosition.current += 1;
      history.pushState(
        { cadenciaRouteIndex: historyPosition.current },
        "",
        routeHash(route),
      );
    }
    focusNavigation.current = !arrowNavigation.current;
    setTab(route.tab);
    setSessionId(route.sessionId);
  }, []);
  const openSession = (id: string) => openRoute({ tab: "Hoje", sessionId: id });
  const navigate = useCallback(
    (next: string) => {
      if (next === tab && !sessionId) return;
      if (
        tab === "Meu treino" &&
        planDirty &&
        !confirm(
          "Sua ficha tem alterações não salvas. Sair e descartar essas alterações?",
        )
      )
        return;
      if (planDirty && account) clearEditorDraft(account);
      setPlanDirty(false);
      openRoute({ tab: next, sessionId: null });
    },
    [tab, planDirty, sessionId, account, openRoute],
  );
  async function importDocuments(input: unknown) {
    if (!store.current) throw Error("Armazenamento indisponível.");
    await store.current.importDocuments(input);
    refresh();
    void engine.current?.run();
  }
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
    if (
      kind === "set" &&
      store.current?.docs.some(
        (d) =>
          d.id === payload.sessionId &&
          d.kind === "session" &&
          d.payload.archivedAt,
      )
    )
      throw Error(
        "Este treino foi retirado. Restaure antes de alterar suas séries.",
      );
    if (!validPayload(kind, payload))
      throw Error("Revise os campos antes de salvar.");
    if (!store.current) throw Error("Armazenamento indisponível.");
    await store.current.mutate(id, kind, payload, deleted, expectedPayload);
    refresh();
    void engine.current?.run();
  }
  const starting = useRef(false);
  async function start(w: W, actual: string, planned: string) {
    if (starting.current) return;
    starting.current = true;
    try {
      const plan = visible(store.current!.docs, "plan")[0]?.payload;
      if (!plan) throw Error("Crie ou importe sua ficha.");
      if (!w.exercises.length)
        throw Error(
          "Este treino está vazio. Adicione exercícios em Meu treino antes de começar.",
        );
      const existing = findResumableSession(store.current!.docs, w.id, actual);
      if (actual === todayKey(new Date(), model.profile.timezone)) {
        const currentProfile = visible(store.current!.docs, "profile")[0];
        const payload = currentProfile?.payload ?? defaults;
        const choice = {
          date: actual,
          workoutId: w.id,
          plannedDate: existing?.payload.plannedDate ?? planned,
        };
        if (JSON.stringify(payload.todayChoice) !== JSON.stringify(choice))
          await save(
            currentProfile?.id ?? singletonIds!.profile,
            "profile",
            { ...payload, todayChoice: choice },
            false,
            currentProfile ? JSON.stringify(payload) : null,
          );
      }
      if (existing) {
        openSession(existing.id);
        return;
      }
      const s = snapshotSession(plan, w, actual, planned);
      await save(s.id, "session", s);
      openSession(s.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      starting.current = false;
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
      clearEditorDraft(old);
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
          const route = parseRoute(location.hash);
          setTab(route?.tab ?? "Hoje");
          setSessionId(route?.sessionId ?? null);
        }}
      />
    );
  if (!ready)
    return (
      <div className="loading">
        <Mark />
        <p>{error || "Preparando seus registros…"}</p>
        {error && (
          <button className="secondary" onClick={() => location.reload()}>
            Tentar novamente
          </button>
        )}
      </div>
    );
  const docs = [...store.current!.docs];
  const model: Model = {
    docs,
    profile: visible(docs, "profile")[0]?.payload || defaults,
    demo: account === "demo",
    save,
    saveBatch,
    importDocuments,
    refresh,
    singletonIds,
    cleanup: {
      job: store.current!.cleanupJob,
      start: async (before, summaries) => {
        await store.current!.createCleanup(before, summaries);
        await store.current!.advanceCleanup(online || account === "demo");
        refresh();
        void engine.current?.run();
      },
      step: async () => {
        await store.current!.advanceCleanup(online || account === "demo");
        refresh();
        void engine.current?.run();
      },
      cancel: async () => {
        await store.current!.cancelCleanup();
        refresh();
      },
      restore: async () => {
        await store.current!.recoverCleanup();
        refresh();
        void engine.current?.run();
      },
    },
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
  const nav = NAV_ITEMS;
  return (
    <div className={"app-shell " + (sessionId ? "training" : "")}>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("Hoje");
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
              aria-current={tab === n.name && !sessionId ? "page" : undefined}
              onClick={() => {
                navigate(n.name);
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
              navigate("Ajustes");
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
              (account === "demo" ? "demo-sync " : "") +
              (dirty || !online || engine.current?.error ? "pending" : "")
            }
            onClick={() =>
              conflicts.length
                ? setConflict(conflicts[0])
                : void engine.current?.run()
            }
            title={"Sincronização: " + status}
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
              navigate("Ajustes");
            }}
          >
            <SettingsIcon size={20} />
          </button>
        </header>
        {account === "demo" && (
          <div className="demo-notice">
            Demonstração · dados fictícios{" "}
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
        <UpdateNotice defer={Boolean(sessionId) || tab === "Meu treino"} />
        <main data-glisse-backdrop>
          {sessionId ? (
            <Workout
              model={model}
              accountKey={account}
              sessionId={sessionId}
              onClose={() => {
                setSessionId(null);
                navigate("Hoje");
              }}
            />
          ) : tab === "Hoje" ? (
            <Today
              model={model}
              onStart={start}
              onResume={openSession}
              onPlan={() => navigate("Meu treino")}
              onAgenda={() => navigate("Agenda")}
            />
          ) : tab === "Agenda" ? (
            <Calendar model={model} onStart={start} onOpen={openSession} />
          ) : tab === "Evolução" ? (
            <Progress model={model} />
          ) : tab === "Meu treino" ? (
            <PlanEditor
              key={account}
              accountKey={account}
              model={model}
              onDirtyChange={setPlanDirty}
            />
          ) : tab === "Instalar" ? (
            <Install />
          ) : (
            <Settings
              model={model}
              onLogout={() => void logout()}
              onInstall={() => navigate("Instalar")}
            />
          )}
        </main>
        <footer className="app-footer">
          Cadência · o próximo registro é seu.
        </footer>
      </div>
      <MobileNavigation
        items={MOBILE_ITEMS}
        value={sessionId ? null : tab}
        onChange={navigate}
      />
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
            Confira sua ficha em Meu treino. Antes do primeiro treino, confirme
            o peso da barra usada na academia.
          </p>
          <button
            className="primary"
            onClick={() => {
              setWelcome(false);
              navigate("Ajustes");
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
  const [installing, setInstalling] = useState(false);
  if (installing)
    return (
      <div className="public-install">
        <button className="text-button" onClick={() => setInstalling(false)}>
          Voltar para entrar
        </button>
        <Install />
      </div>
    );
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
        <button
          className="text-button install-login"
          onClick={() => setInstalling(true)}
        >
          <Download size={17} />
          Instalar no iPhone
        </button>
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
