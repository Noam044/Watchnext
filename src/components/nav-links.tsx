"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { Avatar } from "@/components/avatar";
import { useI18n } from "@/i18n/client";
import { ChatIcon, ScreenIcon, UploadIcon, UserIcon, UsersIcon } from "@/components/icons";

const LINKS = [
  { href: "/dashboard", key: "toWatch", Icon: ScreenIcon },
  { href: "/friends", key: "friends", Icon: UsersIcon },
  { href: "/messages", key: "messages", Icon: ChatIcon },
  { href: "/import", key: "import", Icon: UploadIcon },
] as const;

type Me = { name: string; handle: string; avatar: string | null; pendingRequests: number; unreadMessages: number };

/** Pastille de chaque onglet : demandes d'ami en attente, messages non lus. */
function badgeFor(href: string, me: Me) {
  if (href === "/friends") return me.pendingRequests;
  if (href === "/messages") return me.unreadMessages;
  return 0;
}

function isActive(pathname: string, href: string, handle: string) {
  if (href === "/profile") return pathname.startsWith("/profile") || pathname === `/u/${handle}`;
  if (href === "/friends") return pathname.startsWith("/friends") || (pathname.startsWith("/u/") && pathname !== `/u/${handle}`);
  return pathname.startsWith(href);
}

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="grid min-w-4.5 place-items-center rounded-full bg-curtain px-1 font-mono text-[10px] leading-4.5 font-bold text-screen">
      {count}
    </span>
  );
}

/** Navigation principale (écran large). */
export function DesktopNav({ me }: { me: Me }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const nav = useRef<HTMLElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const activeHref = LINKS.find(({ href }) => isActive(pathname, href, me.handle))?.href ?? null;

  // Pastille de l'onglet actif : elle glisse (en ressort) jusqu'au nouvel onglet à chaque changement de page.
  // Posée sans animation au premier affichage ; masquée sur les pages hors navigation (fiche d'un film…).
  useLayoutEffect(() => {
    const el = pill.current;
    if (!el) return;
    const place = (animate: boolean) => {
      const link = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
      el.style.transitionDuration = animate ? "" : "0s";
      el.style.opacity = link ? "1" : "0";
      if (link) {
        el.style.left = `${link.offsetLeft}px`;
        el.style.width = `${link.offsetWidth}px`;
      }
    };
    place(el.dataset.placed === "1");
    el.dataset.placed = "1";
    const onResize = () => place(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeHref, me.pendingRequests, me.unreadMessages]);

  return (
    <nav ref={nav} aria-label={t.nav.main} className="relative isolate ml-4 hidden items-center gap-1 md:flex lg:ml-8">
      <span
        ref={pill}
        aria-hidden
        className="absolute inset-y-0 -z-10 rounded-full bg-velvet-800 opacity-0 [transition:left_0.55s_var(--ease-spring),width_0.55s_var(--ease-spring),opacity_0.2s]"
      />
      {LINKS.map(({ href, key }) => {
        const active = isActive(pathname, href, me.handle);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
              active ? "text-screen" : "text-dust-300 hover:text-screen"
            }`}
          >
            {t.nav[key]}
            <Badge count={badgeFor(href, me)} />
          </Link>
        );
      })}
    </nav>
  );
}

export function ProfileLink({ me }: { me: Me }) {
  const pathname = usePathname();
  const active = isActive(pathname, "/profile", me.handle);
  return (
    <Link
      href="/profile"
      aria-current={active ? "page" : undefined}
      // Le nom n'apparaît qu'à partir de 1024 px : en dessous, l'en-tête n'a pas la place avec la navigation.
      className={`flex items-center gap-2.5 rounded-full p-1 text-sm transition lg:pr-3 ${
        active ? "bg-velvet-800" : "hover:bg-velvet-850"
      }`}
    >
      <Avatar name={me.name} handle={me.handle} src={me.avatar} size="sm" />
      <span className="hidden max-w-36 truncate font-medium lg:block">{me.name}</span>
    </Link>
  );
}

/** Barre d'onglets fixée en bas (mobile) : les pages sont à portée de pouce. */
export function MobileTabBar({ me }: { me: Me }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const tabs = [...LINKS, { href: "/profile", key: "profile", Icon: UserIcon }] as const;
  const activeIndex = tabs.findIndex(({ href }) => isActive(pathname, href, me.handle));
  return (
    <nav
      aria-label={t.nav.main}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-velvet-800 bg-velvet-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      <ul className="relative grid grid-cols-5">
        {/* Filet lumineux de l'onglet actif : il glisse (en ressort) d'un onglet à l'autre. */}
        <li
          aria-hidden
          className="pointer-events-none absolute -top-px h-0.5 w-1/5 px-5 [transition:left_0.55s_var(--ease-spring),opacity_0.2s]"
          style={{ left: `${Math.max(activeIndex, 0) * 20}%`, opacity: activeIndex < 0 ? 0 : 1 }}
        >
          <span className="block h-full rounded-full bg-tungsten shadow-[0_0_12px_var(--color-tungsten)]" />
        </li>
        {tabs.map(({ href, key, Icon }) => {
          const active = isActive(pathname, href, me.handle);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  active ? "text-tungsten" : "text-dust-400"
                }`}
              >
                {/* L'icône de l'onglet qui devient actif rebondit. */}
                <span className={`relative ${active ? "animate-pop" : ""}`}>
                  <Icon className="size-5.5" />
                  {badgeFor(href, me) > 0 && (
                    <span className="absolute -top-1 -right-2">
                      <Badge count={badgeFor(href, me)} />
                    </span>
                  )}
                </span>
                {t.nav[key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
