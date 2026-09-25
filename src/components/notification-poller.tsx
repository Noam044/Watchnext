"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { notificationSummaryAction, type NotificationSummary } from "@/actions/messages";
import { toast } from "@/components/toaster";
import { useI18n } from "@/i18n/client";

const POLL_MS = 20_000;

/**
 * Notifications dans l'app : surveille les nouveaux messages et demandes d'ami,
 * affiche une notification et rafraîchit les pastilles de la navigation.
 */
export function NotificationPoller({ initial }: { initial: Omit<NotificationSummary, "latestFrom"> }) {
  const router = useRouter();
  const pathname = usePathname();
  const last = useRef(initial);
  const { t } = useI18n();

  // Les compteurs rendus par le serveur font foi (ex. après lecture d'une conversation).
  useEffect(() => {
    last.current = initial;
  }, [initial.unreadMessages, initial.pendingRequests]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const next = await notificationSummaryAction().catch(() => null);
      if (!next) return;
      const prev = last.current;
      const inThread = pathname.startsWith("/messages/");
      if (next.unreadMessages > prev.unreadMessages && !inThread && next.latestFrom) {
        toast(t.messages.newMessageFrom(next.latestFrom));
      }
      if (next.pendingRequests > prev.pendingRequests) toast(t.messages.newFriendRequest);
      if (next.unreadMessages !== prev.unreadMessages || next.pendingRequests !== prev.pendingRequests) {
        last.current = next;
        router.refresh();
      }
    };
    const timer = setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [pathname, router, t]);

  return null;
}
