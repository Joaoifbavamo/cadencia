import { useRef } from "react";
export default function SectionTabs({
  id,
  label,
  items,
  value,
  onChange,
}: {
  id: string;
  label: string;
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div
      className="section-tabs"
      role="tablist"
      aria-label={label}
      onKeyDown={(event) => {
        const index = refs.current.indexOf(event.target as HTMLButtonElement);
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
        onChange(items[next].value);
        refs.current[next]?.focus();
      }}
    >
      {items.map((item, i) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          id={`${id}-tab-${item.value}`}
          aria-controls={`${id}-panel-${item.value}`}
          aria-selected={value === item.value}
          tabIndex={value === item.value ? 0 : -1}
          ref={(node) => {
            refs.current[i] = node;
          }}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
