import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import "./mobile-navigation.css";
type Props = {
  items: { name: string; icon: ReactNode }[];
  value: string | null;
  onChange: (value: string) => boolean | void;
};
function Navigation({ items, value, onChange }: Props) {
  const [selected, setSelected] = useState(value);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
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
  const select = (next: string) => {
    if (onChange(next) === false) return false;
    setSelected(next);
    return true;
  };
  return (
    <nav
      className="bottom-nav cadencia-navigation"
      aria-label="Navegação principal"
      style={
        {
          "--cadencia-tab-count": items.length,
          "--active-index": Math.max(
            0,
            items.findIndex((n) => n.name === selected),
          ),
        } as CSSProperties
      }
      onKeyDown={(event) => {
        const index = buttons.current.indexOf(
          event.target as HTMLButtonElement,
        );
        if (
          index < 0 ||
          !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
        )
          return;
        event.preventDefault();
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? items.length - 1
              : (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) %
                items.length;
        if (select(items[next].name)) buttons.current[next]?.focus();
      }}
    >
      <div className="nav-track">
        <span className="nav-indicator" aria-hidden="true" />
        {items.map((n, i) => (
          <button
            key={n.name}
            ref={(button) => {
              buttons.current[i] = button;
            }}
            type="button"
            className="nav-tab"
            aria-current={selected === n.name ? "page" : undefined}
            onClick={() => select(n.name)}
          >
            {n.icon}
            <span>{n.name}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
export default memo(function MobileNavigation(props: Props) {
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width: 760px)").matches,
  );
  useEffect(() => {
    const query = matchMedia("(max-width: 760px)");
    const change = () => setMobile(query.matches);
    query.addEventListener("change", change);
    change();
    return () => query.removeEventListener("change", change);
  }, []);
  return mobile && props.value !== null ? <Navigation {...props} /> : null;
});
