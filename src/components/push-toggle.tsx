"use client";

import { useEffect, useState, useTransition } from "react";
import { sendTestPushAction, subscribePushAction, unsubscribePushAction } from "@/actions/push";
import { toast } from "@/components/toaster";
import { useI18n } from "@/i18n/client";

type State = "loading" | "unconfigured" | "unsupported" | "ios-install" | "denied" | "off" | "on";

/** Clé publique VAPID (base64url) → octets attendus par pushManager.subscribe. */
function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function supported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Active ou désactive les notifications push sur l'appareil utilisé. */
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const s = useI18n().t.settings;
  const [state, setState] = useState<State>("loading");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: State;
      if (!publicKey) next = "unconfigured";
      else if (!supported()) next = /iPhone|iPad|iPod/.test(navigator.userAgent) ? "ios-install" : "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        // Abonnement déjà présent : on le renvoie au serveur (il a pu être supprimé ou changer de compte).
        if (sub) await subscribePushAction(sub.toJSON());
        next = sub ? "on" : "off";
      }
      if (!cancelled) setState(next);
    })().catch(() => !cancelled && setState("unsupported"));
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  const enable = () =>
    startTransition(async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey!) }));
        const res = await subscribePushAction(sub.toJSON());
        if (!res.ok) throw new Error(res.error);
        setState("on");
        toast(s.pushEnabled);
      } catch {
        toast(s.pushFailed, "error");
      }
    });

  const disable = () =>
    startTransition(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast(s.pushDisabled);
    });

  const test = () =>
    startTransition(async () => {
      const res = await sendTestPushAction();
      if (!res.ok) toast(res.error, "error");
    });

  const notes: Partial<Record<State, string>> = {
    unconfigured: s.pushUnconfigured,
    unsupported: s.pushUnsupported,
    "ios-install": s.pushIosInstall,
    denied: s.pushDenied,
  };

  if (state === "loading") return <p className="text-sm text-dust-400">…</p>;
  if (notes[state]) return <p className="max-w-xl text-sm leading-relaxed text-dust-300">{notes[state]}</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-dust-300">{state === "on" ? s.pushOn : s.pushOff}</p>
      <div className="flex flex-wrap gap-2">
        {state === "on" ? (
          <>
            <button type="button" onClick={test} disabled={pending} className="btn-ghost">
              {s.pushTest}
            </button>
            <button type="button" onClick={disable} disabled={pending} className="btn-quiet">
              {s.pushDisable}
            </button>
          </>
        ) : (
          <button type="button" onClick={enable} disabled={pending} className="btn-primary">
            {s.pushEnable}
          </button>
        )}
      </div>
    </div>
  );
}
