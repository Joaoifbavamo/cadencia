import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TabBar } from "glisse";
import type { ReactNode } from "react";
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
  onChange: (value: string) => void;
};
function Navigation({ items, value, onChange }: Props) {
  const simple = useMediaQueries(accessibilityQueries);
  const nav = useRef<HTMLElement>(null);
  const tabs = useMemo(
    () => items.map((n) => ({ value: n.name, label: n.name, icon: n.icon })),
    [items],
  );
  useLayoutEffect(() => {
    const element = nav.current;
    if (!element) return;
    // The glass includes two 4px insets. Measure its actual safe-area-bounded
    // container instead of deriving tab widths from the entire screen.
    const resize = () =>
      element.style.setProperty(
        "--cadencia-tab-width",
        `${Math.max(0, (element.getBoundingClientRect().width - 8) / Math.max(1, items.length))}px`,
      );
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [items.length]);
  return (
    <nav
      ref={nav}
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
          items={tabs}
          value={value}
          onValueChange={onChange}
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
