import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Clock3, Volume2, VolumeX } from "lucide-react";
export default function RestStage({
  deadline,
  seconds,
  label,
  sound,
  onSound,
  onTest,
  onMore,
  onDone,
  nextLabel,
  onFinished,
}: {
  deadline: number;
  seconds: number;
  label: string;
  sound: boolean;
  onSound: () => void;
  onTest: () => void;
  onMore: () => void;
  onDone: () => void;
  nextLabel: string;
  onFinished: () => void;
}) {
  const [now, setNow] = useState(Date.now()),
    sent = useRef(false);
  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  const ready = left === 0;
  useEffect(() => {
    const refresh = () => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) clearInterval(timer);
    };
    const timer = setInterval(refresh, 1000);
    const end = setTimeout(refresh, Math.max(0, deadline - Date.now()) + 20);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      clearTimeout(end);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [deadline]);
  useEffect(() => {
    if (
      !ready ||
      sent.current ||
      document.visibilityState !== "visible" ||
      Date.now() - deadline > 300000
    )
      return;
    sent.current = true;
    onFinished();
  }, [ready, now, deadline, onFinished]);
  return (
    <div className="rest-only">
      <p className="guided-position">{label}</p>
      <h1>{ready ? "Descanso concluído" : "Hora de descansar"}</h1>
      <p className="guided-subtitle">
        {ready
          ? "Continue quando estiver pronto."
          : "Respire. A próxima etapa está preparada."}
      </p>
      <div className={"rest-dial " + (ready ? "is-ready" : "")}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="dial-track" cx="60" cy="60" r="54" />
          <circle
            className="dial-progress"
            cx="60"
            cy="60"
            r="54"
            style={{
              strokeDasharray: 340,
              strokeDashoffset:
                340 * (1 - Math.min(1, left / Math.max(1, seconds))),
            }}
          />
        </svg>
        <div role="timer" aria-label={"Descanso: " + left + " segundos"}>
          <b>
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
          </b>
          <span>{ready ? <Check size={24} /> : <Clock3 size={22} />}</span>
        </div>
      </div>
      {ready && (
        <p className="rest-complete" role="status">
          Descanso concluído.
        </p>
      )}
      <button className="primary guided-full" onClick={onDone}>
        {ready ? nextLabel : "Encerrar descanso agora"}
        <ArrowRight size={18} />
      </button>
      {!ready && (
        <button className="secondary guided-full" onClick={onMore}>
          Adicionar 30 segundos
        </button>
      )}
      <div className="rest-audio">
        <button className="text-button" onClick={onSound}>
          {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}Som{" "}
          {sound ? "ativado" : "desativado"}
        </button>
        <button className="text-button" onClick={onTest}>
          Testar alarme
        </button>
      </div>
      <details className="rest-help">
        <summary>Sobre o som e os avisos</summary>
        <p>
          Toque em Testar alarme para liberar o som neste navegador. Com o app
          aberto, o alarme acompanha o prazo. Com tela bloqueada, o aviso
          depende das permissões, da conexão e do modo Foco do iPhone. A
          contagem animada funciona dentro do app. Este app web não mostra
          contagem ao vivo na tela bloqueada ou na Ilha Dinâmica.
        </p>
      </details>
    </div>
  );
}
