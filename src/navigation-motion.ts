/** Let Glisse finish its real spring before mounting a potentially heavy page. */
export function afterGlassSettles(commit: () => void): () => void {
  const bar = document.querySelector<HTMLElement>(".bottom-nav .lg-tab-bar");
  if (!bar || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    commit();
    return () => {};
  }
  const main = document.querySelector<HTMLElement>("main");
  const wasInert = main?.inert ?? false;
  if (main) {
    main.inert = true;
    main.setAttribute("aria-busy", "true");
  }
  let stopped = false,
    frame = 0,
    paints = 0;
  const cleanup = () => {
    stopped = true;
    if (main) {
      main.inert = wasInert;
      main.removeAttribute("aria-busy");
    }
    cancelAnimationFrame(frame);
    clearTimeout(fallback);
    document.removeEventListener("visibilitychange", visibility);
  };
  const finish = () => {
    if (stopped) return;
    cleanup();
    commit();
  };
  const check = () => {
    if (stopped) return;
    paints++;
    if (
      document.hidden ||
      !bar.isConnected ||
      (paints > 1 &&
        !bar.hasAttribute("data-away") &&
        !bar.hasAttribute("data-lensing") &&
        !bar.hasAttribute("data-lifted"))
    )
      finish();
    else frame = requestAnimationFrame(check);
  };
  const visibility = () => {
    if (document.hidden) finish();
  };
  const fallback = setTimeout(finish, 900);
  document.addEventListener("visibilitychange", visibility);
  frame = requestAnimationFrame(check);
  return cleanup;
}
