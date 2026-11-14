import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { TabBar } from "glisse";
import type { CSSProperties, ReactNode } from "react";
import "./mobile-navigation.css";
const accessibilityQueries = [
  "(prefers-reduced-transparency: reduce)",
  "(prefers-contrast: more)",
  "(prefers-reduced-motion: reduce)",
];
function useMediaQueries(queries: string[]) {
  const [matches, setMatches] = useState(() =>
    queries.some((q) => matchMedia(q).matches),
  );
  useEffect(() => {
    const media = queries.map((q) => matchMedia(q));
    const change = () => setMatches(media.some((q) => q.matches));
    change();
    for (const query of media) query.addEventListener("change", change);
    return () => {
      for (const query of media) query.removeEventListener("change", change);
    };
  }, [queries]);
  return matches;
}
const mobileQueries = ["(max-width: 760px)"];
type Props = {
  items: { name: string; icon: ReactNode }[];
  value: string | null;
  onChange: (value: string) => boolean | void;
};
function Navigation({ items, value, onChange }: Props) {
  const [selected, setSelected] = useState(value);
  useLayoutEffect(() => setSelected(value), [value]);
  useEffect(() => {
    const restore = () => setSelected(value);
    window.addEventListener("popstate", restore);
    window.addEventListener("hashchange", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("hashchange", restore);
    };
  }, [value]);
  const select = useCallback(
    (next: string) => {
      if (onChange(next) !== false) setSelected(next);
    },
    [onChange],
  );
  const simple = useMediaQueries(accessibilityQueries);
  const tabs = useMemo(
    () => items.map((n) => ({ value: n.name, label: n.name, icon: n.icon })),
    [items],
  );
  return (
    <nav
      style={{ "--cadencia-tab-count": items.length } as CSSProperties}
      className={
        "bottom-nav cadencia-navigation " +
        (simple ? "static-nav" : "glisse-nav")
      }
      aria-label="Navegação principal"
    >
      {simple ? (
        items.map((n) => (
          <button
            key={n.name}
            type="button"
            className={selected === n.name ? "active" : ""}
            aria-current={value === n.name ? "page" : undefined}
            onClick={() => select(n.name)}
          >
            {n.icon}
            <span>{n.name}</span>
          </button>
        ))
      ) : (
        <TabBar
          aria-label="Áreas do Cadência"
          items={tabs}
          value={selected}
          onValueChange={select}
        />
      )}
    </nav>
  );
}
export default memo(function MobileNavigation(props: Props) {
  const mobile = useMediaQueries(mobileQueries);
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const change = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);
  // A display:none optical scene still has its own animation/measurement loop.
  // Mount it only while the navigation can actually be seen and used.
  return mobile && visible && props.value !== null ? (
    <Navigation {...props} />
  ) : null;
});
