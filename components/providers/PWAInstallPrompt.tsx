"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "pitahaya-pwa-dismissed";

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(iosStandalone);
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [logoSrc, setLogoSrc] = useState("/pitahaya-app-logo.png");

  const mobile = useMemo(() => isMobileDevice(), []);
  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);

  const closeBanner = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore localStorage availability issues.
    }
  }, []);

  const runInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        setVisible(false);
      }
    } catch {
      // Some browsers reject automatic prompting; keep CTA visible for manual retry.
    }
  }, [deferredPrompt]);

  useEffect(() => {
    if (!mobile) return;
    if (isStandaloneMode()) {
      setInstalled(true);
      return;
    }

    try {
      const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      if (dismissed) return;
    } catch {
      // Continue even if storage is blocked.
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (isIOS) {
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [isIOS, mobile]);

  useEffect(() => {
    if (!visible || !deferredPrompt || installed || !mobile) return;

    const timer = window.setTimeout(() => {
      void runInstall();
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [deferredPrompt, installed, mobile, runInstall, visible]);

  if (!mobile || installed || !visible) return null;

  return (
    <>
      <div className="fixed inset-x-3 bottom-3 z-80 sm:inset-x-auto sm:right-4 sm:w-95">
        <div className="rounded-2xl border border-[#39065E]/60 bg-[#0C0714]/95 p-3 shadow-[0_20px_60px_rgba(10,6,18,0.55)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <img
              src={logoSrc}
              alt="Pitahaya App"
              className="h-14 w-14 rounded-xl border border-[#CF3790]/40 object-cover"
              onError={() => setLogoSrc("/api/pwa-icon/192")}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Descarga la App</p>
              <p className="mt-0.5 text-xs text-pitahaya-gray-300">
                Instala Pitahaya Tracker para acceso rapido y experiencia de app.
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {deferredPrompt ? (
              <button
                type="button"
                onClick={() => void runInstall()}
                className="flex-1 rounded-lg bg-linear-to-r from-[#CF3790] to-[#F38D62] px-3 py-2 text-xs font-bold text-white"
              >
                Descargar la App
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowIosHelp(true)}
                className="flex-1 rounded-lg bg-linear-to-r from-[#CF3790] to-[#F38D62] px-3 py-2 text-xs font-bold text-white"
              >
                Ver como instalar
              </button>
            )}

            <button
              type="button"
              onClick={closeBanner}
              className="rounded-lg border border-[#39065E] px-3 py-2 text-xs text-pitahaya-gray-300"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>

      {showIosHelp && (
        <div className="fixed inset-0 z-90 flex items-end bg-black/55 p-3 sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-2xl border border-[#39065E]/60 bg-[#100A1A] p-5 text-white">
            <h3 className="text-base font-semibold">Instalar en iPhone</h3>
            <p className="mt-2 text-sm text-pitahaya-gray-300">
              Safari no permite instalacion totalmente automatica, pero toma solo unos segundos:
            </p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-pitahaya-gray-200">
              <li>Toca el boton Compartir en Safari.</li>
              <li>Selecciona Agregar a pantalla de inicio.</li>
              <li>Confirma para instalar Pitahaya Tracker.</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
              className="mt-4 w-full rounded-lg bg-[#CF3790] px-3 py-2 text-sm font-semibold"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
