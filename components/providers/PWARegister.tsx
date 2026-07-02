"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js?v=4", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch((error) => {
        console.error("Error registrando service worker", error);
      });
  }, []);

  return null;
}
