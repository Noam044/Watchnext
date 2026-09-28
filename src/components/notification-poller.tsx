"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, use, useEffect, useRef, useState } from "react";
import { notificationSummaryAction, type NotificationSummary } from "@/actions/messages";
import { toast } from "@/components/toaster";
import { useI18n } from "@/i18n/client";

const POLL_MS = 20_000;

type Counts = Omit<NotificationSummary, "latestFrom">;

const NotificationCounts = createContext<Counts>({ pendingRequests: 0, unreadMessages: 0 });

/** Demandes d'ami en attente et messages non lus, pour les pastilles de la navigation. */
export function useNotificationCounts() {
  return use(NotificationCounts);
}

/**
 * Notifications dans l'app : surveille les nouveaux messages et demandes d'ami,
 * affiche une notification et met à jour les pastilles de la navigation. Seules les pages
 * qui listent ces demandes ou ces conversations sont rafraîchies ; ailleurs, les pastilles
 * changent sans que le serveur ne refasse la page.
 */
export function NotificationPoller({ initial, children }: { initial: Counts; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [counts, setCounts] = useState(initial);
  const last = useRef(initial);
  const { t } = useI18n();

  // Les compteurs rendus par le serveur font foi (ex. après lecture d'une conversation).
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial.unreadMessages !== lastInitial.unreadMessages || initial.pendingRequests !== lastInitial.pendingRequests) {
    setLastInitial(initial);
    setCounts(initial);
  }
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
      const messagesChanged = next.unreadMessages !== prev.unreadMessages;
      const requestsChanged = next.pendingRequests !== prev.pendingRequests;
      if (!messagesChanged && !requestsChanged) return;
      last.current = next;
      setCounts({ unreadMessages: next.unreadMessages, pendingRequests: next.pendingRequests });
      if ((messagesChanged && pathname === "/messages") || (requestsChanged && pathname.startsWith("/friends"))) {
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

  return <NotificationCounts value={counts}>{children}</NotificationCounts>;
}
