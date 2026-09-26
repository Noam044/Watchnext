"use client";

import { useEffect } from "react";

/** Enregistre le service worker (notifications push, app installable). Ne rend rien. */
export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
