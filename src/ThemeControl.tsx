import { useEffect, useState } from "react";
import { Monitor, Sun, Moon } from "lucide-react";
import { applyTheme, type ThemePreference } from "./theme.ts";
export default function ThemeControl() {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    const s = localStorage.getItem("cadencia-theme");
    return s === "light" || s === "dark" ? s : "system";
  });
  useEffect(() => {
    applyTheme(theme);
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyTheme(theme);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [theme]);
  return (
    <div className="theme-control" role="group" aria-label="Aparência">
      {(
        [
          { id: "light", name: "Claro", Icon: Sun },
          { id: "dark", name: "Escuro", Icon: Moon },
          { id: "system", name: "Sistema", Icon: Monitor },
        ] as const
      ).map((t) => (
        <button
          key={t.id}
          aria-pressed={theme === t.id}
          onClick={() => setTheme(t.id)}
        >
          <t.Icon size={17} />
          {t.name}
        </button>
      ))}
    </div>
  );
}
