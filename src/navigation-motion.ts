/** Allow the lightweight selection indicator to settle before mounting a heavy page. */
export function afterNavigationSettles(commit: () => void): () => void {
  const nav = document.querySelector<HTMLElement>(".bottom-nav");
  if (!nav || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    commit();
    return () => {};
  }
  const main = document.querySelector<HTMLElement>("main");
  const wasInert = main?.inert ?? false;
  if (main) {
    main.inert = true;
    main.setAttribute("aria-busy", "true");
  }
  let stopped = false;
  const cleanup = () => {
    stopped = true;
    clearTimeout(timer);
    nav.removeEventListener("transitionend", settled);
    document.removeEventListener("visibilitychange", visibility);
    if (main) {
      main.inert = wasInert;
      main.removeAttribute("aria-busy");
    }
  };
  const finish = () => {
    if (stopped) return;
    cleanup();
    commit();
  };
  const settled = (event: TransitionEvent) => {
    if (
      (event.target as Element)?.classList.contains("nav-indicator") &&
      event.propertyName === "transform"
    )
      finish();
  };
  const visibility = () => {
    if (document.hidden) finish();
  };
  const timer = setTimeout(finish, 300);
  nav.addEventListener("transitionend", settled);
  document.addEventListener("visibilitychange", visibility);
  return cleanup;
}
