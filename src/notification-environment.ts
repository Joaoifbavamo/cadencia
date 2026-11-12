export interface NotificationEnvironment {
  ios: boolean;
  standalone: boolean;
  notifications: boolean;
  push: boolean;
  worker: boolean;
  permission: NotificationPermission;
}
export function notificationStep(e: NotificationEnvironment) {
  if (e.ios && !e.standalone) return "install";
  if (!e.notifications || !e.push || !e.worker) return "unsupported";
  if (e.permission === "denied") return "blocked";
  return e.permission === "granted" ? "connect" : "permission";
}
export function readNotificationEnvironment(): NotificationEnvironment {
  return {
    ios:
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    standalone:
      matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
    notifications: "Notification" in window,
    push: "PushManager" in window,
    worker: "serviceWorker" in navigator,
    permission: "Notification" in window ? Notification.permission : "default",
  };
}
