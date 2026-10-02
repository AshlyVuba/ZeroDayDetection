import { useSyncExternalStore } from "react";
import { registerSW } from "virtual:pwa-register";

const listeners = new Set();

let snapshot = {
  isOnline: navigator.onLine,
  offlineReady: false,
  updateAvailable: false,
};

function publish(nextSnapshot) {
  snapshot = { ...snapshot, ...nextSnapshot };
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

window.addEventListener("online", () => publish({ isOnline: true }));
window.addEventListener("offline", () => publish({ isOnline: false }));

const updateServiceWorker = registerSW({
  immediate: true,
  onOfflineReady() {
    publish({ offlineReady: true });
  },
  onNeedRefresh() {
    publish({ updateAvailable: true });
  },
});

export function usePwaStatus() {
  const status = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...status,
    refresh: () => updateServiceWorker(true),
  };
}
