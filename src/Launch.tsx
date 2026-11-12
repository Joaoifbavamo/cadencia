import { useEffect, useState } from "react";
import { Mark } from "./components.tsx";
export default function Launch() {
  const [visible, setVisible] = useState(
    () =>
      !matchMedia("(prefers-reduced-motion: reduce)").matches &&
      (matchMedia("(display-mode: standalone)").matches ||
        Boolean(
          (navigator as Navigator & { standalone?: boolean }).standalone,
        )),
  );
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 850);
    return () => clearTimeout(t);
  }, [visible]);
  return visible ? (
    <div className="launch" aria-hidden="true">
      <Mark />
      <span>cadência.</span>
    </div>
  ) : null;
}
