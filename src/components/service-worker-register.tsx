"use client";

import { useEffect } from "react";

// Registers /sw.js once the page has loaded. Production only: in `next dev` a worker
// would fight hot reloading and cache stale code.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // updateViaCache "none": the browser always asks the server for a fresh sw.js, so a
    // new version is noticed on the next visit.
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Installing is a nicety; the app works the same without it.
    });
  }, []);
  return null;
}
