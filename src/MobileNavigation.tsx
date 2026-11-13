import { useEffect, useState } from "react";
import { TabBar } from "glisse";
import type { ReactNode } from "react";
export default function MobileNavigation({
  items,
  value,
  onChange,
}: {
  items: { name: string; icon: ReactNode }[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  const queries = [
    "(prefers-reduced-transparency: reduce)",
    "(prefers-contrast: more)",
    "(prefers-reduced-motion: reduce)",
  ];
  const [simple, setSimple] = useState(() =>
    queries.some((q) => matchMedia(q).matches),
  );
  useEffect(() => {
    const media = queries.map((q) => matchMedia(q));
    const change = () => setSimple(media.some((q) => q.matches));
    for (const m of media) m.addEventListener("change", change);
    return () => {
      for (const m of media) m.removeEventListener("change", change);
    };
  }, []);
  return (
    <nav
      className={"bottom-nav " + (simple ? "static-nav" : "glisse-nav")}
      aria-label="Navegação principal"
    >
      {simple ? (
        items.map((n) => (
          <button
            key={n.name}
            className={value === n.name ? "active" : ""}
            aria-current={value === n.name ? "page" : undefined}
            onClick={() => onChange(n.name)}
          >
            {n.icon}
            <span>{n.name}</span>
          </button>
        ))
      ) : (
        <TabBar
          aria-label="Áreas do Cadência"
          items={items.map((n) => ({
            value: n.name,
            label: n.name,
            icon: n.icon,
          }))}
          value={value}
          onValueChange={onChange}
        />
      )}
    </nav>
  );
}
