"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  return (
    <nav aria-label={t.nav.main} className="ml-8 hidden items-center gap-1 md:flex">
      {LINKS.map(({ href, key }) => {
        const active = isActive(pathname, href, me.handle);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              active ? "bg-velvet-800 text-screen" : "text-dust-300 hover:text-screen"
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
      className={`flex items-center gap-2.5 rounded-full p-1 text-sm transition md:pr-3 ${
        active ? "bg-velvet-800" : "hover:bg-velvet-850"
      }`}
    >
      <Avatar name={me.name} handle={me.handle} src={me.avatar} size="sm" className="order-last md:order-first" />
      <span className="hidden max-w-36 truncate font-medium md:block">{me.name}</span>
    </Link>
  );
}

/** Barre d'onglets fixée en bas (mobile) : les pages sont à portée de pouce. */
export function MobileTabBar({ me }: { me: Me }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const tabs = [...LINKS, { href: "/profile", key: "profile", Icon: UserIcon }] as const;
  return (
    <nav
      aria-label={t.nav.main}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-velvet-800 bg-velvet-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      <ul className="grid grid-cols-5">
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
                <span className="relative">
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
