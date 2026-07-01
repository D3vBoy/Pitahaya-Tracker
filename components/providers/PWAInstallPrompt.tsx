"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_UNTIL_KEY = "pitahaya-pwa-dismissed-until";
const DISMISS_DURATION_MS = 1000 * 60 * 60 * 24;

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
  const [installed, setInstalled] = useState(() => isStandaloneMode());
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [showAndroidHelp, setShowAndroidHelp] = useState(false);
  const [autoPromptTried, setAutoPromptTried] = useState(false);
  const [logoSrc, setLogoSrc] = useState("/pitahaya-app-logo.png");

  const mobile = useMemo(() => isMobileDevice(), []);
  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);

  const closeBanner = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + DISMISS_DURATION_MS));
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
      setAutoPromptTried(true);
    } catch {
      // Some browsers reject automatic prompting; keep CTA visible for manual retry.
      setAutoPromptTried(true);
    }
  }, [deferredPrompt]);

  useEffect(() => {
    if (!mobile) return;
    if (installed) return;

    try {
      const dismissedUntil = Number.parseInt(localStorage.getItem(DISMISS_UNTIL_KEY) || "0", 10);
      const dismissed = Number.isFinite(dismissedUntil) && dismissedUntil > Date.now();
      if (dismissed) return;
    } catch {
      // Continue even if storage is blocked.
    }

    // Always show banner on mobile, but defer state update to avoid sync setState in effect.
    const showTimer = window.setTimeout(() => {
      setVisible(true);
    }, 0);

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

    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [installed, mobile]);

  useEffect(() => {
    if (!visible || !deferredPrompt || installed || !mobile || autoPromptTried) return;

    const timer = window.setTimeout(() => {
      void runInstall();
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autoPromptTried, deferredPrompt, installed, mobile, runInstall, visible]);

  if (!mobile || installed || !visible) return null;

  return (
    <>
      <div className="fixed inset-x-3 bottom-3 z-80 sm:inset-x-auto sm:right-4 sm:w-95">
        <div className="rounded-2xl border border-[#39065E]/60 bg-[#0C0714]/95 p-3 shadow-[0_20px_60px_rgba(10,6,18,0.55)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Image
              src={logoSrc}
              alt="Pitahaya App"
              width={56}
              height={56}
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
                onClick={() => (isIOS ? setShowIosHelp(true) : setShowAndroidHelp(true))}
                className="flex-1 rounded-lg bg-linear-to-r from-[#CF3790] to-[#F38D62] px-3 py-2 text-xs font-bold text-white"
              >
                Descargar la App
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

      {showAndroidHelp && (
        <div className="fixed inset-0 z-90 flex items-end bg-black/55 p-3 sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-2xl border border-[#39065E]/60 bg-[#100A1A] p-5 text-white">
            <h3 className="text-base font-semibold">Instalacion en Android</h3>
            <p className="mt-2 text-sm text-pitahaya-gray-300">
              Si no aparece la ventana automatica, sigue estos pasos en Chrome:
            </p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-pitahaya-gray-200">
              <li>Toca el menu de 3 puntos.</li>
              <li>Selecciona Instalar app o Agregar a pantalla principal.</li>
              <li>Confirma para instalar Pitahaya Tracker.</li>
            </ol>
            <p className="mt-3 text-xs text-pitahaya-gray-500">
              Nota: la instalacion automatica puede no habilitarse en conexiones no seguras (HTTP) o navegadores sin soporte PWA completo.
            </p>
            <button
              type="button"
              onClick={() => setShowAndroidHelp(false)}
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
