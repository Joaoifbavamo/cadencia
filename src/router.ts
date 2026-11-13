export interface AppRoute {
  tab: string;
  sessionId: string | null;
}
const paths: Record<string, string> = {
  Hoje: "hoje",
  Agenda: "agenda",
  Evolução: "evolucao",
  "Meu treino": "meu-treino",
  Instalar: "instalar",
  Ajustes: "ajustes",
};
export function parseRoute(hash: string): AppRoute | null {
  if (hash.includes("type=recovery")) return null;
  const path = hash.replace(/^#\/?/, "");
  if (path.startsWith("treino/")) {
    try {
      const id = decodeURIComponent(path.slice(7));
      return id ? { tab: "Hoje", sessionId: id } : null;
    } catch {
      return null;
    }
  }
  const tab = Object.keys(paths).find((k) => paths[k] === path);
  return tab ? { tab, sessionId: null } : null;
}
export function routeHash(route: AppRoute) {
  return route.sessionId
    ? "#/treino/" + encodeURIComponent(route.sessionId)
    : "#/" + (paths[route.tab] || "hoje");
}
