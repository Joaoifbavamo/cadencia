import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
export default function UpdateNotice({ defer = false }: { defer?: boolean }) {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let stopped = false;
    const check = async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg || stopped) return;
      if (reg.waiting) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        reg.installing?.addEventListener("statechange", () => {
          if (reg.waiting && navigator.serviceWorker.controller)
            setWaiting(reg.waiting);
        });
      });
    };
    void check();
    return () => {
      stopped = true;
    };
  }, []);
  if (!waiting) return null;
  return (
    <div className="update-notice" role="status">
      <span>
        {defer
          ? "Atualização pronta para depois do treino ou edição."
          : "Nova versão do Cadência disponível."}
      </span>
      <button
        className="text-button"
        disabled={defer}
        onClick={() => {
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            () => location.reload(),
            { once: true },
          );
          waiting.postMessage({ type: "ACTIVATE_UPDATE" });
        }}
      >
        <RefreshCw size={15} />
        Atualizar app
      </button>
    </div>
  );
}
